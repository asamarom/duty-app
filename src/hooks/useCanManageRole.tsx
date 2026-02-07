import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/integrations/firebase/client';
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

      // Call Cloud Function to check permission
      const canManageUnit = httpsCallable<
        { personnelId: string },
        { canManage: boolean }
      >(functions, 'canManageUnit');

      const result = await canManageUnit({ personnelId });
      setCanManage(result.data.canManage === true);
    } catch (err) {
      console.error('Error checking permission:', err);
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, personnelId, isAdmin, isLeader]);

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
