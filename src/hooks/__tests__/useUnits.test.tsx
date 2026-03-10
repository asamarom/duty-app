import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUnits } from '../useUnits';
import type { Unit } from '../useUnits';

// ── Firebase mocks ────────────────────────────────────────────────────────────

const mockOnSnapshot = vi.fn();
const mockDocs = [] as Array<{ id: string; data: () => unknown }>;

vi.mock('firebase/firestore', () => ({
  collection: vi.fn().mockReturnValue('mocked-collection'),
  query: vi.fn().mockReturnValue('mocked-query'),
  orderBy: vi.fn().mockReturnValue('mocked-orderBy'),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock('@/integrations/firebase/client', () => ({
  db: {},
}));

// ── Helper to mock Firestore units ───────────────────────────────────────────

const createMockUnit = (overrides: Partial<Unit>): Unit => ({
  id: 'unit-id',
  name: 'Test Unit',
  unit_type: 'battalion',
  parent_id: null,
  designation: null,
  leader_id: null,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useUnits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocs.length = 0;
  });

  const setupMockSnapshot = (units: Unit[]) => {
    const docs = units.map((unit) => ({
      id: unit.id,
      data: () => ({
        name: unit.name,
        unitType: unit.unit_type,
        parentId: unit.parent_id,
        designation: unit.designation,
        leaderId: unit.leader_id,
        status: unit.status,
        createdAt: { toDate: () => new Date(unit.created_at) },
        updatedAt: { toDate: () => new Date(unit.updated_at) },
      }),
    }));

    mockOnSnapshot.mockImplementation((query, onNext) => {
      // Call onNext with snapshot immediately
      onNext({ docs });
      // Return unsubscribe function
      return vi.fn();
    });
  };

  describe('Initialization and Loading', () => {
    it('loads units from Firestore on mount', async () => {
      const testUnits = [
        createMockUnit({ id: 'battalion-1', name: 'Alpha Battalion', unit_type: 'battalion' }),
        createMockUnit({ id: 'company-1', name: 'Alpha Company', unit_type: 'company', parent_id: 'battalion-1' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.units).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });

    it('handles Firestore errors', async () => {
      const testError = new Error('Firestore connection failed');

      mockOnSnapshot.mockImplementation((query, onNext, onError) => {
        // Call onError immediately
        onError(testError);
        // Return unsubscribe function
        return vi.fn();
      });

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.units).toHaveLength(0);
    });
  });

  describe('Unit Filtering by Type', () => {
    it('filters battalions correctly', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion' }),
        createMockUnit({ id: 'bat-2', name: 'Battalion 2', unit_type: 'battalion' }),
        createMockUnit({ id: 'comp-1', name: 'Company 1', unit_type: 'company', parent_id: 'bat-1' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.battalions).toHaveLength(2);
      expect(result.current.battalions.every((u) => u.unit_type === 'battalion')).toBe(true);
    });

    it('filters companies correctly', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion' }),
        createMockUnit({ id: 'comp-1', name: 'Company 1', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'comp-2', name: 'Company 2', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'plat-1', name: 'Platoon 1', unit_type: 'platoon', parent_id: 'comp-1' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.companies).toHaveLength(2);
      expect(result.current.companies.every((u) => u.unit_type === 'company')).toBe(true);
    });

    it('filters platoons correctly', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion' }),
        createMockUnit({ id: 'comp-1', name: 'Company 1', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'plat-1', name: 'Platoon 1', unit_type: 'platoon', parent_id: 'comp-1' }),
        createMockUnit({ id: 'plat-2', name: 'Platoon 2', unit_type: 'platoon', parent_id: 'comp-1' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.platoons).toHaveLength(2);
      expect(result.current.platoons.every((u) => u.unit_type === 'platoon')).toBe(true);
    });
  });

  describe('getUnitById', () => {
    it('returns unit when ID exists', async () => {
      const testUnits = [
        createMockUnit({ id: 'unit-123', name: 'Test Unit' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const unit = result.current.getUnitById('unit-123');
      expect(unit).toBeDefined();
      expect(unit?.name).toBe('Test Unit');
    });

    it('returns undefined when ID does not exist', async () => {
      const testUnits = [
        createMockUnit({ id: 'unit-123', name: 'Test Unit' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const unit = result.current.getUnitById('non-existent-id');
      expect(unit).toBeUndefined();
    });
  });

  describe('getChildUnits', () => {
    it('returns all direct children of a unit', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion' }),
        createMockUnit({ id: 'comp-1', name: 'Company 1', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'comp-2', name: 'Company 2', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'comp-3', name: 'Company 3', unit_type: 'company', parent_id: 'bat-2' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const children = result.current.getChildUnits('bat-1');
      expect(children).toHaveLength(2);
      expect(children.every((c) => c.parent_id === 'bat-1')).toBe(true);
    });

    it('returns empty array when unit has no children', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const children = result.current.getChildUnits('bat-1');
      expect(children).toHaveLength(0);
    });
  });

  describe('getUnitAncestors', () => {
    it('returns ancestors in order from closest to farthest', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion', parent_id: null }),
        createMockUnit({ id: 'comp-1', name: 'Company 1', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'plat-1', name: 'Platoon 1', unit_type: 'platoon', parent_id: 'comp-1' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const ancestors = result.current.getUnitAncestors('plat-1');
      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].id).toBe('comp-1'); // Closest ancestor first
      expect(ancestors[1].id).toBe('bat-1');
    });

    it('returns empty array for top-level unit with no parents', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion', parent_id: null }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const ancestors = result.current.getUnitAncestors('bat-1');
      expect(ancestors).toHaveLength(0);
    });
  });

  describe('getUnitPath', () => {
    it('returns hierarchical path for nested unit', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Alpha Battalion', unit_type: 'battalion', parent_id: null }),
        createMockUnit({ id: 'comp-1', name: 'Bravo Company', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'plat-1', name: 'Charlie Platoon', unit_type: 'platoon', parent_id: 'comp-1' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const path = result.current.getUnitPath('plat-1');
      expect(path).toBe('Alpha Battalion > Bravo Company > Charlie Platoon');
    });

    it('returns just unit name for top-level unit', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Alpha Battalion', unit_type: 'battalion', parent_id: null }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const path = result.current.getUnitPath('bat-1');
      expect(path).toBe('Alpha Battalion');
    });

    it('returns empty string for non-existent unit', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const path = result.current.getUnitPath('non-existent');
      expect(path).toBe('');
    });
  });

  describe('buildUnitTree', () => {
    it('builds hierarchical tree from flat unit list', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion', parent_id: null }),
        createMockUnit({ id: 'comp-1', name: 'Company 1', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'comp-2', name: 'Company 2', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'plat-1', name: 'Platoon 1', unit_type: 'platoon', parent_id: 'comp-1' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const tree = result.current.buildUnitTree();

      expect(tree).toHaveLength(1); // 1 root battalion
      expect(tree[0].id).toBe('bat-1');
      expect(tree[0].children).toHaveLength(2); // 2 companies
      expect(tree[0].children[0].children).toHaveLength(1); // 1 platoon under first company
    });

    it('handles multiple root units', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion', parent_id: null }),
        createMockUnit({ id: 'bat-2', name: 'Battalion 2', unit_type: 'battalion', parent_id: null }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const tree = result.current.buildUnitTree();
      expect(tree).toHaveLength(2);
    });
  });

  describe('getCompaniesForBattalion', () => {
    it('returns only companies under specified battalion', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion' }),
        createMockUnit({ id: 'bat-2', name: 'Battalion 2', unit_type: 'battalion' }),
        createMockUnit({ id: 'comp-1', name: 'Company 1', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'comp-2', name: 'Company 2', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'comp-3', name: 'Company 3', unit_type: 'company', parent_id: 'bat-2' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const companies = result.current.getCompaniesForBattalion('bat-1');
      expect(companies).toHaveLength(2);
      expect(companies.every((c) => c.parent_id === 'bat-1')).toBe(true);
      expect(companies.every((c) => c.unit_type === 'company')).toBe(true);
    });

    it('returns empty array for battalion with no companies', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const companies = result.current.getCompaniesForBattalion('bat-1');
      expect(companies).toHaveLength(0);
    });
  });

  describe('getPlatoonsForCompany', () => {
    it('returns only platoons under specified company', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion' }),
        createMockUnit({ id: 'comp-1', name: 'Company 1', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'comp-2', name: 'Company 2', unit_type: 'company', parent_id: 'bat-1' }),
        createMockUnit({ id: 'plat-1', name: 'Platoon 1', unit_type: 'platoon', parent_id: 'comp-1' }),
        createMockUnit({ id: 'plat-2', name: 'Platoon 2', unit_type: 'platoon', parent_id: 'comp-1' }),
        createMockUnit({ id: 'plat-3', name: 'Platoon 3', unit_type: 'platoon', parent_id: 'comp-2' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const platoons = result.current.getPlatoonsForCompany('comp-1');
      expect(platoons).toHaveLength(2);
      expect(platoons.every((p) => p.parent_id === 'comp-1')).toBe(true);
      expect(platoons.every((p) => p.unit_type === 'platoon')).toBe(true);
    });

    it('returns empty array for company with no platoons', async () => {
      const testUnits = [
        createMockUnit({ id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion' }),
        createMockUnit({ id: 'comp-1', name: 'Company 1', unit_type: 'company', parent_id: 'bat-1' }),
      ];

      setupMockSnapshot(testUnits);

      const { result } = renderHook(() => useUnits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const platoons = result.current.getPlatoonsForCompany('comp-1');
      expect(platoons).toHaveLength(0);
    });
  });
});
