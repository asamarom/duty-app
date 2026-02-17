import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  writeBatch,
  orderBy,
  query,
  where,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AssignmentRequestDoc, EquipmentDoc, UnitDoc, PersonnelDoc, UserDoc } from '@/integrations/firebase/types';

export type AssignmentRequestStatus = 'pending' | 'approved' | 'rejected';

// Module-level cache — persists across component mounts so navigating back shows
// previously loaded data immediately while a background refresh runs silently.
let _requestsCache: { requests: AssignmentRequest[]; incoming: AssignmentRequest[] } | null = null;

/** Exposed only for unit tests — resets the module-level cache between test runs. */
export function _resetCacheForTesting() { _requestsCache = null; }

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
  quantity?: number;
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
  const [requests, setRequests] = useState<AssignmentRequest[]>(_requestsCache?.requests ?? []);
  const [incomingTransfers, setIncomingTransfers] = useState<AssignmentRequest[]>(_requestsCache?.incoming ?? []);
  const [loading, setLoading] = useState(_requestsCache === null);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchRequests = useCallback(async () => {
    try {
      if (_requestsCache === null) setLoading(true);
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
            quantity: data.quantity,
            recipient_approved: data.recipientApproved || false,
            recipient_approved_at: data.recipientApprovedAt?.toDate().toISOString(),
            recipient_approved_by: data.recipientApprovedBy || undefined,
          };
        })
      );

      const incoming = mappedRequests.filter(r =>
        r.status === 'pending' && !r.recipient_approved
      );
      _requestsCache = { requests: mappedRequests, incoming };
      setRequests(mappedRequests);
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
    const { equipmentId, toUnitId, toPersonnelId, notes } = data;

    // Get equipment doc to get battalionId
    const equipDoc = await getDoc(doc(db, 'equipment', equipmentId));
    const equipBattalionId = equipDoc?.exists()
      ? (equipDoc.data() as EquipmentDoc & { battalionId?: string }).battalionId
      : undefined;

    // Get current assignment for "from" details
    const currentAssignmentSnapshot = await getDocs(
      query(
        collection(db, 'equipmentAssignments'),
        where('equipmentId', '==', equipmentId),
        where('returnedAt', '==', null),
      )
    );

    let fromPersonnelId: string | null = null;
    let fromUnitId: string | null = null;
    let fromUnitType: string | null = null;
    let fromName: string | null = null;

    if (currentAssignmentSnapshot.docs.length > 0) {
      const assignment = currentAssignmentSnapshot.docs[0].data() as { personnelId?: string | null; unitId?: string | null };
      fromPersonnelId = assignment.personnelId || null;
      fromUnitId = assignment.unitId || null;

      if (fromPersonnelId) {
        const persDoc = await getDoc(doc(db, 'personnel', fromPersonnelId));
        if (persDoc?.exists()) {
          const persData = persDoc.data() as PersonnelDoc;
          fromName = `${persData.firstName} ${persData.lastName}`;
        }
      } else if (fromUnitId) {
        const unitDoc = await getDoc(doc(db, 'units', fromUnitId));
        if (unitDoc?.exists()) {
          const unitData = unitDoc.data() as UnitDoc;
          fromName = unitData.name;
          fromUnitType = unitData.unitType;
        }
      }
    }

    // Resolve toName
    let toName: string | null = null;
    let toUnitType: string | null = null;

    if (toPersonnelId) {
      const persDoc = await getDoc(doc(db, 'personnel', toPersonnelId));
      if (persDoc?.exists()) {
        const persData = persDoc.data() as PersonnelDoc;
        toName = `${persData.firstName} ${persData.lastName}`;
      }
    } else if (toUnitId) {
      const unitDoc = await getDoc(doc(db, 'units', toUnitId));
      if (unitDoc?.exists()) {
        const unitData = unitDoc.data() as UnitDoc;
        toName = unitData.name;
        toUnitType = unitData.unitType;
      }
    }

    const requestData: Record<string, unknown> = {
      equipmentId,
      status: 'pending',
      requestedBy: user!.uid,
      requestedAt: serverTimestamp(),
      fromPersonnelId,
      fromUnitId,
      fromUnitType,
      fromName,
      toPersonnelId: toPersonnelId || null,
      toUnitId: toUnitId || null,
      toUnitType,
      toName,
    };

    if (notes) {
      requestData.notes = notes;
    }

    if (equipBattalionId) {
      requestData.battalionId = equipBattalionId;
    }

    await addDoc(collection(db, 'assignmentRequests'), requestData);

    await updateDoc(doc(db, 'equipment', equipmentId), {
      status: 'pending_transfer',
      updatedAt: serverTimestamp(),
    });

    await fetchRequests();
  }, [fetchRequests, user]);

  const approveRequest = useCallback(async (requestId: string, _notes?: string) => {
    // Find request data from local state
    const localReq = requests.find(r => r.id === requestId);
    if (!localReq) {
      throw new Error(`Assignment request ${requestId} not found`);
    }

    const batch = writeBatch(db);
    const requestRef = doc(db, 'assignmentRequests', requestId);

    // d. Update request status to approved
    batch.update(requestRef, {
      status: 'approved',
      processedBy: user!.uid,
      processedAt: serverTimestamp(),
    });

    // e. Query old active assignments for this equipment
    const oldAssignmentsSnapshot = await getDocs(
      query(
        collection(db, 'equipmentAssignments'),
        where('equipmentId', '==', localReq.equipment_id),
        where('returnedAt', '==', null),
      )
    );

    // f. Mark each old assignment as returned
    oldAssignmentsSnapshot.docs.forEach((d) => {
      batch.update(d.ref, { returnedAt: serverTimestamp() });
    });

    // g. Create new assignment ref
    const newAssRef = doc(collection(db, 'equipmentAssignments'));

    // h. Set new assignment
    const newAssignmentData: Record<string, unknown> = {
      equipmentId: localReq.equipment_id,
      personnelId: localReq.to_personnel_id || null,
      unitId: localReq.to_unit_id || null,
      quantity: localReq.quantity ?? 1,
      assignedAt: serverTimestamp(),
      assignedBy: user!.uid,
      returnedAt: null,
    };

    batch.set(newAssRef, newAssignmentData);

    // i. Update equipment status to assigned
    batch.update(doc(db, 'equipment', localReq.equipment_id), {
      status: 'assigned',
      updatedAt: serverTimestamp(),
    });

    // j. Commit batch
    await batch.commit();

    await fetchRequests();
  }, [fetchRequests, user, requests]);

  const rejectRequest = useCallback(async (requestId: string, _notes?: string) => {
    // Find request data from local state
    const localReq = requests.find(r => r.id === requestId);
    if (!localReq) {
      throw new Error(`Assignment request ${requestId} not found`);
    }

    const batch = writeBatch(db);

    // c. Update request status to rejected
    batch.update(doc(db, 'assignmentRequests', requestId), {
      status: 'rejected',
      processedBy: user!.uid,
      processedAt: serverTimestamp(),
    });

    // d. Reset equipment status to serviceable (CRITICAL: not "available")
    batch.update(doc(db, 'equipment', localReq.equipment_id), {
      status: 'serviceable',
      updatedAt: serverTimestamp(),
    });

    // e. Commit batch
    await batch.commit();

    await fetchRequests();
  }, [fetchRequests, user, requests]);

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
