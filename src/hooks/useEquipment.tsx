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

    // Phase 3: Query users collection instead of personnel
    const fetchUser = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data() as UserDoc;
          setCurrentUserPersonnelId(user.uid); // userId = personnelId now
          // Check if user has approved_user role (replaces isSignatureApproved)
          setIsSignatureApproved(userData.roles?.includes('approved_user') || false);
        } else {
          setCurrentUserPersonnelId(null);
          setIsSignatureApproved(false);
        }
      } catch (err) {
        console.error('Error fetching user record:', err);
        setCurrentUserPersonnelId(null);
        setIsSignatureApproved(false);
      }
    };

    fetchUser();
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

      // Phase 3: Batch-fetch users and units in parallel
      const [userDocs, unitDocs] = await Promise.all([
        Promise.all([...uniquePersonnelIds].map(id => getDoc(doc(db, 'users', id)))),
        Promise.all([...uniqueUnitIds].map(id => getDoc(doc(db, 'units', id)))),
      ]);

      // Build lookup maps
      const personnelNames = new Map<string, string>();
      userDocs.forEach((uDoc) => {
        if (uDoc.exists()) {
          const uData = uDoc.data() as UserDoc;
          personnelNames.set(uDoc.id, `${uData.firstName} ${uData.lastName}`);
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
      // Filter rules (from EQUIPMENT_ACCESS_RULES.md):
      // - ADMIN BYPASS: Admins see ALL equipment without any restrictions (including unassigned)
      // - All non-admin users (leaders, signature-approved, regular users) see:
      //   - Equipment assigned to their unit
      //   - Equipment assigned to them personally
      //   - Equipment with pending transfer TO them
      //   - NOT equipment assigned to other units (even within battalion)
      //   - NOT equipment with pending transfer OUT (entire quantity - shown in Transfers tab instead)
      //   - NOT unassigned equipment (admins only)


      const filteredEquipment = mappedEquipment
        .filter((item) => {
          // ADMIN BYPASS: Admins see all equipment without restrictions
          if (isAdmin) {
            return true;
          }

          const baseEquipmentId = item.id.split('--')[0];

          // Unassigned equipment is ONLY visible to admins
          if (item.assignmentLevel === 'unassigned') {
            return false;
          }

          // Check if this equipment has a pending transfer OUT from the user's unit
          // For leaders/signature-approved users: hide equipment with pending transfer OUT
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

          // Show equipment assigned to the current user personally (for all user types)
          if (currentUserPersonnelId && item.currentPersonnelId === currentUserPersonnelId) {
            return true;
          }

          // Show equipment with pending transfer TO the current user (for all user types)
          if (pendingTransfersToUser.has(baseEquipmentId)) {
            return true;
          }

          // Show equipment assigned to my unit (for all user types, per EQUIPMENT_ACCESS_RULES.md line 69 & decision tree)
          // Both leaders/signature-approved AND regular users can see equipment in their unit
          if (unitId && item.currentUnitId === unitId) {
            return true;
          }

          // Hide all other equipment (equipment in other units)
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
      // Only admins can update equipment
      if (!isAdmin) {
        throw new Error('Only admins can update equipment fields');
      }

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
    [isAdmin]
  );

  const addEquipment = useCallback(
    async (item: Omit<Equipment, 'id'>, assignment?: AssignmentData) => {
      // Permission check: Only admins, leaders, and signature-approved users can create equipment
      if (!isAdmin && !isLeader && !isSignatureApproved) {
        throw new Error('You do not have permission to create equipment');
      }

      // Leaders/signature-approved users can only create equipment in their own unit
      if (!isAdmin && assignment?.unitId && assignment.unitId !== unitId) {
        throw new Error('You can only create equipment in your own unit');
      }

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
    [equipment, user?.uid, battalionId, isAdmin, isLeader, isSignatureApproved, unitId]
  );

  const canDeleteEquipment = useCallback(
    (equipmentItem: EquipmentWithAssignment, currentUserPersonnelId?: string): boolean => {
      // Admins can delete any equipment
      if (isAdmin) {
        return true;
      }

      // Leaders/signature-approved users can delete equipment that:
      // 1. Was created by their unit (createdBy exists and equipment is from their battalion)
      // 2. Is currently assigned to their unit
      if ((isLeader || isSignatureApproved) && unitId && equipmentItem.currentUnitId === unitId) {
        // Check if equipment was created by someone in the same battalion
        // Note: We don't verify the exact createdBy user's unit here, but rely on
        // battalionId matching as a proxy for "created by my unit"
        if (equipmentItem.battalionId === battalionId) {
          return true;
        }
      }

      // Regular users cannot delete equipment
      return false;
    },
    [user?.uid, isAdmin, isLeader, isSignatureApproved, unitId, battalionId]
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
      // a. Get equipment doc to get battalionId and original status
      const equipDoc = await getDoc(doc(db, 'equipment', equipmentId));
      const equipData = equipDoc?.exists() ? (equipDoc.data() as EquipmentDoc & { battalionId?: string }) : null;
      const equipBattalionId = equipData?.battalionId;
      const originalEquipmentStatus = equipData?.status as EquipmentStatus | undefined;

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
          // Phase 3: Query users collection instead of personnel
          const userDoc = await getDoc(doc(db, 'users', fromPersonnelId));
          if (userDoc?.exists()) {
            const userData = userDoc.data() as UserDoc;
            fromName = `${userData.firstName} ${userData.lastName}`;
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
        // Phase 3: Query users collection instead of personnel
        const userDoc = await getDoc(doc(db, 'users', toPersonnelId));
        if (userDoc?.exists()) {
          const userData = userDoc.data() as UserDoc;
          toName = `${userData.firstName} ${userData.lastName}`;
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
        originalEquipmentStatus, // Store original status for restoration on cancel
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

      // Find the equipment item to check ownership and permissions (if available)
      // Note: In some cases (like tests or initial load), equipment might not be in state yet
      const equipmentItem = equipment.find(e => e.id.startsWith(equipmentId));

      // Client-side permission checks (if equipment is found in state)
      // This provides early validation for better UX, but Firestore rules are the ultimate authority
      if (equipmentItem && !isAdmin) {
        if (isLeader || isSignatureApproved) {
          // Leaders/signature-approved users can only transfer equipment from their unit
          if (equipmentItem.currentUnitId !== unitId) {
            throw new Error('You can only transfer equipment assigned to your unit');
          }
        } else {
          // Regular users can only transfer equipment assigned to them personally
          if (equipmentItem.currentPersonnelId !== currentUserPersonnelId) {
            throw new Error('You can only transfer equipment assigned to you personally');
          }
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
    [_initiateTransferLocally, equipment, isAdmin, isLeader, isSignatureApproved, currentUserPersonnelId, unitId]
  );

  useEffect(() => {
    // Wait for battalionId to load before setting up query (unless admin)
    // This prevents querying with battalionId=null which returns empty results
    // CRITICAL: Check both loading state AND null battalionId to avoid race conditions
    if (!isAdmin && (battalionLoading || battalionId === null)) {
      setLoading(true);
      return;
    }

    setLoading(true);

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
