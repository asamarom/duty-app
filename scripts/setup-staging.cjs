#!/usr/bin/env node

/**
 * Setup script for duty-staging Firebase project
 *
 * This script:
 * 1. Initializes Firestore database
 * 2. Deploys security rules
 * 3. Seeds test data (units, test users, equipment)
 *
 * Run with: node scripts/setup-staging.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Staging Firebase config
const STAGING_PROJECT_ID = 'duty-staging';

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   Duty App - Staging Environment Setup                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function main() {
  try {
    // Initialize Firebase Admin with staging project
    console.log('📦 Initializing Firebase Admin SDK for staging...');

    // Check if we're already initialized
    if (!admin.apps.length) {
      // Try to use service account key if it exists
      const serviceAccountPath = path.join(__dirname, '..', 'service-account-staging.json');

      if (fs.existsSync(serviceAccountPath)) {
        console.log('   Using service account key...');
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: STAGING_PROJECT_ID,
        });
      } else {
        console.log('   Using application default credentials...');
        console.log('   (Run "gcloud auth application-default login" if this fails)');
        admin.initializeApp({
          projectId: STAGING_PROJECT_ID,
        });
      }
    }

    const db = admin.firestore();

    console.log('✓ Connected to Firestore\n');

    // Step 1: Create test units
    console.log('📝 Step 1: Creating unit hierarchy...');
    await seedUnits(db);
    console.log('✓ Units created\n');

    // Step 2: Create test users
    console.log('👥 Step 2: Creating test users...');
    await seedUsers(db);
    console.log('✓ Test users created\n');

    // Step 3: Create sample equipment
    console.log('📦 Step 3: Creating sample equipment...');
    await seedEquipment(db);
    console.log('✓ Sample equipment created\n');

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   ✅ Staging environment setup complete!              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('Next steps:');
    console.log('1. Deploy security rules: npm run deploy:rules:staging');
    console.log('2. Configure Vercel environment variables');
    console.log('3. Deploy to preview: git push\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up staging environment:', error);
    process.exit(1);
  }
}

async function seedUnits(db) {
  const units = [
    {
      id: 'battalion-1',
      name: 'Test Battalion',
      type: 'battalion',
      parentId: null,
      level: 1
    },
    {
      id: 'company-1',
      name: 'Alpha Company',
      type: 'company',
      parentId: 'battalion-1',
      level: 2
    },
    {
      id: 'company-2',
      name: 'Bravo Company',
      type: 'company',
      parentId: 'battalion-1',
      level: 2
    },
    {
      id: 'platoon-1',
      name: '1st Platoon',
      type: 'platoon',
      parentId: 'company-1',
      level: 3
    },
    {
      id: 'platoon-2',
      name: '2nd Platoon',
      type: 'platoon',
      parentId: 'company-1',
      level: 3
    },
    {
      id: 'platoon-3',
      name: '3rd Platoon',
      type: 'platoon',
      parentId: 'company-2',
      level: 3
    }
  ];

  for (const unit of units) {
    await db.collection('units').doc(unit.id).set(unit);
    console.log(`  ✓ Created ${unit.type}: ${unit.name}`);
  }
}

async function seedUsers(db) {
  const TEST_PASSWORD = 'TestPassword123!';

  // UIDs must match those in src/lib/testAuth.ts
  const users = [
    {
      uid: '00000000-0000-0000-0000-000000000001',
      email: 'test-admin@e2e.local',
      serviceNumber: 'ADM-001',
      firstName: 'Test',
      lastName: 'Admin',
      rank: 'Major',
      dutyPosition: 'Battalion Commander',
      cellPhone: '+972-50-1234567',
      battalion: 'battalion-1',
      company: null,
      platoon: null,
      signatureApproved: true
    },
    {
      uid: '00000000-0000-0000-0000-000000000002',
      email: 'test-leader@e2e.local',
      serviceNumber: 'LDR-001',
      firstName: 'Test',
      lastName: 'Leader',
      rank: 'Captain',
      dutyPosition: 'Company Commander',
      cellPhone: '+972-50-2345678',
      battalion: 'battalion-1',
      company: 'company-1',
      platoon: null,
      signatureApproved: true
    },
    {
      uid: '00000000-0000-0000-0000-000000000003',
      email: 'test-user@e2e.local',
      serviceNumber: 'USR-001',
      firstName: 'Test',
      lastName: 'User',
      rank: 'Sergeant',
      dutyPosition: 'Team Leader',
      cellPhone: '+972-50-3456789',
      battalion: 'battalion-1',
      company: 'company-1',
      platoon: 'platoon-1',
      signatureApproved: false
    }
  ];

  const roles = [
    { uid: '00000000-0000-0000-0000-000000000001', role: 'admin' },
    { uid: '00000000-0000-0000-0000-000000000002', role: 'leader' },
    { uid: '00000000-0000-0000-0000-000000000003', role: 'user' }
  ];

  // Create Firebase Auth users
  for (const user of users) {
    try {
      await admin.auth().createUser({
        uid: user.uid,
        email: user.email,
        password: TEST_PASSWORD,
        displayName: `${user.firstName} ${user.lastName}`,
        emailVerified: true
      });
      console.log(`  ✓ Created auth user: ${user.email}`);
    } catch (error) {
      if (error.code === 'auth/uid-already-exists') {
        console.log(`  ℹ️  Auth user already exists: ${user.email}`);
      } else {
        throw error;
      }
    }
  }

  // Create personnel records
  for (const user of users) {
    const { uid, ...personnelData } = user;
    await db.collection('personnel').doc(uid).set(personnelData);
    console.log(`  ✓ Created personnel: ${user.email}`);
  }

  // Create user_roles
  for (const roleData of roles) {
    await db.collection('user_roles').doc(roleData.uid).set(roleData);
    console.log(`  ✓ Assigned role ${roleData.role} to ${roleData.uid.split('-')[1]}`);
  }

  // Create approved signup requests for test users
  for (const user of users) {
    await db.collection('signupRequests').add({
      userId: user.uid,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.cellPhone,
      serviceNumber: user.serviceNumber,
      requestedUnitId: user.battalion,
      status: 'approved',
      declineReason: null,
      reviewedBy: 'system',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ Created approved signup request for ${user.email}`);
  }
}

async function seedEquipment(db) {
  const equipment = [
    {
      name: 'M4 Carbine',
      description: 'Serialized rifle for E2E testing',
      serialNumber: 'E2E-SN-001',
      category: 'weapons',
      quantity: 1,
      assignedTo: 'test-user-uid',
      assignedToType: 'personnel',
      assignmentStatus: 'active',
      battalion: 'battalion-1',
      company: 'company-1',
      platoon: 'platoon-1'
    },
    {
      name: 'Radio Set',
      description: 'Bulk radio sets for E2E testing',
      serialNumber: null,
      category: 'communications',
      quantity: 5,
      assignedTo: 'company-1',
      assignedToType: 'unit',
      assignmentStatus: 'active',
      battalion: 'battalion-1',
      company: 'company-1',
      platoon: null
    },
    {
      name: 'First Aid Kit',
      description: 'Medical supplies',
      serialNumber: null,
      category: 'medical',
      quantity: 10,
      assignedTo: 'battalion-1',
      assignedToType: 'unit',
      assignmentStatus: 'active',
      battalion: 'battalion-1',
      company: null,
      platoon: null
    }
  ];

  for (const item of equipment) {
    const docRef = await db.collection('equipment').add({
      ...item,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✓ Created equipment: ${item.name} (${docRef.id})`);
  }
}

// Run the script
main();
