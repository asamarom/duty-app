import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ArrowRight, ArrowLeft, Check, X, Clock, History, Inbox, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssignmentRequests, AssignmentRequest } from '@/hooks/useAssignmentRequests';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useCurrentPersonnel } from '@/hooks/useCurrentPersonnel';
import { useToast } from '@/hooks/use-toast';
import { SignatureDialog } from './SignatureDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function TransfersList() {
  const { t, dir, language } = useLanguage();
  const { isAdmin } = useEffectiveRole();
  const { requests, incomingTransfers, loading, recipientApprove, recipientReject } = useAssignmentRequests();
  const { currentPersonnel, saveSignature } = useCurrentPersonnel();
  const { toast } = useToast();

  const [sigDialogRequest, setSigDialogRequest] = useState<AssignmentRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<AssignmentRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const processedRequests = requests.filter(r => r.status !== 'pending');

  const handleAccept = (request: AssignmentRequest) => {
    if (request.equipment_serial) {
      setSigDialogRequest(request);
    } else {
      doAccept(request.id);
    }
  };

  const doAccept = async (requestId: string, svgString?: string) => {
    setSubmitting(true);
    try {
      if (svgString) await saveSignature(svgString);
      await recipientApprove(requestId);
      toast({ title: t('transfers.transferAccepted'), description: t('transfers.transferAcceptedDesc') });
    } catch {
      toast({ title: t('common.error'), description: t('transfers.failedToProcess'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const doReject = async () => {
    if (!rejectRequest) return;
    setSubmitting(true);
    try {
      await recipientReject(rejectRequest.id, rejectNotes);
      toast({ title: t('transfers.transferRejected'), description: t('transfers.transferRejectedDesc') });
      setRejectRequest(null);
      setRejectNotes('');
    } catch {
      toast({ title: t('common.error'), description: t('transfers.failedToProcess'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (r: AssignmentRequest) => {
    if (r.status === 'pending') return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 me-1" />{t('transfers.awaitingRecipient')}</Badge>;
    if (r.status === 'approved') return <Badge className="bg-success text-success-foreground"><Check className="h-3 w-3 me-1" />{t('status.approved')}</Badge>;
    if (r.status === 'rejected') return <Badge variant="destructive"><X className="h-3 w-3 me-1" />{t('status.rejected')}</Badge>;
    return <Badge variant="secondary">{r.status}</Badge>;
  };

  const TransferCard = ({ request, showActions }: { request: AssignmentRequest; showActions: boolean }) => (
    <Card className="mb-3" dir={dir}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{request.equipment_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {request.equipment_serial
                  ? `S/N: ${request.equipment_serial}`
                  : request.quantity && request.quantity > 1
                  ? `${t('transfers.qty')}: ${request.quantity}`
                  : null}
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 flex-wrap">
                <span>{request.from_unit_name}</span>
                {dir === 'rtl' ? <ArrowLeft className="h-3 w-3 shrink-0" /> : <ArrowRight className="h-3 w-3 shrink-0" />}
                <span>{request.to_unit_name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {request.requested_by_name} · {format(new Date(request.requested_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className={`flex flex-col gap-2 shrink-0 ${dir === 'rtl' ? 'items-start' : 'items-end'}`}>
            {getStatusBadge(request)}
            {showActions && (
              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-success border-success hover:bg-success/10"
                  onClick={() => handleAccept(request)}
                  disabled={submitting}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => setRejectRequest(request)}
                  disabled={submitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Package className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="incoming" dir={dir}>
        <div className="flex mb-4" dir={dir}>
        <TabsList dir={language === 'he' ? 'rtl' : 'ltr'}>
          <TabsTrigger value="incoming" className="gap-2">
            <Inbox className="h-4 w-4" />
            {t('transfers.incoming')}
            {incomingTransfers.length > 0 && (
              <Badge variant="secondary" className={dir === 'rtl' ? 'me-1' : 'ms-1'}>{incomingTransfers.length}</Badge>
            )}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              {t('transfers.allPending')}
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            {t('transfers.history')}
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="incoming">
          {incomingTransfers.length === 0
            ? <EmptyState message={t('transfers.noIncoming')} />
            : incomingTransfers.map(r => <TransferCard key={r.id} request={r} showActions={true} />)}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="pending">
            {requests.filter(r => r.status === 'pending').length === 0
              ? <EmptyState message={t('transfers.noPending')} />
              : requests.filter(r => r.status === 'pending').map(r => <TransferCard key={r.id} request={r} showActions={false} />)}
          </TabsContent>
        )}

        <TabsContent value="history">
          {processedRequests.length === 0
            ? <EmptyState message={t('transfers.noProcessed')} />
            : processedRequests.map(r => <TransferCard key={r.id} request={r} showActions={false} />)}
        </TabsContent>
      </Tabs>

      {/* Signature Dialog */}
      {sigDialogRequest && (
        <SignatureDialog
          open={!!sigDialogRequest}
          onOpenChange={(o) => !o && setSigDialogRequest(null)}
          hasExistingSignature={!!currentPersonnel?.signature}
          equipmentName={sigDialogRequest.equipment_name || ''}
          onConfirm={async (svg) => {
            await doAccept(sigDialogRequest.id, svg);
            setSigDialogRequest(null);
          }}
        />
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectRequest} onOpenChange={(o) => !o && setRejectRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('transfers.rejectIncoming')}</DialogTitle>
            <DialogDescription>{rejectRequest?.equipment_name}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>{t('transfers.notesOptional')}</Label>
            <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder={t('transfers.addNotes')} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRequest(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={doReject} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('transfers.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
