/**
 * Seed test users and Firestore data into Firebase Emulators.
 *
 * Usage: node scripts/seed-emulator-users.cjs [authHost] [firestoreHost]
 *   authHost defaults to localhost:9099
 *   firestoreHost defaults to localhost:8085
 *
 * No service account needed - emulators accept unauthenticated requests.
 */

const AUTH_HOST = process.argv[2] || 'localhost:9099';
const FIRESTORE_HOST = process.argv[3] || 'localhost:8085';
const PROJECT_ID = 'duty-82f42';
const TEST_PASSWORD = 'TestPassword123!';

// UIDs will be populated after auth user creation
const userUIDs = {};

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

const authUsers = [
  { key: 'admin', email: 'test-admin@e2e.local', displayName: 'Test Admin' },
  { key: 'leader', email: 'test-leader@e2e.local', displayName: 'Test Leader' },
  { key: 'user', email: 'test-user@e2e.local', displayName: 'Test User' },
  { key: 'new', email: 'test-new@e2e.local', displayName: 'Test New User' },
  { key: 'pending', email: 'test-pending@e2e.local', displayName: 'Test Pending User' },
  { key: 'declined', email: 'test-declined@e2e.local', displayName: 'Test Declined User' },
];

// ── Auth Emulator API ──────────────────────────────────────────────

async function clearAuthAccounts() {
  const url = `http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    console.warn(`  Warning: could not clear auth accounts (${res.status})`);
  }
}

async function createAuthUser(user) {
  const url = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      password: TEST_PASSWORD,
      displayName: user.displayName,
      emailVerified: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create ${user.email}: ${body}`);
  }

  const data = await res.json();
  return data.localId; // Auto-generated UID
}

// ── Firestore Emulator API ─────────────────────────────────────────

const FIRESTORE_BASE = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toTimestampValue() {
  const now = new Date().toISOString();
  return { timestampValue: now };
}

function toStringValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  return { stringValue: String(val) };
}

function toIntegerValue(val) {
  return { integerValue: String(val) };
}

function toBooleanValue(val) {
  return { booleanValue: val };
}

function toArrayValue(arr) {
  return {
    arrayValue: {
      values: arr.map((item) => toStringValue(item)),
    },
  };
}

async function clearFirestoreCollection(collectionName) {
  const listUrl = `${FIRESTORE_BASE}/${collectionName}`;
  const res = await fetch(listUrl);
  if (!res.ok) return;

  const data = await res.json();
  if (!data.documents) return;

  for (const doc of data.documents) {
    await fetch(`http://${FIRESTORE_HOST}/v1/${doc.name}`, { method: 'DELETE' });
  }
}

async function createFirestoreDoc(collection, docId, fields) {
  const url = `${FIRESTORE_BASE}/${collection}?documentId=${docId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create ${collection}/${docId}: ${body}`);
  }
}

// ── Seed Functions ─────────────────────────────────────────────────

async function seedAuthUsers() {
  console.log('1. Seeding auth users...');
  await clearAuthAccounts();
  for (const user of authUsers) {
    const uid = await createAuthUser(user);
    userUIDs[user.key] = uid;
    console.log(`   Created: ${user.email} (uid: ${uid})`);
  }
}

async function seedUsers() {
  console.log('2. Seeding users collection (roles)...');
  await clearFirestoreCollection('users');

  const usersData = [
    {
      id: userUIDs.admin,
      fields: {
        fullName: toStringValue('Test Admin'),
        avatarUrl: { nullValue: null },
        unitId: toStringValue(TEST_UNIT_IDS.battalion),
        roles: toArrayValue(['admin']),
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
    {
      id: userUIDs.leader,
      fields: {
        fullName: toStringValue('Test Leader'),
        avatarUrl: { nullValue: null },
        unitId: toStringValue(TEST_UNIT_IDS.company),
        roles: toArrayValue(['leader']),
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
    {
      id: userUIDs.user,
      fields: {
        fullName: toStringValue('Test User'),
        avatarUrl: { nullValue: null },
        unitId: toStringValue(TEST_UNIT_IDS.platoon),
        roles: toArrayValue(['user']),
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
  ];

  for (const u of usersData) {
    await createFirestoreDoc('users', u.id, u.fields);
    console.log(`   Created user doc: ${u.id}`);
  }
}

async function seedUnits() {
  console.log('3. Seeding units collection...');
  await clearFirestoreCollection('units');

  const units = [
    {
      id: TEST_UNIT_IDS.battalion,
      fields: {
        name: toStringValue('Test Battalion'),
        unitType: toStringValue('battalion'),
        parentId: { nullValue: null },
        designation: toStringValue('TEST-BN'),
        leaderId: toStringValue(userUIDs.admin),
        status: toStringValue('active'),
        battalionId: toStringValue(TEST_UNIT_IDS.battalion), // self-referential
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
    {
      id: TEST_UNIT_IDS.company,
      fields: {
        name: toStringValue('Alpha Company'),
        unitType: toStringValue('company'),
        parentId: toStringValue(TEST_UNIT_IDS.battalion),
        designation: toStringValue('A-CO'),
        leaderId: toStringValue(userUIDs.leader),
        status: toStringValue('active'),
        battalionId: toStringValue(TEST_UNIT_IDS.battalion),
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
    {
      id: TEST_UNIT_IDS.platoon,
      fields: {
        name: toStringValue('First Platoon'),
        unitType: toStringValue('platoon'),
        parentId: toStringValue(TEST_UNIT_IDS.company),
        designation: toStringValue('1-PLT'),
        leaderId: { nullValue: null },
        status: toStringValue('active'),
        battalionId: toStringValue(TEST_UNIT_IDS.battalion),
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
  ];

  for (const unit of units) {
    await createFirestoreDoc('units', unit.id, unit.fields);
    console.log(`   Created unit: ${unit.fields.name.stringValue}`);
  }
}

async function seedPersonnel() {
  console.log('4. Seeding personnel collection...');
  await clearFirestoreCollection('personnel');

  const personnel = [
    {
      id: TEST_PERSONNEL_IDS.admin,
      fields: {
        userId: toStringValue(userUIDs.admin),
        unitId: toStringValue(TEST_UNIT_IDS.battalion),
        battalionId: toStringValue(TEST_UNIT_IDS.battalion),
        serviceNumber: toStringValue('E2E-ADMIN-001'),
        rank: toStringValue('COL'),
        firstName: toStringValue('Test'),
        lastName: toStringValue('Admin'),
        dutyPosition: toStringValue('System Administrator'),
        phone: toStringValue('+1-555-0101'),
        email: toStringValue('test-admin@e2e.local'),
        localAddress: { nullValue: null },
        profileImage: { nullValue: null },
        locationStatus: toStringValue('home'),
        readinessStatus: toStringValue('ready'),
        skills: toArrayValue([]),
        driverLicenses: toArrayValue([]),
        isSignatureApproved: toBooleanValue(true),
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
    {
      id: TEST_PERSONNEL_IDS.leader,
      fields: {
        userId: toStringValue(userUIDs.leader),
        unitId: toStringValue(TEST_UNIT_IDS.company),
        battalionId: toStringValue(TEST_UNIT_IDS.battalion),
        serviceNumber: toStringValue('E2E-LEADER-002'),
        rank: toStringValue('CPT'),
        firstName: toStringValue('Test'),
        lastName: toStringValue('Leader'),
        dutyPosition: toStringValue('Company Commander'),
        phone: toStringValue('+1-555-0102'),
        email: toStringValue('test-leader@e2e.local'),
        localAddress: { nullValue: null },
        profileImage: { nullValue: null },
        locationStatus: toStringValue('home'),
        readinessStatus: toStringValue('ready'),
        skills: toArrayValue([]),
        driverLicenses: toArrayValue([]),
        isSignatureApproved: toBooleanValue(true),
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
    {
      id: TEST_PERSONNEL_IDS.user,
      fields: {
        userId: toStringValue(userUIDs.user),
        unitId: toStringValue(TEST_UNIT_IDS.platoon),
        battalionId: toStringValue(TEST_UNIT_IDS.battalion),
        serviceNumber: toStringValue('E2E-USER-003'),
        rank: toStringValue('SGT'),
        firstName: toStringValue('Test'),
        lastName: toStringValue('User'),
        dutyPosition: toStringValue('Squad Leader'),
        phone: toStringValue('+1-555-0103'),
        email: toStringValue('test-user@e2e.local'),
        localAddress: { nullValue: null },
        profileImage: { nullValue: null },
        locationStatus: toStringValue('home'),
        readinessStatus: toStringValue('ready'),
        skills: toArrayValue([]),
        driverLicenses: toArrayValue([]),
        isSignatureApproved: toBooleanValue(true),
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
  ];

  for (const p of personnel) {
    await createFirestoreDoc('personnel', p.id, p.fields);
    console.log(`   Created personnel: ${p.fields.firstName.stringValue} ${p.fields.lastName.stringValue}`);
  }
}

async function seedSignupRequests() {
  console.log('5. Seeding signupRequests collection...');
  await clearFirestoreCollection('signupRequests');

  const requests = [
    {
      id: 'sr-admin',
      fields: {
        userId: toStringValue(userUIDs.admin),
        fullName: toStringValue('Test Admin'),
        email: toStringValue('test-admin@e2e.local'),
        phone: toStringValue('+1-555-0101'),
        serviceNumber: toStringValue('E2E-ADMIN-001'),
        requestedUnitId: toStringValue(TEST_UNIT_IDS.battalion),
        status: toStringValue('approved'),
        reviewedBy: toStringValue(userUIDs.admin),
        reviewedAt: toTimestampValue(),
        declineReason: { nullValue: null },
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
    {
      id: 'sr-leader',
      fields: {
        userId: toStringValue(userUIDs.leader),
        fullName: toStringValue('Test Leader'),
        email: toStringValue('test-leader@e2e.local'),
        phone: toStringValue('+1-555-0102'),
        serviceNumber: toStringValue('E2E-LEADER-002'),
        requestedUnitId: toStringValue(TEST_UNIT_IDS.company),
        status: toStringValue('approved'),
        reviewedBy: toStringValue(userUIDs.admin),
        reviewedAt: toTimestampValue(),
        declineReason: { nullValue: null },
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
    {
      id: 'sr-user',
      fields: {
        userId: toStringValue(userUIDs.user),
        fullName: toStringValue('Test User'),
        email: toStringValue('test-user@e2e.local'),
        phone: toStringValue('+1-555-0103'),
        serviceNumber: toStringValue('E2E-USER-003'),
        requestedUnitId: toStringValue(TEST_UNIT_IDS.platoon),
        status: toStringValue('approved'),
        reviewedBy: toStringValue(userUIDs.admin),
        reviewedAt: toTimestampValue(),
        declineReason: { nullValue: null },
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
    {
      id: 'sr-pending',
      fields: {
        userId: toStringValue(userUIDs.pending),
        fullName: toStringValue('Test Pending User'),
        email: toStringValue('test-pending@e2e.local'),
        phone: toStringValue('+1-555-0105'),
        serviceNumber: toStringValue('E2E-PENDING-005'),
        requestedUnitId: toStringValue(TEST_UNIT_IDS.platoon),
        status: toStringValue('pending'),
        reviewedBy: { nullValue: null },
        reviewedAt: { nullValue: null },
        declineReason: { nullValue: null },
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
    {
      id: 'sr-declined',
      fields: {
        userId: toStringValue(userUIDs.declined),
        fullName: toStringValue('Test Declined User'),
        email: toStringValue('test-declined@e2e.local'),
        phone: toStringValue('+1-555-0106'),
        serviceNumber: toStringValue('E2E-DECLINED-006'),
        requestedUnitId: toStringValue(TEST_UNIT_IDS.platoon),
        status: toStringValue('declined'),
        reviewedBy: toStringValue(userUIDs.admin),
        reviewedAt: toTimestampValue(),
        declineReason: toStringValue('Test decline reason for E2E testing'),
        createdAt: toTimestampValue(),
        updatedAt: toTimestampValue(),
      },
    },
  ];

  for (const req of requests) {
    await createFirestoreDoc('signupRequests', req.id, req.fields);
    console.log(`   Created signup request: ${req.fields.fullName.stringValue} (${req.fields.status.stringValue})`);
  }
}

async function seedAdminUnitAssignments() {
  console.log('6. Seeding adminUnitAssignments collection...');
  await clearFirestoreCollection('adminUnitAssignments');

  const assignments = [
    {
      id: 'admin-bn-assignment',
      fields: {
        userId: toStringValue(userUIDs.admin),
        unitId: toStringValue(TEST_UNIT_IDS.battalion),
        unitType: toStringValue('battalion'),
        createdAt: toTimestampValue(),
      },
    },
    {
      id: 'leader-co-assignment',
      fields: {
        userId: toStringValue(userUIDs.leader),
        unitId: toStringValue(TEST_UNIT_IDS.company),
        unitType: toStringValue('company'),
        createdAt: toTimestampValue(),
      },
    },
  ];

  for (const a of assignments) {
    await createFirestoreDoc('adminUnitAssignments', a.id, a.fields);
    console.log(`   Created assignment: ${a.id}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding emulators (auth: ${AUTH_HOST}, firestore: ${FIRESTORE_HOST})...\n`);

  await seedAuthUsers();
  console.log('');
  await seedUsers();
  console.log('');
  await seedUnits();
  console.log('');
  await seedPersonnel();
  console.log('');
  await seedSignupRequests();
  console.log('');
  await seedAdminUnitAssignments();

  console.log('\nAll test data seeded successfully!');
  console.log(`\nPassword for all users: ${TEST_PASSWORD}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
