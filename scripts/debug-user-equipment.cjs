#!/usr/bin/env node
/**
 * Debug script to check user's battalionId and equipment visibility
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const userId = 'wRQHXCcxNBWlzsjb2dDO28pxdqu2';

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugUser() {
  try {
    console.log(`\n👤 Checking user: ${userId}`);

    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('   ❌ User document not found');
      return;
    }

    const userData = userDoc.data();
    console.log('   User data:', JSON.stringify(userData, null, 2));

    // Get unit document
    if (userData.unitId) {
      console.log(`\n📦 Checking unit: ${userData.unitId}`);
      const unitDoc = await db.collection('units').doc(userData.unitId).get();
      if (unitDoc.exists) {
        const unitData = unitDoc.data();
        console.log('   Unit data:', JSON.stringify(unitData, null, 2));
      } else {
        console.log('   ❌ Unit document not found');
      }
    }

    // Get all equipment
    console.log('\n🔧 All equipment in database:');
    const allEquipment = await db.collection('equipment').get();
    allEquipment.forEach(doc => {
      const data = doc.data();
      console.log(`   ${doc.id}: ${data.name} (battalionId: ${data.battalionId || 'MISSING'})`);
    });

    // Query equipment by battalionId if user has it
    const battalionId = userData.battalionId || (userData.unitId ? (await db.collection('units').doc(userData.unitId).get()).data()?.battalionId : null);
    if (battalionId) {
      console.log(`\n🔍 Querying equipment where battalionId == "${battalionId}"`);
      const equipmentQuery = await db.collection('equipment')
        .where('battalionId', '==', battalionId)
        .get();
      console.log(`   Found ${equipmentQuery.size} equipment documents`);
      equipmentQuery.forEach(doc => {
        const data = doc.data();
        console.log(`   ✓ ${doc.id}: ${data.name}`);
      });
    }

    // Get all equipment assignments
    console.log('\n📋 All equipment assignments:');
    const allAssignments = await db.collection('equipmentAssignments').get();
    allAssignments.forEach(doc => {
      const data = doc.data();
      console.log(`   ${doc.id}: equipmentId=${data.equipmentId}, battalionId=${data.battalionId || 'MISSING'}, isReturned=${data.isReturned || false}`);
    });

    // Check custom claims
    console.log('\n🔐 Checking custom claims...');
    const userRecord = await admin.auth().getUser(userId);
    console.log('   Custom claims:', JSON.stringify(userRecord.customClaims, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugUser().then(() => process.exit(0));
