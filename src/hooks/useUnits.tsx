import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Battalion = Tables<'battalions'>;
export type Company = Tables<'companies'>;
export type Platoon = Tables<'platoons'>;

interface UseUnitsReturn {
  battalions: Battalion[];
  companies: Company[];
  platoons: Platoon[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getCompaniesForBattalion: (battalionId: string) => Company[];
  getPlatoonsForCompany: (companyId: string) => Platoon[];
}

export function useUnits(): UseUnitsReturn {
  const [battalions, setBattalions] = useState<Battalion[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [platoons, setPlatoons] = useState<Platoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);

      const [battalionsRes, companiesRes, platoonsRes] = await Promise.all([
        supabase.from('battalions').select('*').order('name'),
        supabase.from('companies').select('*').order('name'),
        supabase.from('platoons').select('*').order('name'),
      ]);

      if (battalionsRes.error) throw battalionsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (platoonsRes.error) throw platoonsRes.error;

      setBattalions(battalionsRes.data || []);
      setCompanies(companiesRes.data || []);
      setPlatoons(platoonsRes.data || []);
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


  return {
    battalions,
    companies,
    platoons,
    loading,
    error,
    refetch: fetchUnits,
    getCompaniesForBattalion,
    getPlatoonsForCompany,
  };
}
