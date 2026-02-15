import { renderHook, waitFor } from '@testing-library/react';
import { useCanManageRole } from '../useCanManageRole';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Firestore mocks ──────────────────────────────────────────────────────────
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockCollection = vi.fn((...args: unknown[]) => ({ id: args[1] as string }));
const mockDoc = vi.fn((...args: unknown[]) => { const segs = args.slice(1) as string[]; return { id: segs[segs.length - 1] ?? 'mock-doc-id' }; });
const mockQuery = vi.fn((...args: unknown[]) => args[0]);
const mockWhere = vi.fn();

vi.mock('firebase/firestore', () => ({
    collection: (...args: unknown[]) => mockCollection(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    doc: (...args: unknown[]) => mockDoc(...args),
    query: (...args: unknown[]) => mockQuery(...args),
    where: (...args: unknown[]) => mockWhere(...args),
    orderBy: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    serverTimestamp: vi.fn(),
}));

// ─── Firebase functions mock ──────────────────────────────────────────────────
const mockHttpsCallable = vi.fn();

vi.mock('firebase/functions', () => ({
    httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
    functions: {},
}));

// ─── useEffectiveRole mock ────────────────────────────────────────────────────
// Default: isAdmin=true so most tests require explicit override for non-admin cases.
const mockUseEffectiveRole = vi.fn(() => ({
    isAdmin: true,
    isLeader: false,
    isActualAdmin: true,
    loading: false,
    roles: ['admin'],
}));

vi.mock('@/hooks/useEffectiveRole', () => ({
    useEffectiveRole: () => mockUseEffectiveRole(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal adminUnitAssignment document snapshot entry */
function makeAdminUnitAssignmentDoc(unitId: string) {
    return {
        id: `assign-${unitId}`,
        data: () => ({ userId: 'test-user-id', unitId }),
    };
}

/** Build a minimal personnel document snapshot */
function makePersonnelDoc(unitId: string | undefined) {
    return {
        exists: () => true,
        data: () => ({ firstName: 'John', lastName: 'Doe', unitId }),
    };
}

/** Build a minimal unit document snapshot */
function makeUnitDoc(id: string, parentId?: string) {
    return {
        exists: () => true,
        data: () => ({ name: `Unit ${id}`, unitType: 'company', parentId }),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCanManageRole Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default Firestore responses
        mockGetDocs.mockResolvedValue({ docs: [] });
        mockGetDoc.mockResolvedValue({ exists: () => false });
        // Re-apply httpsCallable default
        mockHttpsCallable.mockReturnValue(vi.fn().mockResolvedValue({ data: { canManage: true } }));
        // Default role: admin
        mockUseEffectiveRole.mockReturnValue({
            isAdmin: true,
            isLeader: false,
            isActualAdmin: true,
            loading: false,
            roles: ['admin'],
        });
    });

    // =========================================================================
    // TDD RED PHASE — all tests assert the NEW client-side behaviour.
    // Tests will FAIL until useCanManageRole.tsx replaces httpsCallable with
    // direct Firestore queries.
    // =========================================================================

    it('returns canManage:true for admin immediately without Firestore query', async () => {
        // isAdmin = true (default mock)
        const { result } = renderHook(() => useCanManageRole('pers-1'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.canManage).toBe(true);

        // Admin short-circuits — no Firestore read should be needed at all
        // (neither getDocs nor getDoc for personnel/units)
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it('returns canManage:false for non-leader', async () => {
        mockUseEffectiveRole.mockReturnValue({
            isAdmin: false,
            isLeader: false,
            isActualAdmin: false,
            loading: false,
            roles: ['user'],
        });

        const { result } = renderHook(() => useCanManageRole('pers-1'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.canManage).toBe(false);

        // Non-leader short-circuits — no Firestore query needed
        expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('queries adminUnitAssignments for leader and checks unit ancestry', async () => {
        mockUseEffectiveRole.mockReturnValue({
            isAdmin: false,
            isLeader: true,
            isActualAdmin: false,
            loading: false,
            roles: ['leader'],
        });

        // Personnel belongs to unit-2, leader manages unit-1
        mockGetDoc.mockResolvedValueOnce(makePersonnelDoc('unit-2'));
        // unit-2 has no parent → ancestry chain is just ['unit-2']
        mockGetDoc.mockResolvedValueOnce(makeUnitDoc('unit-2', undefined));

        // Leader assigned to unit-1 only
        mockGetDocs.mockResolvedValueOnce({
            docs: [makeAdminUnitAssignmentDoc('unit-1')],
        });

        const { result } = renderHook(() => useCanManageRole('pers-99'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        // The hook must query adminUnitAssignments
        expect(mockGetDocs).toHaveBeenCalled();
    });

    it('returns canManage:true when leader manages an ancestor unit of the personnel unit', async () => {
        mockUseEffectiveRole.mockReturnValue({
            isAdmin: false,
            isLeader: true,
            isActualAdmin: false,
            loading: false,
            roles: ['leader'],
        });

        // Personnel is in unit-child
        mockGetDoc.mockResolvedValueOnce(makePersonnelDoc('unit-child'));
        // unit-child → parent is unit-parent (ancestor)
        mockGetDoc.mockResolvedValueOnce(makeUnitDoc('unit-child', 'unit-parent'));
        // unit-parent has no further parent
        mockGetDoc.mockResolvedValueOnce(makeUnitDoc('unit-parent', undefined));

        // Leader manages unit-parent
        mockGetDocs.mockResolvedValueOnce({
            docs: [makeAdminUnitAssignmentDoc('unit-parent')],
        });

        const { result } = renderHook(() => useCanManageRole('pers-5'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.canManage).toBe(true);
    });

    it('returns canManage:false when leader does not manage personnel unit or ancestors', async () => {
        mockUseEffectiveRole.mockReturnValue({
            isAdmin: false,
            isLeader: true,
            isActualAdmin: false,
            loading: false,
            roles: ['leader'],
        });

        // Personnel is in unit-x (no ancestors)
        mockGetDoc.mockResolvedValueOnce(makePersonnelDoc('unit-x'));
        mockGetDoc.mockResolvedValueOnce(makeUnitDoc('unit-x', undefined));

        // Leader manages unit-y (completely different branch)
        mockGetDocs.mockResolvedValueOnce({
            docs: [makeAdminUnitAssignmentDoc('unit-y')],
        });

        const { result } = renderHook(() => useCanManageRole('pers-6'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.canManage).toBe(false);
    });

    // =========================================================================
    // TDD RED PHASE: httpsCallable must NEVER be called by the new implementation
    // =========================================================================

    describe('httpsCallable is never used (TDD red phase)', () => {
        it('does NOT call httpsCallable when user is admin', async () => {
            // isAdmin = true (default mock)
            const { result } = renderHook(() => useCanManageRole('pers-1'));
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(mockHttpsCallable).not.toHaveBeenCalled();
        });

        it('does NOT call httpsCallable when user is non-leader', async () => {
            mockUseEffectiveRole.mockReturnValue({
                isAdmin: false,
                isLeader: false,
                isActualAdmin: false,
                loading: false,
                roles: [],
            });

            const { result } = renderHook(() => useCanManageRole('pers-1'));
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(mockHttpsCallable).not.toHaveBeenCalled();
        });

        it('does NOT call httpsCallable when user is leader (uses Firestore instead)', async () => {
            mockUseEffectiveRole.mockReturnValue({
                isAdmin: false,
                isLeader: true,
                isActualAdmin: false,
                loading: false,
                roles: ['leader'],
            });

            // Personnel exists in unit-z
            mockGetDoc.mockResolvedValueOnce(makePersonnelDoc('unit-z'));
            mockGetDoc.mockResolvedValueOnce(makeUnitDoc('unit-z', undefined));
            mockGetDocs.mockResolvedValueOnce({ docs: [makeAdminUnitAssignmentDoc('unit-z')] });

            const { result } = renderHook(() => useCanManageRole('pers-7'));
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(mockHttpsCallable).not.toHaveBeenCalled();
        });
    });
});
