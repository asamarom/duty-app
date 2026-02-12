#!/usr/bin/env node

/**
 * Data Migration Script: Add battalionId to existing documents
 *
 * This script adds the battalionId field to existing documents in:
 * - personnel
 * - equipment
 * - equipmentAssignments
 * - assignmentRequests
 * - units
 *
 * The battalionId is derived from:
 * - For personnel/equipment: use the unitId (which should be a battalion ID)
 * - For assignments/requests: derive from linked personnel or equipment
 * - For units: use the unit's own ID if it's a battalion, otherwise find parent battalion
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '..', 'duty-82f42-firebase-adminsdk-yyj5g-c27c9b4802.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
  console.log('✓ Service account file loaded');
} catch (error) {
  console.error('✗ Failed to load service account file:', serviceAccountPath);
  console.error('  Please ensure the Firebase service account JSON file exists');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'duty-82f42'
});

const db = admin.firestore();

// Statistics tracking
const stats = {
  personnel: { total: 0, updated: 0, skipped: 0, errors: 0 },
  equipment: { total: 0, updated: 0, skipped: 0, errors: 0 },
  equipmentAssignments: { total: 0, updated: 0, skipped: 0, errors: 0 },
  assignmentRequests: { total: 0, updated: 0, skipped: 0, errors: 0 },
  units: { total: 0, updated: 0, skipped: 0, errors: 0 }
};

/**
 * Get the battalion ID for a unit
 * Traverse up the hierarchy to find the battalion
 */
async function getBattalionIdForUnit(unitId, unitsCache) {
  if (!unitId) return null;

  // Check cache first
  if (unitsCache.has(unitId)) {
    const unit = unitsCache.get(unitId);
    if (unit.unitType === 'battalion') {
      return unitId;
    }
    if (unit.parentId) {
      return getBattalionIdForUnit(unit.parentId, unitsCache);
    }
    return null;
  }

  // Fetch from database
  const unitDoc = await db.collection('units').doc(unitId).get();
  if (!unitDoc.exists) {
    return null;
  }

  const unitData = unitDoc.data();
  unitsCache.set(unitId, unitData);

  if (unitData.unitType === 'battalion') {
    return unitId;
  }

  if (unitData.parentId) {
    return getBattalionIdForUnit(unitData.parentId, unitsCache);
  }

  return null;
}

/**
 * Migrate personnel collection
 */
async function migratePersonnel(unitsCache) {
  console.log('\n📋 Migrating personnel collection...');

  const snapshot = await db.collection('personnel').get();
  stats.personnel.total = snapshot.size;

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if battalionId already exists
    if (data.battalionId) {
      stats.personnel.skipped++;
      continue;
    }

    try {
      // Get battalion ID from unitId
      let battalionId = null;
      if (data.unitId) {
        battalionId = await getBattalionIdForUnit(data.unitId, unitsCache);
      }

      if (!battalionId) {
        console.warn(`  ⚠ Personnel ${doc.id}: No battalion found for unitId ${data.unitId}, skipping`);
        stats.personnel.skipped++;
        continue;
      }

      batch.update(doc.ref, { battalionId });
      stats.personnel.updated++;
      batchCount++;

      // Commit batch if we hit the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ✓ Committed batch of ${batchCount} personnel updates`);
        batchCount = 0;
      }
    } catch (error) {
      console.error(`  ✗ Error processing personnel ${doc.id}:`, error.message);
      stats.personnel.errors++;
    }
  }

  // Commit remaining batch
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${batchCount} personnel updates`);
  }

  console.log(`  Personnel: ${stats.personnel.updated} updated, ${stats.personnel.skipped} skipped, ${stats.personnel.errors} errors`);
}

/**
 * Migrate equipment collection
 */
async function migrateEquipment(unitsCache) {
  console.log('\n📦 Migrating equipment collection...');

  const snapshot = await db.collection('equipment').get();
  stats.equipment.total = snapshot.size;

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if battalionId already exists
    if (data.battalionId) {
      stats.equipment.skipped++;
      continue;
    }

    try {
      // Get battalion ID from unitId
      let battalionId = null;
      if (data.unitId) {
        battalionId = await getBattalionIdForUnit(data.unitId, unitsCache);
      }

      if (!battalionId) {
        console.warn(`  ⚠ Equipment ${doc.id}: No battalion found for unitId ${data.unitId}, skipping`);
        stats.equipment.skipped++;
        continue;
      }

      batch.update(doc.ref, { battalionId });
      stats.equipment.updated++;
      batchCount++;

      // Commit batch if we hit the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ✓ Committed batch of ${batchCount} equipment updates`);
        batchCount = 0;
      }
    } catch (error) {
      console.error(`  ✗ Error processing equipment ${doc.id}:`, error.message);
      stats.equipment.errors++;
    }
  }

  // Commit remaining batch
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${batchCount} equipment updates`);
  }

  console.log(`  Equipment: ${stats.equipment.updated} updated, ${stats.equipment.skipped} skipped, ${stats.equipment.errors} errors`);
}

/**
 * Migrate equipmentAssignments collection
 */
async function migrateEquipmentAssignments(unitsCache, personnelCache, equipmentCache) {
  console.log('\n🔗 Migrating equipmentAssignments collection...');

  const snapshot = await db.collection('equipmentAssignments').get();
  stats.equipmentAssignments.total = snapshot.size;

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if battalionId already exists
    if (data.battalionId) {
      stats.equipmentAssignments.skipped++;
      continue;
    }

    try {
      let battalionId = null;

      // Try to get battalion from equipment
      if (data.equipmentId) {
        if (!equipmentCache.has(data.equipmentId)) {
          const equipDoc = await db.collection('equipment').doc(data.equipmentId).get();
          if (equipDoc.exists) {
            equipmentCache.set(data.equipmentId, equipDoc.data());
          }
        }
        const equipData = equipmentCache.get(data.equipmentId);
        if (equipData?.battalionId) {
          battalionId = equipData.battalionId;
        } else if (equipData?.unitId) {
          battalionId = await getBattalionIdForUnit(equipData.unitId, unitsCache);
        }
      }

      // Try to get battalion from personnel if not found
      if (!battalionId && data.personnelId) {
        if (!personnelCache.has(data.personnelId)) {
          const persDoc = await db.collection('personnel').doc(data.personnelId).get();
          if (persDoc.exists) {
            personnelCache.set(data.personnelId, persDoc.data());
          }
        }
        const persData = personnelCache.get(data.personnelId);
        if (persData?.battalionId) {
          battalionId = persData.battalionId;
        } else if (persData?.unitId) {
          battalionId = await getBattalionIdForUnit(persData.unitId, unitsCache);
        }
      }

      // Try to get battalion from unitId if not found
      if (!battalionId && data.unitId) {
        battalionId = await getBattalionIdForUnit(data.unitId, unitsCache);
      }

      if (!battalionId) {
        console.warn(`  ⚠ Assignment ${doc.id}: No battalion found, skipping`);
        stats.equipmentAssignments.skipped++;
        continue;
      }

      batch.update(doc.ref, { battalionId });
      stats.equipmentAssignments.updated++;
      batchCount++;

      // Commit batch if we hit the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ✓ Committed batch of ${batchCount} assignment updates`);
        batchCount = 0;
      }
    } catch (error) {
      console.error(`  ✗ Error processing assignment ${doc.id}:`, error.message);
      stats.equipmentAssignments.errors++;
    }
  }

  // Commit remaining batch
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${batchCount} assignment updates`);
  }

  console.log(`  Assignments: ${stats.equipmentAssignments.updated} updated, ${stats.equipmentAssignments.skipped} skipped, ${stats.equipmentAssignments.errors} errors`);
}

/**
 * Migrate assignmentRequests collection
 */
async function migrateAssignmentRequests(unitsCache, equipmentCache) {
  console.log('\n📝 Migrating assignmentRequests collection...');

  const snapshot = await db.collection('assignmentRequests').get();
  stats.assignmentRequests.total = snapshot.size;

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if battalionId already exists
    if (data.battalionId) {
      stats.assignmentRequests.skipped++;
      continue;
    }

    try {
      let battalionId = null;

      // Try to get battalion from equipment
      if (data.equipmentId) {
        if (!equipmentCache.has(data.equipmentId)) {
          const equipDoc = await db.collection('equipment').doc(data.equipmentId).get();
          if (equipDoc.exists) {
            equipmentCache.set(data.equipmentId, equipDoc.data());
          }
        }
        const equipData = equipmentCache.get(data.equipmentId);
        if (equipData?.battalionId) {
          battalionId = equipData.battalionId;
        } else if (equipData?.unitId) {
          battalionId = await getBattalionIdForUnit(equipData.unitId, unitsCache);
        }
      }

      if (!battalionId) {
        console.warn(`  ⚠ Request ${doc.id}: No battalion found, skipping`);
        stats.assignmentRequests.skipped++;
        continue;
      }

      batch.update(doc.ref, { battalionId });
      stats.assignmentRequests.updated++;
      batchCount++;

      // Commit batch if we hit the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ✓ Committed batch of ${batchCount} request updates`);
        batchCount = 0;
      }
    } catch (error) {
      console.error(`  ✗ Error processing request ${doc.id}:`, error.message);
      stats.assignmentRequests.errors++;
    }
  }

  // Commit remaining batch
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${batchCount} request updates`);
  }

  console.log(`  Requests: ${stats.assignmentRequests.updated} updated, ${stats.assignmentRequests.skipped} skipped, ${stats.assignmentRequests.errors} errors`);
}

/**
 * Migrate units collection
 */
async function migrateUnits(unitsCache) {
  console.log('\n🏢 Migrating units collection...');

  const snapshot = await db.collection('units').get();
  stats.units.total = snapshot.size;

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if battalionId already exists
    if (data.battalionId) {
      stats.units.skipped++;
      continue;
    }

    try {
      let battalionId = null;

      // If this is a battalion, use its own ID
      if (data.unitType === 'battalion') {
        battalionId = doc.id;
      } else {
        // Find parent battalion
        battalionId = await getBattalionIdForUnit(doc.id, unitsCache);
      }

      if (!battalionId) {
        console.warn(`  ⚠ Unit ${doc.id}: No battalion found, skipping`);
        stats.units.skipped++;
        continue;
      }

      batch.update(doc.ref, { battalionId });
      stats.units.updated++;
      batchCount++;

      // Commit batch if we hit the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ✓ Committed batch of ${batchCount} unit updates`);
        batchCount = 0;
      }
    } catch (error) {
      console.error(`  ✗ Error processing unit ${doc.id}:`, error.message);
      stats.units.errors++;
    }
  }

  // Commit remaining batch
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${batchCount} unit updates`);
  }

  console.log(`  Units: ${stats.units.updated} updated, ${stats.units.skipped} skipped, ${stats.units.errors} errors`);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting battalionId data migration...');
  console.log('📍 Project: duty-82f42\n');

  try {
    // Build caches to avoid repeated queries
    const unitsCache = new Map();
    const personnelCache = new Map();
    const equipmentCache = new Map();

    // Pre-load units cache
    console.log('📥 Loading units into cache...');
    const unitsSnapshot = await db.collection('units').get();
    unitsSnapshot.forEach(doc => {
      unitsCache.set(doc.id, doc.data());
    });
    console.log(`  ✓ Loaded ${unitsCache.size} units into cache\n`);

    // Run migrations in order
    await migrateUnits(unitsCache);
    await migratePersonnel(unitsCache);
    await migrateEquipment(unitsCache);
    await migrateEquipmentAssignments(unitsCache, personnelCache, equipmentCache);
    await migrateAssignmentRequests(unitsCache, equipmentCache);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));

    const collections = ['personnel', 'equipment', 'equipmentAssignments', 'assignmentRequests', 'units'];
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    collections.forEach(collection => {
      const s = stats[collection];
      console.log(`\n${collection}:`);
      console.log(`  Total:   ${s.total}`);
      console.log(`  Updated: ${s.updated}`);
      console.log(`  Skipped: ${s.skipped}`);
      console.log(`  Errors:  ${s.errors}`);

      totalUpdated += s.updated;
      totalSkipped += s.skipped;
      totalErrors += s.errors;
    });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Total Updated: ${totalUpdated}`);
    console.log(`⏭️  Total Skipped: ${totalSkipped}`);
    console.log(`❌ Total Errors:  ${totalErrors}`);
    console.log('='.repeat(60));

    if (totalErrors > 0) {
      console.log('\n⚠️  Migration completed with errors. Please review the logs above.');
      process.exit(1);
    } else {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
