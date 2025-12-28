import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequest } from '@/hooks/useSignupRequest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Clock, XCircle, RefreshCw, Loader2, LogOut } from 'lucide-react';

export default function PendingApprovalPage() {
  const { user, signOut } = useAuth();
  const { request, status, loading, refetch } = useSignupRequest();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && status === 'approved') {
      navigate('/');
    } else if (!loading && status === 'none') {
      navigate('/signup-request');
    }
  }, [status, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleNewRequest = () => {
    navigate('/signup-request');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4 glow-tactical">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">PMTB System</h1>
        </div>

        {status === 'pending' && (
          <Card className="card-tactical">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-warning/20 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              <CardTitle>Request Pending</CardTitle>
              <CardDescription>
                Your signup request is being reviewed by an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{request?.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service #:</span>
                  <span className="font-medium">{request?.service_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unit Type:</span>
                  <span className="font-medium capitalize">{request?.requested_unit_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span className="font-medium">
                    {request?.created_at && new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={refetch}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Status
              </Button>

              <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'declined' && (
          <Card className="card-tactical">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Request Declined</CardTitle>
              <CardDescription>
                Your signup request was declined by an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {request?.decline_reason && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <p className="text-sm font-medium text-destructive-foreground">Reason:</p>
                  <p className="text-sm text-muted-foreground mt-1">{request.decline_reason}</p>
                </div>
              )}

              <Button className="w-full" onClick={handleNewRequest}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Submit New Request
              </Button>

              <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
