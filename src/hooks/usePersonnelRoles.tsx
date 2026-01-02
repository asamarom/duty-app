import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from './useUserRole';

interface PersonnelWithRole {
  personnelId: string;
  userId: string | null;
  roles: AppRole[];
}

interface UsePersonnelRolesReturn {
  personnelRoles: Map<string, PersonnelWithRole>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getPersonnelRoles: (personnelId: string) => AppRole[];
  hasRole: (personnelId: string, role: AppRole) => boolean;
}

export function usePersonnelRoles(personnelIds?: string[]): UsePersonnelRolesReturn {
  const [personnelRoles, setPersonnelRoles] = useState<Map<string, PersonnelWithRole>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      
      // First get personnel with their user_ids
      let personnelQuery = supabase
        .from('personnel')
        .select('id, user_id');
      
      if (personnelIds && personnelIds.length > 0) {
        personnelQuery = personnelQuery.in('id', personnelIds);
      }
      
      const { data: personnelData, error: personnelError } = await personnelQuery;
      
      if (personnelError) throw personnelError;
      
      // Get unique user_ids that are not null
      const userIds = [...new Set(personnelData?.filter(p => p.user_id).map(p => p.user_id) || [])];
      
      // Fetch roles for these user_ids
      let rolesData: { user_id: string; role: string }[] = [];
      if (userIds.length > 0) {
        const { data, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        
        if (rolesError) throw rolesError;
        rolesData = data || [];
      }
      
      // Build a map from user_id to roles
      const userRolesMap = new Map<string, AppRole[]>();
      rolesData.forEach(r => {
        const existing = userRolesMap.get(r.user_id) || [];
        existing.push(r.role as AppRole);
        userRolesMap.set(r.user_id, existing);
      });
      
      // Build the personnel roles map
      const result = new Map<string, PersonnelWithRole>();
      personnelData?.forEach(p => {
        result.set(p.id, {
          personnelId: p.id,
          userId: p.user_id,
          roles: p.user_id ? (userRolesMap.get(p.user_id) || []) : [],
        });
      });
      
      setPersonnelRoles(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [personnelIds?.join(',')]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const getPersonnelRoles = useCallback((personnelId: string): AppRole[] => {
    return personnelRoles.get(personnelId)?.roles || [];
  }, [personnelRoles]);

  const hasRole = useCallback((personnelId: string, role: AppRole): boolean => {
    return getPersonnelRoles(personnelId).includes(role);
  }, [getPersonnelRoles]);

  return {
    personnelRoles,
    loading,
    error,
    refetch: fetchRoles,
    getPersonnelRoles,
    hasRole,
  };
}
