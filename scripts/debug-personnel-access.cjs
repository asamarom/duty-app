#!/usr/bin/env node
/**
 * Debug personnel access issues in equipment assignments
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugPersonnelAccess() {
  try {
    const userId = 'wRQHXCcxNBWlzsjb2dDO28pxdqu2';
    const battalionId = 'yCCxfGgoXMgCeCwQrg00';

    console.log('\n🔍 Debugging Personnel Access');
    console.log('================================\n');
    console.log(`User: ${userId}`);
    console.log(`Battalion: ${battalionId}\n`);

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    console.log('👤 User roles:', userData.roles);
    console.log('');

    // Get all equipment assignments for this battalion
    const assignmentsSnapshot = await db.collection('equipmentAssignments')
      .where('battalionId', '==', battalionId)
      .where('returnedAt', '==', null)
      .get();

    console.log(`📦 Found ${assignmentsSnapshot.size} active assignments in battalion\n`);

    // Collect unique personnel IDs
    const personnelIds = new Set();
    const unitIds = new Set();

    assignmentsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.personnelId) personnelIds.add(data.personnelId);
      if (data.unitId) unitIds.add(data.unitId);
    });

    console.log(`👥 Unique personnel IDs: ${personnelIds.size}`);
    console.log(`🏢 Unique unit IDs: ${unitIds.size}\n`);

    // Check each personnel ID
    console.log('Checking personnel access:\n');
    for (const personnelId of personnelIds) {
      const personDoc = await db.collection('users').doc(personnelId).get();

      if (!personDoc.exists) {
        console.log(`❌ ${personnelId}: Document not found!`);
        continue;
      }

      const personData = personDoc.data();
      const personBattalionId = personData.battalionId || personData.unitId;
      const isSameBattalion = personBattalionId === battalionId;

      console.log(`${isSameBattalion ? '✓' : '❌'} ${personnelId}:`);
      console.log(`   Name: ${personData.firstName} ${personData.lastName}`);
      console.log(`   Battalion: ${personBattalionId}`);
      console.log(`   Same battalion: ${isSameBattalion}`);
      console.log('');
    }

    // Check security rules simulation
    console.log('📋 Security Rules Simulation:\n');
    console.log('For user to read another personnel doc:');
    console.log('  1. isOwner: Only for own document');
    console.log('  2. isAdmin:', userData.roles?.includes('admin'));
    console.log('  3. hasAnyRole:', userData.roles && userData.roles.length > 0);
    console.log('  4. isSameBattalion: Must match user\'s battalion');
    console.log('');

    // Check if any personnel are from different battalions
    const crossBattalionPersonnel = [];
    for (const personnelId of personnelIds) {
      const personDoc = await db.collection('users').doc(personnelId).get();
      if (personDoc.exists) {
        const personData = personDoc.data();
        const personBattalionId = personData.battalionId || personData.unitId;
        if (personBattalionId !== battalionId) {
          crossBattalionPersonnel.push({
            id: personnelId,
            name: `${personData.firstName} ${personData.lastName}`,
            battalion: personBattalionId
          });
        }
      }
    }

    if (crossBattalionPersonnel.length > 0) {
      console.log('⚠️  PROBLEM: Cross-battalion personnel assignments found!');
      console.log('These personnel are from different battalions:\n');
      crossBattalionPersonnel.forEach(p => {
        console.log(`  - ${p.name} (${p.id})`);
        console.log(`    Battalion: ${p.battalion}`);
      });
      console.log('\nThis causes permission denied errors because users can only');
      console.log('read personnel documents from their own battalion.');
      console.log('');
    } else {
      console.log('✅ All personnel are from the same battalion\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugPersonnelAccess().then(() => process.exit(0));
