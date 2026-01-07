import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UseUserBattalionReturn {
  battalionId: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUserBattalion(): UseUserBattalionReturn {
  const { user } = useAuth();
  const [battalionId, setBattalionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBattalion = useCallback(async () => {
    if (!user?.id) {
      setBattalionId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('battalion_id')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;
      setBattalionId(data?.battalion_id || null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBattalion();
  }, [fetchBattalion]);

  return {
    battalionId,
    loading,
    error,
    refetch: fetchBattalion,
  };
}
