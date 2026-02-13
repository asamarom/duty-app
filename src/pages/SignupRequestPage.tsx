import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequest } from '@/hooks/useSignupRequest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, UserCheck } from 'lucide-react';
import { z } from 'zod';
import { BattalionUnitSelector, UnitSelection } from '@/components/signup/BattalionUnitSelector';
import { useLanguage } from '@/contexts/LanguageContext';

const requestSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  serviceNumber: z.string().min(1, 'Service number is required'),
  cellPhone: z.string().min(1, 'Cell phone number is required'),
  unitId: z.string().min(1, 'Please select your unit'),
});

export default function SignupRequestPage() {
  const { user, signOut } = useAuth();
  const { submitRequest, status, loading: requestLoading } = useSignupRequest();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState(user?.displayName || '');
  const [serviceNumber, setServiceNumber] = useState('');
  const [cellPhone, setCellPhone] = useState('');
  const [unitSelection, setUnitSelection] = useState<UnitSelection>({
    unitId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already has a pending/approved request
  useEffect(() => {
    if (!requestLoading && status === 'pending') {
      navigate('/pending-approval');
    } else if (!requestLoading && status === 'approved') {
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
        title: 'Request failed',
        description: error.message,
      });
    } else {
      toast({
        title: 'Request submitted',
        description: 'Your signup request has been submitted for approval.',
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-lg">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4 glow-tactical">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Complete Your Registration</h1>
          <p className="text-muted-foreground text-sm text-center mt-2">
            Submit your details for approval to access the system
          </p>
        </div>

        <Card className="card-tactical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Signup Request
            </CardTitle>
            <CardDescription>
              Fill in your details and select your unit. An admin will review your request.
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
                  placeholder="Enter your full name"
                  disabled={isSubmitting}
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                  placeholder="Enter your service number"
                  disabled={isSubmitting}
                />
                {errors.serviceNumber && <p className="text-sm text-destructive">{errors.serviceNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cellPhone">Cell Phone Number</Label>
                <Input
                  id="cellPhone"
                  value={cellPhone}
                  onChange={(e) => setCellPhone(e.target.value)}
                  placeholder="Enter your cell phone number"
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
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleSignOut}
              >
                Sign out and use a different account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
