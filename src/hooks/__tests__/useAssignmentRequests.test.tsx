import { renderHook, waitFor, act } from '@testing-library/react';
import { useAssignmentRequests, _resetCacheForTesting } from '../useAssignmentRequests';
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
const mockDoc = vi.fn((...args: unknown[]) => {
    const segs = args.slice(1) as string[];
    const path = segs.join('/');
    return {
        id: segs[segs.length - 1] ?? 'mock-doc-id',
        path,
        // Mark as doc ref for onSnapshot mock detection
        _isDocRef: true,
    };
});
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

// ─── useUserBattalion and useUserRole mocks ───────────────────────────────────
vi.mock('@/hooks/useUserBattalion', () => ({
    useUserBattalion: vi.fn(() => ({
        battalionId: 'battalion-test',
        unitId: 'unit-test',
        loading: false,
    })),
}));

vi.mock('@/hooks/useUserRole', () => ({
    useUserRole: vi.fn(() => ({
        isAdmin: true,
        isLeader: false,
        loading: false,
        roles: ['admin'],
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

/**
 * Helper to create onSnapshot mock that handles both doc refs and query refs.
 * - Doc refs (users collection): returns DocumentSnapshot
 * - Query refs (assignmentRequests): returns QuerySnapshot with provided docs
 */
function makeOnSnapshotMock(queryDocs: unknown[] = []) {
    return (ref: unknown, onNext: (snap: unknown) => void) => {
        const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
        const refPath = (ref as { path?: string }).path;

        if (isDocRef && refPath?.startsWith('users/')) {
            // Return DocumentSnapshot for user doc
            onNext({
                exists: () => true,
                id: 'test-user-id',
                data: () => ({ unitId: null, roles: ['user'] }),
            });
        } else {
            // Return QuerySnapshot for assignment requests query
            onNext({ docs: queryDocs });
        }
        return () => {}; // unsubscribe no-op
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAssignmentRequests Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the module-level cache so each test starts with a clean slate
        // and the hook always starts with loading:true (not pre-populated state).
        _resetCacheForTesting();
        // Default: onSnapshot immediately fires with appropriate snapshot based on the ref type
        mockOnSnapshot.mockImplementation(makeOnSnapshotMock([]));
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
        mockOnSnapshot.mockImplementation(makeOnSnapshotMock([]));
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
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([makeRequestDoc()]));

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
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([makeRequestDoc()]));

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
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([makeRequestDoc()]));

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
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([makeRequestDoc()]));

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
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([makeRequestDoc()]));

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
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([makeRequestDoc()]));

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
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([makeRequestDoc()]));

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
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([makeRequestDoc()]));

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

    // =========================================================================
    // Error handling and edge cases
    // =========================================================================

    describe('Error handling', () => {
        it('handles Firestore errors in onSnapshot', async () => {
            const testError = new Error('Firestore connection failed');

            mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void, onError?: (err: Error) => void) => {
                const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
                const refPath = (ref as { path?: string }).path;

                if (isDocRef && refPath?.startsWith('users/')) {
                    // User doc subscription succeeds
                    onNext({
                        exists: () => true,
                        id: 'test-user-id',
                        data: () => ({ unitId: null, roles: ['user'] }),
                    });
                } else {
                    // Assignment requests query fails
                    if (onError) {
                        onError(testError);
                    }
                }
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());

            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.error).toBe(testError);
            expect(result.current.requests).toHaveLength(0);
            expect(result.current.incomingTransfers).toHaveLength(0);
            expect(result.current.outgoingTransfers).toHaveLength(0);
        });

        it('handles errors during mapSnapshot processing', async () => {
            const badDoc = {
                id: 'bad-req-1',
                data: () => {
                    throw new Error('Data parsing failed');
                },
                ref: { id: 'bad-req-1', path: 'assignmentRequests/bad-req-1' },
            };

            mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void) => {
                const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
                const refPath = (ref as { path?: string }).path;

                if (isDocRef && refPath?.startsWith('users/')) {
                    onNext({
                        exists: () => true,
                        id: 'test-user-id',
                        data: () => ({ unitId: null, roles: ['user'] }),
                    });
                } else {
                    onNext({ docs: [badDoc] });
                }
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());

            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.error).toBeTruthy();
            expect(result.current.requests).toHaveLength(0);
        });

        it('throws error when approving non-existent request', async () => {
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([]));

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await expect(async () => {
                await act(async () => {
                    await result.current.approveRequest('non-existent-id');
                });
            }).rejects.toThrow('Assignment request non-existent-id not found');
        });

        it('throws error when rejecting non-existent request', async () => {
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([]));

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await expect(async () => {
                await act(async () => {
                    await result.current.rejectRequest('non-existent-id');
                });
            }).rejects.toThrow('Assignment request non-existent-id not found');
        });

        it('throws error when canceling non-existent request', async () => {
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([]));

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await expect(async () => {
                await act(async () => {
                    await result.current.cancelRequest('non-existent-id');
                });
            }).rejects.toThrow('Assignment request non-existent-id not found');
        });
    });

    // =========================================================================
    // cancelRequest functionality
    // =========================================================================

    describe('cancelRequest', () => {
        it('cancels request when user is the original requester', async () => {
            const requestDoc = makeRequestDoc({
                requestedBy: 'test-user-id',
            });
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([requestDoc]));

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.cancelRequest('req-1');
            });

            expect(mockBatchCommit).toHaveBeenCalled();
            expect(mockBatchUpdate).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ status: 'rejected' })
            );
        });

        it('throws error when non-requester tries to cancel', async () => {
            const requestDoc = makeRequestDoc({
                requestedBy: 'other-user-id',
            });
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([requestDoc]));

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await expect(async () => {
                await act(async () => {
                    await result.current.cancelRequest('req-1');
                });
            }).rejects.toThrow('Only the requester can cancel');
        });

        it('resets equipment status to serviceable on cancel', async () => {
            const requestDoc = makeRequestDoc({
                requestedBy: 'test-user-id',
            });
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([requestDoc]));

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.cancelRequest('req-1');
            });

            const serviceableCall = mockBatchUpdate.mock.calls.find((call) =>
                call[1] && call[1].status === 'serviceable'
            );
            expect(serviceableCall).toBeDefined();
        });
    });

    // =========================================================================
    // recipientApprove and recipientReject
    // =========================================================================

    describe('recipientApprove and recipientReject', () => {
        it('recipientApprove calls approveRequest', async () => {
            const requestDoc = makeRequestDoc();
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([requestDoc]));

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            mockGetDocs.mockResolvedValue(emptySnapshot);

            await act(async () => {
                await result.current.recipientApprove('req-1', 'Looks good');
            });

            expect(mockBatchCommit).toHaveBeenCalled();
            expect(mockBatchUpdate).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ status: 'approved' })
            );
        });

        it('recipientReject calls rejectRequest', async () => {
            const requestDoc = makeRequestDoc();
            mockOnSnapshot.mockImplementation(makeOnSnapshotMock([requestDoc]));

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.recipientReject('req-1', 'Not needed');
            });

            expect(mockBatchCommit).toHaveBeenCalled();
            expect(mockBatchUpdate).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ status: 'rejected' })
            );
        });
    });

    // =========================================================================
    // Filtering: incoming and outgoing transfers
    // =========================================================================

    describe('Filtering: incoming and outgoing transfers', () => {
        it('filters incoming transfers for current user', async () => {
            const incomingRequest = makeRequestDoc({
                status: 'pending',
                toPersonnelId: 'test-user-id',
                recipientApproved: false,
            });

            mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void) => {
                const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
                const refPath = (ref as { path?: string }).path;

                if (isDocRef && refPath?.startsWith('users/')) {
                    onNext({
                        exists: () => true,
                        id: 'test-user-id',
                        data: () => ({ unitId: 'unit-test', roles: ['user'] }),
                    });
                } else {
                    onNext({ docs: [incomingRequest] });
                }
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.incomingTransfers).toHaveLength(1);
            expect(result.current.incomingTransfers[0].id).toBe('req-1');
        });

        it('filters outgoing transfers for current user', async () => {
            const outgoingRequest = makeRequestDoc({
                status: 'pending',
                fromPersonnelId: 'test-user-id',
            });

            mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void) => {
                const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
                const refPath = (ref as { path?: string }).path;

                if (isDocRef && refPath?.startsWith('users/')) {
                    onNext({
                        exists: () => true,
                        id: 'test-user-id',
                        data: () => ({ unitId: 'unit-test', roles: ['user'] }),
                    });
                } else {
                    onNext({ docs: [outgoingRequest] });
                }
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.outgoingTransfers).toHaveLength(1);
            expect(result.current.outgoingTransfers[0].id).toBe('req-1');
        });

        it('filters requests for signature-approved users with unit transfers', async () => {
            const unitIncomingRequest = makeRequestDoc({
                status: 'pending',
                toUnitId: 'unit-test',
                toPersonnelId: null,
                recipientApproved: false,
            });

            mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void) => {
                const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
                const refPath = (ref as { path?: string }).path;

                if (isDocRef && refPath?.startsWith('users/')) {
                    onNext({
                        exists: () => true,
                        id: 'test-user-id',
                        data: () => ({ unitId: 'unit-test', roles: ['approved_user'] }),
                    });
                } else {
                    onNext({ docs: [unitIncomingRequest] });
                }
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.incomingTransfers).toHaveLength(1);
            expect(result.current.incomingTransfers[0].to_unit_id).toBe('unit-test');
        });

        it('excludes unit transfers for non-signature-approved users', async () => {
            const unitIncomingRequest = makeRequestDoc({
                status: 'pending',
                toUnitId: 'unit-test',
                toPersonnelId: null,
                recipientApproved: false,
            });

            mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void) => {
                const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
                const refPath = (ref as { path?: string }).path;

                if (isDocRef && refPath?.startsWith('users/')) {
                    onNext({
                        exists: () => true,
                        id: 'test-user-id',
                        data: () => ({ unitId: 'unit-test', roles: ['user'] }),
                    });
                } else {
                    onNext({ docs: [unitIncomingRequest] });
                }
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.incomingTransfers).toHaveLength(0);
        });

        it('excludes already recipient-approved requests from incoming', async () => {
            const approvedRequest = makeRequestDoc({
                status: 'pending',
                toPersonnelId: 'test-user-id',
                recipientApproved: true,
            });

            mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void) => {
                const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
                const refPath = (ref as { path?: string }).path;

                if (isDocRef && refPath?.startsWith('users/')) {
                    onNext({
                        exists: () => true,
                        id: 'test-user-id',
                        data: () => ({ unitId: 'unit-test', roles: ['user'] }),
                    });
                } else {
                    onNext({ docs: [approvedRequest] });
                }
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.incomingTransfers).toHaveLength(0);
        });

        it('handles users with no unit assigned', async () => {
            const personalRequest = makeRequestDoc({
                status: 'pending',
                toPersonnelId: 'test-user-id',
                recipientApproved: false,
            });

            mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void) => {
                const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
                const refPath = (ref as { path?: string }).path;

                if (isDocRef && refPath?.startsWith('users/')) {
                    onNext({
                        exists: () => true,
                        id: 'test-user-id',
                        data: () => ({ unitId: null, roles: ['user'] }),
                    });
                } else {
                    onNext({ docs: [personalRequest] });
                }
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.incomingTransfers).toHaveLength(1);
        });

        it('handles user document not existing', async () => {
            mockOnSnapshot.mockImplementation((ref: unknown, onNext: (snap: unknown) => void) => {
                const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
                const refPath = (ref as { path?: string }).path;

                if (isDocRef && refPath?.startsWith('users/')) {
                    onNext({
                        exists: () => false,
                    });
                } else {
                    onNext({ docs: [] });
                }
                return () => {};
            });

            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.requests).toHaveLength(0);
        });
    });

    // =========================================================================
    // createRequest edge cases and enrichment
    // =========================================================================

    describe('createRequest enrichment', () => {
        it('fetches and includes equipment battalion ID', async () => {
            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ serialNumber: 'SN-123', battalionId: 'battalion-5' }),
            });
            mockGetDocs.mockResolvedValue(emptySnapshot);

            await act(async () => {
                await result.current.createRequest({
                    equipmentId: 'equip-9',
                    toPersonnelId: 'pers-10',
                });
            });

            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    battalionId: 'battalion-5',
                })
            );
        });

        it('enriches from/to names when creating request', async () => {
            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            // Mock equipment doc
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ serialNumber: 'SN-456', battalionId: null }),
            });

            // Mock current assignment query
            mockGetDocs.mockResolvedValueOnce({
                docs: [{
                    data: () => ({ personnelId: 'from-pers-1', unitId: null }),
                }],
            });

            // Mock from personnel user doc
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ firstName: 'John', lastName: 'Doe' }),
            });

            // Mock to personnel user doc
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ firstName: 'Jane', lastName: 'Smith' }),
            });

            await act(async () => {
                await result.current.createRequest({
                    equipmentId: 'equip-10',
                    toPersonnelId: 'to-pers-2',
                    notes: 'Transfer request',
                });
            });

            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    fromName: 'John Doe',
                    toName: 'Jane Smith',
                    notes: 'Transfer request',
                })
            );
        });

        it('sets equipment status to pending_transfer on createRequest', async () => {
            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            mockGetDoc.mockResolvedValue({ exists: () => false });
            mockGetDocs.mockResolvedValue(emptySnapshot);

            await act(async () => {
                await result.current.createRequest({
                    equipmentId: 'equip-11',
                    toUnitId: 'unit-5',
                });
            });

            expect(mockUpdateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    status: 'pending_transfer',
                })
            );
        });

        it('handles unit-to-unit transfers with enrichment', async () => {
            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            // Mock equipment doc
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ serialNumber: 'SN-789' }),
            });

            // Mock current assignment (from unit)
            mockGetDocs.mockResolvedValueOnce({
                docs: [{
                    data: () => ({ personnelId: null, unitId: 'from-unit-1' }),
                }],
            });

            // Mock from unit doc
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ name: 'Alpha Company', unitType: 'company' }),
            });

            // Mock to unit doc
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ name: 'Bravo Company', unitType: 'company' }),
            });

            await act(async () => {
                await result.current.createRequest({
                    equipmentId: 'equip-12',
                    toUnitId: 'to-unit-2',
                });
            });

            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    fromName: 'Alpha Company',
                    toName: 'Bravo Company',
                    fromUnitType: 'company',
                    toUnitType: 'company',
                })
            );
        });
    });

    // =========================================================================
    // getApprovalsForRequest
    // =========================================================================

    describe('getApprovalsForRequest', () => {
        it('returns empty array (not yet implemented)', async () => {
            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const approvals = result.current.getApprovalsForRequest('req-1');
            expect(approvals).toEqual([]);
        });
    });

    // =========================================================================
    // refetch
    // =========================================================================

    describe('refetch', () => {
        it('refetch is a no-op with onSnapshot', async () => {
            const { result } = renderHook(() => useAssignmentRequests());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.refetch();
            });

            // Should complete without errors
            expect(result.current.error).toBeNull();
        });
    });
});
