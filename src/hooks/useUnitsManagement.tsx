import { doc, addDoc, setDoc, updateDoc, deleteDoc, collection, serverTimestamp, type FieldValue } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useUnits, Unit, UnitType, UnitWithChildren } from './useUnits';
import { useToast } from '@/hooks/use-toast';

interface UnitUpdate {
  name?: string;
  unit_type?: UnitType;
  parent_id?: string | null;
  designation?: string | null;
  leader_id?: string | null;
  status?: 'active' | 'inactive' | 'deployed';
}

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

  // Traverse the in-memory units list to find the battalion for a given unit
  const findBattalionId = (unitId: string | undefined): string | null => {
    if (!unitId) return null;
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return null;
    if (unit.unit_type === 'battalion') return unit.id;
    return findBattalionId(unit.parent_id ?? undefined);
  };

  const createUnit = async (data: {
    name: string;
    unit_type: UnitType;
    parent_id?: string;
    designation?: string;
  }): Promise<Unit | null> => {
    try {
      const unitsRef = collection(db, 'units');

      // Pre-generate the doc reference so we know the ID before writing.
      // This lets battalions self-reference their own ID as battalionId.
      const docRef = doc(unitsRef);
      const parentBattalionId = data.unit_type !== 'battalion'
        ? findBattalionId(data.parent_id)
        : null;

      await setDoc(docRef, {
        name: data.name,
        unitType: data.unit_type,
        parentId: data.parent_id || null,
        designation: data.designation || null,
        leaderId: null,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Battalions use their own ID; child units inherit from their parent battalion.
        battalionId: data.unit_type === 'battalion' ? docRef.id : (parentBattalionId || null),
      });

      const typeLabels: Record<UnitType, string> = {
        battalion: 'Battalion',
        company: 'Company',
        platoon: 'Platoon',
      };

      toast({ title: 'Success', description: `${typeLabels[data.unit_type]} created successfully` });
      await refetch();

      return {
        id: docRef.id,
        name: data.name,
        unit_type: data.unit_type,
        parent_id: data.parent_id || null,
        designation: data.designation || null,
        leader_id: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
      return null;
    }
  };

  const updateUnit = async (id: string, data: Partial<UnitUpdate>): Promise<boolean> => {
    try {
      const unitDocRef = doc(db, 'units', id);
      const updateData: Record<string, FieldValue | string | boolean | number | null> = { updatedAt: serverTimestamp() };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.unit_type !== undefined) updateData.unitType = data.unit_type;
      if (data.parent_id !== undefined) updateData.parentId = data.parent_id;
      if (data.designation !== undefined) updateData.designation = data.designation;
      if (data.leader_id !== undefined) updateData.leaderId = data.leader_id;
      if (data.status !== undefined) updateData.status = data.status;

      await updateDoc(unitDocRef, updateData);

      toast({ title: 'Success', description: 'Unit updated successfully' });
      await refetch();
      return true;
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
      return false;
    }
  };

  const deleteUnitFn = async (id: string): Promise<boolean> => {
    try {
      const unitDocRef = doc(db, 'units', id);
      await deleteDoc(unitDocRef);

      toast({ title: 'Success', description: 'Unit deleted successfully' });
      await refetch();
      return true;
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
      return false;
    }
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
    deleteUnit: deleteUnitFn,
  };
}
