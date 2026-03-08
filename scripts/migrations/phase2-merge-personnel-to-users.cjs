/**
 * Phase 2: Merge personnel collection into users collection
 *
 * This script merges all personnel data into the users collection.
 * Each personnel record is matched to a user via userId field.
 *
 * IMPORTANT: Run this on staging first and verify before production!
 *
 * Usage:
 *   FIREBASE_PROJECT=duty-staging node scripts/migrations/phase2-merge-personnel-to-users.cjs
 *   FIREBASE_PROJECT=duty-82f42 node scripts/migrations/phase2-merge-personnel-to-users.cjs
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

// Location status enum to text mapping
function convertLocationStatus(status) {
  const map = {
    'home': 'Home',
    'on_duty': 'On Duty',
    'off_duty': 'Off Duty',
    'active_mission': 'Active Mission',
    'leave': 'Leave',
    'tdy': 'TDY'
  };
  return map[status] || status || null;
}

async function mergePersonnelToUsers() {
  console.log('🔄 Starting Phase 2 Migration: Merge personnel → users');
  console.log(`📦 Project: ${project}\n`);
  console.log('⚠️  WARNING: This is a breaking change!');
  console.log('⚠️  Make sure you have a backup before proceeding.\n');

  let merged = 0;
  let skipped = 0;
  let errors = 0;
  const orphanedPersonnel = [];

  try {
    // Get all personnel records
    const personnelSnapshot = await db.collection('personnel').get();
    console.log(`📊 Found ${personnelSnapshot.size} personnel records to merge\n`);

    if (personnelSnapshot.empty) {
      console.log('✨ No personnel records to merge!');
      process.exit(0);
    }

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const personnelDoc of personnelSnapshot.docs) {
      const personnel = personnelDoc.data();
      const personnelId = personnelDoc.id;

      // Check if personnel has userId
      if (!personnel.userId) {
        console.error(`⚠️  Personnel ${personnelId} has no userId - skipping`);
        orphanedPersonnel.push(personnelId);
        skipped++;
        continue;
      }

      const userId = personnel.userId;

      // Get existing user doc
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        console.error(`⚠️  User ${userId} not found for personnel ${personnelId} - skipping`);
        orphanedPersonnel.push(personnelId);
        errors++;
        continue;
      }

      const userData = userDoc.data();

      // Merge personnel fields into user
      const mergedData = {
        // Keep existing user fields
        email: userData.email || null,
        avatarUrl: userData.avatarUrl || null,
        roles: userData.roles || [],
        createdAt: userData.createdAt,
        updatedAt: admin.firestore.Timestamp.now(),

        // Add personnel fields
        firstName: personnel.firstName,
        lastName: personnel.lastName,
        serviceNumber: personnel.serviceNumber,
        rank: personnel.rank,
        unitId: personnel.unitId || null,
        battalionId: personnel.battalionId || null,

        // Convert locationStatus enum to text
        location: convertLocationStatus(personnel.locationStatus),

        phone: personnel.phone || null,
        skills: personnel.skills || [],
        driverLicenses: personnel.driverLicenses || [],
        signature: personnel.signature || null,
        profileImage: personnel.profileImage || null,
      };

      // Handle isSignatureApproved → approved_user role
      if (personnel.isSignatureApproved && !mergedData.roles.includes('approved_user')) {
        mergedData.roles = [...mergedData.roles, 'approved_user'];
      }

      // Add to batch
      batch.update(db.collection('users').doc(userId), mergedData);
      batchCount++;
      merged++;

      // Log sample
      if (merged === 1) {
        console.log('📝 Sample merge:');
        console.log(`   Personnel: ${personnelId} → User: ${userId}`);
        console.log(`   Name: ${personnel.firstName} ${personnel.lastName}`);
        console.log(`   Service #: ${personnel.serviceNumber}`);
        console.log(`   Rank: ${personnel.rank}`);
        console.log(`   Signature approved: ${personnel.isSignatureApproved ? 'Yes' : 'No'}`);
        console.log(`   Roles: ${mergedData.roles.join(', ')}`);
        console.log();
      }

      // Commit batch if we hit the limit
      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`✅ Committed batch of ${batchCount} updates (total: ${merged})`);
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
    console.log(`   ✅ Merged: ${merged}`);
    console.log(`   ⏭️  Skipped (no userId): ${skipped}`);
    console.log(`   ❌ Errors (user not found): ${errors}`);

    if (orphanedPersonnel.length > 0) {
      console.log(`\n⚠️  Orphaned personnel records (no matching user):`);
      orphanedPersonnel.forEach(id => console.log(`      ${id}`));
    }

    console.log('\n✨ Phase 2 migration complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run verification script to check data');
    console.log('   2. Update code to use users collection');
    console.log('   3. Update security rules');
    console.log('   4. Run E2E tests');
    console.log('   5. If all good, delete personnel collection');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

mergePersonnelToUsers();
