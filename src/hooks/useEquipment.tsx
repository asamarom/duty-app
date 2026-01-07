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
          currentQuantity: activeAssignment?.quantity || row.quantity,
          createdBy: row.created_by,
        };
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

  const deleteEquipment = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    await fetchEquipment();
  }, [fetchEquipment]);

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

  const assignEquipment = useCallback(async (equipmentId: string, assignment: AssignmentData, quantity?: number) => {
    const equipmentItem = equipment.find(e => e.id === equipmentId);
    if (!equipmentItem) throw new Error('Equipment not found');
    
    const transferQty = quantity || equipmentItem.currentQuantity || equipmentItem.quantity;
    const currentQty = equipmentItem.currentQuantity || equipmentItem.quantity;
    const isPartialTransfer = transferQty < currentQty;
    
    // Record transfer history
    const fromUnitType = equipmentItem.assignmentLevel || 'unassigned';
    const toUnitType = assignment.personnelId ? 'individual' 
      : assignment.platoonId ? 'platoon'
      : assignment.companyId ? 'company'
      : assignment.battalionId ? 'battalion'
      : 'unassigned';
    
    await recordTransferHistory(
      equipmentId,
      transferQty,
      fromUnitType,
      {
        battalionId: equipmentItem.currentBattalionId,
        companyId: equipmentItem.currentCompanyId,
        platoonId: equipmentItem.currentPlatoonId,
        personnelId: equipmentItem.currentPersonnelId,
      },
      toUnitType,
      {
        battalionId: assignment.battalionId,
        companyId: assignment.companyId,
        platoonId: assignment.platoonId,
        personnelId: assignment.personnelId,
      }
    );

    if (isPartialTransfer) {
      // Partial transfer: update source quantity, create new assignment
      if (equipmentItem.currentAssignmentId) {
        await supabase
          .from('equipment_assignments')
          .update({ quantity: currentQty - transferQty })
          .eq('id', equipmentItem.currentAssignmentId);
      }
      
      // Create new assignment with transferred quantity
      const { error: assignError } = await supabase
        .from('equipment_assignments')
        .insert({
          equipment_id: equipmentId,
          personnel_id: assignment.personnelId || null,
          platoon_id: assignment.platoonId || null,
          company_id: assignment.companyId || null,
          battalion_id: assignment.battalionId || null,
          quantity: transferQty,
        });

      if (assignError) throw assignError;
    } else {
      // Full transfer: mark source as returned, create new assignment
      await supabase
        .from('equipment_assignments')
        .update({ returned_at: new Date().toISOString() })
        .eq('equipment_id', equipmentId)
        .is('returned_at', null);

      const { error: assignError } = await supabase
        .from('equipment_assignments')
        .insert({
          equipment_id: equipmentId,
          personnel_id: assignment.personnelId || null,
          platoon_id: assignment.platoonId || null,
          company_id: assignment.companyId || null,
          battalion_id: assignment.battalionId || null,
          quantity: transferQty,
        });

      if (assignError) throw assignError;
    }
    
    await fetchEquipment();
  }, [fetchEquipment, equipment, recordTransferHistory]);

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
    notes?: string,
    quantity?: number
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
        notes: notes ? `${notes}${quantity ? ` (Quantity: ${quantity})` : ''}` : (quantity ? `Quantity: ${quantity}` : null),
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
    assignEquipment,
    unassignEquipment,
    requestAssignment,
    isWithinSameUnit,
    canDeleteEquipment,
    recordTransferHistory,
  };
}
