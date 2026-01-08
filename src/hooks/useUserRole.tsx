import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

export type UserRole = Tables<'user_roles'>;
export type AppRole = 'admin' | 'leader' | 'user';

interface UseUserRoleReturn {
  roles: AppRole[];
  actualRoles: AppRole[]; // The actual roles from DB, unaffected by admin mode
  isAdmin: boolean;
  isLeader: boolean;
  isActualAdmin: boolean; // True if user is actually an admin (regardless of mode)
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [actualRoles, setActualRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = async () => {
    if (!user) {
      setError(null);
      setLoading(false);
      setActualRoles([]);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Primary path: read roles from the roles table (preferred when RLS is configured).
      const { data, error: fetchError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!fetchError) {
        const userRoles = data?.map((r) => r.role as AppRole) || [];
        setActualRoles(userRoles);
        return;
      }

      // Fallback path: use security-definer RPC checks (works even if direct SELECT is blocked).
      const [adminRes, leaderRes] = await Promise.all([
        supabase.rpc('has_role', { _role: 'admin', _user_id: user.id }),
        supabase.rpc('has_role', { _role: 'leader', _user_id: user.id }),
      ]);

      if (adminRes.error) throw adminRes.error;
      if (leaderRes.error) throw leaderRes.error;

      const userRoles: AppRole[] = [
        ...(adminRes.data ? (['admin'] as AppRole[]) : []),
        ...(leaderRes.data ? (['leader'] as AppRole[]) : []),
      ];

      setActualRoles(userRoles);
    } catch (err) {
      setError(err as Error);
      setActualRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [user?.id]);

  const isActualAdmin = actualRoles.includes('admin');

  return {
    roles: actualRoles,
    actualRoles,
    isAdmin: isActualAdmin,
    isLeader: actualRoles.includes('leader'),
    isActualAdmin,
    loading,
    error,
    refetch: fetchRoles,
  };
}
