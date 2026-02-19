# Transfers UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the transfers page into the Equipment page as a second tab, redesign transfers as responsive cards with role-based sub-tabs, show serial/quantity on cards, and add an SVG signature flow for accepting serialized transfers.

**Architecture:** The Equipment page gains a `?tab=` query-param-driven top-level tab bar (Equipment | Transfers). A new `TransfersList` component handles the card-based transfers UI with role-based sub-tabs. A new `SignatureDialog` component captures SVG finger-drawings and saves them to the `personnel` Firestore doc. The old `/assignment-requests` route redirects to `/equipment?tab=transfers`.

**Tech Stack:** React, TypeScript, TailwindCSS, shadcn/ui (Tabs, Dialog, Badge, Button), Firebase Firestore, SVG path capture via pointer events.

**Design doc:** `docs/plans/2026-02-19-transfers-ux-redesign.md`

---

## Task 1: Add `signature` field to types

**Files:**
- Modify: `src/integrations/firebase/types.ts` — add `signature?: string | null` to `PersonnelDoc`
- Modify: `src/types/pmtb.ts` — add `signature?: string` to `Personnel`
- Modify: `src/hooks/usePersonnel.tsx` — map `signature` field in `mapDocToPersonnel`

**Step 1: Update `PersonnelDoc` in `src/integrations/firebase/types.ts`**

Add after `isSignatureApproved: boolean;`:
```typescript
signature?: string | null;
```

**Step 2: Update `Personnel` in `src/types/pmtb.ts`**

Add after `isSignatureApproved?: boolean;`:
```typescript
signature?: string;
```

**Step 3: Update `mapDocToPersonnel` in `src/hooks/usePersonnel.tsx`**

Add to the return object:
```typescript
signature: data.signature || undefined,
```

**Step 4: Verify TypeScript compiles**
```bash
cd /home/ubuntu/duty-app && npx tsc --noEmit
```
Expected: no errors

**Step 5: Commit**
```bash
git add src/integrations/firebase/types.ts src/types/pmtb.ts src/hooks/usePersonnel.tsx
git commit -m "feat: add signature field to PersonnelDoc and Personnel types"
```

---

## Task 2: Create `useCurrentPersonnel` hook

A lightweight hook that fetches the current user's own personnel record (needed to read/write their signature).

**Files:**
- Create: `src/hooks/useCurrentPersonnel.tsx`

**Step 1: Create the hook**

```typescript
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PersonnelDoc } from '@/integrations/firebase/types';

interface CurrentPersonnel {
  id: string;
  signature?: string;
}

interface UseCurrentPersonnelReturn {
  currentPersonnel: CurrentPersonnel | null;
  loading: boolean;
  saveSignature: (svgString: string) => Promise<void>;
}

export function useCurrentPersonnel(): UseCurrentPersonnelReturn {
  const { user } = useAuth();
  const [currentPersonnel, setCurrentPersonnel] = useState<CurrentPersonnel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }

    const q = query(collection(db, 'personnel'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (snap.docs.length > 0) {
        const d = snap.docs[0];
        const data = d.data() as PersonnelDoc;
        setCurrentPersonnel({ id: d.id, signature: data.signature || undefined });
      } else {
        setCurrentPersonnel(null);
      }
      setLoading(false);
    }, () => setLoading(false));

    return unsubscribe;
  }, [user?.uid]);

  const saveSignature = async (svgString: string) => {
    if (!currentPersonnel) throw new Error('No personnel record found');
    await updateDoc(doc(db, 'personnel', currentPersonnel.id), {
      signature: svgString,
      updatedAt: serverTimestamp(),
    });
  };

  return { currentPersonnel, loading, saveSignature };
}
```

**Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```

**Step 3: Commit**
```bash
git add src/hooks/useCurrentPersonnel.tsx
git commit -m "feat: add useCurrentPersonnel hook with signature read/write"
```

---

## Task 3: Create `SignatureDialog` component

**Files:**
- Create: `src/components/equipment/SignatureDialog.tsx`

**Step 1: Create the component**

```typescript
import { useRef, useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasExistingSignature: boolean;
  onConfirm: (svgString?: string) => Promise<void>;
  equipmentName: string;
}

export function SignatureDialog({
  open, onOpenChange, hasExistingSignature, onConfirm, equipmentName,
}: SignatureDialogProps) {
  const { t } = useLanguage();
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getPoint(e);
    setCurrentPath(`M ${x} ${y}`);
    setIsDrawing(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const { x, y } = getPoint(e);
    setCurrentPath(p => `${p} L ${x} ${y}`);
  };

  const onPointerUp = () => {
    if (currentPath) setPaths(p => [...p, currentPath]);
    setCurrentPath('');
    setIsDrawing(false);
  };

  const clearCanvas = () => { setPaths([]); setCurrentPath(''); };

  const buildSvg = useCallback(() => {
    const svg = svgRef.current!;
    const { width, height } = svg.getBoundingClientRect();
    const pathEls = [...paths, currentPath]
      .filter(Boolean)
      .map(d => `<path d="${d}" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${pathEls}</svg>`;
  }, [paths, currentPath]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      if (hasExistingSignature) {
        await onConfirm();
      } else {
        await onConfirm(buildSvg());
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = hasExistingSignature ? checked : paths.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('signature.title')}</DialogTitle>
          <DialogDescription>
            {t('signature.desc')} <strong>{equipmentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {hasExistingSignature ? (
          <div className="flex items-center gap-3 py-4">
            <Checkbox
              id="sig-confirm"
              checked={checked}
              onCheckedChange={c => setChecked(!!c)}
            />
            <Label htmlFor="sig-confirm">{t('signature.confirmCheckbox')}</Label>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('signature.drawPrompt')}</p>
            <div className="border rounded-lg overflow-hidden bg-white" style={{ touchAction: 'none' }}>
              <svg
                ref={svgRef}
                className="w-full"
                style={{ height: 180, cursor: 'crosshair' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                {paths.map((d, i) => (
                  <path key={i} d={d} stroke="black" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {currentPath && (
                  <path d={currentPath} stroke="black" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>
            <Button variant="ghost" size="sm" onClick={clearCanvas} disabled={paths.length === 0}>
              {t('signature.clear')}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || submitting}>
            {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t('signature.saveAndAccept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Add translation keys to `src/i18n/translations.ts`**

Add to both `en` and `he` sections:

English:
```typescript
'signature.title': 'Sign to Accept Transfer',
'signature.desc': 'Your signature is required to accept',
'signature.drawPrompt': 'Draw your signature below using your finger or stylus',
'signature.confirmCheckbox': 'I confirm my saved signature applies to this transfer',
'signature.clear': 'Clear',
'signature.saveAndAccept': 'Save & Accept',
```

Hebrew:
```typescript
'signature.title': 'חתימה לאישור העברה',
'signature.desc': 'נדרשת חתימתך לאישור',
'signature.drawPrompt': 'צייר את חתימתך למטה באמצעות האצבע או העט',
'signature.confirmCheckbox': 'אני מאשר שחתימתי השמורה חלה על העברה זו',
'signature.clear': 'נקה',
'signature.saveAndAccept': 'שמור וקבל',
```

**Step 3: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```

**Step 4: Commit**
```bash
git add src/components/equipment/SignatureDialog.tsx src/i18n/translations.ts
git commit -m "feat: add SignatureDialog component for SVG signature capture"
```

---

## Task 4: Create `TransfersList` component

**Files:**
- Create: `src/components/equipment/TransfersList.tsx`

**Step 1: Create the component**

```typescript
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ArrowRight, Check, X, Clock, History, Inbox, Loader2 } from 'lucide-react';
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
  const { t } = useLanguage();
  const { isAdmin } = useEffectiveRole();
  const { requests, incomingTransfers, loading, recipientApprove, recipientReject } = useAssignmentRequests();
  const { currentPersonnel, saveSignature } = useCurrentPersonnel();
  const { toast } = useToast();

  const [sigDialogRequest, setSigDialogRequest] = useState<AssignmentRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<AssignmentRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const processedRequests = requests.filter(r => r.status !== 'pending');

  const isSerialItem = (r: AssignmentRequest) => {
    // equipment with a serial number — check equipment_serial if denormalized, else infer from request
    return !!(r as AssignmentRequest & { equipment_serial?: string }).equipment_serial;
  };

  const handleAccept = (request: AssignmentRequest) => {
    const isSerial = !!(request as AssignmentRequest & { equipment_serial?: string }).equipment_serial;
    if (isSerial) {
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

  const TransferCard = ({ request, showActions }: { request: AssignmentRequest; showActions: boolean }) => {
    const r = request as AssignmentRequest & { equipment_serial?: string; quantity?: number };
    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{request.equipment_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.equipment_serial
                    ? `S/N: ${r.equipment_serial}`
                    : r.quantity && r.quantity > 1
                    ? `${t('transfers.qty')}: ${r.quantity}`
                    : null}
                </p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 flex-wrap">
                  <span>{request.from_unit_name}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  <span>{request.to_unit_name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {request.requested_by_name} · {format(new Date(request.requested_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
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
  };

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
      <Tabs defaultValue="incoming">
        <TabsList className="mb-4">
          <TabsTrigger value="incoming" className="gap-2">
            <Inbox className="h-4 w-4" />
            {t('transfers.incoming')}
            {incomingTransfers.length > 0 && (
              <Badge variant="secondary" className="ms-1">{incomingTransfers.length}</Badge>
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
```

**Step 2: Add missing translation keys to `src/i18n/translations.ts`**

English:
```typescript
'transfers.qty': 'Qty',
```

Hebrew:
```typescript
'transfers.qty': 'כמות',
```

**Step 3: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```

**Step 4: Commit**
```bash
git add src/components/equipment/TransfersList.tsx src/i18n/translations.ts
git commit -m "feat: add TransfersList card-based component with role-based tabs"
```

---

## Task 5: Add `equipment_serial` to `AssignmentRequest` type and hook

The transfer cards need the serial number. Add it to the request type and map it in `useAssignmentRequests`.

**Files:**
- Modify: `src/hooks/useAssignmentRequests.tsx`

**Step 1: Add `equipment_serial` to `AssignmentRequest` interface**

Add after `equipment_name?`:
```typescript
equipment_serial?: string;
```

**Step 2: Map it in `mapSnapshot`**

After `equipment_name: equipmentName,` add:
```typescript
equipment_serial: (equipDoc?.exists() ? (equipDoc.data() as EquipmentDoc).serialNumber ?? undefined : undefined),
```

Note: `equipDoc` is already fetched in the existing `mapSnapshot` code when `!equipmentName`. Need to always fetch it (or store serialNumber). The simplest approach: denormalize `equipmentSerialNumber` into the `AssignmentRequestDoc` when creating a request, and read it back.

**Step 2 (revised): Denormalize serial number on request creation in `createRequest`**

In `createRequest`, after resolving `equipmentName`, add:
```typescript
const equipSerial = equipDoc?.exists()
  ? (equipDoc.data() as EquipmentDoc).serialNumber ?? null
  : null;
```

And add to `requestData`:
```typescript
equipmentSerialNumber: equipSerial,
```

**Step 3: Add `equipmentSerialNumber` to `AssignmentRequestDoc` in `types.ts`**

```typescript
equipmentSerialNumber?: string | null;
```

**Step 4: Map in `mapSnapshot`**

```typescript
equipment_serial: data.equipmentSerialNumber ?? undefined,
```

**Step 5: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```

**Step 6: Commit**
```bash
git add src/hooks/useAssignmentRequests.tsx src/integrations/firebase/types.ts
git commit -m "feat: denormalize equipment serial number on transfer requests"
```

---

## Task 6: Integrate Transfers tab into EquipmentPage

**Files:**
- Modify: `src/pages/EquipmentPage.tsx`

**Step 1: Add imports**

Add at top:
```typescript
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TransfersList } from '@/components/equipment/TransfersList';
import { ArrowLeftRight } from 'lucide-react';
```

**Step 2: Add `useSearchParams` and tab state**

After existing state declarations:
```typescript
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') ?? 'equipment';
const handleTabChange = (val: string) => setSearchParams(val === 'equipment' ? {} : { tab: val });
```

**Step 3: Remove collapsible imports and state**

Remove:
- `Collapsible, CollapsibleTrigger, CollapsibleContent` from imports
- `myRequestsOpen, setMyRequestsOpen` state
- `myPendingRequests` variable and its `useEffect`
- The `useAssignmentRequests` import (now used inside `TransfersList`)
- `ChevronDown, ChevronUp, Clock` from lucide imports (if only used by collapsible)
- The entire collapsible JSX block (`{!isAdmin && ( ... )}`)

**Step 4: Wrap existing content in tabs**

Replace the outer `<div className="tactical-grid ...">` content structure with:

```tsx
<Tabs value={activeTab} onValueChange={handleTabChange}>
  <div className="px-4 lg:px-6 pt-4 lg:pt-6">
    <TabsList>
      <TabsTrigger value="equipment" className="gap-2">
        <Package className="h-4 w-4" />
        {t('nav.equipment')}
      </TabsTrigger>
      <TabsTrigger value="transfers" className="gap-2">
        <ArrowLeftRight className="h-4 w-4" />
        {t('nav.transfers')}
        {incomingCount > 0 && (
          <Badge variant="secondary" className="ms-1">{incomingCount}</Badge>
        )}
      </TabsTrigger>
    </TabsList>
  </div>

  <TabsContent value="equipment" className="tactical-grid min-h-screen p-4 lg:p-6">
    {/* All existing equipment page content here (header, stats, search, table, FAB) */}
  </TabsContent>

  <TabsContent value="transfers" className="p-4 lg:p-6">
    <TransfersList />
  </TabsContent>
</Tabs>
```

**Step 5: Add `incomingCount` using existing `incomingTransfers` from hook**

Since we removed `useAssignmentRequests` from EquipmentPage but still need the badge count, use `usePendingRequestsCount` — but we'll update that hook in Task 7. For now, just import and use it:

```typescript
const incomingCount = usePendingRequestsCount();
```

**Step 6: Verify TypeScript compiles and app renders**
```bash
npx tsc --noEmit
npm run dev  # visually verify tabs appear
```

**Step 7: Commit**
```bash
git add src/pages/EquipmentPage.tsx
git commit -m "feat: merge transfers into equipment page as tab"
```

---

## Task 7: Update `usePendingRequestsCount` to count user's incoming transfers

Currently counts all system-wide pending requests. Scope it to the current user's incoming transfers so the badge is meaningful for all roles.

**Files:**
- Modify: `src/hooks/usePendingRequestsCount.tsx`

**Step 1: Update hook to use `incomingTransfers` from `useAssignmentRequests`**

```typescript
import { useAssignmentRequests } from './useAssignmentRequests';

export function usePendingRequestsCount() {
  const { incomingTransfers } = useAssignmentRequests();
  return incomingTransfers.length;
}
```

**Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```

**Step 3: Commit**
```bash
git add src/hooks/usePendingRequestsCount.tsx
git commit -m "fix: scope pending requests badge to current user's incoming transfers"
```

---

## Task 8: Remove transfers from Sidebar and MobileNav

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/MobileNav.tsx`

**Step 1: Remove from Sidebar**

In `src/components/layout/Sidebar.tsx`, remove the line:
```typescript
navigation.push({ name: t('nav.transfers'), href: '/assignment-requests', icon: ArrowLeftRight, showBadge: true });
```

The badge on the Equipment nav item will now be handled by `usePendingRequestsCount` which is already wired to the Equipment item — verify it's used there or add `showBadge: true` to the Equipment nav entry and confirm `pendingCount` drives it.

**Step 2: Remove from MobileNav**

In `src/components/layout/MobileNav.tsx`, remove from `moreItems`:
```typescript
{ name: t('nav.transfers'), href: '/assignment-requests', adminOnly: true },
```

**Step 3: Add badge to Equipment item in Sidebar**

In `Sidebar.tsx`, change the Equipment entry to:
```typescript
{ name: t('nav.equipment'), href: '/equipment', icon: Package, showBadge: true },
```

This reuses the existing `pendingCount` badge logic already in the sidebar.

**Step 4: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```

**Step 5: Commit**
```bash
git add src/components/layout/Sidebar.tsx src/components/layout/MobileNav.tsx
git commit -m "feat: move transfer badge to Equipment nav, remove Transfers nav item"
```

---

## Task 9: Redirect `/assignment-requests` and remove old page

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/pages/AssignmentRequestsPage.tsx`

**Step 1: Replace old route with redirect in `App.tsx`**

Remove:
```typescript
const AssignmentRequestsPage = lazy(() => import("./pages/AssignmentRequestsPage"));
```

Replace the route:
```typescript
<Route path="/assignment-requests" element={<Navigate to="/equipment?tab=transfers" replace />} />
```

Add `Navigate` to the react-router-dom import.

**Step 2: Delete old page**
```bash
rm src/pages/AssignmentRequestsPage.tsx
```

**Step 3: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```

**Step 4: Commit**
```bash
git add src/App.tsx
git rm src/pages/AssignmentRequestsPage.tsx
git commit -m "feat: redirect /assignment-requests to /equipment?tab=transfers, remove old page"
```

---

## Task 10: Update PRODUCT.md with new requirement IDs

**Files:**
- Modify: `PRODUCT.md`

**Step 1: Add new requirements to the Equipment Transfer Workflow section**

```markdown
- [XFER-13] Transfers tab shows role-based sub-tabs: Incoming + History for users/leaders; Incoming + All Pending + History for admins
- [XFER-14] Transfer cards display quantity for bulk items (no serial number)
- [XFER-15] Transfer cards display serial number for serialized items
- [XFER-16] Transfers integrated into Equipment page as a second tab; /assignment-requests redirects there
- [XFER-17] Accepting a serialized transfer requires a signature
  - [XFER-17.1] First-time: user draws SVG signature on canvas; saved to personnel record in Firestore
  - [XFER-17.2] Returning user: checkbox confirmation uses saved signature silently
```

**Step 2: Commit**
```bash
git add PRODUCT.md
git commit -m "docs: add XFER-13 through XFER-17 requirements for transfers redesign"
```

---

## Task 11: Final build verification and push

**Step 1: Full TypeScript check**
```bash
npx tsc --noEmit
```

**Step 2: Build**
```bash
npm run build
```
Expected: no errors, dist/ generated

**Step 3: Push**
```bash
git push
```
