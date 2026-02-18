/**
 * One-time migration: ensure all unit documents have a correct `battalionId` field.
 *
 * Rules:
 *  - Battalion units:  battalionId = their own document ID (self-referential)
 *  - Company/Platoon:  battalionId = ancestor battalion ID (traverse parentId chain)
 *
 * Units created after the `createUnit` fix already have this field set correctly.
 * This script patches any units that were created before the fix (missing or null).
 *
 * Usage:
 *   cd tools && node migrate-battalion-ids.js [--dry-run]
 *
 * Requires serviceAccountKey.json in the tools/ directory.
 */

'use strict';

const admin = require('firebase-admin');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
});

const db = admin.firestore();

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}\n`);

  // 1. Load all units into memory
  const snap = await db.collection('units').get();
  const units = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Loaded ${units.length} unit(s).`);

  // Build a lookup map
  const byId = Object.fromEntries(units.map(u => [u.id, u]));

  // 2. Traverse parentId chain to find the ancestor battalion
  function findBattalionId(unitId, visited = new Set()) {
    if (!unitId || visited.has(unitId)) return null; // guard against cycles
    visited.add(unitId);
    const unit = byId[unitId];
    if (!unit) return null;
    if (unit.unitType === 'battalion') return unit.id;
    return findBattalionId(unit.parentId, visited);
  }

  // 3. Determine the correct battalionId for each unit
  const patches = [];
  for (const unit of units) {
    let correctBattalionId;
    if (unit.unitType === 'battalion') {
      correctBattalionId = unit.id; // self-referential
    } else {
      correctBattalionId = findBattalionId(unit.parentId) || null;
    }

    const current = unit.battalionId ?? null;
    if (current !== correctBattalionId) {
      patches.push({ id: unit.id, name: unit.name, unitType: unit.unitType, from: current, to: correctBattalionId });
    }
  }

  if (patches.length === 0) {
    console.log('\nAll units already have correct battalionId. Nothing to do.');
    process.exit(0);
  }

  console.log(`\n${patches.length} unit(s) need patching:\n`);
  for (const p of patches) {
    console.log(`  [${p.unitType}] "${p.name}" (${p.id}): ${JSON.stringify(p.from)} → ${JSON.stringify(p.to)}`);
  }

  if (DRY_RUN) {
    console.log('\nDry run — no changes written.');
    process.exit(0);
  }

  // 4. Write patches in batches of 500 (Firestore limit)
  console.log('\nApplying patches...');
  const BATCH_SIZE = 500;
  for (let i = 0; i < patches.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const p of patches.slice(i, i + BATCH_SIZE)) {
      batch.update(db.collection('units').doc(p.id), {
        battalionId: p.to,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`  Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${Math.min(i + BATCH_SIZE, patches.length)} / ${patches.length})`);
  }

  console.log('\nMigration complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
