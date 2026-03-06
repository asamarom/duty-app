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

      // OPTIMIZATION: Check Auth custom claims for battalionId first (instant, no DB lookup)
      // This matches the Firestore rules optimization and avoids expensive document fetches
      // Note: getIdTokenResult() may not exist in test environments or emulator
      let claimsBattalionId: string | undefined;
      if (typeof user.getIdTokenResult === 'function') {
        try {
          const idTokenResult = await user.getIdTokenResult();
          claimsBattalionId = idTokenResult.claims.battalionId as string | undefined;
        } catch (err) {
          console.warn('useUserBattalion: Could not get ID token claims, falling back to document lookup', err);
        }
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout after 10s')), 10000);
      });

      // Step 1: get user's unitId
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await Promise.race([getDoc(userDocRef), timeoutPromise]);

      if (!userSnap.exists()) {
        setUnitId(null);
        setBattalionId(claimsBattalionId || null);
        return;
      }

      const userData = userSnap.data() as UserDoc;
      const userUnitId = userData.unitId || null;
      setUnitId(userUnitId);

      // Step 2: Use battalionId from custom claims if available (fast path)
      if (claimsBattalionId) {
        setBattalionId(claimsBattalionId);
        return;
      }

      // Step 3: Fallback - resolve battalionId by looking up the unit document (slow path)
      // This provides backward compatibility for users without custom claims set
      if (!userUnitId) {
        setBattalionId(null);
        return;
      }

      const unitDocRef = doc(db, 'units', userUnitId);
      const unitSnap = await Promise.race([getDoc(unitDocRef), timeoutPromise]);

      if (unitSnap.exists()) {
        const unitData = unitSnap.data() as UnitDoc;
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
