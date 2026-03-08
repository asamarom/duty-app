/**
 * Verify Phase 2 Migration
 *
 * Checks that personnel data was correctly merged into users collection.
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

async function verifyPhase2() {
  console.log('🔍 Verifying Phase 2 Migration');
  console.log(`📦 Project: ${project}\n`);

  let allGood = true;

  // Check users collection has personnel fields
  console.log('📋 Checking users collection...');
  const users = await db.collection('users').limit(10).get();

  if (users.empty) {
    console.log('   ⚠️  No users found');
    allGood = false;
  } else {
    console.log(`   Found ${users.size} users (showing first 10)`);

    let missingFields = {
      firstName: 0,
      lastName: 0,
      serviceNumber: 0,
      rank: 0,
      location: 0,
    };

    users.forEach(doc => {
      const data = doc.data();

      // Check for personnel fields
      if (!data.firstName) missingFields.firstName++;
      if (!data.lastName) missingFields.lastName++;
      if (!data.serviceNumber) missingFields.serviceNumber++;
      if (!data.rank) missingFields.rank++;
      // location can be null, so we check if the field exists
      if (!data.hasOwnProperty('location')) missingFields.location++;

      // Show sample
      if (doc === users.docs[0]) {
        console.log(`   Sample user ${doc.id}:`);
        console.log(`      firstName: ${data.firstName || 'MISSING ❌'}`);
        console.log(`      lastName: ${data.lastName || 'MISSING ❌'}`);
        console.log(`      email: ${data.email || 'null'}`);
        console.log(`      phone: ${data.phone || 'null'}`);
        console.log(`      serviceNumber: ${data.serviceNumber || 'MISSING ❌'}`);
        console.log(`      rank: ${data.rank || 'MISSING ❌'}`);
        console.log(`      unitId: ${data.unitId || 'null'}`);
        console.log(`      battalionId: ${data.battalionId || 'null'}`);
        console.log(`      location: ${data.location || 'null'}`);
        console.log(`      roles: ${data.roles ? data.roles.join(', ') : 'MISSING ❌'}`);
        console.log(`      signature: ${data.signature ? 'present' : 'null'}`);
      }
    });

    // Check for missing fields
    const totalUsers = users.size;
    Object.entries(missingFields).forEach(([field, count]) => {
      if (count > 0) {
        console.log(`   ⚠️  ${count}/${totalUsers} users missing ${field}`);
        // Don't fail for optional fields
        if (field !== 'location') {
          allGood = false;
        }
      }
    });

    if (Object.values(missingFields).every(count => count === 0)) {
      console.log(`   ✅ All users have required personnel fields`);
    }
  }

  // Check personnel collection still exists (should for now)
  console.log('\n📋 Checking personnel collection...');
  const personnel = await db.collection('personnel').limit(1).get();

  if (personnel.empty) {
    console.log('   ℹ️  Personnel collection is empty or deleted');
  } else {
    console.log(`   ⚠️  Personnel collection still has ${personnel.size}+ documents`);
    console.log('   ℹ️  This is OK - we keep it until verification is complete');
  }

  // Check that approved_user role was added
  console.log('\n📋 Checking approved_user roles...');
  const approvedUsers = await db.collection('users')
    .where('roles', 'array-contains', 'approved_user')
    .limit(5)
    .get();

  if (approvedUsers.empty) {
    console.log('   ℹ️  No users with approved_user role found (this may be OK if no one was signature approved)');
  } else {
    console.log(`   ✅ Found ${approvedUsers.size}+ users with approved_user role`);
    console.log(`      Sample: ${approvedUsers.docs[0].data().firstName} ${approvedUsers.docs[0].data().lastName}`);
  }

  console.log('\n' + '='.repeat(60));
  if (allGood) {
    console.log('✅ Phase 2 verification PASSED - Users have personnel data!');
  } else {
    console.log('❌ Phase 2 verification FAILED - Some users missing required fields');
    process.exit(1);
  }

  process.exit(0);
}

verifyPhase2();
