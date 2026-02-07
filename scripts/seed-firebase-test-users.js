/**
 * Seed test users into Firebase Authentication
 * Run with: node scripts/seed-firebase-test-users.js
 *
 * Prerequisites:
 * 1. Firebase Auth must be enabled with Email/Password provider
 * 2. Firebase Admin SDK must be installed: npm install firebase-admin
 * 3. Service account key must be downloaded from Firebase Console
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Try to load service account from common locations
const serviceAccountPaths = [
  path.join(__dirname, '..', 'firebase-service-account.json'),
  path.join(__dirname, '..', 'service-account.json'),
  path.join(__dirname, 'service-account.json'),
];

let serviceAccount = null;
for (const saPath of serviceAccountPaths) {
  if (fs.existsSync(saPath)) {
    serviceAccount = require(saPath);
    console.log(`Found service account at: ${saPath}`);
    break;
  }
}

if (!serviceAccount) {
  console.error('Service account not found. Please download it from Firebase Console:');
  console.error('1. Go to Firebase Console > Project Settings > Service accounts');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save the file as firebase-service-account.json in the project root');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const TEST_PASSWORD = 'TestPassword123!';

const testUsers = [
  {
    uid: '00000000-0000-0000-0000-000000000001',
    email: 'test-admin@e2e.local',
    displayName: 'Test Admin',
    emailVerified: true,
  },
  {
    uid: '00000000-0000-0000-0000-000000000002',
    email: 'test-leader@e2e.local',
    displayName: 'Test Leader',
    emailVerified: true,
  },
  {
    uid: '00000000-0000-0000-0000-000000000003',
    email: 'test-user@e2e.local',
    displayName: 'Test User',
    emailVerified: true,
  },
  {
    uid: '00000000-0000-0000-0000-000000000004',
    email: 'test-new@e2e.local',
    displayName: 'Test New User',
    emailVerified: true,
  },
  {
    uid: '00000000-0000-0000-0000-000000000005',
    email: 'test-pending@e2e.local',
    displayName: 'Test Pending User',
    emailVerified: true,
  },
  {
    uid: '00000000-0000-0000-0000-000000000006',
    email: 'test-declined@e2e.local',
    displayName: 'Test Declined User',
    emailVerified: true,
  },
];

async function deleteUserIfExists(uid) {
  try {
    await admin.auth().deleteUser(uid);
    console.log(`  Deleted existing user: ${uid}`);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }
}

async function createTestUser(user) {
  try {
    await deleteUserIfExists(user.uid);
    await admin.auth().createUser({
      uid: user.uid,
      email: user.email,
      password: TEST_PASSWORD,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
    });
    console.log(`  Created: ${user.email}`);
  } catch (error) {
    console.error(`  Error creating ${user.email}: ${error.message}`);
  }
}

async function main() {
  console.log('Seeding Firebase test users...\n');

  for (const user of testUsers) {
    await createTestUser(user);
  }

  console.log('\n✅ Firebase test users seeded successfully!');
  console.log('\nTest users created:');
  console.log('  - test-admin@e2e.local');
  console.log('  - test-leader@e2e.local');
  console.log('  - test-user@e2e.local');
  console.log('  - test-new@e2e.local');
  console.log('  - test-pending@e2e.local');
  console.log('  - test-declined@e2e.local');
  console.log(`\nPassword for all: ${TEST_PASSWORD}`);

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
