import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { PersonnelDoc } from '@/integrations/firebase/types';
import type { Personnel } from '@/types/pmtb';

interface UsePersonnelReturn {
  personnel: Personnel[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
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

  const fetchPersonnel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout after 10s')), 10000);
      });

      const personnelRef = collection(db, 'personnel');
      const q = query(personnelRef, orderBy('lastName'));

      // Race between the query and timeout
      const snapshot = await Promise.race([getDocs(q), timeoutPromise]);

      const mappedPersonnel = snapshot.docs.map((doc) =>
        mapDocToPersonnel(doc.id, doc.data() as PersonnelDoc)
      );

      setPersonnel(mappedPersonnel);
    } catch (err) {
      console.error('usePersonnel: Firestore error', err);
      setError(err as Error);
      setPersonnel([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  return {
    personnel,
    loading,
    error,
    refetch: fetchPersonnel,
  };
}
