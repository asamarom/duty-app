import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { AppRole } from './useUserRole';
import type { UserDoc } from '@/integrations/firebase/types';

interface PersonnelWithRole {
  personnelId: string; // Now userId (same as document ID)
  userId: string | null; // Kept for backward compatibility, always same as personnelId
  roles: AppRole[];
}

interface UsePersonnelRolesReturn {
  personnelRoles: Map<string, PersonnelWithRole>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getPersonnelRoles: (personnelId: string) => AppRole[];
  hasRole: (personnelId: string, role: AppRole) => boolean;
}

export function usePersonnelRoles(personnelIds?: string[]): UsePersonnelRolesReturn {
  const [personnelRoles, setPersonnelRoles] = useState<Map<string, PersonnelWithRole>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Phase 3: Users collection now contains personnel data
      // personnelId = userId = document ID in users collection
      const usersRef = collection(db, 'users');

      if (personnelIds && personnelIds.length > 0) {
        // Firestore 'in' query limited to 30 items at a time
        const batches: string[][] = [];
        for (let i = 0; i < personnelIds.length; i += 30) {
          const batch = personnelIds.slice(i, i + 30);
          batches.push(batch);
        }

        const result = new Map<string, PersonnelWithRole>();
        for (const batch of batches) {
          const q = query(usersRef, where(documentId(), 'in', batch));
          const snapshot = await getDocs(q);
          snapshot.docs.forEach((doc) => {
            const data = doc.data() as UserDoc;
            result.set(doc.id, {
              personnelId: doc.id,
              userId: doc.id, // Same as personnelId now
              roles: data.roles || [],
            });
          });
        }

        setPersonnelRoles(result);
      } else {
        // Fetch all users
        const snapshot = await getDocs(usersRef);
        const result = new Map<string, PersonnelWithRole>();
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as UserDoc;
          result.set(doc.id, {
            personnelId: doc.id,
            userId: doc.id, // Same as personnelId now
            roles: data.roles || [],
          });
        });

        setPersonnelRoles(result);
      }
    } catch (err) {
      console.error('usePersonnelRoles: Firestore error', err);
      setError(err as Error);
      setPersonnelRoles(new Map());
    } finally {
      setLoading(false);
    }
  }, [personnelIds?.join(',')]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const getPersonnelRoles = useCallback((personnelId: string): AppRole[] => {
    return personnelRoles.get(personnelId)?.roles || [];
  }, [personnelRoles]);

  const hasRole = useCallback((personnelId: string, role: AppRole): boolean => {
    return getPersonnelRoles(personnelId).includes(role);
  }, [getPersonnelRoles]);

  return {
    personnelRoles,
    loading,
    error,
    refetch: fetchRoles,
    getPersonnelRoles,
    hasRole,
  };
}
