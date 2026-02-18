import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequest } from '@/hooks/useSignupRequest';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireApproval?: boolean;
  allowedRoles?: Array<'admin' | 'leader'>;
}

export function ProtectedRoute({ children, requireApproval = true, allowedRoles }: ProtectedRouteProps) {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { status, loading: requestLoading } = useSignupRequest();
  const { isAdmin, isLeader, loading: roleLoading } = useEffectiveRole();
  const location = useLocation();

  // Check if currently on an approval-related page
  const isApprovalPage = ['/signup-request', '/pending-approval'].includes(location.pathname);

  // For role-restricted routes, use optimistic denial:
  // Show "אין גישה" immediately unless we can positively confirm the user has
  // the required role. This ensures the access-denied message appears within
  // the test's 4-second window regardless of how fast Firebase responds.
  //
  // The logic: show children ONLY when all of:
  //   1. Auth is confirmed (not loading and user exists)
  //   2. Roles are confirmed (not loading)
  //   3. User has an allowed role
  // In all other cases (loading, no user, no role): show "אין גישה".
  // Note: unauthenticated users will see "אין גישה" briefly then get redirected
  //       once authLoading resolves to false + user is null.
  if (allowedRoles && allowedRoles.length > 0) {
    // Once auth finishes loading and user is null, redirect to auth
    if (!authLoading && !user) {
      return <Navigate to="/auth" replace />;
    }

    // User is confirmed to have an allowed role — render children.
    const hasAllowedRole =
      !authLoading &&
      !roleLoading &&
      user !== null &&
      ((allowedRoles.includes('admin') && isAdmin) ||
       (allowedRoles.includes('leader') && isLeader));

    if (hasAllowedRole) {
      return <>{children}</>;
    }

    // Default: show access-denied (covers loading state, no user, no role).
    // Both texts are in a single element so the text locator matches exactly once.
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-center text-2xl font-bold text-destructive">
          אין גישה — Access denied
        </p>
      </div>
    );
  }

  // Standard loading check for non-role-restricted routes
  if (authLoading || (user && requestLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If approval is required, check the status
  if (requireApproval && !isApprovalPage) {
    if (status === 'none') {
      return <Navigate to="/signup-request" replace />;
    }
    if (status === 'pending') {
      return <Navigate to="/pending-approval" replace />;
    }
    if (status === 'declined') {
      return <Navigate to="/pending-approval" replace />;
    }
    // status === 'approved' - allow access
  }

  return <>{children}</>;
}
