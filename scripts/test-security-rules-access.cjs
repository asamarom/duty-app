#!/usr/bin/env node
/**
 * Test security rules evaluation by simulating user access
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

async function testAccess() {
  try {
    const userId = 'wRQHXCcxNBWlzsjb2dDO28pxdqu2';
    const battalionId = 'yCCxfGgoXMgCeCwQrg00';

    console.log('\n🔍 Testing security rules logic for user:', userId);

    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('❌ User document not found');
      return;
    }

    const userData = userDoc.data();
    console.log('\n📋 User data:');
    console.log('  roles:', userData.roles);
    console.log('  unitId:', userData.unitId);
    console.log('  battalionId:', userData.battalionId);

    // Simulate hasAnyRole()
    const hasAnyRole = userData.roles != null && userData.roles.length > 0;
    console.log('\n✓ hasAnyRole():', hasAnyRole);

    // Simulate getUserBattalionId() - no custom claims, falls back to unitId
    const userBattalionId = userData.unitId; // fallback in security rules
    console.log('✓ getUserBattalionId():', userBattalionId);

    // Simulate hasUnitId()
    const hasUnitId = userData.unitId != null;
    console.log('✓ hasUnitId():', hasUnitId);

    // Test equipment access
    console.log('\n📦 Testing equipment access:');
    const equipmentDocs = await db.collection('equipment').get();
    equipmentDocs.forEach(doc => {
      const data = doc.data();
      const docBattalionId = data.battalionId;

      // Simulate isSameBattalion()
      const isSameBattalion = docBattalionId == null || (hasUnitId && userBattalionId == docBattalionId);

      // Simulate the full read rule
      const canRead = hasAnyRole && isSameBattalion;

      console.log(`  ${doc.id}:`);
      console.log(`    docBattalionId: ${docBattalionId}`);
      console.log(`    isSameBattalion: ${isSameBattalion}`);
      console.log(`    canRead: ${canRead ? '✓ YES' : '✗ NO'}`);
    });

    // Test equipmentAssignments access
    console.log('\n📋 Testing equipmentAssignments access:');
    const assignmentDocs = await db.collection('equipmentAssignments').get();
    assignmentDocs.forEach(doc => {
      const data = doc.data();
      const docBattalionId = data.battalionId;

      const isSameBattalion = docBattalionId == null || (hasUnitId && userBattalionId == docBattalionId);
      const canRead = hasAnyRole && isSameBattalion;

      console.log(`  ${doc.id}:`);
      console.log(`    docBattalionId: ${docBattalionId}`);
      console.log(`    isSameBattalion: ${isSameBattalion}`);
      console.log(`    canRead: ${canRead ? '✓ YES' : '✗ NO'}`);
    });

    // Check if custom claims exist
    console.log('\n🔐 Checking Auth custom claims:');
    const userRecord = await admin.auth().getUser(userId);
    console.log('  customClaims:', userRecord.customClaims || 'undefined');

    if (!userRecord.customClaims || !userRecord.customClaims.battalionId) {
      console.log('\n⚠️  WARNING: User has no battalionId in custom claims!');
      console.log('   Security rules will fall back to getUserDoc().data.unitId');
      console.log('   This requires an additional document lookup on every request.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAccess().then(() => process.exit(0));
