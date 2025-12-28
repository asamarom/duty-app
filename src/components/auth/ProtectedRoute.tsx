import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequest } from '@/hooks/useSignupRequest';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { status, loading: requestLoading } = useSignupRequest();
  const { roles, loading: roleLoading } = useUserRole();

  const loading = authLoading || (user && (requestLoading || roleLoading));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User has a role - they're approved
  if (roles.length > 0) {
    return <>{children}</>;
  }

  // Check signup request status
  if (status === 'approved') {
    // Approved but no role yet - this shouldn't happen normally
    // but let them through as the role might be assigned soon
    return <>{children}</>;
  }

  // User needs to submit a request or wait for approval
  if (status === 'none' || status === 'pending' || status === 'declined') {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}
