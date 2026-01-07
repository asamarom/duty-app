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
  currentBattalionId?: string;
  currentCompanyId?: string;
  currentPlatoonId?: string;
  assignmentLevel: AssignmentLevel;
  hasPendingTransfer?: boolean;
}

interface AssignmentData {
  personnelId?: string;
  platoonId?: string;
  companyId?: string;
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
            company_id,
            battalion_id,
            returned_at,
            personnel(first_name, last_name),
            platoons(name),
            companies(name),
            battalions(name)
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

      const mappedEquipment: EquipmentWithAssignment[] = (equipmentData || []).map((row: any) => {
        // Find active assignment (not returned)
        const activeAssignment = row.equipment_assignments?.find(
          (a: { returned_at: string | null }) => !a.returned_at
        );

        let assigneeName: string | undefined;
        let assignedType: 'individual' | 'company' | 'platoon' | 'battalion' = 'individual';
        let assignmentLevel: AssignmentLevel = 'unassigned';
        let currentBattalionId: string | undefined;
        let currentCompanyId: string | undefined;
        let currentPlatoonId: string | undefined;

        if (activeAssignment) {
          if (activeAssignment.personnel) {
            assigneeName = `${activeAssignment.personnel.first_name} ${activeAssignment.personnel.last_name}`;
            assignedType = 'individual';
            assignmentLevel = 'individual';
          } else if (activeAssignment.platoons) {
            assigneeName = activeAssignment.platoons.name;
            assignedType = 'platoon';
            assignmentLevel = 'platoon';
            currentPlatoonId = activeAssignment.platoon_id;
          } else if (activeAssignment.companies) {
            assigneeName = activeAssignment.companies.name;
            assignedType = 'company';
            assignmentLevel = 'company';
            currentCompanyId = activeAssignment.company_id;
          } else if (activeAssignment.battalions) {
            assigneeName = activeAssignment.battalions.name;
            assignedType = 'battalion';
            assignmentLevel = 'battalion';
            currentBattalionId = activeAssignment.battalion_id;
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
          currentBattalionId: currentBattalionId || activeAssignment?.battalion_id,
          currentCompanyId: currentCompanyId || activeAssignment?.company_id,
          currentPlatoonId: currentPlatoonId || activeAssignment?.platoon_id,
          assignmentLevel,
          hasPendingTransfer: pendingEquipmentIds.has(row.id),
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
    if (assignment && inserted && (assignment.personnelId || assignment.platoonId || assignment.companyId || assignment.battalionId)) {
      const { error: assignError } = await supabase
        .from('equipment_assignments')
        .insert({
          equipment_id: inserted.id,
          personnel_id: assignment.personnelId || null,
          platoon_id: assignment.platoonId || null,
          company_id: assignment.companyId || null,
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
        company_id: assignment.companyId || null,
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

  // Helper function to determine if assignment is within same unit (to member)
  const isWithinSameUnit = useCallback((
    currentLevel: AssignmentLevel,
    targetLevel: AssignmentLevel,
    equipmentItem: EquipmentWithAssignment,
    assignment: AssignmentData
  ): boolean => {
    // Assigning to individual within current unit is direct
    if (targetLevel === 'individual' && assignment.personnelId) {
      return true; // For now, consider individual assignment from any level as direct
    }
    
    // If target and current are same type/id, it's within same unit
    if (currentLevel === 'battalion' && targetLevel === 'battalion' && 
        equipmentItem.currentBattalionId === assignment.battalionId) {
      return true;
    }
    if (currentLevel === 'company' && targetLevel === 'company' && 
        equipmentItem.currentCompanyId === assignment.companyId) {
      return true;
    }
    if (currentLevel === 'platoon' && targetLevel === 'platoon' && 
        equipmentItem.currentPlatoonId === assignment.platoonId) {
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
      : assignment.platoonId ? 'platoon'
      : assignment.companyId ? 'company'
      : assignment.battalionId ? 'battalion'
      : 'unassigned';

    const { error: insertError } = await supabase
      .from('assignment_requests')
      .insert({
        equipment_id: equipmentId,
        from_unit_type: fromUnitType,
        from_battalion_id: equipmentItem.currentBattalionId || null,
        from_company_id: equipmentItem.currentCompanyId || null,
        from_platoon_id: equipmentItem.currentPlatoonId || null,
        from_personnel_id: equipmentItem.currentPersonnelId || null,
        to_unit_type: toUnitType,
        to_battalion_id: assignment.battalionId || null,
        to_company_id: assignment.companyId || null,
        to_platoon_id: assignment.platoonId || null,
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
