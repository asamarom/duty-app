/**
 * Firestore Security Rules Tests
 *
 * Tests the 18 security fixes applied to firestore.rules.
 * Requires a Firestore emulator running on port 8085.
 *
 * Run via:  npm run test:rules
 * CI:       run-rules-tests job in .github/workflows/ci.yml
 */
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { setDoc, doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';

// ── Constants ────────────────────────────────────────────────────────────────

const PROJECT_ID = 'duty-82f42';
const FIRESTORE_PORT = 8085;

const UIDs = {
  admin: 'uid-admin-001',
  leader: 'uid-leader-001',
  user: 'uid-user-001',
  userB: 'uid-user-battalion-b',
  newUser: 'uid-new-user',
} as const;

const BATTALION_A = 'battalion-001';
const BATTALION_B = 'battalion-002';

// ── Test Environment ──────────────────────────────────────────────────────────

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      host: 'localhost',
      port: FIRESTORE_PORT,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed test users and data (bypass rules for setup)
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // Users
    await setDoc(doc(db, 'users', UIDs.admin), {
      fullName: 'Admin User', email: 'admin@test.com',
      unitId: BATTALION_A, roles: { admin: true },
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });
    await setDoc(doc(db, 'users', UIDs.leader), {
      fullName: 'Leader User', email: 'leader@test.com',
      unitId: BATTALION_A, roles: { leader: true },
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });
    await setDoc(doc(db, 'users', UIDs.user), {
      fullName: 'Regular User', email: 'user@test.com',
      unitId: BATTALION_A, roles: { user: true },
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });
    await setDoc(doc(db, 'users', UIDs.userB), {
      fullName: 'User in Battalion B', email: 'userb@test.com',
      unitId: BATTALION_B, roles: { user: true },
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });
    // UIDs.newUser intentionally has no user doc (not yet registered)

    // Personnel records
    await setDoc(doc(db, 'personnel', 'personnel-a-001'), {
      firstName: 'John', lastName: 'Doe', serviceNumber: 'SN001',
      rank: 'Private', locationStatus: 'home', readinessStatus: 'ready',
      battalionId: BATTALION_A, createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });
    await setDoc(doc(db, 'personnel', 'personnel-b-001'), {
      firstName: 'Jane', lastName: 'Smith', serviceNumber: 'SN002',
      rank: 'Corporal', locationStatus: 'home', readinessStatus: 'ready',
      battalionId: BATTALION_B, createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });

    // Equipment in battalion A
    await setDoc(doc(db, 'equipment', 'equip-a-001'), {
      name: 'Radio', quantity: 5, status: 'serviceable',
      battalionId: BATTALION_A, createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });
    await setDoc(doc(db, 'equipment', 'equip-b-001'), {
      name: 'Vehicle', quantity: 2, status: 'serviceable',
      battalionId: BATTALION_B, createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });

    // Signup requests
    await setDoc(doc(db, 'signupRequests', 'req-001'), {
      userId: UIDs.newUser, fullName: 'New User', email: 'new@test.com',
      serviceNumber: 'SN003', status: 'pending', createdAt: '2024-01-01',
    });
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Unauthenticated Access', () => {
  it('denies read on users collection', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'users', UIDs.admin)));
  });

  it('denies read on personnel collection', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'personnel', 'personnel-a-001')));
  });

  it('denies read on equipment collection', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'equipment', 'equip-a-001')));
  });

  it('denies write to any collection', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users', 'hacker-id'), { fullName: 'Hacker' })
    );
  });
});

describe('Users Collection', () => {
  it('allows a user to read their own document', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'users', UIDs.user)));
  });

  it('denies a user from reading another user\'s document', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(getDoc(doc(ctx.firestore(), 'users', UIDs.admin)));
  });

  it('allows admin to read any user document', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'users', UIDs.user)));
  });

  it('[CRITICAL] prevents self-assigning admin role on user create', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.newUser);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users', UIDs.newUser), {
        fullName: 'New User', email: 'new@test.com',
        roles: { admin: true }, // <-- MUST be denied
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('allows user to create their own doc without roles field', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.newUser);
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'users', UIDs.newUser), {
        fullName: 'New User', email: 'new@test.com',
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('[CRITICAL] prevents a user from updating their own roles field', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'users', UIDs.user), {
        roles: { admin: true }, // <-- MUST be denied
      })
    );
  });

  it('allows a user to update their own fullName', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'users', UIDs.user), {
        fullName: 'Updated Name', updatedAt: '2024-01-02',
      })
    );
  });

  it('denies user from creating a doc for a different user', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users', UIDs.leader), {
        fullName: 'Impersonated', email: 'bad@test.com',
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });
});

describe('Battalion-Based Access Control', () => {
  it('[CRITICAL] denies user from Battalion A reading Battalion B personnel', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      getDoc(doc(ctx.firestore(), 'personnel', 'personnel-b-001'))
    );
  });

  it('[CRITICAL] denies user from Battalion A reading Battalion B equipment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      getDoc(doc(ctx.firestore(), 'equipment', 'equip-b-001'))
    );
  });

  it('allows user to read personnel in their own battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'personnel', 'personnel-a-001'))
    );
  });

  it('allows user to read equipment in their own battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'equipment', 'equip-a-001'))
    );
  });

  it('allows admin to read personnel from any battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'personnel', 'personnel-b-001'))
    );
  });
});

describe('Personnel Collection', () => {
  it('[CRITICAL] prevents leader from modifying isSignatureApproved', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'personnel', 'personnel-a-001'), {
        isSignatureApproved: true, // <-- only admins can set this
      })
    );
  });

  it('allows admin to modify isSignatureApproved', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'personnel', 'personnel-a-001'), {
        isSignatureApproved: true,
      })
    );
  });

  it('validates required fields on personnel create', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    // Missing required 'serviceNumber'
    await assertFails(
      addDoc(collection(ctx.firestore(), 'personnel'), {
        firstName: 'John', lastName: 'Doe',
        rank: 'Private', locationStatus: 'home', readinessStatus: 'ready',
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('rejects invalid locationStatus enum values', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'personnel'), {
        firstName: 'Test', lastName: 'Person', serviceNumber: 'SN999',
        rank: 'Private', locationStatus: 'invalid_status', // <-- bad value
        readinessStatus: 'ready', createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });
});

describe('Equipment Collection', () => {
  it('rejects equipment with zero quantity', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipment'), {
        name: 'Empty Stock', quantity: 0, // <-- must be > 0
        status: 'serviceable', createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('rejects equipment with negative quantity', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipment'), {
        name: 'Negative Stock', quantity: -5,
        status: 'serviceable', createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('rejects invalid equipment status', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipment'), {
        name: 'Test Equipment', quantity: 3,
        status: 'broken', // <-- not a valid status
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('allows valid equipment creation by admin', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      addDoc(collection(ctx.firestore(), 'equipment'), {
        name: 'Valid Equipment', quantity: 3,
        status: 'serviceable', createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('denies regular user from creating equipment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipment'), {
        name: 'Unauthorized Equipment', quantity: 1,
        status: 'serviceable', createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });
});

describe('Signup Requests', () => {
  it('[CRITICAL] prevents creating signup request with pre-approved status', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.newUser);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'signupRequests', 'req-hack'), {
        userId: UIDs.newUser, fullName: 'Hacker', email: 'hack@test.com',
        serviceNumber: 'SN-HACK',
        status: 'approved', // <-- MUST be denied, only 'pending' allowed
        createdAt: '2024-01-01',
      })
    );
  });

  it('allows creating signup request with pending status', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.newUser);
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'signupRequests', 'req-new'), {
        userId: UIDs.newUser, fullName: 'New User', email: 'new@test.com',
        serviceNumber: 'SN-NEW', status: 'pending', createdAt: '2024-01-01',
      })
    );
  });

  it('[CRITICAL] prevents non-admin from approving signup requests', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'signupRequests', 'req-001'), {
        status: 'approved', // <-- only admins can do this
      })
    );
  });

  it('allows admin to approve signup requests', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'signupRequests', 'req-001'), {
        status: 'approved',
      })
    );
  });

  it('prevents creating signup request for a different user', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.newUser);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'signupRequests', 'req-spoof'), {
        userId: UIDs.admin, // <-- must match auth.uid
        fullName: 'Spoofed', email: 'spoof@test.com',
        serviceNumber: 'SN-SPOOF', status: 'pending', createdAt: '2024-01-01',
      })
    );
  });
});

describe('Assignment Requests', () => {
  it('[HIGH] prevents requestedBy from being spoofed', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'assignmentRequests'), {
        equipmentId: 'equip-a-001',
        status: 'pending',
        requestedAt: '2024-01-01',
        requestedBy: UIDs.admin, // <-- must equal auth.uid (UIDs.user)
      })
    );
  });

  it('allows creating assignment request with correct requestedBy', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertSucceeds(
      addDoc(collection(ctx.firestore(), 'assignmentRequests'), {
        equipmentId: 'equip-a-001',
        status: 'pending',
        requestedAt: '2024-01-01',
        requestedBy: UIDs.user, // <-- matches auth.uid
      })
    );
  });

  it('[CRITICAL] prevents creating request with pre-approved status', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'assignmentRequests'), {
        equipmentId: 'equip-a-001',
        status: 'approved', // <-- must be 'pending' on create
        requestedAt: '2024-01-01',
        requestedBy: UIDs.user,
      })
    );
  });
});
