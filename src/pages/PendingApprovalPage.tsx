import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequest } from '@/hooks/useSignupRequest';
import { useUnits } from '@/hooks/useUnits';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Clock, XCircle, RefreshCw, Loader2, LogOut, AlertCircle } from 'lucide-react';

export default function PendingApprovalPage() {
  const { signOut } = useAuth();
  const { request, status, loading, refetch } = useSignupRequest();
  const { getUnitById } = useUnits();
  const { t, dir } = useLanguage();
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const unit = request?.requested_unit_id ? getUnitById(request.requested_unit_id) : undefined;
  const unitName = unit
    ? unit.designation ? `${unit.name} (${unit.designation})` : unit.name
    : request?.requested_unit_id ?? null;

  const detailRows = [
    { label: t('auth.fullName'), value: request?.full_name },
    { label: t('personnel.email'), value: request?.email },
    { label: t('personnel.serviceNumber'), value: request?.service_number },
    request?.phone ? { label: t('personnel.phone'), value: request.phone } : null,
    unitName ? { label: t('signup.selectBattalion'), value: unitName } : null,
    {
      label: t('signup.submittedOn'),
      value: request?.created_at
        ? new Date(request.created_at).toLocaleDateString()
        : null,
    },
  ].filter(Boolean) as { label: string; value: string | null | undefined }[];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4" dir={dir}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4 glow-tactical">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Pending */}
        {status === 'pending' && (
          <Card className="card-tactical">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <CardTitle data-testid="pending-heading">{t('signup.requestPending')}</CardTitle>
              <CardDescription>{t('signup.pendingDesc')}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                {detailRows.map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm gap-4">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-end">{value ?? '—'}</span>
                  </div>
                ))}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{t('signup.awaitingReviewDesc')}</p>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={refetch}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('signup.checkStatus')}
              </Button>

              <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('signup.signOut')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Declined */}
        {status === 'declined' && (
          <Card className="card-tactical">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle data-testid="declined-heading">{t('signup.requestDeclined')}</CardTitle>
              <CardDescription>{t('signup.declinedDesc')}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                {detailRows.map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm gap-4">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-end">{value ?? '—'}</span>
                  </div>
                ))}
              </div>

              {request?.decline_reason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-destructive">{t('signup.reasonForDecline')}</p>
                      <p className="text-sm text-muted-foreground mt-1">{request.decline_reason}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center">{t('signup.contactAdmin')}</p>

              <Button className="w-full" onClick={handleNewRequest}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('signup.submitNewRequest')}
              </Button>

              <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('signup.signOut')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
