import { renderHook, waitFor } from '@testing-library/react';
import { useEquipment } from '../useEquipment';
import { supabase } from '@/integrations/supabase/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock equipment data
const mockEquipmentData = [
    {
        id: 'eq-1',
        name: 'M4 Carbine',
        serial_number: 'SN12345',
        quantity: 1,
        status: 'serviceable',
        equipment_assignments: [
            {
                id: 'as-1',
                personnel_id: 'pers-1',
                quantity: 1,
                returned_at: null,
            },
        ],
    },
];

describe('useEquipment Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches equipment data on mount', async () => {
        const mockFrom = vi.mocked(supabase.from);
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnValue({ data: mockEquipmentData, error: null }),
            eq: vi.fn().mockReturnThis(),
        } as any);

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

        // Case 1: Matching creator and assignment
        // useAuth mock returns { id: 'test-user-id' } in setup.ts, but here we can't easily change it per test 
        // without re-mocking useAuth. Let's assume useAuth returns 'user-1' for this test.

        // Actually, setup.ts has:
        // vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'test-user-id' } })) }))

        const validItem = { ...equipmentItem, createdBy: 'test-user-id', currentPersonnelId: 'pers-1' };
        expect(result.current.canDeleteEquipment(validItem, 'pers-1')).toBe(true);

        // Case 2: Different creator
        const invalidCreator = { ...equipmentItem, createdBy: 'other-user', currentPersonnelId: 'pers-1' };
        expect(result.current.canDeleteEquipment(invalidCreator, 'pers-1')).toBe(false);

        // Case 3: Different assignment
        const invalidAssignment = { ...equipmentItem, createdBy: 'test-user-id', currentPersonnelId: 'other-pers' };
        expect(result.current.canDeleteEquipment(invalidAssignment, 'pers-1')).toBe(false);
    });
});
