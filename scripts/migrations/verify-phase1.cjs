/**
 * Verify Phase 1 Migration
 *
 * Checks that all fields were added correctly.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const project = process.env.FIREBASE_PROJECT || 'duty-staging';

let serviceAccount;
if (project === 'duty-staging') {
  serviceAccount = require(path.join(__dirname, '..', '..', 'firebase-staging-service-account.json'));
} else if (project === 'duty-82f42') {
  serviceAccount = require(path.join(__dirname, '..', '..', 'firebase-service-account.json'));
} else {
  console.error('❌ Unknown project:', project);
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function verifyPhase1() {
  console.log('🔍 Verifying Phase 1 Migration');
  console.log(`📦 Project: ${project}\n`);

  let allGood = true;

  // Check equipmentAssignments
  console.log('📋 Checking equipmentAssignments...');
  const assignments = await db.collection('equipmentAssignments').limit(10).get();

  if (assignments.empty) {
    console.log('   ⚠️  No assignments found');
  } else {
    console.log(`   Found ${assignments.size} assignments (showing first 10)`);

    let missingBattalionId = 0;
    let missingIsReturned = 0;

    assignments.forEach(doc => {
      const data = doc.data();
      if (!data.battalionId) {
        missingBattalionId++;
        allGood = false;
      }
      if (!data.hasOwnProperty('isReturned')) {
        missingIsReturned++;
        allGood = false;
      }

      // Show sample
      if (doc === assignments.docs[0]) {
        console.log(`   Sample assignment ${doc.id}:`);
        console.log(`      battalionId: ${data.battalionId || 'MISSING ❌'}`);
        console.log(`      isReturned: ${data.isReturned !== undefined ? data.isReturned : 'MISSING ❌'}`);
        console.log(`      equipmentId: ${data.equipmentId}`);
        console.log(`      unitId: ${data.unitId || 'null'}`);
        console.log(`      personnelId: ${data.personnelId || 'null'}`);
      }
    });

    if (missingBattalionId > 0) {
      console.log(`   ❌ ${missingBattalionId} assignments missing battalionId`);
    } else {
      console.log(`   ✅ All assignments have battalionId`);
    }

    if (missingIsReturned > 0) {
      console.log(`   ❌ ${missingIsReturned} assignments missing isReturned`);
    } else {
      console.log(`   ✅ All assignments have isReturned`);
    }
  }

  // Check assignmentRequests
  console.log('\n📋 Checking assignmentRequests...');
  const requests = await db.collection('assignmentRequests').limit(10).get();

  if (requests.empty) {
    console.log('   ℹ️  No requests found (this is normal for new staging environment)');
  } else {
    console.log(`   Found ${requests.size} requests (showing first 10)`);

    let missingBattalionId = 0;

    requests.forEach(doc => {
      const data = doc.data();
      if (!data.battalionId) {
        missingBattalionId++;
        allGood = false;
      }

      // Show sample
      if (doc === requests.docs[0]) {
        console.log(`   Sample request ${doc.id}:`);
        console.log(`      battalionId: ${data.battalionId || 'MISSING ❌'}`);
        console.log(`      status: ${data.status}`);
        console.log(`      equipmentId: ${data.equipmentId}`);
      }
    });

    if (missingBattalionId > 0) {
      console.log(`   ❌ ${missingBattalionId} requests missing battalionId`);
    } else {
      console.log(`   ✅ All requests have battalionId`);
    }
  }

  // Check equipment (should have battalionId already)
  console.log('\n📋 Checking equipment...');
  const equipment = await db.collection('equipment').limit(5).get();

  if (equipment.empty) {
    console.log('   ⚠️  No equipment found');
    allGood = false;
  } else {
    console.log(`   Found ${equipment.size} equipment items (showing first 5)`);

    let missingBattalionId = 0;

    equipment.forEach(doc => {
      const data = doc.data();
      if (!data.battalionId) {
        missingBattalionId++;
        allGood = false;
      }

      // Show sample
      if (doc === equipment.docs[0]) {
        console.log(`   Sample equipment ${doc.id}:`);
        console.log(`      name: ${data.name}`);
        console.log(`      battalionId: ${data.battalionId || 'MISSING ❌'}`);
        console.log(`      status: ${data.status}`);
      }
    });

    if (missingBattalionId > 0) {
      console.log(`   ❌ ${missingBattalionId} equipment missing battalionId`);
    } else {
      console.log(`   ✅ All equipment have battalionId`);
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allGood) {
    console.log('✅ Phase 1 verification PASSED - All data looks good!');
  } else {
    console.log('❌ Phase 1 verification FAILED - Some data is missing required fields');
    process.exit(1);
  }

  process.exit(0);
}

verifyPhase1();
