import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from './useAuth';
import type { UserDoc, UnitDoc } from '@/integrations/firebase/types';

interface UseUserUnitReturn {
  unitId: string | null;
  battalionId: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUserBattalion(): UseUserUnitReturn {
  const { user } = useAuth();
  const [unitId, setUnitId] = useState<string | null>(null);
  const [battalionId, setBattalionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnit = useCallback(async () => {
    if (!user?.uid) {
      setUnitId(null);
      setBattalionId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout after 10s')), 10000);
      });

      // Step 1: get user's unitId
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await Promise.race([getDoc(userDocRef), timeoutPromise]);

      if (!userSnap.exists()) {
        setUnitId(null);
        setBattalionId(null);
        return;
      }

      const userData = userSnap.data() as UserDoc;
      const userUnitId = userData.unitId || null;
      setUnitId(userUnitId);

      if (!userUnitId) {
        setBattalionId(null);
        return;
      }

      // Step 2: resolve battalionId by looking up the unit document.
      // Units store a `battalionId` field (self-referential for battalions,
      // inherited for companies/platoons) — mirrors getUserBattalionId() in firestore.rules.
      const unitDocRef = doc(db, 'units', userUnitId);
      const unitSnap = await Promise.race([getDoc(unitDocRef), timeoutPromise]);

      if (unitSnap.exists()) {
        const unitData = unitSnap.data() as UnitDoc;
        // battalionId on the unit doc points to the root battalion.
        // Fall back to userUnitId in case the field is missing (legacy data).
        setBattalionId(unitData.battalionId || userUnitId);
      } else {
        // Unit doc not found — fall back to userUnitId
        setBattalionId(userUnitId);
      }
    } catch (err) {
      console.error('useUserBattalion: Firestore error', err);
      setError(err as Error);
      setUnitId(null);
      setBattalionId(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchUnit();
  }, [fetchUnit]);

  return {
    unitId,
    battalionId,
    loading,
    error,
    refetch: fetchUnit,
  };
}
