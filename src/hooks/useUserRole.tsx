import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

export type UserRole = Tables<'user_roles'>;
export type AppRole = 'admin' | 'leader' | 'user';

interface UseUserRoleReturn {
  roles: AppRole[];
  isAdmin: boolean;
  isLeader: boolean;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = async () => {
    if (!user) {
      setLoading(false);
      setRoles([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      const userRoles = data?.map((r) => r.role as AppRole) || [];
      setRoles(userRoles);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [user?.id]);

  return {
    roles,
    isAdmin: roles.includes('admin'),
    isLeader: roles.includes('leader'),
    loading,
    error,
    refetch: fetchRoles,
  };
}
