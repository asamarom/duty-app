#!/usr/bin/env node
/**
 * Check what fields exist in equipmentAssignments
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

async function checkAssignments() {
  try {
    console.log('\n📋 All equipmentAssignments documents:');
    const snapshot = await db.collection('equipmentAssignments').get();

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n${doc.id}:`);
      console.log(`  equipmentId: ${data.equipmentId}`);
      console.log(`  battalionId: ${data.battalionId}`);
      console.log(`  personnelId: ${data.personnelId || 'null'}`);
      console.log(`  unitId: ${data.unitId || 'null'}`);
      console.log(`  quantity: ${data.quantity}`);
      console.log(`  isReturned: ${data.isReturned}`);
      console.log(`  returnedAt: ${data.returnedAt}`);
      console.log(`  assignedAt: ${data.assignedAt}`);
      console.log('  ALL FIELDS:', Object.keys(data).join(', '));
    });

    console.log('\n\n📋 Query with returnedAt == null:');
    const q1 = await db.collection('equipmentAssignments')
      .where('returnedAt', '==', null)
      .get();
    console.log(`  Found ${q1.size} documents`);

    console.log('\n📋 Query with isReturned == false:');
    const q2 = await db.collection('equipmentAssignments')
      .where('isReturned', '==', false)
      .get();
    console.log(`  Found ${q2.size} documents`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAssignments().then(() => process.exit(0));
