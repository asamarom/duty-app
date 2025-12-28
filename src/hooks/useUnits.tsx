import { useState, useEffect } from 'react';
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
  getPlatoonsForBattalion: (battalionId: string) => Platoon[];
  getSquadsForPlatoon: (platoonId: string) => Squad[];
}

export function useUnits(): UseUnitsReturn {
  const [battalions, setBattalions] = useState<Battalion[]>([]);
  const [platoons, setPlatoons] = useState<Platoon[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUnits = async () => {
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
    };

    fetchUnits();
  }, []);

  const getPlatoonsForBattalion = (battalionId: string) => {
    return platoons.filter((p) => p.battalion_id === battalionId);
  };

  const getSquadsForPlatoon = (platoonId: string) => {
    return squads.filter((s) => s.platoon_id === platoonId);
  };

  return {
    battalions,
    platoons,
    squads,
    loading,
    error,
    getPlatoonsForBattalion,
    getSquadsForPlatoon,
  };
}
