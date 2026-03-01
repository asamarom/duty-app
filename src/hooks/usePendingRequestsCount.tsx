import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

export function usePendingRequestsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const requestsRef = collection(db, 'signupRequests');
    const q = query(requestsRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCount(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  return count;
}
