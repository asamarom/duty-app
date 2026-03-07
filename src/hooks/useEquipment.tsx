import { useState, useEffect, useCallback, useRef } from 'react';
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
  onSnapshot,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
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
import { useUserRole } from '@/hooks/useUserRole';

export type AssignmentLevel = 'battalion' | 'company' | 'platoon' | 'individual' | 'unassigned';


export interface EquipmentWithAssignment extends Equipment {
  assigneeName?: string;
  currentAssignmentId?: string;
  currentPersonnelId?: string;
  currentUnitId?: string;
  assignmentLevel: AssignmentLevel;
  hasPendingTransfer?: boolean;
  currentQuantity?: number;
  pendingTransferOutQuantity?: number;
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
  updateEquipment: (id: string, updates: { quantity?: number; status?: string; description?: string }) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  assignEquipment: (equipmentId: string, assignment: AssignmentData, quantity?: number) => Promise<void>;
  unassignEquipment: (equipmentId: string) => Promise<void>;
  requestAssignment: (equipmentId: string, assignment: AssignmentData, notes?: string, quantity?: number) => Promise<void>;
  canDeleteEquipment: (equipmentItem: EquipmentWithAssignment, currentUserPersonnelId?: string) => boolean;
  isWithinSameUnit: (currentLevel: AssignmentLevel, targetLevel: AssignmentLevel, item: EquipmentWithAssignment, assignment: AssignmentData) => boolean;
}

export function useEquipment(): UseEquipmentReturn {
  const [equipment, setEquipment] = useState<EquipmentWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { battalionId, unitId, loading: battalionLoading } = useUserBattalion();
  const { isAdmin, isLeader } = useUserRole();
  const [currentUserPersonnelId, setCurrentUserPersonnelId] = useState<string | null>(null);
  const [isSignatureApproved, setIsSignatureApproved] = useState(false);

  const equipmentDocsRef = useRef<QueryDocumentSnapshot[]>([]);
  const assignmentDocsRef = useRef<QueryDocumentSnapshot[]>([]);
  const pendingDocsRef = useRef<QueryDocumentSnapshot[]>([]);
  const rebuildingRef = useRef(false);

  // Fetch current user's personnel record to determine equipment visibility and signature approval
  useEffect(() => {
    if (!user?.uid) {
      setCurrentUserPersonnelId(null);
      setIsSignatureApproved(false);
      return;
    }

    const fetchPersonnel = async () => {
      try {
        const personnelQuery = query(
          collection(db, 'personnel'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(personnelQuery);

        if (!snapshot.empty) {
          const personnelData = snapshot.docs[0].data() as PersonnelDoc;
          setCurrentUserPersonnelId(snapshot.docs[0].id);
          setIsSignatureApproved(personnelData.isSignatureApproved || false);
        } else {
          setCurrentUserPersonnelId(null);
          setIsSignatureApproved(false);
        }
      } catch (err) {
        console.error('Error fetching personnel record:', err);
        setCurrentUserPersonnelId(null);
        setIsSignatureApproved(false);
      }
    };

    fetchPersonnel();
  }, [user?.uid]);

  const rebuild = useCallback(async () => {
    if (rebuildingRef.current) return;
    rebuildingRef.current = true;
    try {
      // Collect unique personnelIds and unitIds from assignment docs
      const uniquePersonnelIds = new Set<string>();
      const uniqueUnitIds = new Set<string>();

      assignmentDocsRef.current.forEach((docSnap) => {
        const data = docSnap.data() as EquipmentAssignmentDoc;
        if (data.personnelId) uniquePersonnelIds.add(data.personnelId);
        if (data.unitId) uniqueUnitIds.add(data.unitId);
      });

      // Batch-fetch personnel and units in parallel
      const [personnelDocs, unitDocs] = await Promise.all([
        Promise.all([...uniquePersonnelIds].map(id => getDoc(doc(db, 'personnel', id)))),
        Promise.all([...uniqueUnitIds].map(id => getDoc(doc(db, 'units', id)))),
      ]);

      // Build lookup maps
      const personnelNames = new Map<string, string>();
      personnelDocs.forEach((pDoc) => {
        if (pDoc.exists()) {
          const pData = pDoc.data() as PersonnelDoc;
          personnelNames.set(pDoc.id, `${pData.firstName} ${pData.lastName}`);
        }
      });

      const unitData = new Map<string, { name: string; unitType: string }>();
      unitDocs.forEach((uDoc) => {
        if (uDoc.exists()) {
          const uData = uDoc.data() as UnitDoc;
          unitData.set(uDoc.id, { name: uData.name, unitType: uData.unitType });
        }
      });

      // Build assignmentsByEquipment map
      const assignmentsByEquipment = new Map<string, Array<{ id: string } & EquipmentAssignmentDoc>>();
      assignmentDocsRef.current.forEach((docSnap) => {
        const data = docSnap.data() as EquipmentAssignmentDoc;
        const equipId = data.equipmentId;
        if (!assignmentsByEquipment.has(equipId)) {
          assignmentsByEquipment.set(equipId, []);
        }
        assignmentsByEquipment.get(equipId)!.push({ id: docSnap.id, ...data });
      });

      // Build pending equipment IDs set and track transfer direction
      const pendingEquipmentIds = new Set(
        pendingDocsRef.current.map((d) => (d.data() as AssignmentRequestDoc).equipmentId)
      );

      // Build map of equipment with pending transfers OUT from user's unit
      // Key: equipmentId, Value: { fromUnitId, toUnitId, quantity }
      const pendingTransfersOut = new Map<string, Array<{ fromUnitId: string | null; toUnitId: string | null; quantity?: number }>>();

      // Build set of equipment with pending transfers TO the current user personally
      const pendingTransfersToUser = new Set<string>();

      pendingDocsRef.current.forEach((d) => {
        const data = d.data() as AssignmentRequestDoc;

        // Track transfers OUT from user's unit
        if (!pendingTransfersOut.has(data.equipmentId)) {
          pendingTransfersOut.set(data.equipmentId, []);
        }
        pendingTransfersOut.get(data.equipmentId)!.push({
          fromUnitId: data.fromUnitId,
          toUnitId: data.toUnitId,
          quantity: data.quantity
        });

        // Track transfers TO current user personally (to_personnel_id matches current user's personnel ID)
        if (data.to_personnel_id && data.to_personnel_id === currentUserPersonnelId) {
          pendingTransfersToUser.add(data.equipmentId);
        }
      });

      // Build mapped equipment
      const mappedEquipment: EquipmentWithAssignment[] = [];

      equipmentDocsRef.current.forEach((docSnap) => {
        const row = { id: docSnap.id, ...docSnap.data() as EquipmentDoc };
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

      // SECURITY: Filter equipment based on visibility rules.
      // This is a critical security filter that ensures users only see equipment
      // they should have access to. While Firestore rules restrict reads to battalion
      // level (necessary due to Firestore's inability to efficiently join collections),
      // this client-side filter provides defense-in-depth by further restricting
      // visibility to unit/personal level.
      //
      // Filter rules:
      // - ADMIN BYPASS: Admins see ALL equipment without any restrictions (including unassigned)
      // - Leaders/signature-approved users see equipment assigned to their unit or personally
      // - Regular users see equipment assigned to their unit or personally
      // - Unassigned equipment is ONLY visible to admins
      // - Hide equipment with pending transfers OUT from user's unit

      console.log(`[useEquipment] Filtering equipment: isAdmin=${isAdmin}, unitId="${unitId}", personnelId="${currentUserPersonnelId}"`);
      console.log(`[useEquipment] Total items before filter: ${mappedEquipment.length}`);
      mappedEquipment.forEach(item => {
        console.log(`[useEquipment] BEFORE FILTER: ${item.name}, currentUnitId="${item.currentUnitId}", currentPersonnelId="${item.currentPersonnelId}", assignmentLevel="${item.assignmentLevel}"`);
      });

      const filteredEquipment = mappedEquipment
        .filter((item) => {
          // ADMIN BYPASS: Admins see all equipment without restrictions
          if (isAdmin) {
            return true;
          }

          const baseEquipmentId = item.id.split('--')[0];

          // Unassigned equipment is ONLY visible to admins
          if (item.assignmentLevel === 'unassigned') {
            return false; // Changed from true - only admins can see unassigned
          }

          // Check if this equipment has a pending transfer OUT from the user's unit
          // Only hide if this is a serialized item (quantity=1 per row) OR if entire quantity is pending
          const pendingTransfers = pendingTransfersOut.get(baseEquipmentId);
          if (pendingTransfers && unitId && item.currentUnitId === unitId) {
            // Calculate total quantity pending transfer OUT from this unit
            const totalPendingOut = pendingTransfers
              .filter(t => t.fromUnitId === unitId)
              .reduce((sum, t) => sum + (t.quantity || 1), 0);

            // Only hide if the ENTIRE quantity of this row is pending transfer OUT
            // For serialized items (currentQuantity = 1), hide if there's any pending transfer
            // For bulk items, only hide if all items in this row are pending transfer
            if (totalPendingOut >= item.currentQuantity) {
              // All items in this row are pending transfer OUT
              // Hide it from the equipment list (it will appear in Transfers tab)
              return false;
            }
          }

          // Show equipment assigned to the current user's unit
          if (unitId && item.currentUnitId === unitId) {
            console.log(`[useEquipment] SHOW ${item.name}: matches user's unitId="${unitId}"`);
            return true;
          }

          // Show equipment assigned to the current user personally
          if (currentUserPersonnelId && item.currentPersonnelId === currentUserPersonnelId) {
            console.log(`[useEquipment] SHOW ${item.name}: matches user's personnelId="${currentUserPersonnelId}"`);
            return true;
          }

          // Show equipment with pending transfer TO the current user (for approval)
          if (pendingTransfersToUser.has(baseEquipmentId)) {
            console.log(`[useEquipment] SHOW ${item.name}: has pending transfer to user`);
            return true;
          }

          // Hide all other equipment
          console.log(`[useEquipment] HIDE ${item.name}: unitId="${unitId}", currentUnitId="${item.currentUnitId}", personnelId="${currentUserPersonnelId}", currentPersonnelId="${item.currentPersonnelId}"`);
          return false;
        })
        .map((item) => {
          // Adjust currentQuantity to exclude items pending transfer OUT
          const baseEquipmentId = item.id.split('--')[0];
          const pendingTransfers = pendingTransfersOut.get(baseEquipmentId);

          if (pendingTransfers && unitId && item.currentUnitId === unitId) {
            const totalPendingOut = pendingTransfers
              .filter(t => t.fromUnitId === unitId)
              .reduce((sum, t) => sum + (t.quantity || 1), 0);

            // Reduce displayed quantity by the number pending transfer OUT
            const adjustedQuantity = Math.max(0, item.currentQuantity - totalPendingOut);

            return {
              ...item,
              currentQuantity: adjustedQuantity,
              // Optional: Add a field to indicate how many are pending
              pendingTransferOutQuantity: totalPendingOut,
            };
          }

          return item;
        });

      console.log(`[useEquipment] Final filtered equipment count: ${filteredEquipment.length}`);
      filteredEquipment.forEach(item => {
        console.log(`  - ${item.name}: visible`);
      });

      setEquipment(filteredEquipment);
      setLoading(false);
    } catch (err) {
      console.error('useEquipment: rebuild error', err);
      setError(err as Error);
      setEquipment([]);
      setLoading(false);
    } finally {
      rebuildingRef.current = false;
    }
  }, [unitId, currentUserPersonnelId, isAdmin, isLeader, isSignatureApproved]);

  const updateEquipment = useCallback(
    async (id: string, updates: { quantity?: number; status?: string; description?: string }) => {
      const equipmentId = getBaseId(id);
      const updateData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (updates.quantity !== undefined) {
        updateData.quantity = updates.quantity;
      }
      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }

      await updateDoc(doc(db, 'equipment', equipmentId), updateData);
    },
    []
  );

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
    },
    [equipment, user?.uid, battalionId]
  );

  const canDeleteEquipment = useCallback(
    (equipmentItem: EquipmentWithAssignment, currentUserPersonnelId?: string): boolean => {
      // Admins can delete any equipment
      if (isAdmin) {
        return true;
      }

      // Leaders/signature-approved users can delete equipment assigned to their unit
      // (Stricter check: should verify createdBy was also from their unit, but requires additional lookup)
      // For now, we allow deletion if equipment is assigned to leader's unit
      if (unitId && equipmentItem.currentUnitId === unitId) {
        return true;
      }

      // Regular users can delete equipment they created AND is assigned to them personally
      if (!currentUserPersonnelId || equipmentItem.currentPersonnelId !== currentUserPersonnelId) {
        return false;
      }
      if (equipmentItem.createdBy !== user?.uid) {
        return false;
      }
      return true;
    },
    [user?.uid, isAdmin, unitId]
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
    },
    [_initiateTransferLocally]
  );

  const deleteEquipment = useCallback(
    async (id: string) => {
      const equipmentId = getBaseId(id);
      await deleteDoc(doc(db, 'equipment', equipmentId));
    },
    []
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
    },
    []
  );

  const requestAssignment = useCallback(
    async (id: string, assignment: AssignmentData, notes?: string, quantity?: number) => {
      const equipmentId = getBaseId(id);

      // User role validation: Regular users can only transfer equipment assigned to them personally
      // Find the equipment item to check ownership
      const equipmentItem = equipment.find(e => e.id.startsWith(equipmentId));
      if (equipmentItem && !isAdmin && !isLeader && !isSignatureApproved) {
        // Regular user - must own the equipment personally
        if (equipmentItem.currentPersonnelId !== currentUserPersonnelId) {
          throw new Error('You can only transfer equipment assigned to you personally');
        }
      }

      await _initiateTransferLocally(
        equipmentId,
        assignment.personnelId || undefined,
        assignment.unitId || undefined,
        notes,
        quantity || undefined,
      );
    },
    [_initiateTransferLocally, equipment, isAdmin, isLeader, isSignatureApproved, currentUserPersonnelId]
  );

  useEffect(() => {
    // Wait for battalionId to load before setting up query (unless admin)
    // This prevents querying with battalionId=null which returns empty results
    if (!isAdmin && battalionLoading) {
      console.log(`[useEquipment] Waiting for battalionId to load...`);
      setLoading(true);
      return;
    }

    setLoading(true);

    console.log(`[useEquipment] Setting up query with isAdmin=${isAdmin}, battalionId="${battalionId}", battalionLoading=${battalionLoading}`);

    // Admin: fetch all equipment
    // Non-admin: filter by battalionId to match Firestore security rules
    const equipQuery = isAdmin
      ? query(collection(db, 'equipment'), orderBy('name'))
      : battalionId
        ? query(collection(db, 'equipment'), where('battalionId', '==', battalionId), orderBy('name'))
        : query(collection(db, 'equipment'), where('battalionId', '==', '__NO_BATTALION__'), orderBy('name')); // Return empty results if no battalion

    // CRITICAL: Also filter assignments and requests by battalionId for non-admins
    // Without this filter, Firestore rules block the query with "Missing or insufficient permissions"
    const assignQuery = isAdmin
      ? query(collection(db, 'equipmentAssignments'), where('returnedAt', '==', null))
      : battalionId
        ? query(collection(db, 'equipmentAssignments'), where('returnedAt', '==', null), where('battalionId', '==', battalionId))
        : query(collection(db, 'equipmentAssignments'), where('returnedAt', '==', null), where('battalionId', '==', '__NO_BATTALION__'));

    const pendingQuery = isAdmin
      ? query(collection(db, 'assignmentRequests'), where('status', '==', 'pending'))
      : battalionId
        ? query(collection(db, 'assignmentRequests'), where('status', '==', 'pending'), where('battalionId', '==', battalionId))
        : query(collection(db, 'assignmentRequests'), where('status', '==', 'pending'), where('battalionId', '==', '__NO_BATTALION__'));

    const u1 = onSnapshot(equipQuery, snap => {
      console.log(`[useEquipment] Received ${snap.docs.length} equipment docs from Firestore`);
      snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.name}: battalionId="${data.battalionId}", currentUnitId="${data.currentUnitId}"`);
      });
      equipmentDocsRef.current = snap.docs;
      rebuild();
    }, err => { console.error('[useEquipment] equipment error', err); setLoading(false); });
    const u2 = onSnapshot(assignQuery, snap => { assignmentDocsRef.current = snap.docs; rebuild(); }, err => { console.error('[useEquipment] assignments error', err); setLoading(false); });
    const u3 = onSnapshot(pendingQuery, snap => { pendingDocsRef.current = snap.docs; rebuild(); }, err => { console.error('[useEquipment] pending error', err); setLoading(false); });

    return () => { u1(); u2(); u3(); };
  }, [rebuild, isAdmin, battalionId, battalionLoading]);

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
    refetch: rebuild,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    assignEquipment,
    unassignEquipment,
    requestAssignment,
    canDeleteEquipment,
    isWithinSameUnit,
  };
}
