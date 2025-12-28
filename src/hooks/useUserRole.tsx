import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'leader' | 'user';

interface UseUserRoleReturn {
  roles: AppRole[];
  isAdmin: boolean;
  isLeader: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user roles:', error);
      setRoles([]);
    } else {
      setRoles((data || []).map((r) => r.role as AppRole));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, [user?.id]);

  return {
    roles,
    isAdmin: roles.includes('admin'),
    isLeader: roles.includes('leader'),
    loading,
    refetch: fetchRoles,
  };
}
