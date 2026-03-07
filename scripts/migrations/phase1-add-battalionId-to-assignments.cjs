/**
 * Phase 1.1: Add battalionId to equipmentAssignments
 *
 * This script backfills battalionId from equipment docs to equipmentAssignments.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   FIREBASE_PROJECT=duty-staging node scripts/migrations/phase1-add-battalionId-to-assignments.cjs
 *   FIREBASE_PROJECT=duty-82f42 node scripts/migrations/phase1-add-battalionId-to-assignments.cjs
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
let serviceAccount;
const project = process.env.FIREBASE_PROJECT || 'duty-staging';

if (project === 'duty-staging') {
  const serviceAccountPath = path.join(__dirname, '..', '..', 'firebase-staging-service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account not found:', serviceAccountPath);
    process.exit(1);
  }
  serviceAccount = require(serviceAccountPath);
} else if (project === 'duty-82f42') {
  const serviceAccountPath = path.join(__dirname, '..', '..', 'firebase-service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account not found:', serviceAccountPath);
    process.exit(1);
  }
  serviceAccount = require(serviceAccountPath);
} else {
  console.error('❌ Unknown project:', project);
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function addBattalionIdToAssignments() {
  console.log('🔄 Starting migration: Add battalionId to equipmentAssignments');
  console.log(`📦 Project: ${project}\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const equipmentCache = new Map();

  try {
    // Get all equipmentAssignments
    const assignmentsSnapshot = await db.collection('equipmentAssignments').get();
    console.log(`📊 Found ${assignmentsSnapshot.size} equipmentAssignments to process\n`);

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const assignmentDoc of assignmentsSnapshot.docs) {
      const assignment = assignmentDoc.data();

      // Skip if battalionId already exists
      if (assignment.battalionId) {
        skipped++;
        continue;
      }

      // Get battalionId from equipment doc
      let battalionId;
      if (equipmentCache.has(assignment.equipmentId)) {
        battalionId = equipmentCache.get(assignment.equipmentId);
      } else {
        const equipmentDoc = await db.collection('equipment').doc(assignment.equipmentId).get();
        if (!equipmentDoc.exists) {
          console.error(`⚠️  Equipment not found for assignment ${assignmentDoc.id}: ${assignment.equipmentId}`);
          errors++;
          continue;
        }
        battalionId = equipmentDoc.data().battalionId;
        equipmentCache.set(assignment.equipmentId, battalionId);
      }

      if (!battalionId) {
        console.error(`⚠️  Equipment ${assignment.equipmentId} has no battalionId`);
        errors++;
        continue;
      }

      // Add to batch
      batch.update(assignmentDoc.ref, { battalionId });
      batchCount++;
      updated++;

      // Commit batch if we hit the limit
      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`✅ Committed batch of ${batchCount} updates (total: ${updated})`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${batchCount} updates`);
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped (already has battalionId): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

addBattalionIdToAssignments();
