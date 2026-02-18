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
// returns a no-op unsubscribe. Defaults to empty docs; individual tests can
// override by calling mockOnSnapshot.mockImplementationOnce(...).
const mockOnSnapshot = vi.fn((
    _query: unknown,
    callback: (snap: { docs: unknown[] }) => void,
    _onError?: (err: Error) => void,
) => {
    callback({ docs: [] });
    return () => {};
});

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
    getDoc: vi.fn(),
    serverTimestamp: vi.fn(),
    onSnapshot: (...args: unknown[]) => mockOnSnapshot(...(args as Parameters<typeof mockOnSnapshot>)),
}));

const mockHttpsCallable = vi.fn();

vi.mock('firebase/functions', () => ({
    httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}));

describe('useEquipment Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: return empty results for all queries
        mockGetDocs.mockResolvedValue({ docs: [] });
        // Default: httpsCallable returns a no-op callable
        mockHttpsCallable.mockReturnValue(vi.fn().mockResolvedValue({ data: { success: true } }));
        // Restore default onSnapshot implementation after vi.clearAllMocks() wipes it
        mockOnSnapshot.mockImplementation((
            _query: unknown,
            callback: (snap: { docs: unknown[] }) => void,
            _onError?: (err: Error) => void,
        ) => {
            callback({ docs: [] });
            return () => {};
        });
    });

    it('fetches equipment data on mount', async () => {
        const mockEquipmentDocs = [
            {
                id: 'eq-1',
                data: () => ({
                    name: 'M4 Carbine',
                    serialNumber: 'SN12345',
                    quantity: 1,
                    status: 'available',
                    createdBy: 'user-1',
                }),
                exists: () => true,
            },
        ];

        // The hook registers 3 onSnapshot listeners: equipment, assignments, pending.
        // Override so the first call (equipment) fires with mockEquipmentDocs,
        // the second and third (assignments, pending) fire with empty docs.
        mockOnSnapshot
            .mockImplementationOnce((_q: unknown, cb: (snap: { docs: unknown[] }) => void) => {
                cb({ docs: mockEquipmentDocs });
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

        expect(result.current.equipment).toHaveLength(1);
        expect(result.current.equipment[0].name).toBe('M4 Carbine');
    });

    it('checks if a user can delete equipment based on creator and assignment', () => {
        const { result } = renderHook(() => useEquipment());

        const equipmentItem = {
            id: 'eq-1--as-1',
            name: 'Test Item',
            createdBy: 'user-1',
            currentPersonnelId: 'pers-1',
            assignmentLevel: 'individual' as any,
            quantity: 1,
        } as any;

        // setup.ts mocks useAuth to return { user: { id: 'test-user-id' } }
        // but useEquipment uses user?.uid, so we test with the mock value

        const validItem = { ...equipmentItem, createdBy: 'test-user-id', currentPersonnelId: 'pers-1' };
        expect(result.current.canDeleteEquipment(validItem, 'pers-1')).toBe(true);

        // Case 2: Different creator
        const invalidCreator = { ...equipmentItem, createdBy: 'other-user', currentPersonnelId: 'pers-1' };
        expect(result.current.canDeleteEquipment(invalidCreator, 'pers-1')).toBe(false);

        // Case 3: Different assignment
        const invalidAssignment = { ...equipmentItem, createdBy: 'test-user-id', currentPersonnelId: 'other-pers' };
        expect(result.current.canDeleteEquipment(invalidAssignment, 'pers-1')).toBe(false);
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
});
