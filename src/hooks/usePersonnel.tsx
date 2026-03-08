import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { UserDoc } from '@/integrations/firebase/types';
import type { Personnel } from '@/types/pmtb';

interface UsePersonnelReturn {
  personnel: Personnel[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function mapDocToPersonnel(id: string, data: UserDoc): Personnel {
  // Check if user has approved_user role (replaces isSignatureApproved)
  const isSignatureApproved = data.roles?.includes('approved_user') || false;

  return {
    id,
    serviceNumber: data.serviceNumber,
    rank: data.rank,
    firstName: data.firstName,
    lastName: data.lastName,
    dutyPosition: 'Unassigned', // Removed in Phase 2
    unitId: data.unitId || undefined,
    role: 'user',
    phone: data.phone || '',
    email: data.email || '',
    localAddress: '', // Removed in Phase 2
    locationStatus: (data.location as any) || 'home', // Free text now, map to enum for compatibility
    skills: data.skills || [],
    driverLicenses: data.driverLicenses || [],
    profileImage: data.profileImage || undefined,
    readinessStatus: 'ready', // Removed in Phase 2
    isSignatureApproved,
    signature: data.signature || undefined,
  };
}

export function usePersonnel(): UsePersonnelReturn {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const timeoutId = setTimeout(() => setLoading(false), 10_000);

    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), orderBy('lastName')),
      (snapshot) => {
        clearTimeout(timeoutId);
        console.log('[usePersonnel] snapshot received, docs:', snapshot.size, 'empty:', snapshot.empty);
        const mappedPersonnel = snapshot.docs.map((doc) =>
          mapDocToPersonnel(doc.id, doc.data() as UserDoc)
        );
        setPersonnel(mappedPersonnel);
        setError(null);
        setLoading(false);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('[usePersonnel] listener error', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => { clearTimeout(timeoutId); unsubscribe(); };
  }, []);

  return {
    personnel,
    loading,
    error,
    refetch: () => {},
  };
}
