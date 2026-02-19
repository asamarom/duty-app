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
