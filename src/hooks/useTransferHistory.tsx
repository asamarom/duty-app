import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import type { TransferHistoryRecord } from '@/types/pmtb';
import type { AssignmentRequestDoc, UnitDoc, PersonnelDoc, UserDoc } from '@/integrations/firebase/types';

interface UseTransferHistoryReturn {
  history: TransferHistoryRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTransferHistory(equipmentId: string | undefined): UseTransferHistoryReturn {
  const [history, setHistory] = useState<TransferHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const [currentPersonnelId, setCurrentPersonnelId] = useState<string | null>(null);
  const [currentUnitId, setCurrentUnitId] = useState<string | null>(null);
  const [isSignatureApproved, setIsSignatureApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch current user's unit and role info
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = getDoc(doc(db, 'users', user.uid)).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserDoc;
        setCurrentPersonnelId(user.uid);
        setCurrentUnitId(data.unitId || null);
        setIsSignatureApproved(data.roles?.includes('approved_user') || false);
        setIsAdmin(data.roles?.includes('admin') || false);
      }
    });

    return () => {};
  }, [user?.uid]);

  const fetchHistory = useCallback(async () => {
    if (!equipmentId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const requestsRef = collection(db, 'assignmentRequests');
      const q = query(
        requestsRef,
        where('equipmentId', '==', equipmentId),
        where('status', '==', 'approved'),
        orderBy('requestedAt', 'desc')
      );

      const snapshot = await getDocs(q);

      const mappedHistory: TransferHistoryRecord[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data() as AssignmentRequestDoc;

          // Fetch related names if not denormalized
          let fromName = data.fromName || 'Unassigned';
          let toName = data.toName || 'Unassigned';
          let transferredByName = data.requestedByName;

          if (!data.fromName) {
            if (data.fromPersonnelId) {
              // Phase 3: Query users collection instead of personnel
              const userDoc = await getDoc(doc(db, 'users', data.fromPersonnelId));
              if (userDoc.exists()) {
                const user = userDoc.data() as UserDoc;
                fromName = `${user.firstName} ${user.lastName}`;
              }
            } else if (data.fromUnitId) {
              const unitDoc = await getDoc(doc(db, 'units', data.fromUnitId));
              if (unitDoc.exists()) {
                fromName = (unitDoc.data() as UnitDoc).name;
              }
            }
          }

          if (!data.toName) {
            if (data.toPersonnelId) {
              // Phase 3: Query users collection instead of personnel
              const userDoc = await getDoc(doc(db, 'users', data.toPersonnelId));
              if (userDoc.exists()) {
                const user = userDoc.data() as UserDoc;
                toName = `${user.firstName} ${user.lastName}`;
              }
            } else if (data.toUnitId) {
              const unitDoc = await getDoc(doc(db, 'units', data.toUnitId));
              if (unitDoc.exists()) {
                toName = (unitDoc.data() as UnitDoc).name;
              }
            }
          }

          if (!transferredByName && data.requestedBy) {
            const userDoc = await getDoc(doc(db, 'users', data.requestedBy));
            if (userDoc.exists()) {
              transferredByName = (userDoc.data() as UserDoc).fullName || undefined;
            }
          }

          return {
            id: docSnap.id,
            equipmentId: data.equipmentId,
            quantity: 1,
            fromUnitType: data.fromUnitType,
            fromUnitId: data.fromUnitId || undefined,
            fromName,
            toUnitType: data.toUnitType,
            toUnitId: data.toUnitId || undefined,
            toName,
            transferredBy: data.requestedBy || undefined,
            transferredByName,
            transferredAt: data.requestedAt?.toDate().toISOString() || new Date().toISOString(),
            notes: data.notes || undefined,
          };
        })
      );

      // Filter history based on user role and unit
      // Admins see all history; leaders see only transfers involving their unit; regular users see only their personal transfers
      const filteredHistory = isAdmin
        ? mappedHistory
        : mappedHistory.filter(record =>
            // Show if transfer involves me personally
            (record.fromUnitId === currentPersonnelId || record.toUnitId === currentPersonnelId) ||
            // Show if transfer involves my unit (for signature-approved users only)
            (isSignatureApproved && (
              record.fromUnitId === currentUnitId || record.toUnitId === currentUnitId
            ))
          );

      setHistory(filteredHistory);
    } catch (err) {
      console.error('useTransferHistory: Firestore error', err);
      setError(err as Error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [equipmentId, isAdmin, currentPersonnelId, currentUnitId, isSignatureApproved]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory,
  };
}
