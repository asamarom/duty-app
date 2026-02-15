import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { Equipment } from '@/types/pmtb';
import type {
  EquipmentDoc,
  EquipmentAssignmentDoc,
  AssignmentRequestDoc,
  PersonnelDoc,
  UnitDoc,
} from '@/integrations/firebase/types';
import { useAuth } from '@/hooks/useAuth';
import { useUserBattalion } from '@/hooks/useUserBattalion';

export type AssignmentLevel = 'battalion' | 'company' | 'platoon' | 'individual' | 'unassigned';

// Module-level cache — persists across component mounts so navigating back to a page
// doesn't trigger a full loading state. Only the first load shows a spinner.
let _equipmentCache: EquipmentWithAssignment[] | null = null;

export interface EquipmentWithAssignment extends Equipment {
  assigneeName?: string;
  currentAssignmentId?: string;
  currentPersonnelId?: string;
  currentUnitId?: string;
  assignmentLevel: AssignmentLevel;
  hasPendingTransfer?: boolean;
  currentQuantity?: number;
}

export interface AssignmentData {
  personnelId?: string;
  unitId?: string;
}

interface UseEquipmentReturn {
  equipment: EquipmentWithAssignment[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addEquipment: (item: Omit<Equipment, 'id'>, assignment?: AssignmentData) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  assignEquipment: (equipmentId: string, assignment: AssignmentData, quantity?: number) => Promise<void>;
  unassignEquipment: (equipmentId: string) => Promise<void>;
  requestAssignment: (equipmentId: string, assignment: AssignmentData, notes?: string, quantity?: number) => Promise<void>;
  canDeleteEquipment: (equipmentItem: EquipmentWithAssignment, currentUserPersonnelId?: string) => boolean;
  isWithinSameUnit: (currentLevel: AssignmentLevel, targetLevel: AssignmentLevel, item: EquipmentWithAssignment, assignment: AssignmentData) => boolean;
}

export function useEquipment(): UseEquipmentReturn {
  const [equipment, setEquipment] = useState<EquipmentWithAssignment[]>(_equipmentCache ?? []);
  const [loading, setLoading] = useState(_equipmentCache === null);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { battalionId } = useUserBattalion();

  const fetchEquipment = useCallback(async () => {
    try {
      if (_equipmentCache === null) setLoading(true);
      setError(null);

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout after 10s')), 10000);
      });

      // Fetch all equipment
      const equipmentRef = collection(db, 'equipment');
      const equipmentQuery = query(equipmentRef, orderBy('name'));
      const equipmentSnapshot = await Promise.race([getDocs(equipmentQuery), timeoutPromise]);

      const equipmentDocs = equipmentSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data() as EquipmentDoc,
      }));

      // Fetch all active assignments
      const assignmentsRef = collection(db, 'equipmentAssignments');
      const activeAssignmentsQuery = query(assignmentsRef, where('returnedAt', '==', null));
      const assignmentsSnapshot = await getDocs(activeAssignmentsQuery);

      const assignmentsByEquipment = new Map<string, Array<{ id: string } & EquipmentAssignmentDoc>>();
      assignmentsSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as EquipmentAssignmentDoc;
        const equipId = data.equipmentId;
        if (!assignmentsByEquipment.has(equipId)) {
          assignmentsByEquipment.set(equipId, []);
        }
        assignmentsByEquipment.get(equipId)!.push({ id: docSnap.id, ...data });
      });

      // Fetch pending transfer requests
      const requestsRef = collection(db, 'assignmentRequests');
      const pendingQuery = query(requestsRef, where('status', '==', 'pending'));
      const pendingSnapshot = await getDocs(pendingQuery);
      const pendingEquipmentIds = new Set(
        pendingSnapshot.docs.map((d) => (d.data() as AssignmentRequestDoc).equipmentId)
      );

      // Collect personnel and unit IDs we need to fetch
      const personnelIds = new Set<string>();
      const unitIds = new Set<string>();

      assignmentsSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as EquipmentAssignmentDoc;
        if (data.personnelId) personnelIds.add(data.personnelId);
        if (data.unitId) unitIds.add(data.unitId);
      });

      // Fetch personnel names
      const personnelNames = new Map<string, string>();
      for (const pId of personnelIds) {
        const pDoc = await getDoc(doc(db, 'personnel', pId));
        if (pDoc.exists()) {
          const pData = pDoc.data() as PersonnelDoc;
          personnelNames.set(pId, `${pData.firstName} ${pData.lastName}`);
        }
      }

      // Fetch unit names
      const unitData = new Map<string, { name: string; unitType: string }>();
      for (const uId of unitIds) {
        const uDoc = await getDoc(doc(db, 'units', uId));
        if (uDoc.exists()) {
          const uData = uDoc.data() as UnitDoc;
          unitData.set(uId, { name: uData.name, unitType: uData.unitType });
        }
      }

      // Build mapped equipment
      const mappedEquipment: EquipmentWithAssignment[] = [];

      equipmentDocs.forEach((row) => {
        const assignments = assignmentsByEquipment.get(row.id) || [];

        // Calculate total assigned quantity
        const totalAssignedQuantity = assignments.reduce((sum, a) => sum + (a.quantity || 0), 0);
        const unassignedQuantity = row.quantity - totalAssignedQuantity;

        // 1. Create rows for each active assignment
        assignments.forEach((assignment) => {
          let assigneeName: string | undefined;
          let assignedType: 'individual' | 'unit' | 'unassigned' = 'unassigned';
          let assignmentLevel: AssignmentLevel = 'unassigned';

          if (assignment.personnelId) {
            assigneeName = personnelNames.get(assignment.personnelId);
            assignedType = 'individual';
            assignmentLevel = 'individual';
          } else if (assignment.unitId) {
            const unit = unitData.get(assignment.unitId);
            if (unit) {
              assigneeName = unit.name;
              assignedType = 'unit';
              assignmentLevel = unit.unitType as AssignmentLevel;
            }
          }

          mappedEquipment.push({
            id: `${row.id}--${assignment.id}`,
            serialNumber: row.serialNumber || undefined,
            name: row.name,
            description: row.description || undefined,
            quantity: row.quantity,
            assignedTo: assigneeName,
            assignedType,
            assignedUnitId: assignment.unitId || undefined,
            assigneeName,
            currentAssignmentId: assignment.id,
            currentPersonnelId: assignment.personnelId || undefined,
            currentUnitId: assignment.unitId || undefined,
            assignmentLevel,
            hasPendingTransfer: pendingEquipmentIds.has(row.id) || row.status === 'pending_transfer',
            currentQuantity: assignment.quantity || 1,
            createdBy: row.createdBy ?? undefined,
          });
        });

        // 2. Create a row for the unassigned pool if quantity remains
        if (unassignedQuantity > 0 || assignments.length === 0) {
          mappedEquipment.push({
            id: `${row.id}--unassigned`,
            serialNumber: row.serialNumber || undefined,
            name: row.name,
            description: row.description || undefined,
            quantity: row.quantity,
            assignedTo: 'Unassigned',
            assignedType: 'unassigned',
            assigneeName: 'Unassigned',
            assignmentLevel: 'unassigned',
            hasPendingTransfer: pendingEquipmentIds.has(row.id) || row.status === 'pending_transfer',
            currentQuantity: unassignedQuantity,
            createdBy: row.createdBy ?? undefined,
          });
        }
      });

      _equipmentCache = mappedEquipment;
      setEquipment(mappedEquipment);
    } catch (err) {
      console.error('useEquipment: Firestore error', err);
      setError(err as Error);
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEquipment = useCallback(
    async (item: Omit<Equipment, 'id'>, assignment?: AssignmentData) => {
      // For bulk items (no serial), check if equipment with same name exists at same assignment
      if (!item.serialNumber && assignment) {
        const assignmentKey = assignment.personnelId
          ? `personnel:${assignment.personnelId}`
          : assignment.unitId
            ? `unit:${assignment.unitId}`
            : null;

        if (assignmentKey) {
          const existingItem = equipment.find((e) => {
            if (e.serialNumber) return false;
            if (e.name.toLowerCase() !== item.name.toLowerCase()) return false;

            const existingKey = e.currentPersonnelId
              ? `personnel:${e.currentPersonnelId}`
              : e.currentUnitId
                ? `unit:${e.currentUnitId}`
                : null;

            return existingKey === assignmentKey;
          });

          if (existingItem && existingItem.currentAssignmentId) {
            const newQuantity = (existingItem.currentQuantity || existingItem.quantity) + (item.quantity || 1);

            // Update assignment quantity
            await updateDoc(doc(db, 'equipmentAssignments', existingItem.currentAssignmentId), {
              quantity: newQuantity,
            });

            // Update equipment total quantity
            const baseId = existingItem.id.split('--')[0];
            await updateDoc(doc(db, 'equipment', baseId), {
              quantity: existingItem.quantity + (item.quantity || 1),
            });

            await fetchEquipment();
            return;
          }
        }
      }

      // Create new equipment record
      const equipmentRef = collection(db, 'equipment');
      const newEquipDoc = await addDoc(equipmentRef, {
        name: item.name,
        serialNumber: item.serialNumber || null,
        description: item.description || null,
        quantity: item.quantity,
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'serviceable',
        ...(battalionId ? { battalionId } : {}),
      });

      // Create assignment if provided
      if (assignment && (assignment.personnelId || assignment.unitId)) {
        const assignmentsRef = collection(db, 'equipmentAssignments');
        await addDoc(assignmentsRef, {
          equipmentId: newEquipDoc.id,
          personnelId: assignment.personnelId || null,
          unitId: assignment.unitId || null,
          quantity: item.quantity || 1,
          assignedAt: serverTimestamp(),
          returnedAt: null,
          ...(battalionId ? { battalionId } : {}),
        });
      }

      await fetchEquipment();
    },
    [fetchEquipment, equipment, user?.uid]
  );

  const canDeleteEquipment = useCallback(
    (equipmentItem: EquipmentWithAssignment, currentUserPersonnelId?: string): boolean => {
      if (!currentUserPersonnelId || equipmentItem.currentPersonnelId !== currentUserPersonnelId) {
        return false;
      }
      if (equipmentItem.createdBy !== user?.uid) {
        return false;
      }
      return true;
    },
    [user?.uid]
  );

  const getBaseId = (id: string) => id.split('--')[0];

  /**
   * Shared helper that replicates the initiateTransfer Cloud Function logic
   * using direct Firestore operations.
   *
   * Creates an assignmentRequest document and sets the equipment status to
   * pending_transfer. Both assignEquipment and requestAssignment delegate here.
   */
  const _initiateTransferLocally = useCallback(
    async (
      equipmentId: string,
      toPersonnelId: string | undefined,
      toUnitId: string | undefined,
      notes?: string,
      quantity?: number,
    ) => {
      // a. Get equipment doc to get battalionId
      const equipDoc = await getDoc(doc(db, 'equipment', equipmentId));
      const equipBattalionId = equipDoc?.exists() ? (equipDoc.data() as EquipmentDoc & { battalionId?: string }).battalionId : undefined;

      // b. Get current assignment
      const currentAssignmentSnapshot = await getDocs(
        query(
          collection(db, 'equipmentAssignments'),
          where('equipmentId', '==', equipmentId),
          where('returnedAt', '==', null),
        )
      );

      // c & d. Resolve fromName
      let fromPersonnelId: string | null = null;
      let fromUnitId: string | null = null;
      let fromUnitType: string | null = null;
      let fromName: string | null = null;

      if (currentAssignmentSnapshot.docs.length > 0) {
        const assignment = currentAssignmentSnapshot.docs[0].data() as EquipmentAssignmentDoc;
        fromPersonnelId = assignment.personnelId || null;
        fromUnitId = assignment.unitId || null;

        if (fromPersonnelId) {
          const persDoc = await getDoc(doc(db, 'personnel', fromPersonnelId));
          if (persDoc?.exists()) {
            const persData = persDoc.data() as PersonnelDoc;
            fromName = `${persData.firstName} ${persData.lastName}`;
          }
        } else if (fromUnitId) {
          const unitDoc = await getDoc(doc(db, 'units', fromUnitId));
          if (unitDoc?.exists()) {
            const unitData = unitDoc.data() as UnitDoc;
            fromName = unitData.name;
            fromUnitType = unitData.unitType;
          }
        }
      }

      // d. Resolve toName
      let toName: string | null = null;
      let toUnitType: string | null = null;

      if (toPersonnelId) {
        const persDoc = await getDoc(doc(db, 'personnel', toPersonnelId));
        if (persDoc?.exists()) {
          const persData = persDoc.data() as PersonnelDoc;
          toName = `${persData.firstName} ${persData.lastName}`;
        }
      } else if (toUnitId) {
        const unitDoc = await getDoc(doc(db, 'units', toUnitId));
        if (unitDoc?.exists()) {
          const unitData = unitDoc.data() as UnitDoc;
          toName = unitData.name;
          toUnitType = unitData.unitType;
        }
      }

      // e. addDoc to assignmentRequests
      const requestData: Record<string, unknown> = {
        equipmentId,
        status: 'pending',
        requestedBy: user!.uid,
        requestedAt: serverTimestamp(),
        fromPersonnelId,
        fromUnitId,
        fromUnitType,
        fromName,
        toPersonnelId: toPersonnelId || null,
        toUnitId: toUnitId || null,
        toUnitType,
        toName,
      };

      if (notes !== undefined) {
        requestData.notes = notes;
      }

      if (quantity !== undefined) {
        requestData.quantity = quantity;
      }

      if (equipBattalionId) {
        requestData.battalionId = equipBattalionId;
      }

      await addDoc(collection(db, 'assignmentRequests'), requestData);

      // f. Update equipment status to pending_transfer
      await updateDoc(doc(db, 'equipment', equipmentId), {
        status: 'pending_transfer',
        updatedAt: serverTimestamp(),
      });
    },
    [user]
  );

  const assignEquipment = useCallback(
    async (id: string, assignment: AssignmentData, quantity?: number) => {
      const equipmentId = getBaseId(id);

      await _initiateTransferLocally(
        equipmentId,
        assignment.personnelId || undefined,
        assignment.unitId || undefined,
        undefined,
        quantity || undefined,
      );

      await fetchEquipment();
    },
    [fetchEquipment, _initiateTransferLocally]
  );

  const deleteEquipment = useCallback(
    async (id: string) => {
      const equipmentId = getBaseId(id);
      await deleteDoc(doc(db, 'equipment', equipmentId));
      await fetchEquipment();
    },
    [fetchEquipment]
  );

  const unassignEquipment = useCallback(
    async (id: string) => {
      const equipmentId = getBaseId(id);

      // Find active assignments for this equipment and mark them returned
      const assignmentsRef = collection(db, 'equipmentAssignments');
      const q = query(
        assignmentsRef,
        where('equipmentId', '==', equipmentId),
        where('returnedAt', '==', null)
      );
      const snapshot = await getDocs(q);

      const updates = snapshot.docs.map((docSnap) =>
        updateDoc(doc(db, 'equipmentAssignments', docSnap.id), {
          returnedAt: serverTimestamp(),
        })
      );

      await Promise.all(updates);
      await fetchEquipment();
    },
    [fetchEquipment]
  );

  const requestAssignment = useCallback(
    async (id: string, assignment: AssignmentData, notes?: string, quantity?: number) => {
      const equipmentId = getBaseId(id);

      await _initiateTransferLocally(
        equipmentId,
        assignment.personnelId || undefined,
        assignment.unitId || undefined,
        notes,
        quantity || undefined,
      );

      await fetchEquipment();
    },
    [fetchEquipment, _initiateTransferLocally]
  );

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const isWithinSameUnit = useCallback(
    (_currentLevel: AssignmentLevel, _targetLevel: AssignmentLevel, item: EquipmentWithAssignment, assignment: AssignmentData): boolean => {
      if (!item.currentUnitId || !assignment.unitId) return false;
      return item.currentUnitId === assignment.unitId;
    },
    []
  );

  return {
    equipment,
    loading,
    error,
    refetch: fetchEquipment,
    addEquipment,
    deleteEquipment,
    assignEquipment,
    unassignEquipment,
    requestAssignment,
    canDeleteEquipment,
    isWithinSameUnit,
  };
}
