import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAssignmentRequests, AssignmentRequest } from '@/hooks/useAssignmentRequests';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowRight,
  Check,
  X,
  Clock,
  Package,
  History,
  Loader2,
  Inbox,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';

export default function AssignmentRequestsPage() {
  const { 
    requests, 
    incomingTransfers, 
    loading, 
    approveRequest, 
    rejectRequest, 
    recipientApprove, 
    recipientReject,
    getApprovalsForRequest 
  } = useAssignmentRequests();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [selectedRequest, setSelectedRequest] = useState<AssignmentRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'recipient_approve' | 'recipient_reject' | 'history' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setSubmitting(true);
    try {
      switch (actionType) {
        case 'approve':
          await approveRequest(selectedRequest.id, notes);
          toast({ title: t('transfers.requestApproved'), description: t('transfers.equipmentReassigned') });
          break;
        case 'reject':
          await rejectRequest(selectedRequest.id, notes);
          toast({ title: t('transfers.requestRejected'), description: t('transfers.requestWasRejected') });
          break;
        case 'recipient_approve':
          await recipientApprove(selectedRequest.id, notes);
          toast({ title: 'Transfer Accepted', description: 'You have accepted the incoming transfer.' });
          break;
        case 'recipient_reject':
          await recipientReject(selectedRequest.id, notes);
          toast({ title: 'Transfer Rejected', description: 'You have rejected the incoming transfer.' });
          break;
      }
      setSelectedRequest(null);
      setActionType(null);
      setNotes('');
    } catch (error) {
      toast({ title: t('common.error'), description: 'Failed to process request.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (request: AssignmentRequest) => {
    if (request.status === 'pending') {
      if (request.recipient_approved) {
        return <Badge className="bg-success/20 text-success border-success"><UserCheck className="h-3 w-3 mr-1" /> Recipient Approved</Badge>;
      }
      return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 mr-1" /> {t('status.pending')}</Badge>;
    }
    if (request.status === 'approved') {
      return <Badge className="bg-success text-success-foreground"><Check className="h-3 w-3 mr-1" /> {t('status.approved')}</Badge>;
    }
    if (request.status === 'rejected') {
      return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> {t('status.rejected')}</Badge>;
    }
    return <Badge variant="secondary">{request.status}</Badge>;
  };

  const RequestRow = ({ request, showActions, isIncoming = false }: { request: AssignmentRequest; showActions: boolean; isIncoming?: boolean }) => {
    const approvalHistory = getApprovalsForRequest(request.id);
    
    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{request.equipment_name}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground capitalize">{request.from_unit_type}:</span>
            <span>{request.from_unit_name}</span>
          </div>
        </TableCell>
        <TableCell>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground capitalize">{request.to_unit_type}:</span>
            <span>{request.to_unit_name}</span>
          </div>
        </TableCell>
        <TableCell>{getStatusBadge(request)}</TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {format(new Date(request.requested_at), 'MMM d, yyyy HH:mm')}
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {request.requested_by_name || t('transfers.unknown')}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {isIncoming && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-success border-success hover:bg-success/10"
                  onClick={() => {
                    setSelectedRequest(request);
                    setActionType('recipient_approve');
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setSelectedRequest(request);
                    setActionType('recipient_reject');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            {showActions && !isIncoming && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-success border-success hover:bg-success/10"
                  onClick={() => {
                    setSelectedRequest(request);
                    setActionType('approve');
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setSelectedRequest(request);
                    setActionType('reject');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            {approvalHistory.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedRequest(request);
                  setActionType('history');
                }}
              >
                <History className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-4 lg:p-6">
        <div>
          <h1 className="text-2xl font-bold">{t('transfers.title')}</h1>
          <p className="text-muted-foreground">{t('transfers.subtitle')}</p>
        </div>

        <Tabs defaultValue="incoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="incoming" className="gap-2">
              <Inbox className="h-4 w-4" />
              Incoming ({incomingTransfers.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              {t('transfers.pending')} ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="gap-2">
              <History className="h-4 w-4" />
              {t('transfers.history')} ({processedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  Incoming Transfers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incomingTransfers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No incoming transfers awaiting your approval.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('transfers.equipment')}</TableHead>
                        <TableHead>{t('transfers.from')}</TableHead>
                        <TableHead></TableHead>
                        <TableHead>{t('transfers.to')}</TableHead>
                        <TableHead>{t('equipment.status')}</TableHead>
                        <TableHead>{t('transfers.requested')}</TableHead>
                        <TableHead>{t('transfers.by')}</TableHead>
                        <TableHead>{t('transfers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomingTransfers.map(request => (
                        <RequestRow key={request.id} request={request} showActions={false} isIncoming={true} />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>{t('transfers.pendingRequests')}</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('transfers.noPending')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('transfers.equipment')}</TableHead>
                        <TableHead>{t('transfers.from')}</TableHead>
                        <TableHead></TableHead>
                        <TableHead>{t('transfers.to')}</TableHead>
                        <TableHead>{t('equipment.status')}</TableHead>
                        <TableHead>{t('transfers.requested')}</TableHead>
                        <TableHead>{t('transfers.by')}</TableHead>
                        <TableHead>{t('transfers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map(request => (
                        <RequestRow key={request.id} request={request} showActions={true} />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processed">
            <Card>
              <CardHeader>
                <CardTitle>{t('transfers.requestHistory')}</CardTitle>
              </CardHeader>
              <CardContent>
                {processedRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('transfers.noProcessed')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('transfers.equipment')}</TableHead>
                        <TableHead>{t('transfers.from')}</TableHead>
                        <TableHead></TableHead>
                        <TableHead>{t('transfers.to')}</TableHead>
                        <TableHead>{t('equipment.status')}</TableHead>
                        <TableHead>{t('transfers.requested')}</TableHead>
                        <TableHead>{t('transfers.by')}</TableHead>
                        <TableHead>{t('transfers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedRequests.map(request => (
                        <RequestRow key={request.id} request={request} showActions={false} />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Approve/Reject/Recipient Action Dialog */}
        <Dialog open={!!actionType && actionType !== 'history'} onOpenChange={() => {
          setSelectedRequest(null);
          setActionType(null);
          setNotes('');
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' && t('transfers.approveRequest')}
                {actionType === 'reject' && t('transfers.rejectRequest')}
                {actionType === 'recipient_approve' && 'Accept Incoming Transfer'}
                {actionType === 'recipient_reject' && 'Reject Incoming Transfer'}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest && (
                  <>
                    {t('transfers.transfer')} <strong>{selectedRequest.equipment_name}</strong> {t('transfers.fromUnit')}{' '}
                    <strong>{selectedRequest.from_unit_name}</strong> {t('transfers.toUnit')}{' '}
                    <strong>{selectedRequest.to_unit_name}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">{t('transfers.notesOptional')}</Label>
                <Textarea
                  id="notes"
                  placeholder={t('transfers.addNotes')}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSelectedRequest(null);
                setActionType(null);
                setNotes('');
              }}>
                {t('common.cancel')}
              </Button>
              <Button
                variant={(actionType === 'approve' || actionType === 'recipient_approve') ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {(actionType === 'approve' || actionType === 'recipient_approve') ? t('transfers.approve') : t('transfers.reject')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={actionType === 'history'} onOpenChange={() => {
          setSelectedRequest(null);
          setActionType(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('transfers.approvalHistory')}</DialogTitle>
              <DialogDescription>
                {selectedRequest?.equipment_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedRequest && getApprovalsForRequest(selectedRequest.id).map(approval => (
                <div key={approval.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={approval.action === 'approved' ? 'default' : 'destructive'}>
                      {approval.action === 'approved' ? t('status.approved') : t('status.rejected')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(approval.action_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm mt-2">
                    {t('transfers.by')}: {approval.action_by_name || t('transfers.unknown')}
                  </p>
                  {approval.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{approval.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
