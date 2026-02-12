# BattalionId Data Migration Guide

## Overview

The updated Firebase security rules require a `battalionId` field on all documents for battalion-based access control. This prevents cross-battalion data leakage.

## Collections Requiring Migration

- `units` - Add battalionId to all unit documents
- `personnel` - Add battalionId to all personnel records
- `equipment` - Add battalion Id to all equipment items
- `equipmentAssignments` - Add battalionId to all assignments
- `assignmentRequests` - Add battalionId to all transfer requests

## Migration Options

### Option 1: Firebase Admin SDK (Recommended)

**Prerequisites:**
1. Download Firebase service account key:
   - Go to [Firebase Console](https://console.firebase.google.com/project/duty-82f42/settings/serviceaccounts/adminsdk)
   - Click "Generate new private key"
   - Save as `duty-82f42-firebase-adminsdk-yyj5g-c27c9b4802.json` in project root

**Run migration:**
```bash
node scripts/migrate-battalion-ids.cjs
```

### Option 2: Manual Firebase Console

1. Go to [Firestore Database](https://console.firebase.google.com/project/duty-82f42/firestore/databases/-default-/data)
2. For each collection, manually add `battalionId` field to documents
3. Battalion ID should be derived from:
   - Units: Use own ID if type='battalion', otherwise parent battalion ID
   - Personnel/Equipment: Use the unitId (which should be a battalion)
   - Assignments/Requests: Derive from linked personnel or equipment

### Option 3: Cloud Function

Deploy the migration as a Cloud Function that can be triggered from the Firebase Console.

## Current Status

**Firestore rules deployed:** ✅ With relaxed battalionId checks (optional during migration)

**Data migrated:** ❌ Pending

**Action Required:**
1. Choose a migration option above
2. Run the migration
3. Verify data has battalionId fields
4. Deploy final security rules (remove optional checks)

## Verification

After migration, verify with:
```bash
# Check a sample document from each collection
firebase firestore:get personnel/{someId}
firebase firestore:get equipment/{someId}
```

All documents should have a `battalionId` field.

## Rollback

If issues occur, redeploy the previous rules:
```bash
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```
