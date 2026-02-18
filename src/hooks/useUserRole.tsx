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

/** Validate that a value is a known AppRole. */
function isAppRole(value: string): value is AppRole {
  return value === 'admin' || value === 'leader' || value === 'user';
}

const ROLE_CACHE_KEY = (uid: string) => `pmtb_roles_${uid}`;

function getCachedRoles(uid: string): AppRole[] | null {
  try {
    const cached = sessionStorage.getItem(ROLE_CACHE_KEY(uid));
    if (!cached) return null;
    return JSON.parse(cached) as AppRole[];
  } catch {
    return null;
  }
}

function setCachedRoles(uid: string, roles: AppRole[]): void {
  try {
    sessionStorage.setItem(ROLE_CACHE_KEY(uid), JSON.stringify(roles));
  } catch {
    // sessionStorage unavailable — ignore
  }
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

    // Apply sessionStorage cache immediately to avoid loading spinner
    // on page navigation when roles were already loaded this session.
    const cached = getCachedRoles(user.uid);
    if (cached !== null) {
      setActualRoles(cached);
      setLoading(false);
    }

    const userDocRef = doc(db, 'users', user.uid);

    // Set a timeout for loading state
    const timeoutId = setTimeout(() => {
      console.warn('useUserRole: Firestore query timeout after 10s');
      setError(new Error('Firestore query timeout'));
      setLoading(false);
    }, 10000);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        clearTimeout(timeoutId);
        const roles: AppRole[] = snapshot.exists()
          ? (snapshot.data() as UserDoc).roles || []
          : [];
        setActualRoles(roles);
        setCachedRoles(user.uid, roles);
        setLoading(false);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('useUserRole: Firestore error', err);
        setError(err);
        // Don't clear roles on error if we have cached data
        if (getCachedRoles(user.uid) === null) {
          setActualRoles([]);
        }
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
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
