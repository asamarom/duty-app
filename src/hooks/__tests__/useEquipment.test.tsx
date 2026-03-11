import { renderHook, waitFor, act } from '@testing-library/react';
import { useEquipment } from '../useEquipment';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firestore functions
const mockGetDocs = vi.fn();
const mockQuery = vi.fn((...args: unknown[]) => args[0]);
const mockCollection = vi.fn((...args: unknown[]) => ({ id: args[1] as string }));
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockDocFn = vi.fn((...args: unknown[]) => {
    const segs = args.slice(1) as string[];
    return { id: segs[segs.length - 1] ?? 'mock-doc-id', path: segs.join('/') };
});

// onSnapshot mock: immediately calls the callback with the provided snapshot,
// returns a no-op unsubscribe. Handles both collection queries and document references.
// For collection queries: provides { docs: [] }
// For document references: provides { exists: () => false, data: () => undefined }
const mockOnSnapshot = vi.fn((
    query: unknown,
    callback: (snap: unknown) => void,
    _onError?: (err: Error) => void,
) => {
    // Check if this is a document reference (has 'path' property) or collection query
    const isDocRef = query && typeof query === 'object' && 'path' in query;

    if (isDocRef) {
        // Document snapshot
        callback({
            exists: () => false,
            data: () => undefined,
        });
    } else {
        // Collection query snapshot
        callback({ docs: [] });
    }
    return () => {};
});

const mockGetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
    collection: (...args: unknown[]) => mockCollection(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    query: (...args: unknown[]) => mockQuery(...args),
    orderBy: (...args: unknown[]) => mockOrderBy(...args),
    where: (...args: unknown[]) => mockWhere(...args),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    doc: (...args: unknown[]) => mockDocFn(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    serverTimestamp: vi.fn(),
    onSnapshot: (...args: unknown[]) => mockOnSnapshot(...(args as Parameters<typeof mockOnSnapshot>)),
}));

const mockHttpsCallable = vi.fn();

vi.mock('firebase/functions', () => ({
    httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}));

// Mock dependent hooks to avoid complex onSnapshot tracking
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: { uid: 'test-user-id' }, loading: false }),
}));

vi.mock('@/hooks/useUserBattalion', () => ({
    useUserBattalion: () => ({ battalionId: 'battalion-a', unitId: 'unit-a', loading: false }),
}));

// Mock useUserRole with default non-admin user, can be overridden in individual tests
const mockUseUserRole = vi.fn(() => ({ isAdmin: false, isLeader: false, loading: false, roles: [] }));

vi.mock('@/hooks/useUserRole', () => ({
    useUserRole: () => mockUseUserRole(),
}));

describe('useEquipment Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mockUseUserRole to default non-admin user
        mockUseUserRole.mockReturnValue({ isAdmin: false, isLeader: false, loading: false, roles: [] });
        // Default: return empty results for all queries
        mockGetDocs.mockResolvedValue({ docs: [] });
        // Default: httpsCallable returns a no-op callable
        mockHttpsCallable.mockReturnValue(vi.fn().mockResolvedValue({ data: { success: true } }));
        // Default: getDoc returns a document snapshot with exists() and data() methods
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ roles: ['approved_user'] }),
        });
        // Restore default onSnapshot implementation after vi.clearAllMocks() wipes it
        mockOnSnapshot.mockImplementation((
            query: unknown,
            callback: (snap: unknown) => void,
            _onError?: (err: Error) => void,
        ) => {
            // Check if this is a document reference (has 'path' property) or collection query
            const isDocRef = query && typeof query === 'object' && 'path' in query;

            if (isDocRef) {
                // Document snapshot
                callback({
                    exists: () => false,
                    data: () => undefined,
                });
            } else {
                // Collection query snapshot
                callback({ docs: [] });
            }
            return () => {};
        });
    });

    it('fetches equipment data on mount', async () => {
        // Mock admin user so they can see all equipment (including unassigned)
        mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

        const mockEquipmentDocs = [
            {
                id: 'eq-1',
                data: () => ({
                    name: 'M4 Carbine',
                    serialNumber: 'SN12345',
                    description: 'Test rifle',
                    category: 'weapon',
                    quantity: 1,
                    status: 'available',
                    createdBy: 'user-1',
                    battalionId: 'battalion-a',
                    currentUnitId: null,
                    currentPersonnelId: null,
                    currentQuantityAssigned: 0,
                    lastAssignedAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
                exists: () => true,
            },
        ];

        // The hook registers 3 onSnapshot listeners: equipment, assignments, pending.
        // The useEffect that registers these listeners will fire twice:
        // 1. Initially when component mounts
        // 2. After fetchUser completes and currentUserPersonnelId changes
        // So we need 6 mock implementations (3 for each registration)
        const mockEquipmentSnapshot = (query: unknown, cb: (snap: unknown) => void) => {
            cb({ docs: mockEquipmentDocs });
            return () => {};
        };
        const mockEmptySnapshot = (query: unknown, cb: (snap: unknown) => void) => {
            cb({ docs: [] });
            return () => {};
        };

        mockOnSnapshot
            // First registration (initial mount)
            .mockImplementationOnce(mockEquipmentSnapshot)
            .mockImplementationOnce(mockEmptySnapshot)
            .mockImplementationOnce(mockEmptySnapshot)
            // Second registration (after currentUserPersonnelId updates)
            .mockImplementationOnce(mockEquipmentSnapshot)
            .mockImplementationOnce(mockEmptySnapshot)
            .mockImplementationOnce(mockEmptySnapshot);

        const { result } = renderHook(() => useEquipment());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.equipment).toHaveLength(1);
        expect(result.current.equipment[0].name).toBe('M4 Carbine');
    });

    it('checks if a user can delete equipment based on role and permissions', () => {
        const { result } = renderHook(() => useEquipment());

        const equipmentItem = {
            id: 'eq-1--as-1',
            name: 'Test Item',
            createdBy: 'user-1',
            currentPersonnelId: 'pers-1',
            currentUnitId: 'unit-1',
            battalionId: 'battalion-test',
            assignmentLevel: 'individual' as any,
            quantity: 1,
        } as any;

        // Regular users cannot delete equipment (per EQUIPMENT_ACCESS_RULES.md)
        const regularUserItem = { ...equipmentItem, createdBy: 'test-user-id', currentPersonnelId: 'pers-1' };
        expect(result.current.canDeleteEquipment(regularUserItem, 'pers-1')).toBe(false);

        // Non-admins cannot delete equipment not in their battalion
        const differentBattalion = { ...equipmentItem, battalionId: 'other-battalion' };
        expect(result.current.canDeleteEquipment(differentBattalion, 'pers-1')).toBe(false);
    });

    describe('isWithinSameUnit', () => {
        it('returns true when item and target are in the same unit', () => {
            const { result } = renderHook(() => useEquipment());

            const item = {
                id: 'eq-1--unassigned', name: 'Rifle',
                currentUnitId: 'unit-alpha',
                assignmentLevel: 'battalion' as const,
                quantity: 1,
            } as any;

            expect(result.current.isWithinSameUnit('battalion', 'battalion', item, { unitId: 'unit-alpha' })).toBe(true);
        });

        it('returns false when item and target are in different units', () => {
            const { result } = renderHook(() => useEquipment());

            const item = {
                id: 'eq-1--unassigned', name: 'Rifle',
                currentUnitId: 'unit-alpha',
                assignmentLevel: 'battalion' as const,
                quantity: 1,
            } as any;

            expect(result.current.isWithinSameUnit('battalion', 'company', item, { unitId: 'unit-bravo' })).toBe(false);
        });

        it('returns false when item has no current unit', () => {
            const { result } = renderHook(() => useEquipment());

            const item = {
                id: 'eq-1--unassigned', name: 'Rifle',
                currentUnitId: undefined,
                assignmentLevel: 'unassigned' as const,
                quantity: 1,
            } as any;

            expect(result.current.isWithinSameUnit('unassigned', 'battalion', item, { unitId: 'unit-alpha' })).toBe(false);
        });

        it('returns false when assignment has no target unit', () => {
            const { result } = renderHook(() => useEquipment());

            const item = {
                id: 'eq-1--as-1', name: 'Rifle',
                currentUnitId: 'unit-alpha',
                assignmentLevel: 'battalion' as const,
                quantity: 1,
            } as any;

            expect(result.current.isWithinSameUnit('battalion', 'individual', item, { personnelId: 'pers-1' })).toBe(false);
        });
    });

    // [XFER-11] For bulk items, transfer quantity is passed to assignmentRequests Firestore doc
    it('requestAssignment passes quantity to assignmentRequests Firestore doc', async () => {
        const { result } = renderHook(() => useEquipment());

        // Wait for the initial load to settle
        await waitFor(() => expect(result.current.loading).toBe(false));

        const firestoreMock = await import('firebase/firestore');
        const mockAddDocFn = vi.mocked(firestoreMock.addDoc);
        mockAddDocFn.mockResolvedValue({ id: 'new-request-id' } as any);

        await act(async () => {
            await result.current.requestAssignment('eq-1--unassigned', { unitId: 'u1' }, undefined, 3);
        });

        expect(mockAddDocFn).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ quantity: 3, toUnitId: 'u1', equipmentId: 'eq-1' })
        );
    });

    it('sets loading to false when an onSnapshot listener errors', async () => {
        // First listener (equipment) triggers the error handler immediately
        mockOnSnapshot
            .mockImplementationOnce((_q: unknown, _cb: unknown, onError?: (err: Error) => void) => {
                if (onError) onError(new Error('Permission denied'));
                return () => {};
            })
            .mockImplementationOnce((_q: unknown, cb: (snap: { docs: unknown[] }) => void) => {
                cb({ docs: [] });
                return () => {};
            })
            .mockImplementationOnce((_q: unknown, cb: (snap: { docs: unknown[] }) => void) => {
                cb({ docs: [] });
                return () => {};
            });

        const { result } = renderHook(() => useEquipment());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        expect(result.current.equipment).toHaveLength(0);
    });

    // =========================================================================
    // TDD RED PHASE: Tests for client-side replacement of initiateTransfer CF
    // These tests will FAIL until httpsCallable calls are replaced with direct
    // Firestore operations in useEquipment.tsx
    // =========================================================================

    describe('requestAssignment — client-side Firestore (TDD red phase)', () => {
        // Access the module-level vi.fn() mocks declared in vi.mock('firebase/firestore') above.
        // We retrieve them via the mocked module so TypeScript knows they are mock instances.
        let mockAddDoc: ReturnType<typeof vi.fn>;
        let mockUpdateDoc: ReturnType<typeof vi.fn>;

        beforeEach(async () => {
            const firestoreMock = await import('firebase/firestore');
            mockAddDoc = vi.mocked(firestoreMock.addDoc);
            mockUpdateDoc = vi.mocked(firestoreMock.updateDoc);
            mockAddDoc.mockResolvedValue({ id: 'new-request-id' } as any);
            mockUpdateDoc.mockResolvedValue(undefined);
        });

        it('requestAssignment creates assignmentRequest doc in Firestore directly', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.requestAssignment('eq-1--unassigned', { personnelId: 'pers-42' }, 'some notes', 1);
            });

            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    equipmentId: 'eq-1',
                    toPersonnelId: 'pers-42',
                    status: 'pending',
                    requestedBy: 'test-user-id',
                })
            );
        });

        it('requestAssignment sets equipment status to pending_transfer', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.requestAssignment('eq-1--unassigned', { personnelId: 'pers-42' });
            });

            expect(mockUpdateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ status: 'pending_transfer' })
            );
        });

        it('requestAssignment passes quantity in request doc', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.requestAssignment('eq-2--unassigned', { unitId: 'unit-99' }, undefined, 5);
            });

            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ quantity: 5 })
            );
        });

        it('requestAssignment does NOT call httpsCallable', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            // Reset httpsCallable call count after initial load (which may use it internally)
            mockHttpsCallable.mockClear();

            await act(async () => {
                await result.current.requestAssignment('eq-1--unassigned', { unitId: 'unit-1' });
            });

            expect(mockHttpsCallable).not.toHaveBeenCalled();
        });

        it('assignEquipment creates assignmentRequest doc in Firestore directly for admin direct assign', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.assignEquipment('eq-3--unassigned', { personnelId: 'pers-10' }, 2);
            });

            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    equipmentId: 'eq-3',
                    toPersonnelId: 'pers-10',
                    status: 'pending',
                    requestedBy: 'test-user-id',
                })
            );
        });

        it('assignEquipment does NOT call httpsCallable', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            // Reset httpsCallable call count after initial load
            mockHttpsCallable.mockClear();

            await act(async () => {
                await result.current.assignEquipment('eq-3--unassigned', { unitId: 'unit-5' });
            });

            expect(mockHttpsCallable).not.toHaveBeenCalled();
        });
    });

    describe('Equipment Filtering and Assignment Logic', () => {
        it('admin can see all equipment including unassigned', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

            const mockEquipmentDocs = [
                {
                    id: 'eq-1',
                    data: () => ({
                        name: 'Rifle A',
                        serialNumber: 'SN001',
                        quantity: 1,
                        status: 'serviceable',
                        battalionId: 'battalion-a',
                    }),
                },
            ];

            mockOnSnapshot
                .mockImplementationOnce((q, cb) => { cb({ docs: mockEquipmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockEquipmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; });

            const { result } = renderHook(() => useEquipment());

            await waitFor(() => expect(result.current.loading).toBe(false));

            // Admin should see unassigned equipment
            expect(result.current.equipment.length).toBeGreaterThan(0);
            expect(result.current.equipment[0].assignmentLevel).toBe('unassigned');
        });

        it('hides unassigned equipment from non-admin users', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: false, isLeader: true, loading: false, roles: ['leader'] });

            const mockEquipmentDocs = [
                {
                    id: 'eq-1',
                    data: () => ({
                        name: 'Unassigned Rifle',
                        serialNumber: 'SN999',
                        quantity: 5,
                        status: 'serviceable',
                        battalionId: 'battalion-a',
                    }),
                },
            ];

            mockOnSnapshot
                .mockImplementationOnce((q, cb) => { cb({ docs: mockEquipmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockEquipmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; });

            const { result } = renderHook(() => useEquipment());

            await waitFor(() => expect(result.current.loading).toBe(false));

            // Non-admin should not see unassigned equipment
            expect(result.current.equipment).toHaveLength(0);
        });

        it('creates rows for each active assignment', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

            const mockEquipmentDocs = [
                {
                    id: 'eq-multi',
                    data: () => ({
                        name: 'Multi-Assigned Equipment',
                        serialNumber: null,
                        quantity: 10,
                        status: 'serviceable',
                        battalionId: 'battalion-a',
                    }),
                },
            ];

            const mockAssignmentDocs = [
                {
                    id: 'as-1',
                    data: () => ({
                        equipmentId: 'eq-multi',
                        unitId: 'unit-a',
                        personnelId: null,
                        quantity: 5,
                        returnedAt: null,
                    }),
                },
                {
                    id: 'as-2',
                    data: () => ({
                        equipmentId: 'eq-multi',
                        personnelId: 'pers-1',
                        unitId: null,
                        quantity: 3,
                        returnedAt: null,
                    }),
                },
            ];

            mockOnSnapshot
                .mockImplementationOnce((q, cb) => { cb({ docs: mockEquipmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockAssignmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockEquipmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockAssignmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; });

            mockGetDoc
                .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Unit A', unitType: 'company' }) })
                .mockResolvedValueOnce({ exists: () => true, data: () => ({ firstName: 'John', lastName: 'Doe' }) });

            const { result } = renderHook(() => useEquipment());

            await waitFor(() => expect(result.current.loading).toBe(false));

            // Should have 3 rows: 2 assignments + 1 unassigned pool (10 - 5 - 3 = 2)
            expect(result.current.equipment.length).toBe(3);
        });
    });

    describe('Pending Transfer Handling', () => {
        it('marks equipment with pending transfer flag', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

            const mockEquipmentDocs = [
                {
                    id: 'eq-pending',
                    data: () => ({
                        name: 'Pending Equipment',
                        serialNumber: 'SNPEND',
                        quantity: 1,
                        status: 'pending_transfer',
                        battalionId: 'battalion-a',
                    }),
                },
            ];

            const mockAssignmentDocs = [
                {
                    id: 'as-pending',
                    data: () => ({
                        equipmentId: 'eq-pending',
                        unitId: 'unit-a',
                        personnelId: null,
                        quantity: 1,
                        returnedAt: null,
                    }),
                },
            ];

            const mockPendingDocs = [
                {
                    id: 'req-pending',
                    data: () => ({
                        equipmentId: 'eq-pending',
                        fromUnitId: 'unit-a',
                        toUnitId: 'unit-b',
                        status: 'pending',
                        quantity: 1,
                    }),
                },
            ];

            mockOnSnapshot
                .mockImplementationOnce((q, cb) => { cb({ docs: mockEquipmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockAssignmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockPendingDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockEquipmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockAssignmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockPendingDocs }); return () => {}; });

            mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Unit A', unitType: 'company' }) });

            const { result } = renderHook(() => useEquipment());

            await waitFor(() => expect(result.current.loading).toBe(false));

            // Equipment should be marked with pending transfer flag
            const item = result.current.equipment.find(e => e.name === 'Pending Equipment');
            expect(item?.hasPendingTransfer).toBe(true);
        });

        it('tracks total quantity of pending transfers OUT', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

            const mockEquipmentDocs = [
                {
                    id: 'eq-multi-pending',
                    data: () => ({
                        name: 'Multi Pending Equipment',
                        serialNumber: null,
                        quantity: 10,
                        status: 'serviceable',
                        battalionId: 'battalion-a',
                    }),
                },
            ];

            const mockAssignmentDocs = [
                {
                    id: 'as-multi-pending',
                    data: () => ({
                        equipmentId: 'eq-multi-pending',
                        unitId: 'unit-a',
                        personnelId: null,
                        quantity: 10,
                        returnedAt: null,
                    }),
                },
            ];

            const mockPendingDocs = [
                {
                    id: 'req-1',
                    data: () => ({
                        equipmentId: 'eq-multi-pending',
                        fromUnitId: 'unit-a',
                        toUnitId: 'unit-b',
                        status: 'pending',
                        quantity: 2,
                    }),
                },
                {
                    id: 'req-2',
                    data: () => ({
                        equipmentId: 'eq-multi-pending',
                        fromUnitId: 'unit-a',
                        toUnitId: 'unit-c',
                        status: 'pending',
                        quantity: 3,
                    }),
                },
            ];

            mockOnSnapshot
                .mockImplementationOnce((q, cb) => { cb({ docs: mockEquipmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockAssignmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockPendingDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockEquipmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockAssignmentDocs }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: mockPendingDocs }); return () => {}; });

            mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Unit A', unitType: 'company' }) });

            const { result } = renderHook(() => useEquipment());

            await waitFor(() => expect(result.current.loading).toBe(false));

            // Should track total pending OUT (2 + 3 = 5)
            const item = result.current.equipment.find(e => e.name === 'Multi Pending Equipment');
            expect(item?.pendingTransferOutQuantity).toBe(5);
        });
    });

    describe('Equipment CRUD Operations', () => {
        it('addEquipment creates new equipment for admin', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const firestoreMock = await import('firebase/firestore');
            const mockAddDocFn = vi.mocked(firestoreMock.addDoc);
            mockAddDocFn.mockResolvedValue({ id: 'new-eq-id' } as any);

            await act(async () => {
                await result.current.addEquipment({
                    name: 'New Rifle',
                    serialNumber: 'SN-NEW',
                    quantity: 1,
                });
            });

            expect(mockAddDocFn).toHaveBeenCalled();
        });


        it('addEquipment allows leaders to create equipment in their own unit', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: false, isLeader: true, loading: false, roles: ['leader'] });

            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const firestoreMock = await import('firebase/firestore');
            const mockAddDocFn = vi.mocked(firestoreMock.addDoc);
            mockAddDocFn.mockResolvedValue({ id: 'new-eq-id' } as any);

            await act(async () => {
                await result.current.addEquipment(
                    { name: 'New Rifle', serialNumber: 'SN-NEW', quantity: 1 },
                    { unitId: 'unit-a' }
                );
            });

            expect(mockAddDocFn).toHaveBeenCalled();
        });

        it('addEquipment throws error for leaders creating in different unit', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: false, isLeader: true, loading: false, roles: ['leader'] });

            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await expect(act(async () => {
                await result.current.addEquipment(
                    { name: 'New Rifle', serialNumber: 'SN-NEW', quantity: 1 },
                    { unitId: 'other-unit' }
                );
            })).rejects.toThrow('You can only create equipment in your own unit');
        });

        it('updateEquipment updates equipment fields for admin', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const firestoreMock = await import('firebase/firestore');
            const mockUpdateDocFn = vi.mocked(firestoreMock.updateDoc);
            mockUpdateDocFn.mockResolvedValue(undefined);

            await act(async () => {
                await result.current.updateEquipment('eq-1--as-1', { quantity: 5, status: 'unserviceable' });
            });

            expect(mockUpdateDocFn).toHaveBeenCalled();
        });

        it('updateEquipment throws error for non-admin users', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: false, isLeader: true, loading: false, roles: ['leader'] });

            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            await expect(act(async () => {
                await result.current.updateEquipment('eq-1--as-1', { quantity: 5 });
            })).rejects.toThrow('Only admins can update equipment fields');
        });

        it('deleteEquipment deletes equipment for admin', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const firestoreMock = await import('firebase/firestore');
            const mockDeleteDocFn = vi.mocked(firestoreMock.deleteDoc);
            mockDeleteDocFn.mockResolvedValue(undefined);

            await act(async () => {
                await result.current.deleteEquipment('eq-1--as-1');
            });

            expect(mockDeleteDocFn).toHaveBeenCalled();
        });

        it('unassignEquipment marks assignments as returned', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const firestoreMock = await import('firebase/firestore');
            const mockUpdateDocFn = vi.mocked(firestoreMock.updateDoc);

            mockGetDocs.mockResolvedValue({
                docs: [
                    { id: 'as-1', data: () => ({ equipmentId: 'eq-1', returnedAt: null }) },
                ],
            } as any);
            mockUpdateDocFn.mockResolvedValue(undefined);

            await act(async () => {
                await result.current.unassignEquipment('eq-1--as-1');
            });

            expect(mockUpdateDocFn).toHaveBeenCalled();
        });
    });

    describe('Permission Checks', () => {
        it('canDeleteEquipment returns true for admin', () => {
            mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

            const { result } = renderHook(() => useEquipment());

            const equipmentItem = {
                id: 'eq-1--as-1',
                name: 'Test Item',
                currentUnitId: 'unit-other',
                battalionId: 'battalion-other',
                assignmentLevel: 'individual' as const,
                quantity: 1,
            } as any;

            expect(result.current.canDeleteEquipment(equipmentItem)).toBe(true);
        });

        it('canDeleteEquipment returns true for leader in same unit and battalion', () => {
            mockUseUserRole.mockReturnValue({ isAdmin: false, isLeader: true, loading: false, roles: ['leader'] });

            const { result } = renderHook(() => useEquipment());

            const equipmentItem = {
                id: 'eq-1--as-1',
                name: 'Test Item',
                currentUnitId: 'unit-a',
                battalionId: 'battalion-a',
                assignmentLevel: 'individual' as const,
                quantity: 1,
            } as any;

            expect(result.current.canDeleteEquipment(equipmentItem)).toBe(true);
        });

        it('canDeleteEquipment returns false for leader with different battalion', () => {
            mockUseUserRole.mockReturnValue({ isAdmin: false, isLeader: true, loading: false, roles: ['leader'] });

            const { result } = renderHook(() => useEquipment());

            const equipmentItem = {
                id: 'eq-1--as-1',
                name: 'Test Item',
                currentUnitId: 'unit-a',
                battalionId: 'battalion-other',
                assignmentLevel: 'individual' as const,
                quantity: 1,
            } as any;

            expect(result.current.canDeleteEquipment(equipmentItem)).toBe(false);
        });

        it('requestAssignment allows admin to transfer any equipment', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const firestoreMock = await import('firebase/firestore');
            const mockAddDocFn = vi.mocked(firestoreMock.addDoc);
            const mockUpdateDocFn = vi.mocked(firestoreMock.updateDoc);

            mockAddDocFn.mockResolvedValue({ id: 'new-request-id' } as any);
            mockUpdateDocFn.mockResolvedValue(undefined);
            mockGetDocs.mockResolvedValue({ docs: [] } as any);
            mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ battalionId: 'battalion-a' }) });

            await act(async () => {
                await result.current.requestAssignment('eq-other--as-other', { unitId: 'unit-c' });
            });

            expect(mockAddDocFn).toHaveBeenCalled();
        });
    });


    describe('Loading States', () => {
        it('sets loading to false after successful data fetch', async () => {
            mockUseUserRole.mockReturnValue({ isAdmin: true, isLeader: false, loading: false, roles: ['admin'] });

            mockOnSnapshot
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; })
                .mockImplementationOnce((q, cb) => { cb({ docs: [] }); return () => {}; });

            const { result } = renderHook(() => useEquipment());

            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.error).toBeNull();
        });
    });

    describe('Transfer Request Creation', () => {
        it('_initiateTransferLocally resolves fromName and toName for personnel', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const firestoreMock = await import('firebase/firestore');
            const mockAddDocFn = vi.mocked(firestoreMock.addDoc);
            const mockUpdateDocFn = vi.mocked(firestoreMock.updateDoc);

            mockAddDocFn.mockResolvedValue({ id: 'new-request-id' } as any);
            mockUpdateDocFn.mockResolvedValue(undefined);
            mockGetDocs.mockResolvedValue({ docs: [] } as any);

            mockGetDoc
                .mockResolvedValueOnce({ exists: () => true, data: () => ({ battalionId: 'battalion-a' }) })
                .mockResolvedValueOnce({ exists: () => true, data: () => ({ firstName: 'John', lastName: 'Doe' }) });

            await act(async () => {
                await result.current.assignEquipment('eq-1--unassigned', { personnelId: 'pers-123' });
            });

            expect(mockAddDocFn).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    toPersonnelId: 'pers-123',
                    toName: 'John Doe',
                })
            );
        });

        it('_initiateTransferLocally resolves fromName and toName for units', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const firestoreMock = await import('firebase/firestore');
            const mockAddDocFn = vi.mocked(firestoreMock.addDoc);
            const mockUpdateDocFn = vi.mocked(firestoreMock.updateDoc);

            mockAddDocFn.mockResolvedValue({ id: 'new-request-id' } as any);
            mockUpdateDocFn.mockResolvedValue(undefined);
            mockGetDocs.mockResolvedValue({ docs: [] } as any);

            mockGetDoc
                .mockResolvedValueOnce({ exists: () => true, data: () => ({ battalionId: 'battalion-a' }) })
                .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Alpha Company', unitType: 'company' }) });

            await act(async () => {
                await result.current.assignEquipment('eq-1--unassigned', { unitId: 'unit-alpha' });
            });

            expect(mockAddDocFn).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    toUnitId: 'unit-alpha',
                    toName: 'Alpha Company',
                    toUnitType: 'company',
                })
            );
        });

        it('_initiateTransferLocally includes notes when provided', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const firestoreMock = await import('firebase/firestore');
            const mockAddDocFn = vi.mocked(firestoreMock.addDoc);
            const mockUpdateDocFn = vi.mocked(firestoreMock.updateDoc);

            mockAddDocFn.mockResolvedValue({ id: 'new-request-id' } as any);
            mockUpdateDocFn.mockResolvedValue(undefined);
            mockGetDocs.mockResolvedValue({ docs: [] } as any);

            mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ battalionId: 'battalion-a' }) });

            await act(async () => {
                await result.current.requestAssignment('eq-1--unassigned', { unitId: 'unit-1' }, 'Urgent transfer', 2);
            });

            expect(mockAddDocFn).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    notes: 'Urgent transfer',
                    quantity: 2,
                })
            );
        });

        it('_initiateTransferLocally retrieves current assignment info', async () => {
            const { result } = renderHook(() => useEquipment());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const firestoreMock = await import('firebase/firestore');
            const mockAddDocFn = vi.mocked(firestoreMock.addDoc);
            const mockUpdateDocFn = vi.mocked(firestoreMock.updateDoc);

            mockAddDocFn.mockResolvedValue({ id: 'new-request-id' } as any);
            mockUpdateDocFn.mockResolvedValue(undefined);
            mockGetDocs.mockResolvedValue({
                docs: [{
                    id: 'as-1',
                    data: () => ({
                        equipmentId: 'eq-1',
                        personnelId: 'current-owner',
                        unitId: null,
                    }),
                }],
            } as any);

            mockGetDoc
                .mockResolvedValueOnce({ exists: () => true, data: () => ({ battalionId: 'battalion-a' }) })
                .mockResolvedValueOnce({ exists: () => true, data: () => ({ firstName: 'Jane', lastName: 'Smith' }) });

            await act(async () => {
                await result.current.assignEquipment('eq-1--as-1', { unitId: 'unit-1' });
            });

            expect(mockAddDocFn).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    fromPersonnelId: 'current-owner',
                    fromName: 'Jane Smith',
                })
            );
        });
    });
});
