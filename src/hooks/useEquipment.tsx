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
  currentQuantity?: number; // The quantity at current assignment
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
  assignEquipment: (equipmentId: string, assignment: AssignmentData, quantity?: number) => Promise<void>;
  unassignEquipment: (equipmentId: string) => Promise<void>;
  requestAssignment: (equipmentId: string, assignment: AssignmentData, notes?: string, quantity?: number) => Promise<void>;
  isWithinSameUnit: (currentLevel: AssignmentLevel, targetLevel: AssignmentLevel, equipmentItem: EquipmentWithAssignment, assignment: AssignmentData) => boolean;
  canDeleteEquipment: (equipmentItem: EquipmentWithAssignment, currentUserPersonnelId?: string) => boolean;
  recordTransferHistory: (
    equipmentId: string,
    quantity: number,
    fromUnitType: string,
    fromIds: { battalionId?: string; companyId?: string; platoonId?: string; personnelId?: string },
    toUnitType: string,
    toIds: { battalionId?: string; companyId?: string; platoonId?: string; personnelId?: string },
    notes?: string
  ) => Promise<void>;
}

export function useEquipment(): UseEquipmentReturn {
  const [equipment, setEquipment] = useState<EquipmentWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch equipment with assignments including quantity
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
            quantity,
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
          let assignedType: 'individual' | 'company' | 'platoon' | 'battalion' = 'individual';
          let assignmentLevel: AssignmentLevel = 'unassigned';
          let currentBattalionId: string | undefined;
          let currentCompanyId: string | undefined;
          let currentPlatoonId: string | undefined;

          if (assignment.personnel) {
            assigneeName = `${assignment.personnel.first_name} ${assignment.personnel.last_name}`;
            assignedType = 'individual';
            assignmentLevel = 'individual';
          } else if (assignment.platoons) {
            assigneeName = assignment.platoons.name;
            assignedType = 'platoon';
            assignmentLevel = 'platoon';
            currentPlatoonId = assignment.platoon_id;
          } else if (assignment.companies) {
            assigneeName = assignment.companies.name;
            assignedType = 'company';
            assignmentLevel = 'company';
            currentCompanyId = assignment.company_id;
          } else if (assignment.battalions) {
            assigneeName = assignment.battalions.name;
            assignedType = 'battalion';
            assignmentLevel = 'battalion';
            currentBattalionId = assignment.battalion_id;
          }

          mappedEquipment.push({
            id: `${row.id}--${assignment.id}`,
            serialNumber: row.serial_number || undefined,
            name: row.name,
            description: row.description || undefined,
            quantity: row.quantity, // Total quantity of the base item
            assignedTo: assigneeName,
            assignedType,
            assigneeName,
            currentAssignmentId: assignment.id,
            currentPersonnelId: assignment.personnel_id,
            currentBattalionId: currentBattalionId || assignment.battalion_id,
            currentCompanyId: currentCompanyId || assignment.company_id,
            currentPlatoonId: currentPlatoonId || assignment.platoon_id,
            assignmentLevel,
            hasPendingTransfer: pendingEquipmentIds.has(row.id) || row.status === 'pending_transfer',
            currentQuantity: assignment.quantity || 1, // Quantity of THIS assignment
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
            assignedType: 'individual', // Default type for unassigned
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

  // Record transfer in history table
  const recordTransferHistory = useCallback(async (
    equipmentId: string,
    quantity: number,
    fromUnitType: string,
    fromIds: { battalionId?: string; companyId?: string; platoonId?: string; personnelId?: string },
    toUnitType: string,
    toIds: { battalionId?: string; companyId?: string; platoonId?: string; personnelId?: string },
    notes?: string
  ) => {
    await supabase.from('equipment_transfer_history').insert({
      equipment_id: equipmentId,
      quantity,
      from_unit_type: fromUnitType,
      from_battalion_id: fromIds.battalionId || null,
      from_company_id: fromIds.companyId || null,
      from_platoon_id: fromIds.platoonId || null,
      from_personnel_id: fromIds.personnelId || null,
      to_unit_type: toUnitType,
      to_battalion_id: toIds.battalionId || null,
      to_company_id: toIds.companyId || null,
      to_platoon_id: toIds.platoonId || null,
      to_personnel_id: toIds.personnelId || null,
      transferred_by: user?.id || null,
      notes: notes || null,
    });
  }, [user?.id]);

  const addEquipment = useCallback(async (item: Omit<Equipment, 'id'>, assignment?: AssignmentData) => {
    // For bulk items (no serial), check if equipment with same name exists at same assignment
    if (!item.serialNumber && assignment) {
      // Build assignment key for matching
      const assignmentKey = assignment.personnelId
        ? `personnel:${assignment.personnelId}`
        : assignment.platoonId
          ? `platoon:${assignment.platoonId}`
          : assignment.companyId
            ? `company:${assignment.companyId}`
            : assignment.battalionId
              ? `battalion:${assignment.battalionId}`
              : null;

      if (assignmentKey) {
        // Find existing equipment with same name at same location
        const existingItem = equipment.find(e => {
          if (e.serialNumber) return false; // Skip serialized items
          if (e.name.toLowerCase() !== item.name.toLowerCase()) return false;

          const existingKey = e.currentPersonnelId
            ? `personnel:${e.currentPersonnelId}`
            : e.currentPlatoonId
              ? `platoon:${e.currentPlatoonId}`
              : e.currentCompanyId
                ? `company:${e.currentCompanyId}`
                : e.currentBattalionId
                  ? `battalion:${e.currentBattalionId}`
                  : null;

          return existingKey === assignmentKey;
        });

        if (existingItem && existingItem.currentAssignmentId) {
          // Add to existing assignment's quantity
          const newQuantity = (existingItem.currentQuantity || existingItem.quantity) + (item.quantity || 1);

          await supabase
            .from('equipment_assignments')
            .update({ quantity: newQuantity })
            .eq('id', existingItem.currentAssignmentId);

          // Update the equipment's total quantity as well
          await supabase
            .from('equipment')
            .update({ quantity: existingItem.quantity + (item.quantity || 1) })
            .eq('id', existingItem.id);

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
    if (assignment && inserted && (assignment.personnelId || assignment.platoonId || assignment.companyId || assignment.battalionId)) {
      const { error: assignError } = await supabase
        .from('equipment_assignments')
        .insert({
          equipment_id: inserted.id,
          personnel_id: assignment.personnelId || null,
          platoon_id: assignment.platoonId || null,
          company_id: assignment.companyId || null,
          battalion_id: assignment.battalionId || null,
          quantity: item.quantity || 1,
        });

      if (assignError) throw assignError;
    }

    await fetchEquipment();
  }, [fetchEquipment, equipment, user?.id]);


  // Check if user can delete equipment (creator only, when assigned back to them)
  const canDeleteEquipment = useCallback((equipmentItem: EquipmentWithAssignment, currentUserPersonnelId?: string): boolean => {
    // Must be assigned to the current user's personnel record
    if (!currentUserPersonnelId || equipmentItem.currentPersonnelId !== currentUserPersonnelId) {
      return false;
    }
    // Equipment must have been created by current user
    if (equipmentItem.createdBy !== user?.id) {
      return false;
    }
    return true;
  }, [user?.id]);

  const getBaseId = (id: string) => id.split('--')[0];

  const assignEquipment = useCallback(async (id: string, assignment: AssignmentData, quantity?: number) => {
    const equipmentId = getBaseId(id);
    
    // Close any existing active assignment
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
        quantity: quantity || 1,
      });

    if (assignError) throw assignError;

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
    id: string,
    assignment: AssignmentData,
    notes?: string,
    quantity?: number
  ) => {
    if (!user) throw new Error('Not authenticated');
    
    const equipmentId = getBaseId(id);
    
    // Get current assignment info
    const currentItem = equipment.find(e => e.id === id);
    const fromUnitType = currentItem?.assignmentLevel || 'unassigned';
    
    const toUnitType = assignment.personnelId ? 'individual'
      : assignment.platoonId ? 'platoon'
        : assignment.companyId ? 'company'
          : assignment.battalionId ? 'battalion'
            : 'unassigned';

    // Create assignment request
    const { data: requestData, error: insertError } = await supabase
      .from('assignment_requests')
      .insert({
        equipment_id: equipmentId,
        from_unit_type: fromUnitType,
        from_battalion_id: currentItem?.currentBattalionId || null,
        from_company_id: currentItem?.currentCompanyId || null,
        from_platoon_id: currentItem?.currentPlatoonId || null,
        from_personnel_id: currentItem?.currentPersonnelId || null,
        to_unit_type: toUnitType,
        to_battalion_id: assignment.battalionId || null,
        to_company_id: assignment.companyId || null,
        to_platoon_id: assignment.platoonId || null,
        to_personnel_id: assignment.personnelId || null,
        notes: notes || null,
        requested_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Auto-approve as sender
    if (requestData) {
      await supabase.from('assignment_approvals').insert({
        request_id: requestData.id,
        action: 'approved',
        action_by: user.id,
        notes: 'Sender initiated transfer',
      });
    }

    await fetchEquipment();
  }, [fetchEquipment, user, equipment]);

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
    isWithinSameUnit,
    canDeleteEquipment,
    recordTransferHistory,
  };
}
