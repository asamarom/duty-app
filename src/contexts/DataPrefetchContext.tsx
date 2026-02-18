import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

export function DataPrefetchProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const prefetchStarted = useRef(false);

  useEffect(() => {
    if (authLoading || !user || prefetchStarted.current) return;
    prefetchStarted.current = true;
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(
      query(collection(db, 'personnel'), orderBy('lastName')),
      () => {},
      (err) => console.warn('[prefetch] personnel', err)
    ));

    unsubs.push(onSnapshot(
      query(collection(db, 'units'), orderBy('name')),
      () => {},
      (err) => console.warn('[prefetch] units', err)
    ));

    unsubs.push(onSnapshot(
      query(collection(db, 'equipment'), orderBy('name')),
      () => {},
      (err) => console.warn('[prefetch] equipment', err)
    ));

    unsubs.push(onSnapshot(
      query(collection(db, 'assignmentRequests'), orderBy('requestedAt', 'desc')),
      () => {},
      (err) => console.warn('[prefetch] assignmentRequests', err)
    ));

    return () => {
      unsubs.forEach(u => u());
      prefetchStarted.current = false;
    };
  }, [authLoading, user?.uid]);

  return <>{children}</>;
}
