import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, Check, X, Loader2, RefreshCw, Clock, UserCog } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface SignupRequest {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  service_number: string;
  phone: string | null;
  requested_unit_type: string;
  requested_battalion_id: string | null;
  requested_platoon_id: string | null;
  requested_squad_id: string | null;
  status: 'pending' | 'approved' | 'declined';
  decline_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface Unit {
  id: string;
  name: string;
  battalion_id?: string;
  platoon_id?: string;
}

export default function SignupApprovalsPage() {
  const { user } = useAuth();
  const { isAdmin, isLeader, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'declined' | 'all'>('pending');
  
  // Dialog states
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<SignupRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Manual add user form
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    email: '',
    fullName: '',
    serviceNumber: '',
    phone: '',
    rank: '',
    unitType: 'squad' as 'battalion' | 'platoon' | 'squad',
    unitId: '',
  });
  
  // Units
  const [battalions, setBattalions] = useState<Unit[]>([]);
  const [platoons, setPlatoons] = useState<Unit[]>([]);
  const [squads, setSquads] = useState<Unit[]>([]);

  const fetchRequests = async () => {
    setLoading(true);
    
    let query = supabase
      .from('signup_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching requests:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load signup requests.',
      });
    } else {
      setRequests(data as SignupRequest[]);
    }
    
    setLoading(false);
  };

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

  useEffect(() => {
    if (!roleLoading && (isAdmin || isLeader)) {
      fetchRequests();
      fetchUnits();
    }
  }, [roleLoading, isAdmin, isLeader, filter]);

  const handleApprove = async (request: SignupRequest) => {
    setIsProcessing(true);
    
    try {
      // 1. Update request status
      const { error: updateError } = await supabase
        .from('signup_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // 2. Add user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: request.user_id,
          role: 'user',
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        console.warn('Role assignment warning:', roleError);
      }

      // 3. Create personnel record
      const { error: personnelError } = await supabase
        .from('personnel')
        .insert({
          user_id: request.user_id,
          first_name: request.full_name.split(' ')[0] || request.full_name,
          last_name: request.full_name.split(' ').slice(1).join(' ') || '',
          service_number: request.service_number,
          phone: request.phone,
          email: request.email,
          rank: 'PVT', // Default rank
          squad_id: request.requested_squad_id,
        });

      if (personnelError) {
        console.warn('Personnel creation warning:', personnelError);
      }

      toast({
        title: 'Request Approved',
        description: `${request.full_name} has been approved and added to the system.`,
      });
      
      fetchRequests();
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve request.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    
    try {
      const { error } = await supabase
        .from('signup_requests')
        .update({
          status: 'declined',
          decline_reason: declineReason || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'Request Declined',
        description: `${selectedRequest.full_name}'s request has been declined.`,
      });
      
      setDeclineDialogOpen(false);
      setDeclineReason('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Decline error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to decline request.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualAdd = async () => {
    setIsProcessing(true);
    
    try {
      // Get squad info for personnel record
      let squadId = null;
      if (manualForm.unitType === 'squad') {
        squadId = manualForm.unitId;
      }

      // Create personnel record directly (user account created separately)
      const { error } = await supabase
        .from('personnel')
        .insert({
          first_name: manualForm.fullName.split(' ')[0] || manualForm.fullName,
          last_name: manualForm.fullName.split(' ').slice(1).join(' ') || '',
          service_number: manualForm.serviceNumber,
          phone: manualForm.phone || null,
          email: manualForm.email,
          rank: manualForm.rank || 'PVT',
          squad_id: squadId,
        });

      if (error) throw error;

      toast({
        title: 'User Added',
        description: `${manualForm.fullName} has been added to the system.`,
      });
      
      setManualDialogOpen(false);
      setManualForm({
        email: '',
        fullName: '',
        serviceNumber: '',
        phone: '',
        rank: '',
        unitType: 'squad',
        unitId: '',
      });
    } catch (error) {
      console.error('Manual add error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add user.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getUnitsForType = (type: string) => {
    switch (type) {
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

  const getUnitName = (request: SignupRequest) => {
    let unit: Unit | undefined;
    if (request.requested_unit_type === 'squad' && request.requested_squad_id) {
      unit = squads.find(s => s.id === request.requested_squad_id);
    } else if (request.requested_unit_type === 'platoon' && request.requested_platoon_id) {
      unit = platoons.find(p => p.id === request.requested_platoon_id);
    } else if (request.requested_unit_type === 'battalion' && request.requested_battalion_id) {
      unit = battalions.find(b => b.id === request.requested_battalion_id);
    }
    return unit?.name || 'Unknown';
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isLeader) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Signup Approvals</h1>
            <p className="text-muted-foreground">Review and manage signup requests</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRequests} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setManualDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User Manually
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="declined">Declined</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <UserCog className="h-12 w-12 mb-4 opacity-50" />
                    <p>No {filter === 'all' ? '' : filter} requests found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Service Number</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.full_name}</TableCell>
                          <TableCell>{request.service_number}</TableCell>
                          <TableCell>{request.email}</TableCell>
                          <TableCell>
                            <span className="capitalize">{request.requested_unit_type}: </span>
                            {getUnitName(request)}
                          </TableCell>
                          <TableCell>
                            {new Date(request.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                request.status === 'approved'
                                  ? 'default'
                                  : request.status === 'declined'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {request.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(request)}
                                  disabled={isProcessing}
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setDeclineDialogOpen(true);
                                  }}
                                  disabled={isProcessing}
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Decline
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Provide a reason for declining {selectedRequest?.full_name}'s request (optional).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for declining..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Add Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User Manually</DialogTitle>
            <DialogDescription>
              Add a new user to the system without requiring a signup request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={manualForm.fullName}
                onChange={(e) => setManualForm({ ...manualForm, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Service Number</Label>
              <Input
                value={manualForm.serviceNumber}
                onChange={(e) => setManualForm({ ...manualForm, serviceNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={manualForm.email}
                onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input
                value={manualForm.phone}
                onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Rank</Label>
              <Input
                placeholder="e.g., PVT, CPL, SGT"
                value={manualForm.rank}
                onChange={(e) => setManualForm({ ...manualForm, rank: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Type</Label>
              <Select
                value={manualForm.unitType}
                onValueChange={(v) => setManualForm({ ...manualForm, unitType: v as typeof manualForm.unitType, unitId: '' })}
              >
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
              <Select
                value={manualForm.unitId}
                onValueChange={(v) => setManualForm({ ...manualForm, unitId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a unit..." />
                </SelectTrigger>
                <SelectContent>
                  {getUnitsForType(manualForm.unitType).map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualAdd} disabled={isProcessing || !manualForm.fullName || !manualForm.serviceNumber}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
