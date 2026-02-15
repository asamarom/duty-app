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
import { setDoc, doc, getDoc, updateDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';

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

    // Users — roles MUST be arrays because hasRole() uses `role in array`
    await setDoc(doc(db, 'users', UIDs.admin), {
      fullName: 'Admin User', email: 'admin@test.com',
      unitId: BATTALION_A, roles: ['admin'],
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });
    await setDoc(doc(db, 'users', UIDs.leader), {
      fullName: 'Leader User', email: 'leader@test.com',
      unitId: BATTALION_A, roles: ['leader'],
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });
    await setDoc(doc(db, 'users', UIDs.user), {
      fullName: 'Regular User', email: 'user@test.com',
      unitId: BATTALION_A, roles: ['user'],
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });
    await setDoc(doc(db, 'users', UIDs.userB), {
      fullName: 'User in Battalion B', email: 'userb@test.com',
      unitId: BATTALION_B, roles: ['user'],
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

    // Units
    await setDoc(doc(db, 'units', 'unit-a-001'), {
      name: 'Alpha Battalion', unitType: 'battalion', status: 'active',
      battalionId: BATTALION_A, parentId: null,
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    });

    // Equipment assignments
    await setDoc(doc(db, 'equipmentAssignments', 'assign-a-001'), {
      equipmentId: 'equip-a-001', unitId: 'unit-a-001', quantity: 2,
      assignedAt: '2024-01-01', returnedAt: null, battalionId: BATTALION_A,
    });
    await setDoc(doc(db, 'equipmentAssignments', 'assign-b-001'), {
      equipmentId: 'equip-b-001', unitId: 'unit-b-001', quantity: 1,
      assignedAt: '2024-01-01', returnedAt: null, battalionId: BATTALION_B,
    });
    // Assignment with returnedAt already set (for immutability tests)
    await setDoc(doc(db, 'equipmentAssignments', 'assign-returned-001'), {
      equipmentId: 'equip-a-001', unitId: 'unit-a-001', quantity: 1,
      assignedAt: '2024-01-01', returnedAt: '2024-06-01', battalionId: BATTALION_A,
    });

    // Assignment requests
    await setDoc(doc(db, 'assignmentRequests', 'areq-a-001'), {
      equipmentId: 'equip-a-001', status: 'pending',
      requestedAt: '2024-01-01', requestedBy: UIDs.user,
      battalionId: BATTALION_A,
    });
    await setDoc(doc(db, 'assignmentRequests', 'areq-approved-001'), {
      equipmentId: 'equip-a-001', status: 'approved',
      requestedAt: '2024-01-01', requestedBy: UIDs.user,
      battalionId: BATTALION_A,
    });
    // Assignment request in battalion B
    await setDoc(doc(db, 'assignmentRequests', 'areq-b-001'), {
      equipmentId: 'equip-b-001', status: 'pending',
      requestedAt: '2024-01-01', requestedBy: UIDs.userB,
      battalionId: BATTALION_B,
    });

    // Admin unit assignments
    await setDoc(doc(db, 'adminUnitAssignments', UIDs.leader + '_unit-a-001'), {
      userId: UIDs.leader, unitId: 'unit-a-001', createdAt: '2024-01-01',
    });
    await setDoc(doc(db, 'adminUnitAssignments', 'uid-other-leader_unit-b-001'), {
      userId: 'uid-other-leader', unitId: 'unit-b-001', createdAt: '2024-01-01',
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

// ── NEW TEST GROUPS ───────────────────────────────────────────────────────────

describe('Units Collection', () => {
  it('unauthenticated cannot read units', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'units', 'unit-a-001')));
  });

  it('any authenticated user can read units (even without roles)', async () => {
    // UIDs.newUser has no user doc at all, but is authenticated
    const ctx = testEnv.authenticatedContext(UIDs.newUser);
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'units', 'unit-a-001')));
  });

  it('admin can create valid unit', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'units', 'unit-new-001'), {
        name: 'Bravo Company', unitType: 'company', status: 'active',
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('leader cannot create unit', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'units', 'unit-new-leader'), {
        name: 'Leader Unit', unitType: 'platoon', status: 'active',
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('user cannot create unit', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'units', 'unit-new-user'), {
        name: 'User Unit', unitType: 'platoon', status: 'active',
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('invalid unitType is rejected', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'units', 'unit-bad-type'), {
        name: 'Bad Type Unit', unitType: 'squad', // <-- not a valid type
        status: 'active', createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('invalid status is rejected', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'units', 'unit-bad-status'), {
        name: 'Bad Status Unit', unitType: 'battalion',
        status: 'disbanded', // <-- not a valid status
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('missing required fields are rejected', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    // Missing 'status' and timestamps
    await assertFails(
      setDoc(doc(ctx.firestore(), 'units', 'unit-missing-fields'), {
        name: 'Incomplete Unit', unitType: 'battalion',
      })
    );
  });

  it('admin can update unit', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'units', 'unit-a-001'), {
        status: 'inactive', unitType: 'battalion', updatedAt: '2024-06-01',
      })
    );
  });

  it('leader cannot update unit', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'units', 'unit-a-001'), {
        status: 'inactive', unitType: 'battalion', updatedAt: '2024-06-01',
      })
    );
  });

  it('admin cannot set parentId equal to own unitId (circular reference)', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    // The doc ID is 'unit-a-001' and we try to set parentId to the same value
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'units', 'unit-a-001'), {
        parentId: 'unit-a-001', // <-- circular: parentId == unitId
        unitType: 'battalion', status: 'active', updatedAt: '2024-06-01',
      })
    );
  });

  it('admin can delete unit', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'units', 'unit-a-001')));
  });

  it('leader cannot delete unit', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertFails(deleteDoc(doc(ctx.firestore(), 'units', 'unit-a-001')));
  });
});

describe('Equipment — Leader Access', () => {
  it('leader can create equipment in same battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertSucceeds(
      addDoc(collection(ctx.firestore(), 'equipment'), {
        name: 'Leader Radio', quantity: 3,
        status: 'serviceable', battalionId: BATTALION_A,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('leader cannot create equipment in different battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipment'), {
        name: 'Cross-Battalion Equipment', quantity: 1,
        status: 'serviceable', battalionId: BATTALION_B, // <-- leader is in BATTALION_A
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('equipment with status "available" is rejected (not a valid status)', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipment'), {
        name: 'Available Equipment', quantity: 1,
        status: 'available', // <-- not in the allowed set
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      })
    );
  });

  it('equipment missing updatedAt is rejected', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipment'), {
        name: 'No Timestamp', quantity: 2,
        status: 'serviceable', createdAt: '2024-01-01',
        // updatedAt intentionally omitted
      })
    );
  });

  it('leader can update equipment in own battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'equipment', 'equip-a-001'), {
        quantity: 10, updatedAt: '2024-06-01',
      })
    );
  });

  it('leader cannot update equipment in other battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'equipment', 'equip-b-001'), {
        quantity: 10, updatedAt: '2024-06-01',
      })
    );
  });

  it('admin can delete equipment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'equipment', 'equip-a-001')));
  });

  it('leader cannot delete equipment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertFails(deleteDoc(doc(ctx.firestore(), 'equipment', 'equip-a-001')));
  });

  it('user cannot delete equipment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(deleteDoc(doc(ctx.firestore(), 'equipment', 'equip-a-001')));
  });
});

describe('Equipment Assignments', () => {
  it('admin can create assignment with unitId', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      addDoc(collection(ctx.firestore(), 'equipmentAssignments'), {
        equipmentId: 'equip-a-001', unitId: 'unit-a-001',
        quantity: 1, assignedAt: '2024-01-01',
      })
    );
  });

  it('admin can create assignment with personnelId', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      addDoc(collection(ctx.firestore(), 'equipmentAssignments'), {
        equipmentId: 'equip-a-001', personnelId: 'personnel-a-001',
        quantity: 1, assignedAt: '2024-01-01',
      })
    );
  });

  it('leader can create assignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertSucceeds(
      addDoc(collection(ctx.firestore(), 'equipmentAssignments'), {
        equipmentId: 'equip-a-001', unitId: 'unit-a-001',
        quantity: 1, assignedAt: '2024-01-01', battalionId: BATTALION_A,
      })
    );
  });

  it('user cannot create assignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipmentAssignments'), {
        equipmentId: 'equip-a-001', unitId: 'unit-a-001',
        quantity: 1, assignedAt: '2024-01-01',
      })
    );
  });

  it('zero quantity is rejected', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipmentAssignments'), {
        equipmentId: 'equip-a-001', unitId: 'unit-a-001',
        quantity: 0, // <-- must be > 0
        assignedAt: '2024-01-01',
      })
    );
  });

  it('negative quantity is rejected', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipmentAssignments'), {
        equipmentId: 'equip-a-001', unitId: 'unit-a-001',
        quantity: -3, // <-- must be > 0
        assignedAt: '2024-01-01',
      })
    );
  });

  it('create without personnelId AND without unitId is rejected', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertFails(
      addDoc(collection(ctx.firestore(), 'equipmentAssignments'), {
        equipmentId: 'equip-a-001',
        quantity: 1, assignedAt: '2024-01-01',
        // neither personnelId nor unitId provided
      })
    );
  });

  it('admin can update assignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'equipmentAssignments', 'assign-a-001'), {
        quantity: 3,
      })
    );
  });

  it('leader can update assignment in own battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'equipmentAssignments', 'assign-a-001'), {
        quantity: 3,
      })
    );
  });

  it('leader cannot update assignment in other battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'equipmentAssignments', 'assign-b-001'), {
        quantity: 3,
      })
    );
  });

  it('returnedAt can be set on update', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'equipmentAssignments', 'assign-a-001'), {
        returnedAt: '2024-06-01',
      })
    );
  });

  it('returnedAt cannot be unset once set (must not go back to null)', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    // 'assign-returned-001' already has returnedAt: '2024-06-01'
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'equipmentAssignments', 'assign-returned-001'), {
        returnedAt: null, // <-- cannot unset a set returnedAt
      })
    );
  });

  it('admin can delete assignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      deleteDoc(doc(ctx.firestore(), 'equipmentAssignments', 'assign-a-001'))
    );
  });

  it('leader can delete assignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertSucceeds(
      deleteDoc(doc(ctx.firestore(), 'equipmentAssignments', 'assign-a-001'))
    );
  });

  it('user cannot delete assignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      deleteDoc(doc(ctx.firestore(), 'equipmentAssignments', 'assign-a-001'))
    );
  });

  it('user cannot read assignment from other battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user); // UIDs.user is in BATTALION_A
    await assertFails(
      getDoc(doc(ctx.firestore(), 'equipmentAssignments', 'assign-b-001'))
    );
  });

  it('admin can read assignment from any battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'equipmentAssignments', 'assign-b-001'))
    );
  });
});

describe('Assignment Requests — extended', () => {
  it('admin can read requests from any battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'assignmentRequests', 'areq-b-001'))
    );
  });

  it('user can read requests from own battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user); // UIDs.user is in BATTALION_A
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'assignmentRequests', 'areq-a-001'))
    );
  });

  it('user cannot read requests from other battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user); // UIDs.user is in BATTALION_A
    await assertFails(
      getDoc(doc(ctx.firestore(), 'assignmentRequests', 'areq-b-001'))
    );
  });

  it('leader can approve a pending request in own battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader); // UIDs.leader is in BATTALION_A
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'assignmentRequests', 'areq-a-001'), {
        status: 'approved',
      })
    );
  });

  it('leader cannot approve a request in other battalion', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader); // UIDs.leader is in BATTALION_A
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'assignmentRequests', 'areq-b-001'), {
        status: 'approved', // <-- different battalion
      })
    );
  });

  it('cannot update an already-approved request (invalid status transition)', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    // 'areq-approved-001' has status: 'approved', cannot transition from non-pending
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'assignmentRequests', 'areq-approved-001'), {
        status: 'rejected', // <-- source doc is already approved, not pending
      })
    );
  });

  it('admin can delete a request', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      deleteDoc(doc(ctx.firestore(), 'assignmentRequests', 'areq-a-001'))
    );
  });

  it('user cannot delete a request', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      deleteDoc(doc(ctx.firestore(), 'assignmentRequests', 'areq-a-001'))
    );
  });
});

describe('Signup Requests — extended', () => {
  it('user cannot read another user\'s signup request', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    // 'req-001' belongs to UIDs.newUser, not UIDs.user
    await assertFails(
      getDoc(doc(ctx.firestore(), 'signupRequests', 'req-001'))
    );
  });

  it('leader cannot list all signup requests (only own doc is accessible)', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    // 'req-001' belongs to UIDs.newUser, and UIDs.leader is not an admin
    await assertFails(
      getDoc(doc(ctx.firestore(), 'signupRequests', 'req-001'))
    );
  });

  it('admin can delete a signup request', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      deleteDoc(doc(ctx.firestore(), 'signupRequests', 'req-001'))
    );
  });

  it('user cannot delete a signup request', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      deleteDoc(doc(ctx.firestore(), 'signupRequests', 'req-001'))
    );
  });

  it('missing required field serviceNumber is rejected', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.newUser);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'signupRequests', 'req-missing-sn'), {
        userId: UIDs.newUser, fullName: 'New User', email: 'new@test.com',
        // serviceNumber intentionally omitted
        status: 'pending', createdAt: '2024-01-01',
      })
    );
  });

  it('serviceNumber over 50 characters is rejected', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.newUser);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'signupRequests', 'req-long-sn'), {
        userId: UIDs.newUser, fullName: 'New User', email: 'new@test.com',
        serviceNumber: 'SN-' + 'X'.repeat(50), // 53 chars total — exceeds limit of 50
        status: 'pending', createdAt: '2024-01-01',
      })
    );
  });
});

describe('Admin Unit Assignments', () => {
  it('admin can read any adminUnitAssignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'adminUnitAssignments', 'uid-other-leader_unit-b-001'))
    );
  });

  it('leader can read their own adminUnitAssignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    // Doc ID is UIDs.leader + '_unit-a-001', and its userId field equals UIDs.leader
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'adminUnitAssignments', UIDs.leader + '_unit-a-001'))
    );
  });

  it('leader cannot read another leader\'s adminUnitAssignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    // 'uid-other-leader_unit-b-001' has userId: 'uid-other-leader', not UIDs.leader
    await assertFails(
      getDoc(doc(ctx.firestore(), 'adminUnitAssignments', 'uid-other-leader_unit-b-001'))
    );
  });

  it('user cannot read adminUnitAssignments', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.user);
    await assertFails(
      getDoc(doc(ctx.firestore(), 'adminUnitAssignments', UIDs.leader + '_unit-a-001'))
    );
  });

  it('admin can create adminUnitAssignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'adminUnitAssignments', 'uid-leader-001_unit-new'), {
        userId: UIDs.leader, unitId: 'unit-new', createdAt: '2024-01-01',
      })
    );
  });

  it('admin can delete adminUnitAssignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.admin);
    await assertSucceeds(
      deleteDoc(doc(ctx.firestore(), 'adminUnitAssignments', UIDs.leader + '_unit-a-001'))
    );
  });

  it('leader cannot create adminUnitAssignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertFails(
      setDoc(doc(ctx.firestore(), 'adminUnitAssignments', UIDs.leader + '_unit-new'), {
        userId: UIDs.leader, unitId: 'unit-new', createdAt: '2024-01-01',
      })
    );
  });

  it('leader cannot delete adminUnitAssignment', async () => {
    const ctx = testEnv.authenticatedContext(UIDs.leader);
    await assertFails(
      deleteDoc(doc(ctx.firestore(), 'adminUnitAssignments', UIDs.leader + '_unit-a-001'))
    );
  });
});
