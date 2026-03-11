import { renderHook, act } from '@testing-library/react';
import { useUnitsManagement } from '../useUnitsManagement';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks ────────────────────────────────────────────────────────────

const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDoc = vi.fn();
let capturedDocRef: { id: string } = { id: 'generated-doc-id' };

vi.mock('firebase/firestore', () => ({
  collection: vi.fn().mockReturnValue('mocked-collection'),
  doc: vi.fn(() => capturedDocRef),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
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
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });
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

    it('updates all unit fields when provided', async () => {
      const { result } = renderHook(() => useUnitsManagement());

      await act(async () => {
        await result.current.updateUnit(COMPANY_ID, {
          name: 'Updated Company',
          unit_type: 'company',
          parent_id: BATTALION_ID,
          designation: 'Alpha',
          status: 'deployed',
        });
      });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const [, data] = mockUpdateDoc.mock.calls[0];
      expect(data.name).toBe('Updated Company');
      expect(data.unitType).toBe('company');
      expect(data.parentId).toBe(BATTALION_ID);
      expect(data.designation).toBe('Alpha');
      expect(data.status).toBe('deployed');
    });

    it('handles Firestore error and returns false', async () => {
      const error = new Error('Firestore update failed');
      mockUpdateDoc.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUnitsManagement());

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateUnit(BATTALION_ID, { name: 'Test' });
      });

      expect(updateResult).toBe(false);
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    it('updates user record when leader_id is assigned and user exists', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
      });

      const { result } = renderHook(() => useUnitsManagement());

      await act(async () => {
        await result.current.updateUnit(COMPANY_ID, { leader_id: 'user-123' });
      });

      // Should call updateDoc twice: once for unit, once for user
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);

      // First call is for the unit
      const [unitDocRef, unitData] = mockUpdateDoc.mock.calls[0];
      expect(unitData.leaderId).toBe('user-123');

      // Second call is for the user record
      const [userDocRef, userData] = mockUpdateDoc.mock.calls[1];
      expect(userData).toHaveProperty('unitId', COMPANY_ID);
      expect(userData).toHaveProperty('battalionId', BATTALION_ID);
    });

    it('updates user record without battalionId when unit has no battalion', async () => {
      const orphanUnitId = 'orphan-unit-id';

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
      });

      const { result } = renderHook(() => useUnitsManagement());

      await act(async () => {
        await result.current.updateUnit(orphanUnitId, { leader_id: 'user-456' });
      });

      // Should call updateDoc twice: once for unit, once for user
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);

      // Second call is for the user record
      const [, userData] = mockUpdateDoc.mock.calls[1];
      expect(userData).toHaveProperty('unitId', orphanUnitId);
      // battalionId should not be set when findBattalionId returns null
      expect(userData).not.toHaveProperty('battalionId');
    });

    it('warns when leader user does not exist', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const { result } = renderHook(() => useUnitsManagement());

      await act(async () => {
        await result.current.updateUnit(COMPANY_ID, { leader_id: 'nonexistent-user' });
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[useUnitsManagement] Leader user not found:',
        'nonexistent-user'
      );

      consoleWarnSpy.mockRestore();
    });

    it('handles user record update error gracefully without failing unit update', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
      });

      const userUpdateError = new Error('User update failed');
      mockUpdateDoc
        .mockResolvedValueOnce(undefined) // First call for unit succeeds
        .mockRejectedValueOnce(userUpdateError); // Second call for user fails

      const { result } = renderHook(() => useUnitsManagement());

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateUnit(COMPANY_ID, { leader_id: 'user-123' });
      });

      // Unit update should still succeed
      expect(updateResult).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useUnitsManagement] Failed to update user record for leader',
        userUpdateError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteUnit', () => {
    it('successfully deletes a unit', async () => {
      const { result } = renderHook(() => useUnitsManagement());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteUnit(BATTALION_ID);
      });

      expect(deleteResult).toBe(true);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });

    it('handles Firestore error and returns false', async () => {
      const error = new Error('Firestore delete failed');
      mockDeleteDoc.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUnitsManagement());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteUnit(BATTALION_ID);
      });

      expect(deleteResult).toBe(false);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('createUnit error handling', () => {
    it('handles Firestore error and returns null', async () => {
      const error = new Error('Firestore setDoc failed');
      mockSetDoc.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUnitsManagement());

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createUnit({
          name: 'Test Battalion',
          unit_type: 'battalion',
        });
      });

      expect(createResult).toBeNull();
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });
  });
});
