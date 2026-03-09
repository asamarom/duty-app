#!/usr/bin/env node
/**
 * Fix custom claims for a specific user by removing invalid battalionId
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function fixUserCustomClaims() {
  try {
    const userId = 'wRQHXCcxNBWlzsjb2dDO28pxdqu2';

    console.log(`\n🔧 Fixing custom claims for user: ${userId}`);

    // Get current custom claims
    const userRecord = await auth.getUser(userId);
    console.log('   Current custom claims:', userRecord.customClaims);

    // Get user document to determine correct battalionId
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('   ❌ User document not found');
      return;
    }

    const userData = userDoc.data();
    console.log('   User data:');
    console.log('     unitId:', userData.unitId);
    console.log('     battalionId:', userData.battalionId);
    console.log('     roles:', userData.roles);

    // Determine correct battalionId
    let correctBattalionId = userData.battalionId;

    // If user doesn't have battalionId, look it up from their unit
    if (!correctBattalionId && userData.unitId) {
      const unitDoc = await db.collection('units').doc(userData.unitId).get();
      if (unitDoc.exists) {
        const unitData = unitDoc.data();
        correctBattalionId = unitData.battalionId || userData.unitId; // If unit is a battalion, use its ID
        console.log(`   Resolved battalionId from unit doc: ${correctBattalionId}`);
      } else {
        // Unit doc doesn't exist, assume unitId IS the battalionId
        correctBattalionId = userData.unitId;
        console.log(`   Unit doc not found, using unitId as battalionId: ${correctBattalionId}`);
      }
    }

    // Set new custom claims (only set battalionId if we have a valid one)
    const newClaims = {};
    if (correctBattalionId) {
      newClaims.battalionId = correctBattalionId;
    }
    // Preserve other custom claims if they exist and are valid
    if (userRecord.customClaims) {
      for (const [key, value] of Object.entries(userRecord.customClaims)) {
        if (key !== 'battalionId' && value !== 'undefined' && value !== undefined) {
          newClaims[key] = value;
        }
      }
    }

    console.log('   Setting new custom claims:', newClaims);
    await auth.setCustomUserClaims(userId, newClaims);

    // Verify
    const updatedUserRecord = await auth.getUser(userId);
    console.log('   ✓ Updated custom claims:', updatedUserRecord.customClaims);

    console.log('\n✅ Custom claims fixed!');
    console.log('   User will need to refresh their auth token (logout/login or wait for auto-refresh)');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixUserCustomClaims().then(() => process.exit(0));
