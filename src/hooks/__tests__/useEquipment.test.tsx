import { renderHook, waitFor } from '@testing-library/react';
import { useEquipment } from '../useEquipment';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firestore functions
const mockGetDocs = vi.fn();
const mockQuery = vi.fn();
const mockCollection = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();

vi.mock('firebase/firestore', () => ({
    collection: (...args: unknown[]) => mockCollection(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    query: (...args: unknown[]) => mockQuery(...args),
    orderBy: (...args: unknown[]) => mockOrderBy(...args),
    where: (...args: unknown[]) => mockWhere(...args),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    serverTimestamp: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
    httpsCallable: vi.fn(),
}));

describe('useEquipment Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: return empty results for all queries
        mockGetDocs.mockResolvedValue({ docs: [] });
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

        // First getDocs call = equipment, second = assignments, third = pending requests
        mockGetDocs
            .mockResolvedValueOnce({ docs: mockEquipmentDocs })
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [] });

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
});
