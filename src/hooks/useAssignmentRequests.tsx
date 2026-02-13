import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, orderBy, query, doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/integrations/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AssignmentRequestDoc, EquipmentDoc, UnitDoc, PersonnelDoc, UserDoc } from '@/integrations/firebase/types';

export type AssignmentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AssignmentRequest {
  id: string;
  equipment_id: string;
  equipment_name?: string;
  from_unit_type: string;
  from_unit_id?: string;
  from_personnel_id?: string;
  from_unit_name?: string;
  to_unit_type: string;
  to_unit_id?: string;
  to_personnel_id?: string;
  to_unit_name?: string;
  status: AssignmentRequestStatus;
  requested_by?: string;
  requested_by_name?: string;
  requested_at: string;
  notes?: string;
  recipient_approved: boolean;
  recipient_approved_at?: string;
  recipient_approved_by?: string;
}

export interface RequestApproval {
  id: string;
  action: 'approved' | 'rejected';
  action_at: string;
  action_by_name?: string;
  notes?: string;
}

interface UseAssignmentRequestsReturn {
  requests: AssignmentRequest[];
  incomingTransfers: AssignmentRequest[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createRequest: (data: {
    equipmentId: string;
    toUnitId?: string;
    toPersonnelId?: string;
    notes?: string;
  }) => Promise<void>;
  approveRequest: (requestId: string, notes?: string) => Promise<void>;
  rejectRequest: (requestId: string, notes?: string) => Promise<void>;
  recipientApprove: (requestId: string, notes?: string) => Promise<void>;
  recipientReject: (requestId: string, notes?: string) => Promise<void>;
  getApprovalsForRequest: (requestId: string) => RequestApproval[];
}

export function useAssignmentRequests(): UseAssignmentRequestsReturn {
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<AssignmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout after 10s')), 10000);
      });

      const requestsRef = collection(db, 'assignmentRequests');
      const q = query(requestsRef, orderBy('requestedAt', 'desc'));
      const snapshot = await Promise.race([getDocs(q), timeoutPromise]);

      const mappedRequests: AssignmentRequest[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data() as AssignmentRequestDoc;

          // Use denormalized names if available, otherwise fetch
          let equipmentName = data.equipmentName;
          let fromUnitName = data.fromName || 'Unassigned';
          let toUnitName = data.toName || 'Unassigned';
          let requestedByName = data.requestedByName;

          // If names not denormalized, fetch them
          if (!equipmentName && data.equipmentId) {
            const equipDoc = await getDoc(doc(db, 'equipment', data.equipmentId));
            if (equipDoc.exists()) {
              equipmentName = (equipDoc.data() as EquipmentDoc).name;
            }
          }

          if (!data.fromName) {
            if (data.fromPersonnelId) {
              const persDoc = await getDoc(doc(db, 'personnel', data.fromPersonnelId));
              if (persDoc.exists()) {
                const pers = persDoc.data() as PersonnelDoc;
                fromUnitName = `${pers.firstName} ${pers.lastName}`;
              }
            } else if (data.fromUnitId) {
              const unitDoc = await getDoc(doc(db, 'units', data.fromUnitId));
              if (unitDoc.exists()) {
                fromUnitName = (unitDoc.data() as UnitDoc).name;
              }
            }
          }

          if (!data.toName) {
            if (data.toPersonnelId) {
              const persDoc = await getDoc(doc(db, 'personnel', data.toPersonnelId));
              if (persDoc.exists()) {
                const pers = persDoc.data() as PersonnelDoc;
                toUnitName = `${pers.firstName} ${pers.lastName}`;
              }
            } else if (data.toUnitId) {
              const unitDoc = await getDoc(doc(db, 'units', data.toUnitId));
              if (unitDoc.exists()) {
                toUnitName = (unitDoc.data() as UnitDoc).name;
              }
            }
          }

          if (!requestedByName && data.requestedBy) {
            const userDoc = await getDoc(doc(db, 'users', data.requestedBy));
            if (userDoc.exists()) {
              requestedByName = (userDoc.data() as UserDoc).fullName || undefined;
            }
          }

          return {
            id: docSnap.id,
            equipment_id: data.equipmentId,
            equipment_name: equipmentName,
            from_unit_type: data.fromUnitType,
            from_unit_id: data.fromUnitId || undefined,
            from_personnel_id: data.fromPersonnelId || undefined,
            from_unit_name: fromUnitName,
            to_unit_type: data.toUnitType,
            to_unit_id: data.toUnitId || undefined,
            to_personnel_id: data.toPersonnelId || undefined,
            to_unit_name: toUnitName,
            status: data.status,
            requested_by: data.requestedBy || undefined,
            requested_by_name: requestedByName,
            requested_at: data.requestedAt?.toDate().toISOString() || new Date().toISOString(),
            notes: data.notes || undefined,
            recipient_approved: data.recipientApproved || false,
            recipient_approved_at: data.recipientApprovedAt?.toDate().toISOString(),
            recipient_approved_by: data.recipientApprovedBy || undefined,
          };
        })
      );

      setRequests(mappedRequests);

      const incoming = mappedRequests.filter(r =>
        r.status === 'pending' && !r.recipient_approved
      );
      setIncomingTransfers(incoming);
    } catch (err) {
      console.error('useAssignmentRequests: Firestore error', err);
      setError(err as Error);
      setRequests([]);
      setIncomingTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRequest = useCallback(async (data: {
    equipmentId: string;
    toUnitId?: string;
    toPersonnelId?: string;
    notes?: string;
  }) => {
    const initiateTransfer = httpsCallable(functions, 'initiateTransfer');
    await initiateTransfer({
      equipmentId: data.equipmentId,
      toUnitId: data.toUnitId || null,
      toPersonnelId: data.toPersonnelId || null,
      notes: data.notes || null,
    });

    await fetchRequests();
  }, [fetchRequests]);

  const approveRequest = useCallback(async (requestId: string, notes?: string) => {
    const processTransfer = httpsCallable(functions, 'processTransfer');
    await processTransfer({
      requestId,
      action: 'approved',
      notes: notes || null,
    });

    await fetchRequests();
  }, [fetchRequests]);

  const rejectRequest = useCallback(async (requestId: string, notes?: string) => {
    const processTransfer = httpsCallable(functions, 'processTransfer');
    await processTransfer({
      requestId,
      action: 'rejected',
      notes: notes || null,
    });

    await fetchRequests();
  }, [fetchRequests]);

  const recipientApprove = useCallback(async (requestId: string, notes?: string) => {
    await approveRequest(requestId, notes ? `Recipient approved: ${notes}` : 'Recipient approved the transfer');
  }, [approveRequest]);

  const recipientReject = useCallback(async (requestId: string, notes?: string) => {
    await rejectRequest(requestId, notes ? `Recipient rejected: ${notes}` : 'Recipient rejected the transfer');
  }, [rejectRequest]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const getApprovalsForRequest = useCallback((_requestId: string): RequestApproval[] => {
    // Approval history is not yet stored per-request in the data model.
    // Returns empty array until the data model supports it.
    return [];
  }, []);

  return {
    requests,
    incomingTransfers,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    approveRequest,
    rejectRequest,
    recipientApprove,
    recipientReject,
    getApprovalsForRequest,
  };
}
