/**
 * Seed test users and Firestore data into Firebase Staging project.
 *
 * Usage: node scripts/seed-firebase-staging.js
 *
 * Prerequisites:
 * 1. Firebase Admin SDK: npm install firebase-admin
 * 2. Service account key downloaded from Firebase Console
 *    Save as: firebase-staging-service-account.json (in project root)
 *
 * To get the service account key:
 * 1. Go to https://console.firebase.google.com/project/duty-staging/settings/serviceaccounts/adminsdk
 * 2. Click "Generate new private key"
 * 3. Save as firebase-staging-service-account.json
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Try to load service account from common locations
const serviceAccountPaths = [
  path.join(__dirname, '..', 'firebase-staging-service-account.json'),
  path.join(__dirname, '..', 'service-account-staging.json'),
  path.join(__dirname, 'firebase-staging-service-account.json'),
];

let serviceAccount = null;
for (const saPath of serviceAccountPaths) {
  if (fs.existsSync(saPath)) {
    serviceAccount = require(saPath);
    console.log(`✅ Found service account at: ${saPath}`);
    break;
  }
}

if (!serviceAccount) {
  console.error('\n❌ Service account key not found!\n');
  console.error('Please download it from Firebase Console:');
  console.error('1. Go to: https://console.firebase.google.com/project/duty-staging/settings/serviceaccounts/adminsdk');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save the file as "firebase-staging-service-account.json" in the project root\n');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://duty-staging.firebaseio.com`,
});

const db = admin.firestore();
const auth = admin.auth();

const TEST_PASSWORD = 'TestPassword123!';

// Fixed IDs for test data
const TEST_UNIT_IDS = {
  battalion: '00000000-0000-0000-0000-100000000001',
  company: '00000000-0000-0000-0000-100000000002',
  platoon: '00000000-0000-0000-0000-100000000003',
};

const TEST_PERSONNEL_IDS = {
  admin: '00000000-0000-0000-0000-200000000001',
  leader: '00000000-0000-0000-0000-200000000002',
  user: '00000000-0000-0000-0000-200000000003',
};

const TEST_EQUIPMENT_IDS = {
  bulk: '00000000-0000-0000-0000-300000000001',
  serialized: '00000000-0000-0000-0000-300000000002',
};

const TEST_ASSIGNMENT_IDS = {
  bulkToBattalion: '00000000-0000-0000-0000-400000000001',
  serializedToUser: '00000000-0000-0000-0000-400000000002',
};

// Store UIDs after creating auth users
const userUIDs = {};

const authUsers = [
  { key: 'admin', email: 'test-admin@e2e.local', displayName: 'Test Admin', role: 'admin' },
  { key: 'leader', email: 'test-leader@e2e.local', displayName: 'Test Leader', role: 'leader' },
  { key: 'user', email: 'test-user@e2e.local', displayName: 'Test User', role: 'user' },
  { key: 'new', email: 'test-new@e2e.local', displayName: 'Test New User', role: null },
  { key: 'pending', email: 'test-pending@e2e.local', displayName: 'Test Pending User', role: null },
  { key: 'declined', email: 'test-declined@e2e.local', displayName: 'Test Declined User', role: null },
];

// ── Helper Functions ───────────────────────────────────────────────

async function deleteUserByEmail(email) {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.deleteUser(user.uid);
    console.log(`   Deleted existing user: ${email}`);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }
}

async function createAuthUser(user) {
  try {
    // Delete if exists
    await deleteUserByEmail(user.email);

    // Create new user
    const userRecord = await auth.createUser({
      email: user.email,
      password: TEST_PASSWORD,
      displayName: user.displayName,
      emailVerified: true,
    });

    // Set custom claims for role
    if (user.role) {
      await auth.setCustomUserClaims(userRecord.uid, { role: user.role });
      console.log(`   Created: ${user.email} (uid: ${userRecord.uid}, role: ${user.role})`);
    } else {
      console.log(`   Created: ${user.email} (uid: ${userRecord.uid})`);
    }

    return userRecord.uid;
  } catch (error) {
    console.error(`   ❌ Error creating ${user.email}: ${error.message}`);
    throw error;
  }
}

async function clearCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  if (snapshot.size > 0) {
    await batch.commit();
    console.log(`   Cleared ${snapshot.size} documents from ${collectionName}`);
  }
}

// ── Seed Functions ─────────────────────────────────────────────────

async function seedAuthUsers() {
  console.log('1️⃣  Seeding Auth users...');

  for (const user of authUsers) {
    const uid = await createAuthUser(user);
    userUIDs[user.key] = uid;
  }
}

async function seedUsers() {
  console.log('\n2️⃣  Seeding users collection (roles)...');
  await clearCollection('users');

  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  const usersData = [
    {
      id: userUIDs.admin,
      data: {
        fullName: 'Test Admin',
        avatarUrl: null,
        unitId: TEST_UNIT_IDS.battalion,
        roles: ['admin'],
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      id: userUIDs.leader,
      data: {
        fullName: 'Test Leader',
        avatarUrl: null,
        unitId: TEST_UNIT_IDS.company,
        roles: ['leader'],
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      id: userUIDs.user,
      data: {
        fullName: 'Test User',
        avatarUrl: null,
        unitId: TEST_UNIT_IDS.platoon,
        roles: ['user'],
        createdAt: now,
        updatedAt: now,
      },
    },
  ];

  for (const u of usersData) {
    batch.set(db.collection('users').doc(u.id), u.data);
    console.log(`   Created user doc: ${u.id}`);
  }

  await batch.commit();
}

async function seedUnits() {
  console.log('\n3️⃣  Seeding units collection...');
  await clearCollection('units');

  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  const units = [
    {
      id: TEST_UNIT_IDS.battalion,
      data: {
        name: 'Test Battalion',
        unitType: 'battalion',
        parentId: null,
        designation: 'TEST-BN',
        leaderId: userUIDs.admin,
        status: 'active',
        battalionId: TEST_UNIT_IDS.battalion,
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      id: TEST_UNIT_IDS.company,
      data: {
        name: 'Alpha Company',
        unitType: 'company',
        parentId: TEST_UNIT_IDS.battalion,
        designation: 'A-CO',
        leaderId: userUIDs.leader,
        status: 'active',
        battalionId: TEST_UNIT_IDS.battalion,
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      id: TEST_UNIT_IDS.platoon,
      data: {
        name: 'First Platoon',
        unitType: 'platoon',
        parentId: TEST_UNIT_IDS.company,
        designation: '1-PLT',
        leaderId: null,
        status: 'active',
        battalionId: TEST_UNIT_IDS.battalion,
        createdAt: now,
        updatedAt: now,
      },
    },
  ];

  for (const unit of units) {
    batch.set(db.collection('units').doc(unit.id), unit.data);
    console.log(`   Created unit: ${unit.data.name}`);
  }

  await batch.commit();
}

async function seedPersonnel() {
  console.log('\n4️⃣  Seeding personnel collection...');
  await clearCollection('personnel');

  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  const personnel = [
    {
      id: TEST_PERSONNEL_IDS.admin,
      data: {
        userId: userUIDs.admin,
        unitId: TEST_UNIT_IDS.battalion,
        battalionId: TEST_UNIT_IDS.battalion,
        serviceNumber: 'E2E-ADMIN-001',
        rank: 'COL',
        firstName: 'Test',
        lastName: 'Admin',
        dutyPosition: 'System Administrator',
        phone: '+1-555-0101',
        email: 'test-admin@e2e.local',
        localAddress: null,
        profileImage: null,
        locationStatus: 'home',
        readinessStatus: 'ready',
        skills: [],
        driverLicenses: [],
        isSignatureApproved: true,
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      id: TEST_PERSONNEL_IDS.leader,
      data: {
        userId: userUIDs.leader,
        unitId: TEST_UNIT_IDS.company,
        battalionId: TEST_UNIT_IDS.battalion,
        serviceNumber: 'E2E-LEADER-002',
        rank: 'CPT',
        firstName: 'Test',
        lastName: 'Leader',
        dutyPosition: 'Company Commander',
        phone: '+1-555-0102',
        email: 'test-leader@e2e.local',
        localAddress: null,
        profileImage: null,
        locationStatus: 'home',
        readinessStatus: 'ready',
        skills: [],
        driverLicenses: [],
        isSignatureApproved: true,
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      id: TEST_PERSONNEL_IDS.user,
      data: {
        userId: userUIDs.user,
        unitId: TEST_UNIT_IDS.platoon,
        battalionId: TEST_UNIT_IDS.battalion,
        serviceNumber: 'E2E-USER-003',
        rank: 'SGT',
        firstName: 'Test',
        lastName: 'User',
        dutyPosition: 'Squad Leader',
        phone: '+1-555-0103',
        email: 'test-user@e2e.local',
        localAddress: null,
        profileImage: null,
        locationStatus: 'home',
        readinessStatus: 'ready',
        skills: [],
        driverLicenses: [],
        isSignatureApproved: true,
        createdAt: now,
        updatedAt: now,
      },
    },
  ];

  for (const p of personnel) {
    batch.set(db.collection('personnel').doc(p.id), p.data);
    console.log(`   Created personnel: ${p.data.firstName} ${p.data.lastName}`);
  }

  await batch.commit();
}

async function seedSignupRequests() {
  console.log('\n5️⃣  Seeding signupRequests collection...');
  await clearCollection('signupRequests');

  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  const requests = [
    {
      id: 'sr-admin',
      data: {
        userId: userUIDs.admin,
        fullName: 'Test Admin',
        email: 'test-admin@e2e.local',
        phone: '+1-555-0101',
        serviceNumber: 'E2E-ADMIN-001',
        requestedUnitId: TEST_UNIT_IDS.battalion,
        status: 'approved',
        reviewedBy: userUIDs.admin,
        reviewedAt: now,
        declineReason: null,
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      id: 'sr-leader',
      data: {
        userId: userUIDs.leader,
        fullName: 'Test Leader',
        email: 'test-leader@e2e.local',
        phone: '+1-555-0102',
        serviceNumber: 'E2E-LEADER-002',
        requestedUnitId: TEST_UNIT_IDS.company,
        status: 'approved',
        reviewedBy: userUIDs.admin,
        reviewedAt: now,
        declineReason: null,
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      id: 'sr-user',
      data: {
        userId: userUIDs.user,
        fullName: 'Test User',
        email: 'test-user@e2e.local',
        phone: '+1-555-0103',
        serviceNumber: 'E2E-USER-003',
        requestedUnitId: TEST_UNIT_IDS.platoon,
        status: 'approved',
        reviewedBy: userUIDs.admin,
        reviewedAt: now,
        declineReason: null,
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      id: 'sr-pending',
      data: {
        userId: userUIDs.pending,
        fullName: 'Test Pending User',
        email: 'test-pending@e2e.local',
        phone: '+1-555-0105',
        serviceNumber: 'E2E-PENDING-005',
        requestedUnitId: TEST_UNIT_IDS.platoon,
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        declineReason: null,
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      id: 'sr-declined',
      data: {
        userId: userUIDs.declined,
        fullName: 'Test Declined User',
        email: 'test-declined@e2e.local',
        phone: '+1-555-0106',
        serviceNumber: 'E2E-DECLINED-006',
        requestedUnitId: TEST_UNIT_IDS.platoon,
        status: 'declined',
        reviewedBy: userUIDs.admin,
        reviewedAt: now,
        declineReason: 'Test decline reason for E2E testing',
        createdAt: now,
        updatedAt: now,
      },
    },
  ];

  for (const req of requests) {
    batch.set(db.collection('signupRequests').doc(req.id), req.data);
    console.log(`   Created signup request: ${req.data.fullName} (${req.data.status})`);
  }

  await batch.commit();
}

async function seedAdminUnitAssignments() {
  console.log('\n6️⃣  Seeding adminUnitAssignments collection...');
  await clearCollection('adminUnitAssignments');

  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  const assignments = [
    {
      id: 'admin-bn-assignment',
      data: {
        userId: userUIDs.admin,
        unitId: TEST_UNIT_IDS.battalion,
        unitType: 'battalion',
        createdAt: now,
      },
    },
    {
      id: 'leader-co-assignment',
      data: {
        userId: userUIDs.leader,
        unitId: TEST_UNIT_IDS.company,
        unitType: 'company',
        createdAt: now,
      },
    },
  ];

  for (const a of assignments) {
    batch.set(db.collection('adminUnitAssignments').doc(a.id), a.data);
    console.log(`   Created assignment: ${a.id}`);
  }

  await batch.commit();
}

async function seedEquipment() {
  console.log('\n7️⃣  Seeding equipment and assignments...');
  await clearCollection('equipment');
  await clearCollection('equipmentAssignments');

  const now = admin.firestore.Timestamp.now();

  // Equipment
  await db.collection('equipment').doc(TEST_EQUIPMENT_IDS.bulk).set({
    name: 'Radio Set',
    serialNumber: null,
    description: 'Bulk radio sets for E2E testing',
    quantity: 5,
    status: 'serviceable',
    createdBy: null,
    battalionId: TEST_UNIT_IDS.battalion,
    createdAt: now,
    updatedAt: now,
  });
  console.log('   Created bulk equipment: Radio Set (qty: 5)');

  await db.collection('equipment').doc(TEST_EQUIPMENT_IDS.serialized).set({
    name: 'M4 Carbine',
    serialNumber: 'E2E-SN-001',
    description: 'Serialized rifle for E2E testing',
    quantity: 1,
    status: 'serviceable',
    createdBy: null,
    battalionId: TEST_UNIT_IDS.battalion,
    createdAt: now,
    updatedAt: now,
  });
  console.log('   Created serialized equipment: M4 Carbine (SN: E2E-SN-001)');

  // Assignments
  await db.collection('equipmentAssignments').doc(TEST_ASSIGNMENT_IDS.bulkToBattalion).set({
    equipmentId: TEST_EQUIPMENT_IDS.bulk,
    personnelId: null,
    unitId: TEST_UNIT_IDS.battalion,
    quantity: 5,
    assignedBy: null,
    assignedAt: now,
    returnedAt: null,
    notes: null,
    battalionId: TEST_UNIT_IDS.battalion,
    createdAt: now,
  });
  console.log('   Created assignment: Radio Set (5) → Test Battalion');

  await db.collection('equipmentAssignments').doc(TEST_ASSIGNMENT_IDS.serializedToUser).set({
    equipmentId: TEST_EQUIPMENT_IDS.serialized,
    personnelId: TEST_PERSONNEL_IDS.user,
    unitId: null,
    quantity: 1,
    assignedBy: null,
    assignedAt: now,
    returnedAt: null,
    notes: null,
    battalionId: TEST_UNIT_IDS.battalion,
    createdAt: now,
  });
  console.log('   Created assignment: M4 Carbine → Test User');
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Firebase Staging project: duty-staging\n');
  console.log('⚠️  WARNING: This will DELETE existing test data and recreate it!\n');

  try {
    await seedAuthUsers();
    await seedUsers();
    await seedUnits();
    await seedPersonnel();
    await seedSignupRequests();
    await seedAdminUnitAssignments();
    await seedEquipment();

    console.log('\n✅ All test data seeded successfully!');
    console.log(`\n📧 Test user emails:`);
    console.log('   - test-admin@e2e.local (admin)');
    console.log('   - test-leader@e2e.local (leader)');
    console.log('   - test-user@e2e.local (user)');
    console.log('   - test-new@e2e.local (no role)');
    console.log('   - test-pending@e2e.local (pending approval)');
    console.log('   - test-declined@e2e.local (declined)');
    console.log(`\n🔑 Password for all: ${TEST_PASSWORD}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
