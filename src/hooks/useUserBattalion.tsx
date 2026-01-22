import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UseUserUnitReturn {
  unitId: string | null;
  // Backwards compatibility alias
  battalionId: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get the current user's assigned unit from their profile.
 * Returns unitId (and battalionId as alias for backwards compatibility).
 */
export function useUserBattalion(): UseUserUnitReturn {
  const { user } = useAuth();
  const [unitId, setUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnit = useCallback(async () => {
    if (!user?.id) {
      setUnitId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('unit_id')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;
      setUnitId(data?.unit_id || null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUnit();
  }, [fetchUnit]);

  return {
    unitId,
    battalionId: unitId, // Backwards compatibility
    loading,
    error,
    refetch: fetchUnit,
  };
}
