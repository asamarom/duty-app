import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();

// Types
type AppRole = 'admin' | 'leader' | 'user';
type AssignmentRequestStatus = 'pending' | 'approved' | 'rejected';

interface UserDoc {
  roles: AppRole[];
  battalionId?: string;
  fullName?: string;
}

interface PersonnelDoc {
  firstName: string;
  lastName: string;
  unitId?: string;
  userId?: string;
}

interface UnitDoc {
  name: string;
  unitType: string;
  parentId?: string;
}

interface EquipmentDoc {
  name: string;
  status?: string;
}

interface EquipmentAssignmentDoc {
  equipmentId: string;
  personnelId?: string;
  unitId?: string;
  returnedAt?: admin.firestore.Timestamp;
}

interface AssignmentRequestDoc {
  equipmentId: string;
  status: AssignmentRequestStatus;
  requestedBy: string;
  requestedByName?: string;
  requestedAt: admin.firestore.Timestamp;
  fromPersonnelId?: string;
  fromUnitId?: string;
  fromUnitType?: string;
  fromName?: string;
  toPersonnelId?: string;
  toUnitId?: string;
  toUnitType?: string;
  toName?: string;
  notes?: string;
  processedBy?: string;
  processedAt?: admin.firestore.Timestamp;
}

// Helper function to check if user has a role
async function hasRole(uid: string, role: AppRole): Promise<boolean> {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return false;
  const data = userDoc.data() as UserDoc;
  return data.roles?.includes(role) ?? false;
}

// Helper function to check if user is admin
async function isAdmin(uid: string): Promise<boolean> {
  return hasRole(uid, 'admin');
}

// Helper function to check if user is admin or leader
async function isAdminOrLeader(uid: string): Promise<boolean> {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return false;
  const data = userDoc.data() as UserDoc;
  return data.roles?.includes('admin') || data.roles?.includes('leader') || false;
}

// Helper to get unit ancestors (for checking unit hierarchy)
async function getUnitAncestors(unitId: string): Promise<string[]> {
  const ancestors: string[] = [];
  let currentId: string | undefined = unitId;

  while (currentId) {
    ancestors.push(currentId);
    const unitDoc = await db.collection('units').doc(currentId).get();
    if (!unitDoc.exists) break;
    const data = unitDoc.data() as UnitDoc;
    currentId = data.parentId;
  }

  return ancestors;
}

// Helper to get units a leader can manage
async function getLeaderManagedUnits(userId: string): Promise<string[]> {
  const assignmentsSnapshot = await db
    .collection('adminUnitAssignments')
    .where('userId', '==', userId)
    .get();

  const unitIds: string[] = [];
  assignmentsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.unitId) unitIds.push(data.unitId);
  });

  return unitIds;
}

// Helper to check if a leader can manage a specific unit
async function canLeaderManageUnit(userId: string, targetUnitId: string): Promise<boolean> {
  const managedUnits = await getLeaderManagedUnits(userId);

  // Get ancestors of the target unit
  const targetAncestors = await getUnitAncestors(targetUnitId);

  // Check if any managed unit is in the target's ancestor chain
  return managedUnits.some((unitId) => targetAncestors.includes(unitId));
}

/**
 * canManageUnit - Check if the current user can manage a specific personnel/unit
 */
export const canManageUnit = onCall(async (request) => {
  const { personnelId } = request.data as { personnelId: string };
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  if (!personnelId) {
    throw new HttpsError('invalid-argument', 'personnelId is required');
  }

  // Admins can manage anyone
  if (await isAdmin(uid)) {
    return { canManage: true };
  }

  // Check if user is a leader
  if (!(await hasRole(uid, 'leader'))) {
    return { canManage: false };
  }

  // Get the personnel's unit
  const personnelDoc = await db.collection('personnel').doc(personnelId).get();
  if (!personnelDoc.exists) {
    return { canManage: false };
  }

  const personnelData = personnelDoc.data() as PersonnelDoc;
  if (!personnelData.unitId) {
    return { canManage: false };
  }

  // Check if leader can manage this unit
  const canManage = await canLeaderManageUnit(uid, personnelData.unitId);
  return { canManage };
});

/**
 * initiateTransfer - Create a transfer request for equipment
 */
export const initiateTransfer = onCall(async (request) => {
  const { equipmentId, toUnitId, toPersonnelId, notes } = request.data as {
    equipmentId: string;
    toUnitId?: string;
    toPersonnelId?: string;
    notes?: string;
  };

  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  if (!equipmentId) {
    throw new HttpsError('invalid-argument', 'equipmentId is required');
  }

  if (!toUnitId && !toPersonnelId) {
    throw new HttpsError('invalid-argument', 'Either toUnitId or toPersonnelId is required');
  }

  // Get current user's name
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.exists ? (userDoc.data() as UserDoc) : null;
  const requestedByName = userData?.fullName;

  // Get equipment details
  const equipmentDoc = await db.collection('equipment').doc(equipmentId).get();
  if (!equipmentDoc.exists) {
    throw new HttpsError('not-found', 'Equipment not found');
  }

  // Get current assignment
  const currentAssignmentSnapshot = await db
    .collection('equipmentAssignments')
    .where('equipmentId', '==', equipmentId)
    .where('returnedAt', '==', null)
    .limit(1)
    .get();

  let fromPersonnelId: string | undefined;
  let fromUnitId: string | undefined;
  let fromName: string | undefined;
  let fromUnitType: string | undefined;

  if (!currentAssignmentSnapshot.empty) {
    const assignment = currentAssignmentSnapshot.docs[0].data() as EquipmentAssignmentDoc;
    fromPersonnelId = assignment.personnelId;
    fromUnitId = assignment.unitId;

    if (fromPersonnelId) {
      const persDoc = await db.collection('personnel').doc(fromPersonnelId).get();
      if (persDoc.exists) {
        const persData = persDoc.data() as PersonnelDoc;
        fromName = `${persData.firstName} ${persData.lastName}`;
      }
    } else if (fromUnitId) {
      const unitDoc = await db.collection('units').doc(fromUnitId).get();
      if (unitDoc.exists) {
        const unitData = unitDoc.data() as UnitDoc;
        fromName = unitData.name;
        fromUnitType = unitData.unitType;
      }
    }
  }

  // Get destination details
  let toName: string | undefined;
  let toUnitType: string | undefined;

  if (toPersonnelId) {
    const persDoc = await db.collection('personnel').doc(toPersonnelId).get();
    if (persDoc.exists) {
      const persData = persDoc.data() as PersonnelDoc;
      toName = `${persData.firstName} ${persData.lastName}`;
    }
  } else if (toUnitId) {
    const unitDoc = await db.collection('units').doc(toUnitId).get();
    if (unitDoc.exists) {
      const unitData = unitDoc.data() as UnitDoc;
      toName = unitData.name;
      toUnitType = unitData.unitType;
    }
  }

  // Create the transfer request
  const requestData: Omit<AssignmentRequestDoc, 'requestedAt'> & { requestedAt: admin.firestore.FieldValue } = {
    equipmentId,
    status: 'pending',
    requestedBy: uid,
    requestedByName,
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    fromPersonnelId,
    fromUnitId,
    fromUnitType,
    fromName,
    toPersonnelId,
    toUnitId,
    toUnitType,
    toName,
    notes,
  };

  const docRef = await db.collection('assignmentRequests').add(requestData);

  // Update equipment status
  await db.collection('equipment').doc(equipmentId).update({
    status: 'pending_transfer',
  });

  return { success: true, requestId: docRef.id };
});

/**
 * processTransfer - Approve or reject a transfer request
 */
export const processTransfer = onCall(async (request) => {
  const { requestId, action } = request.data as {
    requestId: string;
    action: 'approve' | 'reject';
  };

  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  if (!requestId || !action) {
    throw new HttpsError('invalid-argument', 'requestId and action are required');
  }

  // Only admins and leaders can process transfers
  if (!(await isAdminOrLeader(uid))) {
    throw new HttpsError('permission-denied', 'Only admins and leaders can process transfers');
  }

  // Get the request
  const requestDoc = await db.collection('assignmentRequests').doc(requestId).get();
  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Transfer request not found');
  }

  const requestData = requestDoc.data() as AssignmentRequestDoc;

  if (requestData.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Request has already been processed');
  }

  const batch = db.batch();

  // Update request status
  const newStatus: AssignmentRequestStatus = action === 'approve' ? 'approved' : 'rejected';
  batch.update(requestDoc.ref, {
    status: newStatus,
    processedBy: uid,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (action === 'approve') {
    // Mark old assignment as returned
    const oldAssignmentSnapshot = await db
      .collection('equipmentAssignments')
      .where('equipmentId', '==', requestData.equipmentId)
      .where('returnedAt', '==', null)
      .get();

    oldAssignmentSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        returnedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Create new assignment
    const newAssignmentRef = db.collection('equipmentAssignments').doc();
    batch.set(newAssignmentRef, {
      equipmentId: requestData.equipmentId,
      personnelId: requestData.toPersonnelId || null,
      unitId: requestData.toUnitId || null,
      quantity: 1,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      returnedAt: null,
    });

    // Update equipment status
    batch.update(db.collection('equipment').doc(requestData.equipmentId), {
      status: 'assigned',
    });
  } else {
    // Rejected - reset equipment status
    batch.update(db.collection('equipment').doc(requestData.equipmentId), {
      status: 'available',
    });
  }

  await batch.commit();

  return { success: true };
});

/**
 * onUserRolesChanged - Sync custom claims when user roles change
 * This allows using custom claims for security rules if needed
 */
export const onUserRolesChanged = onDocumentWritten('users/{userId}', async (event) => {
  const userId = event.params.userId;
  const afterData = event.data?.after.data() as UserDoc | undefined;

  if (!afterData) {
    // Document was deleted, remove custom claims
    await admin.auth().setCustomUserClaims(userId, {});
    return;
  }

  const roles = afterData.roles || [];

  // Set custom claims
  await admin.auth().setCustomUserClaims(userId, {
    admin: roles.includes('admin'),
    leader: roles.includes('leader'),
    user: roles.includes('user'),
  });
});
