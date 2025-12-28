import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { Equipment } from '@/types/pmtb';

export type EquipmentRow = Tables<'equipment'>;

export type AssignmentLevel = 'battalion' | 'platoon' | 'squad' | 'individual' | 'unassigned';

interface EquipmentWithAssignment extends Equipment {
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
}

export function useEquipment(): UseEquipmentReturn {
  const [equipment, setEquipment] = useState<EquipmentWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch equipment with assignments including battalion
      const { data: equipmentData, error: fetchError } = await supabase
        .from('equipment')
        .select(`
          *,
          equipment_assignments(
            id,
            personnel_id,
            platoon_id,
            squad_id,
            battalion_id,
            returned_at,
            personnel(first_name, last_name),
            platoons(name),
            squads(name),
            battalions(name)
          )
        `)
        .order('name');

      if (fetchError) throw fetchError;

      const mappedEquipment: EquipmentWithAssignment[] = (equipmentData || []).map((row) => {
        // Find active assignment (not returned)
        const activeAssignment = row.equipment_assignments?.find(
          (a: { returned_at: string | null }) => !a.returned_at
        );

        let assigneeName: string | undefined;
        let assignedType: 'individual' | 'squad' | 'platoon' = 'individual';
        let assignmentLevel: AssignmentLevel = 'unassigned';

        if (activeAssignment) {
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
          } else if (activeAssignment.battalions) {
            assigneeName = activeAssignment.battalions.name;
            assignedType = 'platoon'; // For display purposes
            assignmentLevel = 'battalion';
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
          currentBattalionId: activeAssignment?.battalion_id,
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
        });

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
      });

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
  };
}
