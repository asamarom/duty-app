#!/usr/bin/env node
/**
 * Phase 3 Migration: Add battalionId to existing equipment documents
 *
 * This script adds the battalionId field to all equipment documents
 * that don't have it yet, based on the createdBy user's battalionId.
 *
 * Usage:
 *   node scripts/migrate-equipment-battalion-id.cjs --project production
 *   node scripts/migrate-equipment-battalion-id.cjs --project staging
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const projectArg = args.find(arg => arg.startsWith('--project='));
const project = projectArg ? projectArg.split('=')[1] : 'production';

console.log(`🔄 Starting Phase 3 migration: Adding battalionId to equipment`);
console.log(`📦 Target project: ${project}`);

// Initialize Firebase Admin
let serviceAccountPath;
if (project === 'staging') {
  serviceAccountPath = path.join(__dirname, '..', 'firebase-staging-service-account.json');
} else {
  serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Service account file not found: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateEquipmentBattalionId() {
  try {
    console.log('\n📋 Step 1: Fetching all equipment documents...');
    const equipmentSnapshot = await db.collection('equipment').get();
    console.log(`   Found ${equipmentSnapshot.size} equipment documents`);

    console.log('\n📋 Step 2: Fetching all units to build battalion mapping...');
    const unitsSnapshot = await db.collection('units').get();
    const unitToBattalion = new Map();
    unitsSnapshot.forEach(doc => {
      const data = doc.data();
      unitToBattalion.set(doc.id, data.battalionId || doc.id);
    });
    console.log(`   Loaded ${unitToBattalion.size} units`);

    console.log('\n📋 Step 3: Fetching all users to build user-to-battalion mapping...');
    const usersSnapshot = await db.collection('users').get();
    const userToBattalion = new Map();
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.battalionId) {
        userToBattalion.set(doc.id, data.battalionId);
      } else if (data.unitId) {
        const battalionId = unitToBattalion.get(data.unitId);
        if (battalionId) {
          userToBattalion.set(doc.id, battalionId);
        }
      }
    });
    console.log(`   Loaded ${userToBattalion.size} user-to-battalion mappings`);

    console.log('\n📋 Step 4: Identifying equipment documents missing battalionId...');
    const equipmentToUpdate = [];
    equipmentSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.battalionId && data.createdBy) {
        const battalionId = userToBattalion.get(data.createdBy);
        if (battalionId) {
          equipmentToUpdate.push({
            id: doc.id,
            battalionId,
            name: data.name,
            createdBy: data.createdBy,
          });
        } else {
          console.warn(`   ⚠️  Equipment ${doc.id} (${data.name}) has createdBy=${data.createdBy} but no battalionId mapping found`);
        }
      }
    });

    console.log(`   Found ${equipmentToUpdate.length} equipment documents to update`);

    if (equipmentToUpdate.length === 0) {
      console.log('\n✅ All equipment documents already have battalionId - no migration needed');
      return;
    }

    console.log('\n📋 Step 5: Updating equipment documents with battalionId...');
    const batch = db.batch();
    let batchCount = 0;
    const batchSize = 500; // Firestore batch limit

    for (const equipment of equipmentToUpdate) {
      const docRef = db.collection('equipment').doc(equipment.id);
      batch.update(docRef, { battalionId: equipment.battalionId });
      batchCount++;

      console.log(`   ✓ ${equipment.name} (${equipment.id}) → battalionId: ${equipment.battalionId}`);

      // Commit batch if we hit the limit
      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`   📦 Committed batch of ${batchCount} updates`);
        batchCount = 0;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   📦 Committed final batch of ${batchCount} updates`);
    }

    console.log('\n✅ Migration complete!');
    console.log(`   Updated ${equipmentToUpdate.length} equipment documents with battalionId`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Also need to update equipmentAssignments and assignmentRequests
async function migrateAssignmentsBattalionId() {
  try {
    console.log('\n📋 Step 6: Migrating equipmentAssignments...');
    const assignmentsSnapshot = await db.collection('equipmentAssignments').get();
    console.log(`   Found ${assignmentsSnapshot.size} assignment documents`);

    // Build equipment to battalionId mapping
    const equipmentSnapshot = await db.collection('equipment').get();
    const equipmentToBattalion = new Map();
    equipmentSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.battalionId) {
        equipmentToBattalion.set(doc.id, data.battalionId);
      }
    });

    const assignmentsToUpdate = [];
    assignmentsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.battalionId && data.equipmentId) {
        const battalionId = equipmentToBattalion.get(data.equipmentId);
        if (battalionId) {
          assignmentsToUpdate.push({
            id: doc.id,
            battalionId,
            equipmentId: data.equipmentId,
          });
        }
      }
    });

    console.log(`   Found ${assignmentsToUpdate.length} assignments to update`);

    if (assignmentsToUpdate.length > 0) {
      const batch = db.batch();
      for (const assignment of assignmentsToUpdate) {
        const docRef = db.collection('equipmentAssignments').doc(assignment.id);
        batch.update(docRef, { battalionId: assignment.battalionId });
      }
      await batch.commit();
      console.log(`   ✅ Updated ${assignmentsToUpdate.length} assignment documents`);
    }

    console.log('\n📋 Step 7: Migrating assignmentRequests...');
    const requestsSnapshot = await db.collection('assignmentRequests').get();
    console.log(`   Found ${requestsSnapshot.size} request documents`);

    const requestsToUpdate = [];
    requestsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.battalionId && data.equipmentId) {
        const battalionId = equipmentToBattalion.get(data.equipmentId);
        if (battalionId) {
          requestsToUpdate.push({
            id: doc.id,
            battalionId,
            equipmentId: data.equipmentId,
          });
        }
      }
    });

    console.log(`   Found ${requestsToUpdate.length} requests to update`);

    if (requestsToUpdate.length > 0) {
      const batch = db.batch();
      for (const request of requestsToUpdate) {
        const docRef = db.collection('assignmentRequests').doc(request.id);
        batch.update(docRef, { battalionId: request.battalionId });
      }
      await batch.commit();
      console.log(`   ✅ Updated ${requestsToUpdate.length} request documents`);
    }

  } catch (error) {
    console.error('\n❌ Assignments migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateEquipmentBattalionId();
    await migrateAssignmentsBattalionId();
    console.log('\n🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

main();
