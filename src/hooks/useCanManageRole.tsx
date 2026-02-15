import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from './useAuth';
import { useEffectiveRole } from './useEffectiveRole';
import type { PersonnelDoc, UnitDoc, AdminUnitAssignmentDoc } from '@/integrations/firebase/types';

interface UseCanManageRoleReturn {
  canManage: boolean;
  loading: boolean;
}

/**
 * Checks if the current user can manage roles for a specific personnel.
 * - Admins can manage anyone
 * - Leaders can manage personnel in their assigned units (and descendant units)
 */
export function useCanManageRole(personnelId: string | undefined): UseCanManageRoleReturn {
  const { user } = useAuth();
  const { isAdmin, isLeader, loading: roleLoading } = useEffectiveRole();
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPermission = useCallback(async () => {
    if (!user || !personnelId) {
      setCanManage(false);
      setLoading(false);
      return;
    }

    // Admins can manage anyone — short-circuit, no Firestore query needed
    if (isAdmin) {
      setCanManage(true);
      setLoading(false);
      return;
    }

    // Non-leaders cannot manage — short-circuit, no Firestore query needed
    if (!isLeader) {
      setCanManage(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // a. Get personnel doc
      const personnelDoc = await getDoc(doc(db, 'personnel', personnelId));

      // b. If personnel doesn't exist or has no unitId → cannot manage
      if (!personnelDoc.exists()) {
        setCanManage(false);
        return;
      }

      const personnelData = personnelDoc.data() as PersonnelDoc;

      if (!personnelData.unitId) {
        setCanManage(false);
        return;
      }

      // c. Query adminUnitAssignments for this user
      const adminAssignmentsSnapshot = await getDocs(
        query(
          collection(db, 'adminUnitAssignments'),
          where('userId', '==', user.uid),
        )
      );

      // d. Build managedUnitIds array
      const managedUnitIds: string[] = [];
      adminAssignmentsSnapshot.docs.forEach((d) => {
        const data = d.data() as AdminUnitAssignmentDoc;
        if (data.unitId) {
          managedUnitIds.push(data.unitId);
        }
      });

      // e. Walk unit ancestor chain starting at personnelData.unitId
      const ancestors: string[] = [];
      let currentId: string | undefined = personnelData.unitId;

      while (currentId) {
        ancestors.push(currentId);
        const unitDoc = await getDoc(doc(db, 'units', currentId));
        if (!unitDoc.exists()) {
          break;
        }
        const unitData = unitDoc.data() as UnitDoc;
        currentId = unitData.parentId ?? undefined;
      }

      // f. Check if any managed unit is in the ancestor chain
      const canManageResult = managedUnitIds.some(id => ancestors.includes(id));

      // g. Set result
      setCanManage(canManageResult);
    } catch (err) {
      console.error('Error checking permission:', err);
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, personnelId, isAdmin, isLeader]);

  useEffect(() => {
    if (!roleLoading) {
      checkPermission();
    }
  }, [checkPermission, roleLoading]);

  return {
    canManage,
    loading: loading || roleLoading,
  };
}
