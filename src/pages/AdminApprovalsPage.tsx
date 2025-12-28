import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useUnits } from '@/hooks/useUnits';
import { useToast } from '@/hooks/use-toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, UserPlus, Building2, Users, UserCheck } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type SignupRequest = Tables<'signup_requests'>;

export default function AdminApprovalsPage() {
  const { user } = useAuth();
  const { isAdmin, isLeader, loading: rolesLoading } = useUserRole();
  const { battalions, platoons, squads, loading: unitsLoading } = useUnits();
  const { toast } = useToast();

  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SignupRequest | null>(null);

  // Add user dialog state
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'leader' | 'admin'>('user');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('signup_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load signup requests.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin || isLeader) {
      fetchRequests();
    }
  }, [isAdmin, isLeader]);

  const getUnitName = (request: SignupRequest) => {
    if (request.requested_squad_id) {
      const squad = squads.find((s) => s.id === request.requested_squad_id);
      return squad?.name || 'Unknown Squad';
    }
    if (request.requested_platoon_id) {
      const platoon = platoons.find((p) => p.id === request.requested_platoon_id);
      return platoon?.name || 'Unknown Platoon';
    }
    if (request.requested_battalion_id) {
      const battalion = battalions.find((b) => b.id === request.requested_battalion_id);
      return battalion?.name || 'Unknown Battalion';
    }
    return 'No unit';
  };

  const handleApprove = async (request: SignupRequest) => {
    setProcessingId(request.id);
    try {
      // Update the request status
      const { error: updateError } = await supabase
        .from('signup_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Add user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: request.user_id,
          role: 'user',
        });

      // Ignore if role already exists
      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      toast({
        title: 'Request approved',
        description: `${request.full_name} has been approved.`,
      });

      fetchRequests();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve request.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;

    setProcessingId(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('signup_requests')
        .update({
          status: 'declined',
          decline_reason: declineReason || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'Request declined',
        description: `${selectedRequest.full_name}'s request has been declined.`,
      });

      setDeclineDialogOpen(false);
      setDeclineReason('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to decline request.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openDeclineDialog = (request: SignupRequest) => {
    setSelectedRequest(request);
    setDeclineReason('');
    setDeclineDialogOpen(true);
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

  if (rolesLoading || unitsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin && !isLeader) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Signup Approvals</h1>
            <p className="text-muted-foreground">Manage user signup requests</p>
          </div>
          
          <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User Manually
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User Manually</DialogTitle>
                <DialogDescription>
                  Note: The user must first sign in with Google to create their account.
                  You can then assign them a role here using their email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>User Email</Label>
                  <Input
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as 'user' | 'leader' | 'admin')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="leader">Leader</SelectItem>
                      {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={async () => {
                  // This would require an edge function to look up user by email
                  // For now, show a message
                  toast({
                    title: 'Feature coming soon',
                    description: 'Manual user addition will be available in a future update.',
                  });
                  setAddUserDialogOpen(false);
                }}>
                  Add User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="processed" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Processed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{request.full_name}</CardTitle>
                          <CardDescription>{request.email}</CardDescription>
                        </div>
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Service #</p>
                          <p className="font-medium">{request.service_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{request.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Unit Type</p>
                          <p className="font-medium capitalize">{request.requested_unit_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Unit</p>
                          <p className="font-medium">{getUnitName(request)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleApprove(request)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => openDeclineDialog(request)}
                          disabled={processingId === request.id}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : processedRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No processed requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {processedRequests.map((request) => (
                  <Card key={request.id} className="opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{request.full_name}</CardTitle>
                          <CardDescription>{request.email}</CardDescription>
                        </div>
                        <Badge
                          variant={request.status === 'approved' ? 'default' : 'destructive'}
                          className="gap-1"
                        >
                          {request.status === 'approved' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {request.status === 'approved' ? 'Approved' : 'Declined'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Service #</p>
                          <p className="font-medium">{request.service_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Unit</p>
                          <p className="font-medium">{getUnitName(request)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Reviewed</p>
                          <p className="font-medium">
                            {request.reviewed_at && new Date(request.reviewed_at).toLocaleDateString()}
                          </p>
                        </div>
                        {request.decline_reason && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Decline Reason</p>
                            <p className="font-medium text-destructive">{request.decline_reason}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Decline Dialog */}
        <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to decline {selectedRequest?.full_name}'s request?
                You can optionally provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Reason (Optional)</Label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter a reason for declining..."
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDecline}
                disabled={processingId === selectedRequest?.id}
              >
                {processingId === selectedRequest?.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Decline
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
