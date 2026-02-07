import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from './useAuth';
import type { UserDoc, AppRole } from '@/integrations/firebase/types';

export type { AppRole };

interface UseUserRoleReturn {
  roles: AppRole[];
  actualRoles: AppRole[];
  isAdmin: boolean;
  isLeader: boolean;
  isActualAdmin: boolean;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [actualRoles, setActualRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setActualRoles([]);
      setLoading(false);
      setError(null);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserDoc;
          setActualRoles(data.roles || []);
        } else {
          setActualRoles([]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setActualRoles([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const fetchRoles = async () => {
    // Roles are kept in sync via onSnapshot, but we expose refetch for compatibility
    setLoading(true);
    setLoading(false);
  };

  const isActualAdmin = actualRoles.includes('admin');

  return {
    roles: actualRoles,
    actualRoles,
    isAdmin: isActualAdmin,
    isLeader: actualRoles.includes('leader'),
    isActualAdmin,
    loading,
    error,
    refetch: fetchRoles,
  };
}
