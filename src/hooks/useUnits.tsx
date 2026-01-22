import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Unit, UnitType } from '@/integrations/supabase/types';

export type { Unit, UnitType };

// Helper type for unit with children
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
      const { data, error: fetchError } = await supabase
        .from('units')
        .select('*')
        .order('unit_type')
        .order('name');

      if (fetchError) throw fetchError;
      setUnits(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Filter units by type
  const battalions = useMemo(() =>
    units.filter(u => u.unit_type === 'battalion'), [units]);

  const companies = useMemo(() =>
    units.filter(u => u.unit_type === 'company'), [units]);

  const platoons = useMemo(() =>
    units.filter(u => u.unit_type === 'platoon'), [units]);

  // Get unit by ID
  const getUnitById = useCallback((id: string) => {
    return units.find(u => u.id === id);
  }, [units]);

  // Get direct children of a unit
  const getChildUnits = useCallback((parentId: string) => {
    return units.filter(u => u.parent_id === parentId);
  }, [units]);

  // Get all ancestors of a unit (from immediate parent to root)
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

  // Get full path string for a unit (e.g., "Battalion > Company > Platoon")
  const getUnitPath = useCallback((unitId: string): string => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return '';

    const ancestors = getUnitAncestors(unitId);
    const path = [...ancestors.reverse(), unit];
    return path.map(u => u.name).join(' > ');
  }, [units, getUnitAncestors]);

  // Build hierarchical tree structure
  const buildUnitTree = useCallback((): UnitWithChildren[] => {
    const unitMap = new Map<string, UnitWithChildren>();

    // Create map with empty children arrays
    units.forEach(unit => {
      unitMap.set(unit.id, { ...unit, children: [] });
    });

    const roots: UnitWithChildren[] = [];

    // Build tree by assigning children to parents
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

  // Get companies for a specific battalion
  const getCompaniesForBattalion = useCallback((battalionId: string): Unit[] => {
    return units.filter(u => u.unit_type === 'company' && u.parent_id === battalionId);
  }, [units]);

  // Get platoons for a specific company
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
