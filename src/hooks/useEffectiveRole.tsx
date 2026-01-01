import { useUserRole } from './useUserRole';
import { useAdminMode } from '@/contexts/AdminModeContext';

/**
 * Hook that provides effective permissions based on admin mode toggle.
 * When admin mode is OFF, admins see the app as if they were regular users.
 * When admin mode is ON, admins have full access.
 */
export function useEffectiveRole() {
  const { roles, actualRoles, isAdmin, isLeader, isActualAdmin, loading, error, refetch } = useUserRole();
  const { isAdminMode } = useAdminMode();

  // If user is an actual admin but admin mode is off, treat them as a regular user
  const effectiveIsAdmin = isActualAdmin && isAdminMode;
  
  // Leaders keep their leader status unless they're also admins with admin mode off
  const effectiveIsLeader = isLeader && (!isActualAdmin || isAdminMode);

  return {
    // Effective roles (respects admin mode)
    isAdmin: effectiveIsAdmin,
    isLeader: effectiveIsLeader,
    
    // Actual roles (for showing the toggle, etc.)
    isActualAdmin,
    actualRoles,
    roles,
    
    // Admin mode state
    isAdminMode,
    
    // Loading/error states
    loading,
    error,
    refetch,
  };
}

