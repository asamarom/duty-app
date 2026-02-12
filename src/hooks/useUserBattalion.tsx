import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from './useAuth';
import type { UserDoc } from '@/integrations/firebase/types';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnit = useCallback(async () => {
    if (!user?.uid) {
      setUnitId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout after 10s')), 10000);
      });

      const userDocRef = doc(db, 'users', user.uid);
      const snapshot = await Promise.race([getDoc(userDocRef), timeoutPromise]);

      if (snapshot.exists()) {
        const data = snapshot.data() as UserDoc;
        setUnitId(data.unitId || null);
      } else {
        setUnitId(null);
      }
    } catch (err) {
      console.error('useUserBattalion: Firestore error', err);
      setError(err as Error);
      setUnitId(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchUnit();
  }, [fetchUnit]);

  return {
    unitId,
    battalionId: unitId,
    loading,
    error,
    refetch: fetchUnit,
  };
}
