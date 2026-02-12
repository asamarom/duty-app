import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { AppRole } from './useUserRole';
import type { PersonnelDoc, UserDoc } from '@/integrations/firebase/types';

interface PersonnelWithRole {
  personnelId: string;
  userId: string | null;
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

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout after 10s')), 10000);
      });

      // Fetch personnel with their user_ids
      const personnelRef = collection(db, 'personnel');
      let personnelQuery;

      if (personnelIds && personnelIds.length > 0) {
        // Firestore 'in' query limited to 30 items at a time
        const batches = [];
        for (let i = 0; i < personnelIds.length; i += 30) {
          const batch = personnelIds.slice(i, i + 30);
          batches.push(batch);
        }

        const allPersonnelData: { id: string; userId: string | null }[] = [];
        for (const batch of batches) {
          const q = query(personnelRef, where(documentId(), 'in', batch));
          const snapshot = await Promise.race([getDocs(q), timeoutPromise]);
          snapshot.docs.forEach((doc) => {
            const data = doc.data() as PersonnelDoc;
            allPersonnelData.push({ id: doc.id, userId: data.userId });
          });
        }

        // Get unique user_ids that are not null
        const userIds = [...new Set(allPersonnelData.filter(p => p.userId).map(p => p.userId!))];

        // Fetch roles from users collection
        const userRolesMap = new Map<string, AppRole[]>();
        if (userIds.length > 0) {
          for (let i = 0; i < userIds.length; i += 30) {
            const batch = userIds.slice(i, i + 30);
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where(documentId(), 'in', batch));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach((doc) => {
              const data = doc.data() as UserDoc;
              userRolesMap.set(doc.id, data.roles || []);
            });
          }
        }

        // Build the personnel roles map
        const result = new Map<string, PersonnelWithRole>();
        allPersonnelData.forEach(p => {
          result.set(p.id, {
            personnelId: p.id,
            userId: p.userId,
            roles: p.userId ? (userRolesMap.get(p.userId) || []) : [],
          });
        });

        setPersonnelRoles(result);
      } else {
        // Fetch all personnel
        const snapshot = await getDocs(personnelRef);
        const allPersonnelData = snapshot.docs.map((doc) => {
          const data = doc.data() as PersonnelDoc;
          return { id: doc.id, userId: data.userId };
        });

        // Get unique user_ids
        const userIds = [...new Set(allPersonnelData.filter(p => p.userId).map(p => p.userId!))];

        // Fetch roles from users collection
        const userRolesMap = new Map<string, AppRole[]>();
        if (userIds.length > 0) {
          for (let i = 0; i < userIds.length; i += 30) {
            const batch = userIds.slice(i, i + 30);
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where(documentId(), 'in', batch));
            const usersSnapshot = await getDocs(q);
            usersSnapshot.docs.forEach((doc) => {
              const data = doc.data() as UserDoc;
              userRolesMap.set(doc.id, data.roles || []);
            });
          }
        }

        // Build the personnel roles map
        const result = new Map<string, PersonnelWithRole>();
        allPersonnelData.forEach(p => {
          result.set(p.id, {
            personnelId: p.id,
            userId: p.userId,
            roles: p.userId ? (userRolesMap.get(p.userId) || []) : [],
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
