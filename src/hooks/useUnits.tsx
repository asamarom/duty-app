import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { UnitDoc, UnitType } from '@/integrations/firebase/types';

// Re-export types for backwards compatibility
export type { UnitType };

// Unit type matching the existing interface
export interface Unit {
  id: string;
  name: string;
  unit_type: UnitType;
  parent_id: string | null;
  designation: string | null;
  leader_id: string | null;
  status: 'active' | 'inactive' | 'deployed';
  created_at: string;
  updated_at: string;
}

export interface UnitWithChildren extends Unit {
  children: UnitWithChildren[];
}

interface UseUnitsReturn {
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
  getCompaniesForBattalion: (battalionId: string) => Unit[];
  getPlatoonsForCompany: (companyId: string) => Unit[];
}

export function useUnits(): UseUnitsReturn {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const unitsRef = collection(db, 'units');
      const q = query(unitsRef, orderBy('name'));
      const snapshot = await getDocs(q);

      const fetchedUnits: Unit[] = snapshot.docs.map((doc) => {
        const data = doc.data() as UnitDoc;
        return {
          id: doc.id,
          name: data.name,
          unit_type: data.unitType,
          parent_id: data.parentId,
          designation: data.designation,
          leader_id: data.leaderId,
          status: data.status,
          created_at: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updated_at: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        };
      });

      // Sort by unit_type then name
      fetchedUnits.sort((a, b) => {
        const typeOrder = { battalion: 0, company: 1, platoon: 2 };
        const typeCompare = typeOrder[a.unit_type] - typeOrder[b.unit_type];
        if (typeCompare !== 0) return typeCompare;
        return a.name.localeCompare(b.name);
      });

      setUnits(fetchedUnits);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const battalions = useMemo(() =>
    units.filter(u => u.unit_type === 'battalion'), [units]);

  const companies = useMemo(() =>
    units.filter(u => u.unit_type === 'company'), [units]);

  const platoons = useMemo(() =>
    units.filter(u => u.unit_type === 'platoon'), [units]);

  const getUnitById = useCallback((id: string) => {
    return units.find(u => u.id === id);
  }, [units]);

  const getChildUnits = useCallback((parentId: string) => {
    return units.filter(u => u.parent_id === parentId);
  }, [units]);

  const getUnitAncestors = useCallback((unitId: string): Unit[] => {
    const ancestors: Unit[] = [];
    let current = units.find(u => u.id === unitId);

    while (current?.parent_id) {
      const parent = units.find(u => u.id === current!.parent_id);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }, [units]);

  const getUnitPath = useCallback((unitId: string): string => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return '';

    const ancestors = getUnitAncestors(unitId);
    const path = [...ancestors.reverse(), unit];
    return path.map(u => u.name).join(' > ');
  }, [units, getUnitAncestors]);

  const buildUnitTree = useCallback((): UnitWithChildren[] => {
    const unitMap = new Map<string, UnitWithChildren>();

    units.forEach(unit => {
      unitMap.set(unit.id, { ...unit, children: [] });
    });

    const roots: UnitWithChildren[] = [];

    unitMap.forEach(unit => {
      if (unit.parent_id) {
        const parent = unitMap.get(unit.parent_id);
        if (parent) {
          parent.children.push(unit);
        }
      } else {
        roots.push(unit);
      }
    });

    return roots;
  }, [units]);

  const getCompaniesForBattalion = useCallback((battalionId: string): Unit[] => {
    return units.filter(u => u.unit_type === 'company' && u.parent_id === battalionId);
  }, [units]);

  const getPlatoonsForCompany = useCallback((companyId: string): Unit[] => {
    return units.filter(u => u.unit_type === 'platoon' && u.parent_id === companyId);
  }, [units]);

  return {
    units,
    battalions,
    companies,
    platoons,
    loading,
    error,
    refetch: fetchUnits,
    getUnitById,
    getChildUnits,
    getUnitAncestors,
    getUnitPath,
    buildUnitTree,
    getCompaniesForBattalion,
    getPlatoonsForCompany,
  };
}
