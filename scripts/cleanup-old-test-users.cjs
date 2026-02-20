#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

const STAGING_PROJECT_ID = 'duty-staging';

async function cleanup() {
  console.log('Cleaning up old test users from staging...\n');
  
  const serviceAccountPath = path.join(__dirname, '..', 'service-account-staging.json');
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    projectId: STAGING_PROJECT_ID,
  });
  
  const db = admin.firestore();
  
  const oldUIDs = ['test-admin-uid', 'test-leader-uid', 'test-user-uid'];
  const emails = ['test-admin@e2e.local', 'test-leader@e2e.local', 'test-user@e2e.local'];
  
  // Delete old Firebase Auth users
  for (const email of emails) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(user.uid);
      console.log(`✓ Deleted auth user: ${email} (${user.uid})`);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        console.log(`  (Auth user not found: ${email})`);
      } else {
        console.error(`Error deleting ${email}:`, e.message);
      }
    }
  }
  
  // Delete old Firestore records
  for (const uid of oldUIDs) {
    try {
      await db.collection('personnel').doc(uid).delete();
      console.log(`✓ Deleted personnel: ${uid}`);
    } catch (e) {
      console.error(`Error deleting personnel ${uid}:`, e.message);
    }
    
    try {
      await db.collection('user_roles').doc(uid).delete();
      console.log(`✓ Deleted user_role: ${uid}`);
    } catch (e) {
      console.error(`Error deleting user_role ${uid}:`, e.message);
    }
  }
  
  // Delete old signup requests
  const signupRequests = await db.collection('signupRequests')
    .where('userId', 'in', oldUIDs)
    .get();
  
  for (const doc of signupRequests.docs) {
    await doc.ref.delete();
    console.log(`✓ Deleted signup request: ${doc.id}`);
  }
  
  console.log('\n✅ Cleanup complete!');
  process.exit(0);
}

cleanup().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
