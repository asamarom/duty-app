#!/usr/bin/env node
/**
 * Fix equipment assignments with orphaned personnel IDs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixOrphanedAssignments() {
  try {
    console.log('\n🔧 Fixing Orphaned Equipment Assignments');
    console.log('==========================================\n');

    // Get all active assignments
    const assignmentsSnapshot = await db.collection('equipmentAssignments')
      .where('returnedAt', '==', null)
      .get();

    console.log(`Found ${assignmentsSnapshot.size} active assignments\n`);

    const orphanedAssignments = [];
    const personnelCheck = new Map();

    // Check each assignment
    for (const assignmentDoc of assignmentsSnapshot.docs) {
      const data = assignmentDoc.data();

      if (!data.personnelId) continue;

      // Check if we've already verified this personnel ID
      if (!personnelCheck.has(data.personnelId)) {
        const userDoc = await db.collection('users').doc(data.personnelId).get();
        personnelCheck.set(data.personnelId, userDoc.exists);
      }

      if (!personnelCheck.get(data.personnelId)) {
        orphanedAssignments.push({
          assignmentId: assignmentDoc.id,
          ...data,
        });
      }
    }

    if (orphanedAssignments.length === 0) {
      console.log('✅ No orphaned assignments found!\n');
      return;
    }

    console.log(`⚠️  Found ${orphanedAssignments.length} orphaned assignments:\n`);

    for (const assignment of orphanedAssignments) {
      console.log(`Assignment: ${assignment.assignmentId}`);
      console.log(`  Equipment: ${assignment.equipmentId}`);
      console.log(`  Orphaned Personnel ID: ${assignment.personnelId}`);
      console.log(`  Unit: ${assignment.unitId || 'N/A'}`);
      console.log(`  Assigned At: ${assignment.assignedAt?.toDate?.() || 'N/A'}`);
      console.log('');
    }

    console.log('Options to fix:');
    console.log('  1. Mark these assignments as returned (returnedAt = now)');
    console.log('  2. Delete these assignments');
    console.log('  3. Try to match with current users by name');
    console.log('');

    // Auto-fix: Mark as returned
    console.log('Auto-fixing: Marking orphaned assignments as returned...\n');

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    for (const assignment of orphanedAssignments) {
      const assignmentRef = db.collection('equipmentAssignments').doc(assignment.assignmentId);
      batch.update(assignmentRef, {
        returnedAt: now,
        returnedBy: 'system',
        notes: 'Auto-returned: Personnel record not found (likely from pre-migration data)',
      });
      console.log(`  ✓ Marking ${assignment.assignmentId} as returned`);

      // Also update the equipment document to clear currentPersonnelId
      if (assignment.equipmentId) {
        const equipmentRef = db.collection('equipment').doc(assignment.equipmentId);
        batch.update(equipmentRef, {
          currentPersonnelId: null,
          currentQuantityAssigned: admin.firestore.FieldValue.increment(-1),
          status: 'available',
          updatedAt: now,
        });
        console.log(`  ✓ Clearing personnel from equipment ${assignment.equipmentId}`);
      }
    }

    await batch.commit();
    console.log('\n✅ Fixed all orphaned assignments!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixOrphanedAssignments().then(() => process.exit(0));
