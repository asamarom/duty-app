import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { Equipment } from '@/types/pmtb';
import { useAuth } from '@/hooks/useAuth';

export type EquipmentRow = Tables<'equipment'>;

export type AssignmentLevel = 'battalion' | 'platoon' | 'squad' | 'individual' | 'unassigned';

export interface EquipmentWithAssignment extends Equipment {
  assigneeName?: string;
  currentAssignmentId?: string;
  currentPersonnelId?: string;
  currentBattalionId?: string;
  currentPlatoonId?: string;
  currentSquadId?: string;
  assignmentLevel: AssignmentLevel;
}

interface AssignmentData {
  personnelId?: string;
  platoonId?: string;
  squadId?: string;
  battalionId?: string;
}

interface UseEquipmentReturn {
  equipment: EquipmentWithAssignment[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addEquipment: (item: Omit<Equipment, 'id'>, assignment?: AssignmentData) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>;
  assignEquipment: (equipmentId: string, assignment: AssignmentData) => Promise<void>;
  unassignEquipment: (equipmentId: string) => Promise<void>;
  requestAssignment: (equipmentId: string, assignment: AssignmentData, notes?: string) => Promise<void>;
  isWithinSameUnit: (currentLevel: AssignmentLevel, targetLevel: AssignmentLevel, equipmentItem: EquipmentWithAssignment, assignment: AssignmentData) => boolean;
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
            platoon_id,
            squad_id,
            returned_at,
            personnel(first_name, last_name),
            platoons(name),
            squads(name)
          )
        `)
        .order('name');

      if (fetchError) throw fetchError;

      // Fetch battalion assignments separately (since types aren't regenerated yet)
      const { data: battalionAssignments } = await supabase
        .from('equipment_assignments')
        .select('id, equipment_id, battalion_id, battalions(name)')
        .not('battalion_id', 'is', null)
        .is('returned_at', null);

      // Create a map of equipment_id to battalion assignment
      const battalionMap = new Map<string, { battalion_id: string; battalionName: string }>();
      if (battalionAssignments) {
        for (const ba of battalionAssignments as any[]) {
          if (ba.battalion_id && ba.battalions) {
            battalionMap.set(ba.equipment_id, {
              battalion_id: ba.battalion_id,
              battalionName: ba.battalions.name,
            });
          }
        }
      }

      const mappedEquipment: EquipmentWithAssignment[] = (equipmentData || []).map((row) => {
        // Find active assignment (not returned)
        const activeAssignment = row.equipment_assignments?.find(
          (a: { returned_at: string | null }) => !a.returned_at
        );

        let assigneeName: string | undefined;
        let assignedType: 'individual' | 'squad' | 'platoon' | 'battalion' = 'individual';
        let assignmentLevel: AssignmentLevel = 'unassigned';
        let currentBattalionId: string | undefined;

        // Check for battalion assignment first
        const battalionAssignment = battalionMap.get(row.id);
        if (battalionAssignment) {
          assigneeName = battalionAssignment.battalionName;
          assignedType = 'battalion';
          assignmentLevel = 'battalion';
          currentBattalionId = battalionAssignment.battalion_id;
        } else if (activeAssignment) {
          if (activeAssignment.personnel) {
            assigneeName = `${activeAssignment.personnel.first_name} ${activeAssignment.personnel.last_name}`;
            assignedType = 'individual';
            assignmentLevel = 'individual';
          } else if (activeAssignment.squads) {
            assigneeName = activeAssignment.squads.name;
            assignedType = 'squad';
            assignmentLevel = 'squad';
          } else if (activeAssignment.platoons) {
            assigneeName = activeAssignment.platoons.name;
            assignedType = 'platoon';
            assignmentLevel = 'platoon';
          }
        }

        return {
          id: row.id,
          serialNumber: row.serial_number || undefined,
          name: row.name,
          description: row.description || undefined,
          quantity: row.quantity,
          assignedTo: assigneeName,
          assignedType,
          assigneeName,
          currentAssignmentId: activeAssignment?.id,
          currentPersonnelId: activeAssignment?.personnel_id,
          currentBattalionId,
          currentPlatoonId: activeAssignment?.platoon_id,
          currentSquadId: activeAssignment?.squad_id,
          assignmentLevel,
        };
      });
      
      setEquipment(mappedEquipment);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEquipment = useCallback(async (item: Omit<Equipment, 'id'>, assignment?: AssignmentData) => {
    const { data: inserted, error: insertError } = await supabase
      .from('equipment')
      .insert({
        name: item.name,
        serial_number: item.serialNumber || null,
        description: item.description || null,
        quantity: item.quantity,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Create assignment if provided
    if (assignment && inserted && (assignment.personnelId || assignment.platoonId || assignment.squadId || assignment.battalionId)) {
      const { error: assignError } = await supabase
        .from('equipment_assignments')
        .insert({
          equipment_id: inserted.id,
          personnel_id: assignment.personnelId || null,
          platoon_id: assignment.platoonId || null,
          squad_id: assignment.squadId || null,
          battalion_id: assignment.battalionId || null,
        } as any);

      if (assignError) throw assignError;
    }

    await fetchEquipment();
  }, [fetchEquipment]);

  const deleteEquipment = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    await fetchEquipment();
  }, [fetchEquipment]);

  const updateEquipment = useCallback(async (id: string, updates: Partial<Equipment>) => {
    const { error: updateError } = await supabase
      .from('equipment')
      .update({
        name: updates.name,
        serial_number: updates.serialNumber || null,
        description: updates.description || null,
        quantity: updates.quantity,
      })
      .eq('id', id);

    if (updateError) throw updateError;
    await fetchEquipment();
  }, [fetchEquipment]);

  const assignEquipment = useCallback(async (equipmentId: string, assignment: AssignmentData) => {
    // First, mark any existing assignment as returned
    await supabase
      .from('equipment_assignments')
      .update({ returned_at: new Date().toISOString() })
      .eq('equipment_id', equipmentId)
      .is('returned_at', null);

    // Create new assignment
    const { error: assignError } = await supabase
      .from('equipment_assignments')
      .insert({
        equipment_id: equipmentId,
        personnel_id: assignment.personnelId || null,
        platoon_id: assignment.platoonId || null,
        squad_id: assignment.squadId || null,
        battalion_id: assignment.battalionId || null,
      } as any);

    if (assignError) throw assignError;
    await fetchEquipment();
  }, [fetchEquipment]);

  const unassignEquipment = useCallback(async (equipmentId: string) => {
    const { error: unassignError } = await supabase
      .from('equipment_assignments')
      .update({ returned_at: new Date().toISOString() })
      .eq('equipment_id', equipmentId)
      .is('returned_at', null);

    if (unassignError) throw unassignError;
    await fetchEquipment();
  }, [fetchEquipment]);

  // Helper function to determine if assignment is within same unit (to member)
  const isWithinSameUnit = useCallback((
    currentLevel: AssignmentLevel,
    targetLevel: AssignmentLevel,
    equipmentItem: EquipmentWithAssignment,
    assignment: AssignmentData
  ): boolean => {
    // Assigning to individual within current unit is direct
    if (targetLevel === 'individual' && assignment.personnelId) {
      // If current is battalion, assigning to someone in that battalion is direct
      // If current is platoon, assigning to someone in that platoon is direct
      // If current is squad, assigning to someone in that squad is direct
      return true; // For now, consider individual assignment from any level as direct
    }
    
    // If target and current are same type/id, it's within same unit
    if (currentLevel === 'battalion' && targetLevel === 'battalion' && 
        equipmentItem.currentBattalionId === assignment.battalionId) {
      return true;
    }
    if (currentLevel === 'platoon' && targetLevel === 'platoon' && 
        equipmentItem.currentPlatoonId === assignment.platoonId) {
      return true;
    }
    if (currentLevel === 'squad' && targetLevel === 'squad' && 
        equipmentItem.currentSquadId === assignment.squadId) {
      return true;
    }
    
    return false;
  }, []);

  // Create an assignment request for cross-unit transfers
  const requestAssignment = useCallback(async (
    equipmentId: string, 
    assignment: AssignmentData,
    notes?: string
  ) => {
    const equipmentItem = equipment.find(e => e.id === equipmentId);
    if (!equipmentItem) throw new Error('Equipment not found');

    const fromUnitType = equipmentItem.assignmentLevel || 'unassigned';
    const toUnitType = assignment.personnelId ? 'individual' 
      : assignment.squadId ? 'squad'
      : assignment.platoonId ? 'platoon'
      : assignment.battalionId ? 'battalion'
      : 'unassigned';

    const { error: insertError } = await supabase
      .from('assignment_requests')
      .insert({
        equipment_id: equipmentId,
        from_unit_type: fromUnitType,
        from_battalion_id: equipmentItem.currentBattalionId || null,
        from_platoon_id: equipmentItem.currentPlatoonId || null,
        from_squad_id: equipmentItem.currentSquadId || null,
        from_personnel_id: equipmentItem.currentPersonnelId || null,
        to_unit_type: toUnitType,
        to_battalion_id: assignment.battalionId || null,
        to_platoon_id: assignment.platoonId || null,
        to_squad_id: assignment.squadId || null,
        to_personnel_id: assignment.personnelId || null,
        requested_by: user?.id || null,
        notes: notes || null,
      });

    if (insertError) throw insertError;
  }, [equipment, user?.id]);

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
    updateEquipment,
    assignEquipment,
    unassignEquipment,
    requestAssignment,
    isWithinSameUnit,
  };
}
