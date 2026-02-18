import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { PersonnelDoc } from '@/integrations/firebase/types';
import type { Personnel } from '@/types/pmtb';

interface UsePersonnelReturn {
  personnel: Personnel[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function mapDocToPersonnel(id: string, data: PersonnelDoc): Personnel {
  return {
    id,
    serviceNumber: data.serviceNumber,
    rank: data.rank,
    firstName: data.firstName,
    lastName: data.lastName,
    dutyPosition: data.dutyPosition || 'Unassigned',
    unitId: data.unitId || undefined,
    role: 'user',
    phone: data.phone || '',
    email: data.email || '',
    localAddress: data.localAddress || '',
    locationStatus: data.locationStatus,
    skills: data.skills || [],
    driverLicenses: data.driverLicenses || [],
    profileImage: data.profileImage || undefined,
    readinessStatus: data.readinessStatus,
    isSignatureApproved: data.isSignatureApproved,
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
      query(collection(db, 'personnel'), orderBy('lastName')),
      (snapshot) => {
        clearTimeout(timeoutId);
        const mappedPersonnel = snapshot.docs.map((doc) =>
          mapDocToPersonnel(doc.id, doc.data() as PersonnelDoc)
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
