import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

export function usePendingRequestsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Set a timeout for loading state
    const timeoutId = setTimeout(() => {
      console.warn('usePendingRequestsCount: Firestore query timeout after 10s');
      setCount(0);
    }, 10000);

    const requestsRef = collection(db, 'assignmentRequests');
    const q = query(requestsRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        clearTimeout(timeoutId);
        setCount(snapshot.size);
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('usePendingRequestsCount: Firestore error', error);
        setCount(0);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return count;
}
