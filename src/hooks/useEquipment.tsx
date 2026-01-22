import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { Equipment } from '@/types/pmtb';
import { useAuth } from '@/hooks/useAuth';

export type EquipmentRow = Tables<'equipment'>;

export type AssignmentLevel = 'battalion' | 'company' | 'platoon' | 'individual' | 'unassigned';

export interface EquipmentWithAssignment extends Equipment {
  assigneeName?: string;
  currentAssignmentId?: string;
  currentPersonnelId?: string;
  currentUnitId?: string;
  assignmentLevel: AssignmentLevel;
  hasPendingTransfer?: boolean;
  currentQuantity?: number;
}

interface AssignmentData {
  personnelId?: string;
  unitId?: string;
}

interface UseEquipmentReturn {
  equipment: EquipmentWithAssignment[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addEquipment: (item: Omit<Equipment, 'id'>, assignment?: AssignmentData) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  assignEquipment: (equipmentId: string, assignment: AssignmentData, quantity?: number) => Promise<void>;
  unassignEquipment: (equipmentId: string) => Promise<void>;
  requestAssignment: (equipmentId: string, assignment: AssignmentData, notes?: string, quantity?: number) => Promise<void>;
  canDeleteEquipment: (equipmentItem: EquipmentWithAssignment, currentUserPersonnelId?: string) => boolean;
}

export function useEquipment(): UseEquipmentReturn {
  const [equipment, setEquipment] = useState<EquipmentWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch equipment with assignments
      const { data: equipmentData, error: fetchError } = await supabase
        .from('equipment')
        .select(`
          *,
          equipment_assignments(
            id,
            personnel_id,
            unit_id,
            returned_at,
            quantity,
            personnel(first_name, last_name),
            units(name, unit_type)
          )
        `)
        .order('name');

      if (fetchError) throw fetchError;

      // Fetch pending transfer requests to mark equipment
      const { data: pendingRequests } = await supabase
        .from('assignment_requests')
        .select('equipment_id')
        .eq('status', 'pending');

      const pendingEquipmentIds = new Set((pendingRequests || []).map(r => r.equipment_id));

      const mappedEquipment: EquipmentWithAssignment[] = [];

      (equipmentData || []).forEach((row: any) => {
        const assignments = row.equipment_assignments || [];
        const activeAssignments = assignments.filter((a: any) => !a.returned_at);

        // Calculate total assigned quantity
        const totalAssignedQuantity = activeAssignments.reduce((sum: number, a: any) => sum + (a.quantity || 0), 0);
        const unassignedQuantity = row.quantity - totalAssignedQuantity;

        // 1. Create rows for each active assignment
        activeAssignments.forEach((assignment: any) => {
          let assigneeName: string | undefined;
          let assignedType: 'individual' | 'unit' | 'unassigned' = 'unassigned';
          let assignmentLevel: AssignmentLevel = 'unassigned';

          if (assignment.personnel) {
            assigneeName = `${assignment.personnel.first_name} ${assignment.personnel.last_name}`;
            assignedType = 'individual';
            assignmentLevel = 'individual';
          } else if (assignment.units) {
            assigneeName = assignment.units.name;
            assignedType = 'unit';
            assignmentLevel = assignment.units.unit_type as AssignmentLevel;
          }

          mappedEquipment.push({
            id: `${row.id}--${assignment.id}`,
            serialNumber: row.serial_number || undefined,
            name: row.name,
            description: row.description || undefined,
            quantity: row.quantity,
            assignedTo: assigneeName,
            assignedType,
            assignedUnitId: assignment.unit_id || undefined,
            assigneeName,
            currentAssignmentId: assignment.id,
            currentPersonnelId: assignment.personnel_id,
            currentUnitId: assignment.unit_id,
            assignmentLevel,
            hasPendingTransfer: pendingEquipmentIds.has(row.id) || row.status === 'pending_transfer',
            currentQuantity: assignment.quantity || 1,
            createdBy: row.created_by,
          });
        });

        // 2. Create a row for the unassigned pool if quantity remains
        if (unassignedQuantity > 0 || activeAssignments.length === 0) {
          mappedEquipment.push({
            id: `${row.id}--unassigned`,
            serialNumber: row.serial_number || undefined,
            name: row.name,
            description: row.description || undefined,
            quantity: row.quantity,
            assignedTo: 'Unassigned',
            assignedType: 'unassigned',
            assigneeName: 'Unassigned',
            assignmentLevel: 'unassigned',
            hasPendingTransfer: pendingEquipmentIds.has(row.id) || row.status === 'pending_transfer',
            currentQuantity: unassignedQuantity,
            createdBy: row.created_by,
          });
        }
      });

      setEquipment(mappedEquipment);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEquipment = useCallback(async (item: Omit<Equipment, 'id'>, assignment?: AssignmentData) => {
    // For bulk items (no serial), check if equipment with same name exists at same assignment
    if (!item.serialNumber && assignment) {
      const assignmentKey = assignment.personnelId
        ? `personnel:${assignment.personnelId}`
        : assignment.unitId
          ? `unit:${assignment.unitId}`
          : null;

      if (assignmentKey) {
        const existingItem = equipment.find(e => {
          if (e.serialNumber) return false;
          if (e.name.toLowerCase() !== item.name.toLowerCase()) return false;

          const existingKey = e.currentPersonnelId
            ? `personnel:${e.currentPersonnelId}`
            : e.currentUnitId
              ? `unit:${e.currentUnitId}`
              : null;

          return existingKey === assignmentKey;
        });

        if (existingItem && existingItem.currentAssignmentId) {
          const newQuantity = (existingItem.currentQuantity || existingItem.quantity) + (item.quantity || 1);

          await supabase
            .from('equipment_assignments')
            .update({ quantity: newQuantity })
            .eq('id', existingItem.currentAssignmentId);

          const baseId = existingItem.id.split('--')[0];
          await supabase
            .from('equipment')
            .update({ quantity: existingItem.quantity + (item.quantity || 1) })
            .eq('id', baseId);

          await fetchEquipment();
          return;
        }
      }
    }

    // Create new equipment record
    const { data: inserted, error: insertError } = await supabase
      .from('equipment')
      .insert({
        name: item.name,
        serial_number: item.serialNumber || null,
        description: item.description || null,
        quantity: item.quantity,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Create assignment if provided
    if (assignment && inserted && (assignment.personnelId || assignment.unitId)) {
      const { error: assignError } = await supabase
        .from('equipment_assignments')
        .insert({
          equipment_id: inserted.id,
          personnel_id: assignment.personnelId || null,
          unit_id: assignment.unitId || null,
          quantity: item.quantity || 1,
        });

      if (assignError) throw assignError;
    }

    await fetchEquipment();
  }, [fetchEquipment, equipment, user?.id]);

  const canDeleteEquipment = useCallback((equipmentItem: EquipmentWithAssignment, currentUserPersonnelId?: string): boolean => {
    if (!currentUserPersonnelId || equipmentItem.currentPersonnelId !== currentUserPersonnelId) {
      return false;
    }
    if (equipmentItem.createdBy !== user?.id) {
      return false;
    }
    return true;
  }, [user?.id]);

  const getBaseId = (id: string) => id.split('--')[0];

  const assignEquipment = useCallback(async (id: string, assignment: AssignmentData, quantity?: number) => {
    const equipmentId = getBaseId(id);

    const { error: rpcError } = await supabase.rpc('initiate_transfer', {
      p_equipment_id: equipmentId,
      p_to_unit_id: assignment.unitId || null,
      p_to_personnel_id: assignment.personnelId || null,
    });

    if (rpcError) throw rpcError;

    await fetchEquipment();
  }, [fetchEquipment]);

  const deleteEquipment = useCallback(async (id: string) => {
    const equipmentId = getBaseId(id);
    const { error: deleteError } = await supabase
      .from('equipment')
      .delete()
      .eq('id', equipmentId);

    if (deleteError) throw deleteError;
    await fetchEquipment();
  }, [fetchEquipment]);

  const unassignEquipment = useCallback(async (id: string) => {
    const equipmentId = getBaseId(id);
    const { error: unassignError } = await supabase
      .from('equipment_assignments')
      .update({ returned_at: new Date().toISOString() })
      .eq('equipment_id', equipmentId)
      .is('returned_at', null);

    if (unassignError) throw unassignError;
    await fetchEquipment();
  }, [fetchEquipment]);

  const requestAssignment = useCallback(async (
    id: string,
    assignment: AssignmentData,
    notes?: string,
    quantity?: number
  ) => {
    const equipmentId = getBaseId(id);

    const { error: rpcError } = await supabase.rpc('initiate_transfer', {
      p_equipment_id: equipmentId,
      p_to_unit_id: assignment.unitId || null,
      p_to_personnel_id: assignment.personnelId || null,
      p_notes: notes || null,
    });

    if (rpcError) throw rpcError;
    await fetchEquipment();
  }, [fetchEquipment]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  return {
    equipment,
    loading,
    error,
    refetch: fetchEquipment,
    addEquipment,
    deleteEquipment,
    assignEquipment,
    unassignEquipment,
    requestAssignment,
    canDeleteEquipment,
  };
}
