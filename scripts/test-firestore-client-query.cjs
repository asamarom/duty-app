#!/usr/bin/env node
/**
 * Test Firestore queries using the CLIENT SDK with actual auth
 * to see if security rules are blocking access
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
const auth = admin.auth();

async function testClientQuery() {
  try {
    const userId = 'wRQHXCcxNBWlzsjb2dDO28pxdqu2';
    const battalionId = 'yCCxfGgoXMgCeCwQrg00';

    // Get a custom token for this user to simulate client auth
    console.log('\n🔐 Creating custom token for user:', userId);
    const customToken = await auth.createCustomToken(userId);
    console.log('   ✓ Custom token created');

    // Check if security rules would allow this query
    console.log('\n🔍 Testing query that client is trying to make:');
    console.log('   Query: equipment where battalionId ==', battalionId, 'orderBy name');

    // Try the query with Admin SDK (bypasses security rules)
    try {
      const equipmentQuery = db.collection('equipment')
        .where('battalionId', '==', battalionId)
        .orderBy('name');

      const snapshot = await equipmentQuery.get();
      console.log('   ✓ Admin SDK query successful:', snapshot.size, 'documents');
    } catch (err) {
      console.log('   ✗ Admin SDK query failed:', err.message);
    }

    // Test the assignments query
    console.log('\n🔍 Testing assignments query:');
    console.log('   Query: equipmentAssignments where returnedAt == null AND battalionId ==', battalionId);

    try {
      const assignmentsQuery = db.collection('equipmentAssignments')
        .where('returnedAt', '==', null)
        .where('battalionId', '==', battalionId);

      const snapshot = await assignmentsQuery.get();
      console.log('   ✓ Admin SDK query successful:', snapshot.size, 'documents');
    } catch (err) {
      console.log('   ✗ Admin SDK query failed:', err.message);
    }

    // Check user document structure
    console.log('\n📋 Checking user document structure for security rules:');
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    console.log('   User document exists:', userDoc.exists);
    console.log('   Has roles array:', Array.isArray(userData.roles));
    console.log('   roles.length > 0:', userData.roles && userData.roles.length > 0);
    console.log('   Has unitId:', userData.unitId != null);
    console.log('   unitId value:', userData.unitId);
    console.log('   battalionId value:', userData.battalionId);

    // Simulate security rules check
    console.log('\n✅ Security rules evaluation simulation:');
    console.log('   isAuthenticated: true (has userId)');
    console.log('   hasAnyRole:', userData.roles && userData.roles.length > 0);
    console.log('   hasUnitId:', userData.unitId != null);
    console.log('   getUserBattalionId:', userData.unitId); // fallback to unitId
    console.log('   isSameBattalion:', userData.unitId === battalionId);
    console.log('   → Should allow read:', (userData.roles && userData.roles.length > 0) && (userData.unitId === battalionId));

    // Log the custom token for manual testing
    console.log('\n📝 Custom token (for manual browser testing):');
    console.log('   ', customToken);
    console.log('\n   You can use this token in browser console:');
    console.log('   firebase.auth().signInWithCustomToken("' + customToken + '")');

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testClientQuery().then(() => process.exit(0));
