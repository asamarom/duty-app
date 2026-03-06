/**
 * Migration script to backfill denormalized current assignment fields on equipment documents.
 *
 * This script adds:
 * - currentUnitId: string | null
 * - currentPersonnelId: string | null
 * - currentQuantityAssigned: number
 * - lastAssignedAt: Timestamp | null
 *
 * See docs/DATABASE_OPTIMIZATION.md for rationale.
 *
 * Usage: node scripts/migrate-denormalize-equipment.cjs [environment]
 *   environment: 'emulator' | 'staging' | 'production' (default: emulator)
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const environment = process.argv[2] || 'emulator';

console.log(`\n🔄 Migrating equipment documents (${environment})...\n`);

// Initialize Firebase Admin based on environment
if (environment === 'emulator') {
  // Emulator mode
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8085';
  admin.initializeApp({
    projectId: 'duty-82f42',
  });
  console.log('✅ Connected to Firestore Emulator');
} else if (environment === 'staging' || environment === 'production') {
  // Staging/Production mode - require service account
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('🔐 Using service account from environment variable');
  } else {
    const serviceAccountPath = path.join(__dirname, '..', `firebase-${environment}-service-account.json`);
    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`\n❌ Service account not found: ${serviceAccountPath}`);
      console.error('Please set FIREBASE_SERVICE_ACCOUNT environment variable or provide the service account file.\n');
      process.exit(1);
    }
    serviceAccount = require(serviceAccountPath);
    console.log(`✅ Using service account from: ${serviceAccountPath}`);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log(`✅ Connected to Firebase ${environment}`);
} else {
  console.error('❌ Invalid environment. Use: emulator, staging, or production');
  process.exit(1);
}

const db = admin.firestore();

async function migrateEquipment() {
  try {
    console.log('\n1️⃣  Fetching all equipment documents...');
    const equipmentSnapshot = await db.collection('equipment').get();
    console.log(`   Found ${equipmentSnapshot.size} equipment documents`);

    if (equipmentSnapshot.empty) {
      console.log('✅ No equipment to migrate');
      return;
    }

    console.log('\n2️⃣  Processing equipment and finding active assignments...');
    let processedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_LIMIT = 500;

    for (const equipDoc of equipmentSnapshot.docs) {
      const equipId = equipDoc.id;
      const equipData = equipDoc.data();

      // Find active assignment (returnedAt == null)
      const activeAssignmentsSnap = await db
        .collection('equipmentAssignments')
        .where('equipmentId', '==', equipId)
        .where('returnedAt', '==', null)
        .get();

      let currentUnitId = null;
      let currentPersonnelId = null;
      let currentQuantityAssigned = 0;
      let lastAssignedAt = null;

      if (!activeAssignmentsSnap.empty) {
        // Use the most recent assignment if multiple exist (shouldn't happen, but be safe)
        const assignment = activeAssignmentsSnap.docs[0].data();
        currentUnitId = assignment.unitId || null;
        currentPersonnelId = assignment.personnelId || null;
        currentQuantityAssigned = assignment.quantity || 0;
        lastAssignedAt = assignment.assignedAt || null;

        if (activeAssignmentsSnap.size > 1) {
          console.warn(`   ⚠️  Equipment ${equipId} (${equipData.name}) has ${activeAssignmentsSnap.size} active assignments - using first one`);
        }
      }

      // Update equipment document with denormalized fields
      batch.update(equipDoc.ref, {
        currentUnitId,
        currentPersonnelId,
        currentQuantityAssigned,
        lastAssignedAt,
      });

      batchCount++;
      processedCount++;
      updatedCount++;

      if (currentUnitId || currentPersonnelId) {
        console.log(`   ✓ ${equipData.name} → ${currentPersonnelId ? 'Personnel' : 'Unit'} (qty: ${currentQuantityAssigned})`);
      } else {
        console.log(`   ✓ ${equipData.name} → Unassigned`);
        skippedCount++;
      }

      // Commit batch if we hit the limit
      if (batchCount >= BATCH_LIMIT) {
        console.log(`\n   💾 Committing batch of ${batchCount} updates...`);
        await batch.commit();
        batchCount = 0;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      console.log(`\n   💾 Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Processed: ${processedCount} equipment documents`);
    console.log(`   - Updated: ${updatedCount} documents`);
    console.log(`   - With assignments: ${updatedCount - skippedCount}`);
    console.log(`   - Unassigned: ${skippedCount}`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateEquipment()
  .then(() => {
    console.log('\n🎉 All done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
