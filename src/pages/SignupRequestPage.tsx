import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequest } from '@/hooks/useSignupRequest';
import { useUnits } from '@/hooks/useUnits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Building2, Users, UserCheck } from 'lucide-react';
import { z } from 'zod';

const requestSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  serviceNumber: z.string().min(1, 'Service number is required'),
  phone: z.string().optional(),
  unitType: z.enum(['battalion', 'platoon', 'squad']),
  battalionId: z.string().optional(),
  platoonId: z.string().optional(),
  squadId: z.string().optional(),
}).refine((data) => {
  if (data.unitType === 'battalion') return !!data.battalionId;
  if (data.unitType === 'platoon') return !!data.battalionId && !!data.platoonId;
  if (data.unitType === 'squad') return !!data.battalionId && !!data.platoonId && !!data.squadId;
  return false;
}, {
  message: 'Please select the appropriate unit',
  path: ['unitType'],
});

export default function SignupRequestPage() {
  const { user, signOut } = useAuth();
  const { submitRequest, status, loading: requestLoading } = useSignupRequest();
  const { battalions, getPlatoonsForBattalion, getSquadsForPlatoon, loading: unitsLoading } = useUnits();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [serviceNumber, setServiceNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [unitType, setUnitType] = useState<'battalion' | 'platoon' | 'squad'>('battalion');
  const [battalionId, setBattalionId] = useState('');
  const [platoonId, setPlatoonId] = useState('');
  const [squadId, setSquadId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const platoons = battalionId ? getPlatoonsForBattalion(battalionId) : [];
  const squads = platoonId ? getSquadsForPlatoon(platoonId) : [];

  // Redirect if already has a pending/approved request
  useEffect(() => {
    if (!requestLoading && status === 'pending') {
      navigate('/pending-approval');
    } else if (!requestLoading && status === 'approved') {
      navigate('/');
    }
  }, [status, requestLoading, navigate]);

  // Reset child selections when parent changes
  useEffect(() => {
    setPlatoonId('');
    setSquadId('');
  }, [battalionId]);

  useEffect(() => {
    setSquadId('');
  }, [platoonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = requestSchema.safeParse({
      fullName,
      serviceNumber,
      phone,
      unitType,
      battalionId,
      platoonId,
      squadId,
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
      phone: phone || undefined,
      serviceNumber,
      unitType,
      battalionId: battalionId || undefined,
      platoonId: platoonId || undefined,
      squadId: squadId || undefined,
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

  if (requestLoading || unitsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <Label htmlFor="fullName">Full Name</Label>
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
                <Label htmlFor="serviceNumber">Service Number</Label>
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
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Unit Level</Label>
                <Select value={unitType} onValueChange={(v) => setUnitType(v as 'battalion' | 'platoon' | 'squad')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="battalion">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Battalion
                      </div>
                    </SelectItem>
                    <SelectItem value="platoon">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Platoon
                      </div>
                    </SelectItem>
                    <SelectItem value="squad">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Squad
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.unitType && <p className="text-sm text-destructive">{errors.unitType}</p>}
              </div>

              <div className="space-y-2">
                <Label>Battalion</Label>
                <Select value={battalionId} onValueChange={setBattalionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select battalion" />
                  </SelectTrigger>
                  <SelectContent>
                    {battalions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.designation && `(${b.designation})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(unitType === 'platoon' || unitType === 'squad') && battalionId && (
                <div className="space-y-2">
                  <Label>Platoon</Label>
                  <Select value={platoonId} onValueChange={setPlatoonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platoon" />
                    </SelectTrigger>
                    <SelectContent>
                      {platoons.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.designation && `(${p.designation})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {unitType === 'squad' && platoonId && (
                <div className="space-y-2">
                  <Label>Squad</Label>
                  <Select value={squadId} onValueChange={setSquadId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select squad" />
                    </SelectTrigger>
                    <SelectContent>
                      {squads.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} {s.designation && `(${s.designation})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
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
