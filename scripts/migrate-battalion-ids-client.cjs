#!/usr/bin/env node

/**
 * Data Migration Script: Add battalionId to existing documents
 * Uses Firebase Client SDK with existing credentials
 */

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, writeBatch, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
 */
async function getBattalionIdForUnit(unitId, unitsCache) {
  if (!unitId) return null;

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

  const unitDoc = await getDoc(doc(db, 'units', unitId));
  if (!unitDoc.exists()) {
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
 * Migrate collection with batching
 */
async function migrateCollection(collectionName, getBattalionId, caches) {
  console.log(`\n📋 Migrating ${collectionName} collection...`);

  const snapshot = await getDocs(collection(db, collectionName));
  stats[collectionName].total = snapshot.size;

  let batch = writeBatch(db);
  let batchCount = 0;
  const BATCH_SIZE = 500;
  let totalBatches = 0;

  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();

    if (data.battalionId) {
      stats[collectionName].skipped++;
      continue;
    }

    try {
      const battalionId = await getBattalionId(docSnapshot.id, data, caches);

      if (!battalionId) {
        console.warn(`  ⚠ ${collectionName} ${docSnapshot.id}: No battalion found, skipping`);
        stats[collectionName].skipped++;
        continue;
      }

      batch.update(docSnapshot.ref, { battalionId });
      stats[collectionName].updated++;
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        totalBatches++;
        console.log(`  ✓ Committed batch ${totalBatches} (${batchCount} updates)`);
        batch = writeBatch(db);
        batchCount = 0;
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${collectionName} ${docSnapshot.id}:`, error.message);
      stats[collectionName].errors++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    totalBatches++;
    console.log(`  ✓ Committed final batch ${totalBatches} (${batchCount} updates)`);
  }

  console.log(`  ${collectionName}: ${stats[collectionName].updated} updated, ${stats[collectionName].skipped} skipped, ${stats[collectionName].errors} errors`);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting battalionId data migration...');
  console.log('📍 Project: duty-82f42\n');

  try {
    // Sign in as admin
    console.log('🔐 Authenticating...');
    const adminEmail = process.env.MIGRATION_ADMIN_EMAIL || 'test-admin@e2e.local';
    const adminPassword = process.env.MIGRATION_ADMIN_PASSWORD || 'TestPassword123!';

    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log(`  ✓ Signed in as ${adminEmail}\n`);

    // Build caches
    const unitsCache = new Map();
    const personnelCache = new Map();
    const equipmentCache = new Map();

    // Pre-load units cache
    console.log('📥 Loading units into cache...');
    const unitsSnapshot = await getDocs(collection(db, 'units'));
    unitsSnapshot.forEach(docSnapshot => {
      unitsCache.set(docSnapshot.id, docSnapshot.data());
    });
    console.log(`  ✓ Loaded ${unitsCache.size} units into cache\n`);

    // Migrate collections
    await migrateCollection('units', async (unitId, data, caches) => {
      if (data.unitType === 'battalion') {
        return unitId;
      }
      return getBattalionIdForUnit(unitId, caches.units);
    }, { units: unitsCache });

    await migrateCollection('personnel', async (persId, data, caches) => {
      if (data.unitId) {
        return getBattalionIdForUnit(data.unitId, caches.units);
      }
      return null;
    }, { units: unitsCache });

    await migrateCollection('equipment', async (equipId, data, caches) => {
      if (data.unitId) {
        return getBattalionIdForUnit(data.unitId, caches.units);
      }
      return null;
    }, { units: unitsCache });

    await migrateCollection('equipmentAssignments', async (assignId, data, caches) => {
      // Try equipment first
      if (data.equipmentId) {
        if (!caches.equipment.has(data.equipmentId)) {
          const equipDoc = await getDoc(doc(db, 'equipment', data.equipmentId));
          if (equipDoc.exists()) {
            caches.equipment.set(data.equipmentId, equipDoc.data());
          }
        }
        const equipData = caches.equipment.get(data.equipmentId);
        if (equipData?.battalionId) return equipData.battalionId;
        if (equipData?.unitId) return getBattalionIdForUnit(equipData.unitId, caches.units);
      }

      // Try personnel
      if (data.personnelId) {
        if (!caches.personnel.has(data.personnelId)) {
          const persDoc = await getDoc(doc(db, 'personnel', data.personnelId));
          if (persDoc.exists()) {
            caches.personnel.set(data.personnelId, persDoc.data());
          }
        }
        const persData = caches.personnel.get(data.personnelId);
        if (persData?.battalionId) return persData.battalionId;
        if (persData?.unitId) return getBattalionIdForUnit(persData.unitId, caches.units);
      }

      // Try unitId directly
      if (data.unitId) {
        return getBattalionIdForUnit(data.unitId, caches.units);
      }

      return null;
    }, { units: unitsCache, personnel: personnelCache, equipment: equipmentCache });

    await migrateCollection('assignmentRequests', async (reqId, data, caches) => {
      if (data.equipmentId) {
        if (!caches.equipment.has(data.equipmentId)) {
          const equipDoc = await getDoc(doc(db, 'equipment', data.equipmentId));
          if (equipDoc.exists()) {
            caches.equipment.set(data.equipmentId, equipDoc.data());
          }
        }
        const equipData = caches.equipment.get(data.equipmentId);
        if (equipData?.battalionId) return equipData.battalionId;
        if (equipData?.unitId) return getBattalionIdForUnit(equipData.unitId, caches.units);
      }
      return null;
    }, { units: unitsCache, equipment: equipmentCache });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));

    const collections = ['units', 'personnel', 'equipment', 'equipmentAssignments', 'assignmentRequests'];
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    collections.forEach(collectionName => {
      const s = stats[collectionName];
      console.log(`\n${collectionName}:`);
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
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrate();
