import { supabase } from '@/integrations/supabase/client';
import { useUnits, Unit, UnitType, UnitWithChildren } from './useUnits';
import { useToast } from '@/hooks/use-toast';
import type { UnitInsert, UnitUpdate } from '@/integrations/supabase/types';

interface UseUnitsManagementReturn {
  units: Unit[];
  battalions: Unit[];
  companies: Unit[];
  platoons: Unit[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getUnitById: (id: string) => Unit | undefined;
  getChildUnits: (parentId: string) => Unit[];
  getUnitAncestors: (unitId: string) => Unit[];
  getUnitPath: (unitId: string) => string;
  buildUnitTree: () => UnitWithChildren[];
  // Unit CRUD
  createUnit: (data: { name: string; unit_type: UnitType; parent_id?: string; designation?: string }) => Promise<Unit | null>;
  updateUnit: (id: string, data: Partial<UnitUpdate>) => Promise<boolean>;
  deleteUnit: (id: string) => Promise<boolean>;
}

export function useUnitsManagement(): UseUnitsManagementReturn {
  const {
    units,
    battalions,
    companies,
    platoons,
    loading,
    error,
    refetch,
    getUnitById,
    getChildUnits,
    getUnitAncestors,
    getUnitPath,
    buildUnitTree,
  } = useUnits();
  const { toast } = useToast();

  const createUnit = async (data: {
    name: string;
    unit_type: UnitType;
    parent_id?: string;
    designation?: string;
  }): Promise<Unit | null> => {
    const insertData: UnitInsert = {
      name: data.name,
      unit_type: data.unit_type,
      parent_id: data.parent_id || null,
      designation: data.designation,
    };

    const { data: newUnit, error } = await supabase
      .from('units')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }

    const typeLabels: Record<UnitType, string> = {
      battalion: 'Battalion',
      company: 'Company',
      platoon: 'Platoon',
    };

    toast({ title: 'Success', description: `${typeLabels[data.unit_type]} created successfully` });
    await refetch();
    return newUnit;
  };

  const updateUnit = async (id: string, data: Partial<UnitUpdate>): Promise<boolean> => {
    const { error } = await supabase
      .from('units')
      .update(data)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'Success', description: 'Unit updated successfully' });
    await refetch();
    return true;
  };

  const deleteUnit = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'Success', description: 'Unit deleted successfully' });
    await refetch();
    return true;
  };

  return {
    units,
    battalions,
    companies,
    platoons,
    loading,
    error,
    refetch,
    getUnitById,
    getChildUnits,
    getUnitAncestors,
    getUnitPath,
    buildUnitTree,
    createUnit,
    updateUnit,
    deleteUnit,
  };
}
