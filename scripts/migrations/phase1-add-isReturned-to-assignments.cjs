/**
 * Phase 1.3: Add isReturned to equipmentAssignments
 *
 * This script backfills isReturned field based on returnedAt.
 * isReturned = (returnedAt === null ? false : true)
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   FIREBASE_PROJECT=duty-staging node scripts/migrations/phase1-add-isReturned-to-assignments.cjs
 *   FIREBASE_PROJECT=duty-82f42 node scripts/migrations/phase1-add-isReturned-to-assignments.cjs
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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: project
});

const db = admin.firestore();

async function addIsReturnedToAssignments() {
  console.log('🔄 Starting migration: Add isReturned to equipmentAssignments');
  console.log(`📦 Project: ${project}\n`);

  let updated = 0;
  let skipped = 0;
  let activeAssignments = 0;
  let returnedAssignments = 0;

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

      // Skip if isReturned already exists
      if (assignment.hasOwnProperty('isReturned')) {
        skipped++;
        continue;
      }

      // Calculate isReturned based on returnedAt
      const isReturned = assignment.returnedAt !== null;

      if (isReturned) {
        returnedAssignments++;
      } else {
        activeAssignments++;
      }

      // Add to batch
      batch.update(assignmentDoc.ref, { isReturned });
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
    console.log(`      🔵 Active (isReturned=false): ${activeAssignments}`);
    console.log(`      🟢 Returned (isReturned=true): ${returnedAssignments}`);
    console.log(`   ⏭️  Skipped (already has isReturned): ${skipped}`);
    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

addIsReturnedToAssignments();
