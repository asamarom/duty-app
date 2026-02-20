import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { SignupRequestDoc, UserDoc, AppRole } from '@/integrations/firebase/types';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
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

interface SignupRequest extends SignupRequestDoc {
  id: string;
}

export default function AdminApprovalsPage() {
  const { user } = useAuth();
  const { isAdmin: effectiveIsAdmin, isLeader: effectiveIsLeader, isActualAdmin, loading: rolesLoading } = useEffectiveRole();
  const { units, getUnitPath: getUnitPathFromHook, loading: unitsLoading } = useUnits();
  const { toast } = useToast();
  const { t } = useLanguage();

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
      const requestsRef = collection(db, 'signupRequests');
      const q = query(requestsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as SignupRequest[];

      setRequests(data);
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
    if (!request.requestedUnitId) return t('units.noUnit');
    return getUnitPathFromHook(request.requestedUnitId) || t('units.noUnit');
  };

  // Traverse unit hierarchy to find the battalion ID for a given unit
  const getBattalionId = (unitId: string | null | undefined): string | null => {
    if (!unitId) return null;
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return null;
    if (unit.unit_type === 'battalion') return unit.id;
    return getBattalionId(unit.parent_id);
  };

  const handleApprove = async (request: SignupRequest) => {
    setProcessingId(request.id);
    try {
      // Update the request status
      await updateDoc(doc(db, 'signupRequests', request.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid,
      });

      // Get or create user doc and add 'user' role
      const userDocRef = doc(db, 'users', request.userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as UserDoc;
        const currentRoles = userData.roles || [];
        if (!currentRoles.includes('user')) {
          await updateDoc(userDocRef, {
            roles: [...currentRoles, 'user'],
          });
        }
      } else {
        // Create user doc with 'user' role
        await updateDoc(userDocRef, {
          roles: ['user'],
          fullName: request.fullName,
        });
      }

      // Create personnel record linked to the user
      const nameParts = request.fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const battalionId = getBattalionId(request.requestedUnitId);
      const personnelRef = collection(db, 'personnel');
      try {
        await addDoc(personnelRef, {
          userId: request.userId,
          firstName,
          lastName,
          email: request.email,
          phone: request.phone || null,
          serviceNumber: request.serviceNumber,
          unitId: request.requestedUnitId || null,
          rank: 'טוראי', // Default rank
          locationStatus: 'on_duty',
          readinessStatus: 'ready',
          isSignatureApproved: false,
          createdAt: serverTimestamp(),
          ...(battalionId ? { battalionId } : {}),
        });
      } catch (personnelError) {
        console.error('Failed to create personnel record:', personnelError);
        // Don't throw - approval still succeeded
      }

      toast({
        title: t('approvals.approved'),
        description: `${request.fullName} ${t('approvals.approvedDesc')}`,
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
      await updateDoc(doc(db, 'signupRequests', selectedRequest.id), {
        status: 'declined',
        declineReason: declineReason || null,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid,
      });

      toast({
        title: t('approvals.declined'),
        description: `${selectedRequest.fullName} ${t('approvals.declinedDesc')}`,
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
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
                <UserPlus className="me-2 h-4 w-4" />
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
                    placeholder={t('approvals.emailPlaceholder')}
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
                  // This would require a Cloud Function to look up user by email
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
                <Badge variant="secondary" className="ms-1">
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
                          <CardTitle className="text-lg">{request.fullName}</CardTitle>
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
                          <p className="font-medium">{request.serviceNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('approvals.phone')}</p>
                          <p className="font-medium">{request.phone || 'N/A'}</p>
                        </div>
                        <div className="col-span-2">
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
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="me-2 h-4 w-4" />
                          )}
                          {t('approvals.approve')}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => openDeclineDialog(request)}
                          disabled={processingId === request.id}
                        >
                          <XCircle className="me-2 h-4 w-4" />
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
                          <CardTitle className="text-lg">{request.fullName}</CardTitle>
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
                          <p className="font-medium">{request.serviceNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('approvals.unit')}</p>
                          <p className="font-medium">{getUnitPath(request)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('approvals.reviewed')}</p>
                          <p className="font-medium">
                            {request.reviewedAt && (request.reviewedAt as any).toDate?.()?.toLocaleDateString()}
                          </p>
                        </div>
                        {request.declineReason && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">{t('approvals.declineReason')}</p>
                            <p className="font-medium text-destructive">{request.declineReason}</p>
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
                {t('approvals.declineDesc')} {selectedRequest?.fullName}
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
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="me-2 h-4 w-4" />
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
