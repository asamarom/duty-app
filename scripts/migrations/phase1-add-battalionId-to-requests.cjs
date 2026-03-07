/**
 * Phase 1.2: Add battalionId to assignmentRequests
 *
 * This script backfills battalionId from equipment docs to assignmentRequests.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   FIREBASE_PROJECT=duty-staging node scripts/migrations/phase1-add-battalionId-to-requests.cjs
 *   FIREBASE_PROJECT=duty-82f42 node scripts/migrations/phase1-add-battalionId-to-requests.cjs
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

async function addBattalionIdToRequests() {
  console.log('🔄 Starting migration: Add battalionId to assignmentRequests');
  console.log(`📦 Project: ${project}\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const equipmentCache = new Map();

  try {
    // Get all assignmentRequests
    const requestsSnapshot = await db.collection('assignmentRequests').get();
    console.log(`📊 Found ${requestsSnapshot.size} assignmentRequests to process\n`);

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const requestDoc of requestsSnapshot.docs) {
      const request = requestDoc.data();

      // Skip if battalionId already exists
      if (request.battalionId) {
        skipped++;
        continue;
      }

      // Get battalionId from equipment doc
      let battalionId;
      if (equipmentCache.has(request.equipmentId)) {
        battalionId = equipmentCache.get(request.equipmentId);
      } else {
        const equipmentDoc = await db.collection('equipment').doc(request.equipmentId).get();
        if (!equipmentDoc.exists) {
          console.error(`⚠️  Equipment not found for request ${requestDoc.id}: ${request.equipmentId}`);
          errors++;
          continue;
        }
        battalionId = equipmentDoc.data().battalionId;
        equipmentCache.set(request.equipmentId, battalionId);
      }

      if (!battalionId) {
        console.error(`⚠️  Equipment ${request.equipmentId} has no battalionId`);
        errors++;
        continue;
      }

      // Add to batch
      batch.update(requestDoc.ref, { battalionId });
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

addBattalionIdToRequests();
