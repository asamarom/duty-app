import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequest } from '@/hooks/useSignupRequest';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireApproval?: boolean;
}

export function ProtectedRoute({ children, requireApproval = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { status, loading: requestLoading } = useSignupRequest();
  const location = useLocation();

  // Check if currently on an approval-related page
  const isApprovalPage = ['/signup-request', '/pending-approval'].includes(location.pathname);

  if (authLoading || (user && requestLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
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
