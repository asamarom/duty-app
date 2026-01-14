import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminMode } from '@/contexts/AdminModeContext';
import { useUnits } from '@/hooks/useUnits';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { Loader2, CheckCircle, XCircle, Clock, UserPlus } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type SignupRequest = Tables<'signup_requests'>;

export default function AdminApprovalsPage() {
  const { user } = useAuth();
  const { isAdmin, isLeader, isActualAdmin, loading: rolesLoading } = useUserRole();
  const { isAdminMode } = useAdminMode();
  const { battalions, companies, platoons, loading: unitsLoading } = useUnits();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Determine effective admin/leader status based on admin mode
  // Admin mode only affects admin privileges; leader privileges remain.
  const effectiveIsAdmin = isActualAdmin && isAdminMode;
  const effectiveIsLeader = isLeader;
  const hasAdminAccess = effectiveIsAdmin || effectiveIsLeader;

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
        title: t('common.error'),
        description: t('approvals.errorLoading'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAdminAccess) {
      fetchRequests();
    }
  }, [hasAdminAccess]);

  const getUnitPath = (request: SignupRequest): string => {
    const parts: string[] = [];

    if (request.requested_battalion_id) {
      const battalion = battalions.find((b) => b.id === request.requested_battalion_id);
      parts.push(battalion?.name || t('units.unknownBattalion'));
    }
    if (request.requested_company_id) {
      const company = companies.find((c) => c.id === request.requested_company_id);
      parts.push(company?.name || 'Unknown company');
    }
    if (request.requested_platoon_id) {
      const platoon = platoons.find((p) => p.id === request.requested_platoon_id);
      parts.push(platoon?.name || t('units.unknownPlatoon'));
    }

    return parts.length > 0 ? parts.join(' → ') : t('units.noUnit');
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

      // Create personnel record linked to the user
      const nameParts = request.full_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Assign unit based on the request
      const battalionId = request.requested_battalion_id;
      const companyId = request.requested_company_id;
      const platoonId = request.requested_platoon_id;

      const { error: personnelError } = await supabase
        .from('personnel')
        .insert({
          user_id: request.user_id,
          first_name: firstName,
          last_name: lastName,
          email: request.email,
          phone: request.phone,
          service_number: request.service_number,
          battalion_id: battalionId,
          company_id: companyId,
          platoon_id: platoonId,
          rank: 'Private', // Default rank, can be updated later
          is_signature_approved: false, // Default role
        });

      if (personnelError && !personnelError.message.includes('duplicate')) {
        console.error('Failed to create personnel record:', personnelError);
        // Don't throw - approval still succeeded, just personnel creation failed
      }

      toast({
        title: t('approvals.approved'),
        description: `${request.full_name} ${t('approvals.approvedDesc')}`,
      });

      fetchRequests();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('approvals.errorApproving'),
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
        title: t('approvals.declined'),
        description: `${selectedRequest.full_name} ${t('approvals.declinedDesc')}`,
      });

      setDeclineDialogOpen(false);
      setDeclineReason('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('approvals.errorDeclining'),
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

  if (!hasAdminAccess) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('approvals.noPermission')}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('approvals.title')}</h1>
            <p className="text-muted-foreground">{t('approvals.subtitle')}</p>
          </div>

          <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('approvals.addUser')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('approvals.addUserTitle')}</DialogTitle>
                <DialogDescription>
                  {t('approvals.addUserDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('approvals.userEmail')}</Label>
                  <Input
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('approvals.role')}</Label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as 'user' | 'leader' | 'admin')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t('approvals.user')}</SelectItem>
                      <SelectItem value="leader">{t('approvals.leader')}</SelectItem>
                      {effectiveIsAdmin && <SelectItem value="admin">{t('approvals.admin')}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={async () => {
                  // This would require an edge function to look up user by email
                  // For now, show a message
                  toast({
                    title: t('approvals.featureComingSoon'),
                    description: t('approvals.featureComingSoonDesc'),
                  });
                  setAddUserDialogOpen(false);
                }}>
                  {t('approvals.addUserBtn')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              {t('status.pending')}
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="processed" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              {t('approvals.processed')}
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
                  <p className="text-muted-foreground">{t('approvals.noPending')}</p>
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
                          {t('status.pending')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">{t('approvals.serviceNumber')}</p>
                          <p className="font-medium">{request.service_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('approvals.phone')}</p>
                          <p className="font-medium">{request.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('approvals.unitType')}</p>
                          <p className="font-medium capitalize">{request.requested_unit_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('approvals.unit')}</p>
                          <p className="font-medium">{getUnitPath(request)}</p>
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
                          {t('approvals.approve')}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => openDeclineDialog(request)}
                          disabled={processingId === request.id}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          {t('approvals.decline')}
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
                  <p className="text-muted-foreground">{t('approvals.noProcessed')}</p>
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
                          {request.status === 'approved' ? t('status.approved') : t('status.declined')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">{t('approvals.serviceNumber')}</p>
                          <p className="font-medium">{request.service_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('approvals.unit')}</p>
                          <p className="font-medium">{getUnitPath(request)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('approvals.reviewed')}</p>
                          <p className="font-medium">
                            {request.reviewed_at && new Date(request.reviewed_at).toLocaleDateString()}
                          </p>
                        </div>
                        {request.decline_reason && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">{t('approvals.declineReason')}</p>
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
              <DialogTitle>{t('approvals.declineRequest')}</DialogTitle>
              <DialogDescription>
                {t('approvals.declineDesc')} {selectedRequest?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>{t('approvals.reasonOptional')}</Label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder={t('approvals.reasonPlaceholder')}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
                {t('common.cancel')}
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
                {t('approvals.decline')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
