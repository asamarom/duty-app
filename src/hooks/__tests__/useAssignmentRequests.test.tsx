import { renderHook, waitFor, act } from '@testing-library/react';
import { useAssignmentRequests } from '../useAssignmentRequests';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Firestore mocks ──────────────────────────────────────────────────────────
// writeBatch mock: returns an object with update/set/delete/commit spies.
// Each test that needs to inspect batch calls should grab the return value from
// the mock and assert on its methods.
const mockBatchUpdate = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

const mockWriteBatch = vi.fn((..._args: unknown[]) => ({
    update: mockBatchUpdate,
    set: mockBatchSet,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
}));

const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn((...args: unknown[]) => { const segs = args.slice(1) as string[]; return { id: segs[segs.length - 1] ?? 'mock-doc-id', path: segs.join('/') }; });
const mockCollection = vi.fn((...args: unknown[]) => ({ id: args[1] as string }));
const mockQuery = vi.fn((...args: unknown[]) => args[0]);
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockGetDoc = vi.fn();
const mockServerTimestamp = vi.fn().mockReturnValue('SERVER_TIMESTAMP');
const mockOnSnapshot = vi.fn();

vi.mock('firebase/firestore', () => ({
    collection: (...args: unknown[]) => mockCollection(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    addDoc: (...args: unknown[]) => mockAddDoc(...args),
    updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
    writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
    doc: (...args: unknown[]) => mockDoc(...args),
    query: (...args: unknown[]) => mockQuery(...args),
    orderBy: (...args: unknown[]) => mockOrderBy(...args),
    where: (...args: unknown[]) => mockWhere(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    serverTimestamp: () => mockServerTimestamp(),
    onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

// ─── Firebase functions mock ──────────────────────────────────────────────────
const mockHttpsCallable = vi.fn();

vi.mock('firebase/functions', () => ({
    httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
    functions: {},
}));

// ─── useEffectiveRole mock ────────────────────────────────────────────────────
vi.mock('@/hooks/useEffectiveRole', () => ({
    useEffectiveRole: vi.fn(() => ({
        isAdmin: true,
        isLeader: false,
        loading: false,
    })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** An empty Firestore query snapshot */
const emptySnapshot = { docs: [] };

/**
 * Build a minimal AssignmentRequestDoc snapshot document.
 * Only the fields that the hook reads are populated.
 */
function makeRequestDoc(overrides: Record<string, unknown> = {}) {
    const data = {
        equipmentId: 'equip-1',
        status: 'pending',
        requestedBy: 'user-99',
        requestedAt: { toDate: () => new Date('2025-01-01') },
        fromUnitType: 'battalion',
        toUnitType: 'individual',
        toPersonnelId: 'pers-1',
        recipientApproved: false,
        ...overrides,
    };
    return {
        id: 'req-1',
        data: () => data,
        ref: { id: 'req-1', path: 'assignmentRequests/req-1' },
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAssignmentRequests Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: onSnapshot immediately fires with an empty snapshot
        mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snap: unknown) => void) => {
            onNext({ docs: [] });
            return () => {}; // unsubscribe no-op
        });
        // Default: all getDocs queries (enrichment fetches) return empty snapshots
        mockGetDocs.mockResolvedValue(emptySnapshot);
        mockGetDoc.mockResolvedValue({ exists: () => false });
        mockAddDoc.mockResolvedValue({ id: 'new-doc-id' });
        mockUpdateDoc.mockResolvedValue(undefined);
        // Re-apply the batch mock default after clearAllMocks
        mockWriteBatch.mockReturnValue({
            update: mockBatchUpdate,
            set: mockBatchSet,
            delete: mockBatchDelete,
            commit: mockBatchCommit,
        });
        mockBatchCommit.mockResolvedValue(undefined);
        // httpsCallable default: returns a no-op callable
        mockHttpsCallable.mockReturnValue(vi.fn().mockResolvedValue({ data: { success: true } }));
    });

    // =========================================================================
    // fetchRequests — basic smoke test
    // =========================================================================

    it('loads with empty requests when Firestore returns empty snapshot', async () => {
        const { result } = renderHook(() => useAssignmentRequests());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.requests).toHaveLength(0);
        expect(result.current.error).toBeNull();
    });

    // =========================================================================
    // TDD RED PHASE: approveRequest — client-side batch operations
    // These tests will FAIL until the hook replaces httpsCallable(processTransfer)
    // with direct Firestore batch writes.
    // =========================================================================

    describe('approveRequest — client-side batch (TDD red phase)', () => {
        it('approveRequest updates request status to approved via batch', async () => {
            // Seed the hook with one pending request so we have context
            mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snap: unknown) => void) => {
                onNext({ docs: [makeRequestDoc()] });
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            // getDocs call inside approveRequest: find old assignment
            mockGetDocs.mockResolvedValue(emptySnapshot);

            await act(async () => {
                await result.current.approveRequest('req-1');
            });

            // The batch must have been committed
            expect(mockBatchCommit).toHaveBeenCalled();

            // batch.update should have been called on the request ref with status:'approved'
            expect(mockBatchUpdate).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ status: 'approved' })
            );
        });

        it('approveRequest marks old assignment returnedAt via batch', async () => {
            mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snap: unknown) => void) => {
                onNext({ docs: [makeRequestDoc()] });
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            // Simulate one active assignment returned by the inner query
            const oldAssignmentDoc = {
                id: 'assign-old-1',
                ref: { id: 'assign-old-1', path: 'equipmentAssignments/assign-old-1' },
                data: () => ({ equipmentId: 'equip-1', returnedAt: null }),
            };
            mockGetDocs.mockResolvedValueOnce({ docs: [oldAssignmentDoc] });

            await act(async () => {
                await result.current.approveRequest('req-1');
            });

            // One of the batch.update calls should set returnedAt
            const returnedAtCall = mockBatchUpdate.mock.calls.find((call) =>
                call[1] && 'returnedAt' in call[1]
            );
            expect(returnedAtCall).toBeDefined();
        });

        it('approveRequest creates new equipmentAssignment via batch.set', async () => {
            mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snap: unknown) => void) => {
                onNext({ docs: [makeRequestDoc()] });
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            mockGetDocs.mockResolvedValue(emptySnapshot);

            await act(async () => {
                await result.current.approveRequest('req-1');
            });

            // batch.set should have been called to create the new assignment
            expect(mockBatchSet).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    equipmentId: 'equip-1',
                })
            );
        });

        it('approveRequest sets equipment status to assigned via batch', async () => {
            mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snap: unknown) => void) => {
                onNext({ docs: [makeRequestDoc()] });
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            mockGetDocs.mockResolvedValue(emptySnapshot);

            await act(async () => {
                await result.current.approveRequest('req-1');
            });

            // One of the batch.update calls must set equipment status:'assigned'
            const assignedCall = mockBatchUpdate.mock.calls.find((call) =>
                call[1] && call[1].status === 'assigned'
            );
            expect(assignedCall).toBeDefined();
        });
    });

    // =========================================================================
    // TDD RED PHASE: rejectRequest — client-side batch operations
    // =========================================================================

    describe('rejectRequest — client-side batch (TDD red phase)', () => {
        it('rejectRequest updates request status to rejected via batch', async () => {
            mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snap: unknown) => void) => {
                onNext({ docs: [makeRequestDoc()] });
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.rejectRequest('req-1');
            });

            expect(mockBatchCommit).toHaveBeenCalled();
            expect(mockBatchUpdate).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ status: 'rejected' })
            );
        });

        it('rejectRequest sets equipment status to serviceable (not available)', async () => {
            // NOTE: The Cloud Function (incorrectly) sets status:'available' on rejection,
            // but the Firestore rules do NOT allow 'available' as a valid status.
            // The client-side implementation must use 'serviceable' instead.
            mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snap: unknown) => void) => {
                onNext({ docs: [makeRequestDoc()] });
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.rejectRequest('req-1');
            });

            // Must use 'serviceable', never 'available'
            const serviceableCall = mockBatchUpdate.mock.calls.find((call) =>
                call[1] && call[1].status === 'serviceable'
            );
            expect(serviceableCall).toBeDefined();

            const availableCall = mockBatchUpdate.mock.calls.find((call) =>
                call[1] && call[1].status === 'available'
            );
            expect(availableCall).toBeUndefined();
        });
    });

    // =========================================================================
    // TDD RED PHASE: createRequest — direct addDoc (replaces initiateTransfer CF)
    // =========================================================================

    describe('createRequest — direct addDoc (TDD red phase)', () => {
        it('createRequest adds doc to assignmentRequests collection', async () => {
            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.createRequest({
                    equipmentId: 'equip-7',
                    toPersonnelId: 'pers-55',
                    notes: 'urgent request',
                });
            });

            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    equipmentId: 'equip-7',
                    toPersonnelId: 'pers-55',
                    status: 'pending',
                    requestedBy: 'test-user-id',
                })
            );
        });
    });

    // =========================================================================
    // TDD RED PHASE: none of the above call httpsCallable
    // =========================================================================

    describe('httpsCallable is never used (TDD red phase)', () => {
        it('approveRequest does NOT call httpsCallable', async () => {
            mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snap: unknown) => void) => {
                onNext({ docs: [makeRequestDoc()] });
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            mockHttpsCallable.mockClear();
            mockGetDocs.mockResolvedValue(emptySnapshot);

            await act(async () => {
                await result.current.approveRequest('req-1');
            });

            expect(mockHttpsCallable).not.toHaveBeenCalled();
        });

        it('rejectRequest does NOT call httpsCallable', async () => {
            mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snap: unknown) => void) => {
                onNext({ docs: [makeRequestDoc()] });
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            mockHttpsCallable.mockClear();

            await act(async () => {
                await result.current.rejectRequest('req-1');
            });

            expect(mockHttpsCallable).not.toHaveBeenCalled();
        });

        it('createRequest does NOT call httpsCallable', async () => {
            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            mockHttpsCallable.mockClear();

            await act(async () => {
                await result.current.createRequest({ equipmentId: 'equip-8' });
            });

            expect(mockHttpsCallable).not.toHaveBeenCalled();
        });
    });
});
