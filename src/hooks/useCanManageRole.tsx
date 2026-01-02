import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

interface UseCanManageRoleReturn {
  canManage: boolean;
  loading: boolean;
}

/**
 * Checks if the current user can manage roles for a specific personnel.
 * - Admins can manage anyone
 * - Leaders can manage personnel in their assigned units
 */
export function useCanManageRole(personnelId: string | undefined): UseCanManageRoleReturn {
  const { user } = useAuth();
  const { isAdmin, isLeader, loading: roleLoading } = useUserRole();
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPermission = useCallback(async () => {
    if (!user || !personnelId) {
      setCanManage(false);
      setLoading(false);
      return;
    }

    // Admins can manage anyone
    if (isAdmin) {
      setCanManage(true);
      setLoading(false);
      return;
    }

    // Non-leaders cannot manage
    if (!isLeader) {
      setCanManage(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Check via the database function
      const { data, error } = await supabase
        .rpc('can_assign_leader_role', {
          _assigner_user_id: user.id,
          _target_personnel_id: personnelId,
        });

      if (error) {
        console.error('Error checking permission:', error);
        setCanManage(false);
      } else {
        setCanManage(data === true);
      }
    } catch (err) {
      console.error('Error checking permission:', err);
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, personnelId, isAdmin, isLeader]);

  useEffect(() => {
    if (!roleLoading) {
      checkPermission();
    }
  }, [checkPermission, roleLoading]);

  return {
    canManage,
    loading: loading || roleLoading,
  };
}
