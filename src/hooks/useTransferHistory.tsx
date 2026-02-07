import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
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
              const persDoc = await getDoc(doc(db, 'personnel', data.fromPersonnelId));
              if (persDoc.exists()) {
                const pers = persDoc.data() as PersonnelDoc;
                fromName = `${pers.firstName} ${pers.lastName}`;
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
              const persDoc = await getDoc(doc(db, 'personnel', data.toPersonnelId));
              if (persDoc.exists()) {
                const pers = persDoc.data() as PersonnelDoc;
                toName = `${pers.firstName} ${pers.lastName}`;
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

      setHistory(mappedHistory);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

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
