import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Battalion = Tables<'battalions'>;
export type Platoon = Tables<'platoons'>;
export type Squad = Tables<'squads'>;

interface UseUnitsReturn {
  battalions: Battalion[];
  platoons: Platoon[];
  squads: Squad[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getPlatoonsForBattalion: (battalionId: string) => Platoon[];
  getSquadsForPlatoon: (platoonId: string) => Squad[];
}

export function useUnits(): UseUnitsReturn {
  const [battalions, setBattalions] = useState<Battalion[]>([]);
  const [platoons, setPlatoons] = useState<Platoon[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      
      const [battalionsRes, platoonsRes, squadsRes] = await Promise.all([
        supabase.from('battalions').select('*').order('name'),
        supabase.from('platoons').select('*').order('name'),
        supabase.from('squads').select('*').order('name'),
      ]);

      if (battalionsRes.error) throw battalionsRes.error;
      if (platoonsRes.error) throw platoonsRes.error;
      if (squadsRes.error) throw squadsRes.error;

      setBattalions(battalionsRes.data || []);
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

  const getPlatoonsForBattalion = useCallback((battalionId: string) => {
    return platoons.filter((p) => p.battalion_id === battalionId);
  }, [platoons]);

  const getSquadsForPlatoon = useCallback((platoonId: string) => {
    return squads.filter((s) => s.platoon_id === platoonId);
  }, [squads]);

  return {
    battalions,
    platoons,
    squads,
    loading,
    error,
    refetch: fetchUnits,
    getPlatoonsForBattalion,
    getSquadsForPlatoon,
  };
}
