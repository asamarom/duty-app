import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UserDoc } from '@/integrations/firebase/types';

interface CurrentPersonnel {
  id: string;
  signature?: string;
  firstName?: string;
  lastName?: string;
  serviceNumber?: string;
  unitId?: string | null;
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

    // Phase 3: Users collection now contains personnel data, userId is the document ID
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserDoc;
          setCurrentPersonnel({
            id: snap.id,
            signature: data.signature || undefined,
            firstName: data.firstName,
            lastName: data.lastName,
            serviceNumber: data.serviceNumber,
            unitId: data.unitId,
          });
        } else {
          setCurrentPersonnel(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, [user?.uid]);

  const saveSignature = async (svgString: string) => {
    if (!currentPersonnel) throw new Error('No user record found');
    await updateDoc(doc(db, 'users', currentPersonnel.id), {
      signature: svgString,
      updatedAt: serverTimestamp(),
    });
  };

  return { currentPersonnel, loading, saveSignature };
}
