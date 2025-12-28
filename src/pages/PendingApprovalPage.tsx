import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequest } from '@/hooks/useSignupRequest';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Clock, XCircle, RefreshCw, LogOut } from 'lucide-react';
import { z } from 'zod';

const requestSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  serviceNumber: z.string().min(1, 'Service number is required').max(50),
  phone: z.string().max(20).optional(),
  unitType: z.enum(['battalion', 'platoon', 'squad']),
  unitId: z.string().min(1, 'Please select a unit'),
});

interface Unit {
  id: string;
  name: string;
  battalion_id?: string;
  platoon_id?: string;
}

export default function PendingApprovalPage() {
  const { user, signOut } = useAuth();
  const { signupRequest, status, loading, submitRequest, refetch } = useSignupRequest();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [serviceNumber, setServiceNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [unitType, setUnitType] = useState<'battalion' | 'platoon' | 'squad'>('squad');
  const [unitId, setUnitId] = useState('');
  
  // Units data
  const [battalions, setBattalions] = useState<Unit[]>([]);
  const [platoons, setPlatoons] = useState<Unit[]>([]);
  const [squads, setSquads] = useState<Unit[]>([]);

  useEffect(() => {
    const fetchUnits = async () => {
      const [batRes, platRes, squadRes] = await Promise.all([
        supabase.from('battalions').select('id, name'),
        supabase.from('platoons').select('id, name, battalion_id'),
        supabase.from('squads').select('id, name, platoon_id'),
      ]);
      
      setBattalions(batRes.data || []);
      setPlatoons(platRes.data || []);
      setSquads(squadRes.data || []);
    };
    
    fetchUnits();
  }, []);

  useEffect(() => {
    // Pre-fill from user metadata
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = requestSchema.safeParse({
      fullName,
      serviceNumber,
      phone: phone || undefined,
      unitType,
      unitId,
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

    const requestData: Parameters<typeof submitRequest>[0] = {
      fullName,
      serviceNumber,
      phone: phone || undefined,
      unitType,
    };

    // Set the correct unit ID based on type
    if (unitType === 'battalion') {
      requestData.battalionId = unitId;
    } else if (unitType === 'platoon') {
      requestData.platoonId = unitId;
      // Also set battalion from platoon
      const platoon = platoons.find(p => p.id === unitId);
      if (platoon?.battalion_id) {
        requestData.battalionId = platoon.battalion_id;
      }
    } else if (unitType === 'squad') {
      requestData.squadId = unitId;
      // Also set platoon and battalion from squad
      const squad = squads.find(s => s.id === unitId);
      if (squad?.platoon_id) {
        requestData.platoonId = squad.platoon_id;
        const platoon = platoons.find(p => p.id === squad.platoon_id);
        if (platoon?.battalion_id) {
          requestData.battalionId = platoon.battalion_id;
        }
      }
    }

    const { error } = await submitRequest(requestData);
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
        description: 'Your signup request has been sent for approval.',
      });
    }
  };

  const getUnitsForType = () => {
    switch (unitType) {
      case 'battalion':
        return battalions;
      case 'platoon':
        return platoons;
      case 'squad':
        return squads;
      default:
        return [];
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show pending status
  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4 glow-tactical">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">PMTB System</h1>
          </div>

          <Card className="card-tactical">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <CardTitle>Pending Approval</CardTitle>
              <CardDescription>
                Your signup request is being reviewed by an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <p><strong>Name:</strong> {signupRequest?.full_name}</p>
                <p><strong>Service Number:</strong> {signupRequest?.service_number}</p>
                <p><strong>Email:</strong> {signupRequest?.email}</p>
                <p><strong>Submitted:</strong> {signupRequest?.created_at ? new Date(signupRequest.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={refetch}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Status
                </Button>
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show declined status with option to resubmit
  if (status === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4 glow-tactical">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">PMTB System</h1>
          </div>

          <Card className="card-tactical">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Request Declined</CardTitle>
              <CardDescription>
                Your signup request was not approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {signupRequest?.decline_reason && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <p className="text-sm"><strong>Reason:</strong> {signupRequest.decline_reason}</p>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground text-center">
                You can submit a new request with corrected information.
              </p>
              
              {/* Show the form again for resubmission */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                {/* Same form fields as below */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceNumber">Service Number</Label>
                  <Input
                    id="serviceNumber"
                    value={serviceNumber}
                    onChange={(e) => setServiceNumber(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.serviceNumber && <p className="text-sm text-destructive">{errors.serviceNumber}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Type</Label>
                  <Select value={unitType} onValueChange={(v) => { setUnitType(v as typeof unitType); setUnitId(''); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="battalion">Battalion</SelectItem>
                      <SelectItem value="platoon">Platoon</SelectItem>
                      <SelectItem value="squad">Squad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select Unit</Label>
                  <Select value={unitId} onValueChange={setUnitId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getUnitsForType().map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.unitId && <p className="text-sm text-destructive">{errors.unitId}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit New Request'
                  )}
                </Button>
              </form>
              
              <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show signup request form (status === 'none')
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4 glow-tactical">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">PMTB System</h1>
          <p className="text-muted-foreground text-sm">Complete Your Registration</p>
        </div>

        <Card className="card-tactical">
          <CardHeader className="text-center pb-4">
            <CardTitle>Request Access</CardTitle>
            <CardDescription>
              Please provide your details and select your unit to request access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceNumber">Service Number</Label>
                <Input
                  id="serviceNumber"
                  placeholder="e.g., 12345678"
                  value={serviceNumber}
                  onChange={(e) => setServiceNumber(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.serviceNumber && <p className="text-sm text-destructive">{errors.serviceNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Unit Type</Label>
                <Select value={unitType} onValueChange={(v) => { setUnitType(v as typeof unitType); setUnitId(''); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="battalion">Battalion</SelectItem>
                    <SelectItem value="platoon">Platoon</SelectItem>
                    <SelectItem value="squad">Squad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Unit</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a unit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getUnitsForType().map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unitId && <p className="text-sm text-destructive">{errors.unitId}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
              
              <Button type="button" variant="ghost" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
