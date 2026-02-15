import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequest } from '@/hooks/useSignupRequest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, UserCheck, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { BattalionUnitSelector, UnitSelection } from '@/components/signup/BattalionUnitSelector';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SignupRequestPage() {
  const { user, signOut } = useAuth();
  const { request, submitRequest, status, loading: requestLoading, refetch } = useSignupRequest();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const requestSchema = z.object({
    fullName: z.string().min(2, t('signup.nameMinLength')),
    serviceNumber: z.string().min(1, t('signup.serviceNumberRequired')),
    cellPhone: z.string().min(1, t('signup.phoneRequired')),
    unitId: z.string().min(1, t('signup.unitRequired')),
  });

  const [fullName, setFullName] = useState(user?.displayName || '');
  const [serviceNumber, setServiceNumber] = useState('');
  const [cellPhone, setCellPhone] = useState('');
  const [unitSelection, setUnitSelection] = useState<UnitSelection>({
    unitId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if approved - but show status for pending/declined
  useEffect(() => {
    if (!requestLoading && status === 'approved') {
      navigate('/');
    }
  }, [status, requestLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = requestSchema.safeParse({
      fullName,
      serviceNumber,
      cellPhone,
      unitId: unitSelection.unitId,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await submitRequest({
      fullName,
      email: user?.email || '',
      phone: cellPhone,
      serviceNumber,
      unitId: unitSelection.unitId,
    });
    setIsSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: t('signup.requestFailed'),
        description: error.message,
      });
    } else {
      toast({
        title: t('signup.requestSubmitted'),
        description: t('signup.requestSubmittedDesc'),
      });
      navigate('/pending-approval');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (requestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Show status view for pending or declined requests
  if (status === 'pending' && request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="w-full max-w-lg">
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t('signup.requestPending')}</h1>
            <p className="text-muted-foreground text-sm text-center mt-2">
              {t('signup.pendingDesc')}
            </p>
          </div>

          <Card className="card-tactical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                {t('signup.statusPending')}
              </CardTitle>
              <CardDescription>
                {t('signup.submittedOn')} {new Date(request.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('auth.fullName')}</span>
                  <span className="font-medium">{request.full_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('personnel.email')}</span>
                  <span className="font-medium">{request.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('personnel.serviceNumber')}</span>
                  <span className="font-medium">{request.service_number}</span>
                </div>
                {request.phone && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">{t('personnel.phone')}</span>
                    <span className="font-medium">{request.phone}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('approvals.unitType')}</span>
                  <span className="font-medium capitalize">{request.requested_unit_id}</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-500">{t('signup.awaitingReview')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('signup.awaitingReviewDesc')}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full mt-4"
                onClick={handleSignOut}
              >
                {t('signup.signOutDifferent')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show declined status
  if (status === 'declined' && request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="w-full max-w-lg">
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 rounded-xl bg-destructive/20 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t('signup.requestDeclined')}</h1>
            <p className="text-muted-foreground text-sm text-center mt-2">
              {t('signup.declinedDesc')}
            </p>
          </div>

          <Card className="card-tactical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                {t('signup.statusDeclined')}
              </CardTitle>
              <CardDescription>
                {t('signup.reviewedOn')} {request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : t('common.na')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('auth.fullName')}</span>
                  <span className="font-medium">{request.full_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('personnel.email')}</span>
                  <span className="font-medium">{request.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('personnel.serviceNumber')}</span>
                  <span className="font-medium">{request.service_number}</span>
                </div>
              </div>

              {request.decline_reason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">{t('signup.reasonForDecline')}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.decline_reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center mt-4">
                {t('signup.contactAdmin')}
              </p>

              <Button
                type="button"
                variant="ghost"
                className="w-full mt-4"
                onClick={handleSignOut}
              >
                {t('signup.signOutDifferent')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show form for new request (status === 'none')
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-lg">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4 glow-tactical">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('signup.completeRegistration')}</h1>
          <p className="text-muted-foreground text-sm text-center mt-2">
            {t('signup.submitDetails')}
          </p>
        </div>

        <Card className="card-tactical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              {t('approvals.title')}
            </CardTitle>
            <CardDescription>
              {t('signup.submitDetails')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  disabled={isSubmitting}
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('personnel.email')}</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceNumber">{t('personnel.serviceNumber')}</Label>
                <Input
                  id="serviceNumber"
                  value={serviceNumber}
                  onChange={(e) => setServiceNumber(e.target.value)}
                  placeholder={t('personnel.serviceNumber')}
                  disabled={isSubmitting}
                />
                {errors.serviceNumber && <p className="text-sm text-destructive">{errors.serviceNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cellPhone">{t('personnel.phone')}</Label>
                <Input
                  id="cellPhone"
                  value={cellPhone}
                  onChange={(e) => setCellPhone(e.target.value)}
                  placeholder={t('personnel.phonePlaceholder')}
                  disabled={isSubmitting}
                />
                {errors.cellPhone && <p className="text-sm text-destructive">{errors.cellPhone}</p>}
              </div>

              {/* Battalion + Unit Tree Selector */}
              <BattalionUnitSelector
                value={unitSelection}
                onChange={setUnitSelection}
                disabled={isSubmitting}
              />
              {errors.unitId && <p className="text-sm text-destructive">{errors.unitId}</p>}

              <Button type="submit" className="w-full" disabled={isSubmitting || !unitSelection.unitId}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('signup.submitRequest')
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleSignOut}
              >
                {t('signup.signOutDifferent')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
