#!/usr/bin/env node
/**
 * Verify user's custom claims and provide instructions for token refresh
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

async function verifyUser() {
  try {
    const userId = process.argv[2] || 'wRQHXCcxNBWlzsjb2dDO28pxdqu2';

    console.log('\n🔍 Checking user authentication status');
    console.log('=====================================\n');
    console.log(`User ID: ${userId}\n`);

    // Get user record
    const userRecord = await auth.getUser(userId);
    console.log('📧 Email:', userRecord.email);
    console.log('👤 Display Name:', userRecord.displayName || '(not set)');
    console.log('✓ Email Verified:', userRecord.emailVerified);
    console.log('');

    // Get custom claims
    console.log('🔐 Custom Claims (server-side):');
    if (userRecord.customClaims) {
      console.log(JSON.stringify(userRecord.customClaims, null, 2));

      if (userRecord.customClaims.battalionId) {
        if (userRecord.customClaims.battalionId === 'undefined') {
          console.log('\n❌ PROBLEM: battalionId is the string "undefined"');
          console.log('   This will cause permission errors!');
        } else {
          console.log(`\n✓ battalionId: ${userRecord.customClaims.battalionId}`);
        }
      } else {
        console.log('\n⚠️  No battalionId in custom claims');
        console.log('   Will fall back to document lookup (slower)');
      }
    } else {
      console.log('  (none set)');
    }
    console.log('');

    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('📄 User Document Data:');
      console.log(`   unitId: ${userData.unitId}`);
      console.log(`   battalionId: ${userData.battalionId || '(not set)'}`);
      console.log(`   roles: ${JSON.stringify(userData.roles)}`);
      console.log('');

      // Check if custom claims match document
      if (userRecord.customClaims?.battalionId) {
        const expectedBattalionId = userData.battalionId || userData.unitId;
        if (userRecord.customClaims.battalionId === expectedBattalionId) {
          console.log('✅ Custom claims match document data - All good!');
        } else {
          console.log('⚠️  Custom claims DO NOT match document:');
          console.log(`   Claims: ${userRecord.customClaims.battalionId}`);
          console.log(`   Expected: ${expectedBattalionId}`);
        }
      }
    } else {
      console.log('❌ User document not found in Firestore');
    }

    // Provide refresh instructions
    console.log('\n📋 To Refresh Token:');
    console.log('═══════════════════\n');
    console.log('Option 1 (Browser):');
    console.log('  Run: ./scripts/refresh-token.sh');
    console.log('  Or visit: http://localhost:5173/tools/refresh-auth.html');
    console.log('');
    console.log('Option 2 (Manual):');
    console.log('  1. Logout of the app');
    console.log('  2. Login again');
    console.log('');
    console.log('Option 3 (Wait):');
    console.log('  Token will auto-refresh in ~1 hour');
    console.log('');

    // Generate a custom token for manual testing
    console.log('🎟️  Custom Token for Testing:');
    console.log('══════════════════════════════\n');
    const customToken = await auth.createCustomToken(userId);
    console.log('You can use this token in browser console to sign in:');
    console.log('');
    console.log('import { getAuth, signInWithCustomToken } from "firebase/auth";');
    console.log('const auth = getAuth();');
    console.log(`signInWithCustomToken(auth, "${customToken}")`);
    console.log('  .then(() => console.log("Signed in!"))');
    console.log('  .catch(err => console.error(err));');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

verifyUser().then(() => process.exit(0));
