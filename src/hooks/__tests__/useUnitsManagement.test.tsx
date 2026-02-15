import { renderHook, act } from '@testing-library/react';
import { useUnitsManagement } from '../useUnitsManagement';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks ────────────────────────────────────────────────────────────

const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
let capturedDocRef: { id: string } = { id: 'generated-doc-id' };

vi.mock('firebase/firestore', () => ({
  collection: vi.fn().mockReturnValue('mocked-collection'),
  doc: vi.fn(() => capturedDocRef),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
  getDoc: vi.fn(),
  type: {},
  FieldValue: {},
}));

// ── Hooks mocks ───────────────────────────────────────────────────────────────

const BATTALION_ID = 'battalion-001';
const COMPANY_ID = 'company-001';

const mockUnits = [
  { id: BATTALION_ID, name: 'Alpha Battalion', unit_type: 'battalion', parent_id: null },
  { id: COMPANY_ID, name: 'Alpha Company', unit_type: 'company', parent_id: BATTALION_ID },
];

vi.mock('../useUnits', () => ({
  useUnits: vi.fn(() => ({
    units: mockUnits,
    loading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
    getUnitById: vi.fn(),
    getChildUnits: vi.fn(),
    getUnitAncestors: vi.fn(),
    getUnitPath: vi.fn(),
    buildUnitTree: vi.fn(),
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ t: (key: string) => key, dir: 'ltr', language: 'en', setLanguage: vi.fn() })),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useUnitsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedDocRef = { id: 'generated-doc-id' };
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
  });

  describe('createUnit — battalionId assignment', () => {
    it('sets battalionId to its own ID when creating a battalion', async () => {
      capturedDocRef = { id: 'new-battalion-id' };
      const { result } = renderHook(() => useUnitsManagement());

      await act(async () => {
        await result.current.createUnit({
          name: 'Bravo Battalion',
          unit_type: 'battalion',
        });
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const [, data] = mockSetDoc.mock.calls[0];
      expect(data.battalionId).toBe('new-battalion-id'); // self-reference
      expect(data.unitType).toBe('battalion');
    });

    it('inherits battalionId from parent when creating a company under a battalion', async () => {
      capturedDocRef = { id: 'new-company-id' };
      const { result } = renderHook(() => useUnitsManagement());

      await act(async () => {
        await result.current.createUnit({
          name: 'Bravo Company',
          unit_type: 'company',
          parent_id: BATTALION_ID,
        });
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const [, data] = mockSetDoc.mock.calls[0];
      expect(data.battalionId).toBe(BATTALION_ID); // inherited from battalion
      expect(data.unitType).toBe('company');
      expect(data.parentId).toBe(BATTALION_ID);
    });

    it('inherits battalionId from grandparent when creating a platoon under a company', async () => {
      capturedDocRef = { id: 'new-platoon-id' };
      const { result } = renderHook(() => useUnitsManagement());

      await act(async () => {
        await result.current.createUnit({
          name: 'First Platoon',
          unit_type: 'platoon',
          parent_id: COMPANY_ID,
        });
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const [, data] = mockSetDoc.mock.calls[0];
      expect(data.battalionId).toBe(BATTALION_ID); // traversed up: company → battalion
      expect(data.unitType).toBe('platoon');
    });

    it('sets battalionId to null when parent is unknown', async () => {
      capturedDocRef = { id: 'orphan-unit-id' };
      const { result } = renderHook(() => useUnitsManagement());

      await act(async () => {
        await result.current.createUnit({
          name: 'Orphan Company',
          unit_type: 'company',
          parent_id: 'nonexistent-parent-id',
        });
      });

      const [, data] = mockSetDoc.mock.calls[0];
      expect(data.battalionId).toBeNull();
    });
  });

  describe('updateUnit', () => {
    it('calls updateDoc with the correct field mapping', async () => {
      const { result } = renderHook(() => useUnitsManagement());

      await act(async () => {
        await result.current.updateUnit(BATTALION_ID, { name: 'Renamed Battalion' });
      });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const [, data] = mockUpdateDoc.mock.calls[0];
      expect(data.name).toBe('Renamed Battalion');
    });
  });
});
