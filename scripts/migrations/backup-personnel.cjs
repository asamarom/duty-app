/**
 * Backup personnel collection before Phase 2 migration
 *
 * Exports all personnel documents to JSON file.
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

async function backupPersonnel() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(__dirname, '..', '..', 'backups', `personnel-backup-${project}-${timestamp}.json`);

  console.log(`📦 Backing up personnel collection from ${project}`);
  console.log(`📁 Output: ${backupFile}\n`);

  try {
    const snapshot = await db.collection('personnel').get();

    if (snapshot.empty) {
      console.log('ℹ️  Personnel collection is empty');
      process.exit(0);
    }

    const backup = {
      collection: 'personnel',
      project,
      timestamp,
      count: snapshot.size,
      documents: []
    };

    snapshot.forEach(doc => {
      backup.documents.push({
        id: doc.id,
        data: doc.data()
      });
    });

    // Write backup file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log(`✅ Backed up ${backup.count} personnel documents`);
    console.log(`📁 File: ${backupFile}`);
    console.log(`📊 Size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

backupPersonnel();
