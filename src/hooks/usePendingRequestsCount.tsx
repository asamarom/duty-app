import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useUserRole } from '@/hooks/useUserRole';

export function usePendingRequestsCount() {
  const [count, setCount] = useState(0);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    // Only admins can query all pending signup requests
    // Non-admins would get permission denied
    if (!isAdmin) {
      setCount(0);
      return;
    }

    const requestsRef = collection(db, 'signupRequests');
    const q = query(requestsRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  return count;
}
