#!/usr/bin/env node
/**
 * Test equipment query with specific battalionId to debug permission error
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

async function testQueries() {
  try {
    const battalionId = 'yCCxfGgoXMgCeCwQrg00';

    console.log('\n📋 Test 1: Query equipment by battalionId');
    const equipmentQuery = db.collection('equipment')
      .where('battalionId', '==', battalionId)
      .orderBy('name');

    const equipmentSnapshot = await equipmentQuery.get();
    console.log(`   ✓ Success! Found ${equipmentSnapshot.size} documents`);
    equipmentSnapshot.forEach(doc => {
      console.log(`     - ${doc.id}: ${doc.data().name}`);
    });

    console.log('\n📋 Test 2: Query equipmentAssignments by isReturned and battalionId');
    const assignmentsQuery = db.collection('equipmentAssignments')
      .where('isReturned', '==', false)
      .where('battalionId', '==', battalionId);

    const assignmentsSnapshot = await assignmentsQuery.get();
    console.log(`   ✓ Success! Found ${assignmentsSnapshot.size} documents`);
    assignmentsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`     - ${doc.id}: equipmentId=${data.equipmentId}`);
    });

    console.log('\n📋 Test 3: Query assignmentRequests by status and battalionId');
    const requestsQuery = db.collection('assignmentRequests')
      .where('status', '==', 'pending')
      .where('battalionId', '==', battalionId);

    const requestsSnapshot = await requestsQuery.get();
    console.log(`   ✓ Success! Found ${requestsSnapshot.size} documents`);
    requestsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`     - ${doc.id}: equipmentId=${data.equipmentId}, status=${data.status}`);
    });

    console.log('\n✅ All queries successful!');

  } catch (error) {
    console.error('\n❌ Query failed:', error.message);
    console.error('   Details:', error);
  }
}

testQueries().then(() => process.exit(0));
