import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAssignmentRequests, AssignmentRequest } from '@/hooks/useAssignmentRequests';
import { useToast } from '@/hooks/use-toast';
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
} from 'lucide-react';
import { format } from 'date-fns';

export default function AssignmentRequestsPage() {
  const { requests, loading, approveRequest, rejectRequest, getApprovalsForRequest } = useAssignmentRequests();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<AssignmentRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'history' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setSubmitting(true);
    try {
      if (actionType === 'approve') {
        await approveRequest(selectedRequest.id, notes);
        toast({ title: 'Request approved', description: 'The equipment has been reassigned.' });
      } else if (actionType === 'reject') {
        await rejectRequest(selectedRequest.id, notes);
        toast({ title: 'Request rejected', description: 'The assignment request was rejected.' });
      }
      setSelectedRequest(null);
      setActionType(null);
      setNotes('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process request.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-success text-success-foreground"><Check className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const RequestRow = ({ request, showActions }: { request: AssignmentRequest; showActions: boolean }) => {
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
        <TableCell>{getStatusBadge(request.status)}</TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {format(new Date(request.requested_at), 'MMM d, yyyy HH:mm')}
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {request.requested_by_name || 'Unknown'}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {showActions && (
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Assignment Requests</h1>
          <p className="text-muted-foreground">Manage equipment transfer requests between units</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="gap-2">
              <History className="h-4 w-4" />
              History ({processedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending assignment requests
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead></TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead>Actions</TableHead>
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
                <CardTitle>Request History</CardTitle>
              </CardHeader>
              <CardContent>
                {processedRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No processed requests yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead></TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead>Actions</TableHead>
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

        {/* Approve/Reject Dialog */}
        <Dialog open={actionType === 'approve' || actionType === 'reject'} onOpenChange={() => {
          setSelectedRequest(null);
          setActionType(null);
          setNotes('');
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve' : 'Reject'} Assignment Request
              </DialogTitle>
              <DialogDescription>
                {selectedRequest && (
                  <>
                    Transfer <strong>{selectedRequest.equipment_name}</strong> from{' '}
                    <strong>{selectedRequest.from_unit_name}</strong> to{' '}
                    <strong>{selectedRequest.to_unit_name}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this decision..."
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
                Cancel
              </Button>
              <Button
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {actionType === 'approve' ? 'Approve' : 'Reject'}
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
              <DialogTitle>Approval History</DialogTitle>
              <DialogDescription>
                {selectedRequest?.equipment_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedRequest && getApprovalsForRequest(selectedRequest.id).map(approval => (
                <div key={approval.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={approval.action === 'approved' ? 'default' : 'destructive'}>
                      {approval.action}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(approval.action_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm mt-2">
                    By: {approval.action_by_name || 'Unknown'}
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
