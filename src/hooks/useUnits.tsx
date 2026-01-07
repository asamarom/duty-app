import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Battalion = Tables<'battalions'>;
export type Company = Tables<'companies'>;
export type Platoon = Tables<'platoons'>;
// Keep Squad type for backward compatibility during migration
export type Squad = Tables<'squads'>;

interface UseUnitsReturn {
  battalions: Battalion[];
  companies: Company[];
  platoons: Platoon[];
  // Legacy support
  squads: Squad[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getCompaniesForBattalion: (battalionId: string) => Company[];
  getPlatoonsForCompany: (companyId: string) => Platoon[];
  // Legacy functions
  getPlatoonsForBattalion: (battalionId: string) => Platoon[];
  getSquadsForPlatoon: (platoonId: string) => Squad[];
}

export function useUnits(): UseUnitsReturn {
  const [battalions, setBattalions] = useState<Battalion[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [platoons, setPlatoons] = useState<Platoon[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      
      const [battalionsRes, companiesRes, platoonsRes, squadsRes] = await Promise.all([
        supabase.from('battalions').select('*').order('name'),
        supabase.from('companies').select('*').order('name'),
        supabase.from('platoons').select('*').order('name'),
        supabase.from('squads').select('*').order('name'),
      ]);

      if (battalionsRes.error) throw battalionsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (platoonsRes.error) throw platoonsRes.error;
      if (squadsRes.error) throw squadsRes.error;

      setBattalions(battalionsRes.data || []);
      setCompanies(companiesRes.data || []);
      setPlatoons(platoonsRes.data || []);
      setSquads(squadsRes.data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // New hierarchy functions
  const getCompaniesForBattalion = useCallback((battalionId: string) => {
    return companies.filter((c) => c.battalion_id === battalionId);
  }, [companies]);

  const getPlatoonsForCompany = useCallback((companyId: string) => {
    return platoons.filter((p) => p.company_id === companyId);
  }, [platoons]);

  // Legacy functions for backward compatibility
  const getPlatoonsForBattalion = useCallback((battalionId: string) => {
    return platoons.filter((p) => p.battalion_id === battalionId);
  }, [platoons]);

  const getSquadsForPlatoon = useCallback((platoonId: string) => {
    return squads.filter((s) => s.platoon_id === platoonId);
  }, [squads]);

  return {
    battalions,
    companies,
    platoons,
    squads,
    loading,
    error,
    refetch: fetchUnits,
    getCompaniesForBattalion,
    getPlatoonsForCompany,
    getPlatoonsForBattalion,
    getSquadsForPlatoon,
  };
}
