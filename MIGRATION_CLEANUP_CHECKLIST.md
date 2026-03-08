# Migration Cleanup Checklist

This document lists all collections and fields that are candidates for deletion after the Phase 2/3 migration is complete and verified in production.

**⚠️ IMPORTANT: DO NOT delete anything until:**
1. Migration has been running successfully in production for at least 2-4 weeks
2. All users have been migrated successfully
3. No issues have been reported
4. A final backup has been taken

---

## 1. Collections to Delete

### 1.1 `personnel` Collection (Production: 1 doc, Staging: 6 docs)

**Status:** DEPRECATED - Security rules block all access (firestore.rules:175-180)

**Reason:** Merged into `users` collection in Phase 2. All personnel data now lives in the `users` collection.

**Before Deletion:**
- ✅ Verify all personnel records were migrated to `users`
- ✅ Verify security rules block all access (already done)
- ✅ Run verification script: `scripts/verify-phase2.cjs`
- ⚠️ Take final backup before deletion

**Delete Command (Admin SDK):**
```javascript
// scripts/delete-personnel-collection.cjs
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteCollection() {
  const snapshot = await db.collection('personnel').get();
  console.log(`Found ${snapshot.size} documents to delete`);

  // Delete in batches
  const batchSize = 500;
  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;

    if (count >= batchSize) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log('Personnel collection deleted');
}

deleteCollection().then(() => process.exit(0)).catch(console.error);
```

---

## 2. Firestore Security Rules to Clean Up

### 2.1 Remove Personnel Collection Rules (firestore.rules:172-180)

**Current:**
```javascript
// ============================================================================
// PERSONNEL COLLECTION - DEPRECATED (merged into users collection)
// ============================================================================
// This collection is no longer used. All personnel data is now in users collection.
// Rules kept for backward compatibility during migration.
match /personnel/{personnelId} {
  allow read: if false;
  allow create: if false;
  allow update: if false;
  allow delete: if false;
}
```

**Action:** Remove entire section after verifying no production access attempts in Firebase logs.

---

## 3. TypeScript Interfaces to Clean Up

### 3.1 Remove `PersonnelDoc` Interface (src/integrations/firebase/types.ts)

**Status:** Already removed ✅

This interface was removed during Phase 2 migration.

---

## 4. Fields to Remove from `UserDoc`

### 4.1 Legacy Personnel Fields (Currently Marked as Removed)

These fields are **already removed** from the data model but their legacy values may still exist in some documents:

| Field | Status | Replacement | Notes |
|-------|--------|-------------|-------|
| `dutyPosition` | ❌ Removed in Phase 2 | None | Free text, no longer tracked |
| `localAddress` | ❌ Removed in Phase 2 | None | Privacy concerns |
| `readinessStatus` | ❌ Removed in Phase 2 | None | Not actively used |
| `isSignatureApproved` | ❌ Replaced | `roles: ['approved_user']` | Boolean → Role-based |
| `locationStatus` | ⚠️ Changed | `location` (free text) | Enum → Free text |

**Action:** No code changes needed. These fields are already handled correctly in mapping functions.

---

## 5. Code References to Clean Up

### 5.1 Personnel Collection References (Still Active)

The following files still reference the `personnel` collection and need to be updated or removed:

#### High Priority (Active Code Paths)

| File | Line(s) | Usage | Action Required |
|------|---------|-------|----------------|
| `src/pages/PersonnelDetailPage.tsx` | 101, 179 | Gets/updates `personnel` doc by ID | ⚠️ **FIX REQUIRED** - Should use `users` collection |
| `src/pages/AddPersonnelPage.tsx` | 46 | Creates new `personnel` doc | ⚠️ **FIX REQUIRED** - Should create `users` doc |
| `src/contexts/DataPrefetchContext.tsx` | 16 | Prefetches `personnel` collection | ⚠️ **FIX REQUIRED** - Should prefetch `users` |
| `src/hooks/useUnitsManagement.tsx` | 138, 176 | Queries/creates `personnel` docs | ⚠️ **FIX REQUIRED** - Should use `users` |
| `src/hooks/useAssignmentRequests.tsx` | 116, 131, 187, 298, 318 | Gets personnel names for display | ⚠️ **FIX REQUIRED** - Should query `users` |
| `src/hooks/useEquipment.tsx` | 90, 129, 527, 547 | Gets personnel data for assignments | ⚠️ **FIX REQUIRED** - Should query `users` |
| `src/hooks/useTransferHistory.tsx` | 50, 65 | Gets personnel names for history | ⚠️ **FIX REQUIRED** - Should query `users` |
| `src/hooks/useCanManageRole.tsx` | 56 | Checks personnel doc for unitId | ⚠️ **FIX REQUIRED** - Should query `users` |
| `src/components/approvals/ApprovalsManagement.tsx` | 142 | Creates personnel doc on approval | ⚠️ **FIX REQUIRED** - Personnel doc creation handled elsewhere |
| `src/components/settings/ApprovalsTab.tsx` | 36 | Queries personnel collection | ⚠️ **FIX REQUIRED** - Should query `users` |

#### Low Priority (Test Code)

| File | Lines | Usage | Action Required |
|------|-------|-------|----------------|
| `src/test/rules/firestore-rules.test.ts` | Multiple | Seeds and tests personnel rules | ✅ Can keep for verifying deprecation rules |

#### No Action Needed (Documentation/Tools)

| File | Usage | Action |
|------|-------|--------|
| `tools/test-personnel.html` | Debug tool | ✅ Keep or update to use `users` |
| `tools/debug-personnel-google.html` | Debug tool | ✅ Keep or update to use `users` |
| `docs/**/*.md` | Documentation | ✅ Update docs to reflect new structure |
| `.a5c/processes/**` | Process definitions | ✅ Archive or update |

---

## 6. Field Name Migrations (TODO in Phase 4?)

### 6.1 Rename `personnelId` → `userId` in Related Collections

These fields are marked with `TODO: Phase 3` comments but were not changed in Phase 3:

| Collection | Field | New Name | Status |
|------------|-------|----------|--------|
| `equipment` | `currentPersonnelId` | `currentUserId` | TODO |
| `equipmentAssignments` | `personnelId` | `userId` | TODO |
| `assignmentRequests` | `fromPersonnelId` | `fromUserId` | TODO |
| `assignmentRequests` | `toPersonnelId` | `toUserId` | TODO |

**Decision:** These renames are **cosmetic only** and low priority. The field values already contain userIds (not separate personnelIds). Consider doing this in a future cleanup phase.

---

## 7. Firestore Indexes to Update

### 7.1 No Personnel Indexes Found ✅

The `firestore.indexes.json` file does NOT contain any indexes for the `personnel` collection, so no index cleanup is needed.

All indexes reference:
- `users` ✅
- `units` ✅
- `equipment` ✅
- `equipmentAssignments` ✅
- `assignmentRequests` ✅
- `signupRequests` ✅
- `adminUnitAssignments` ✅

---

## 8. Migration Script Cleanup

### 8.1 Seed Scripts

| File | Status | Action |
|------|--------|--------|
| `scripts/seed-firebase-staging.cjs` | Has commented out personnel seeding | ✅ Remove commented code after verification |
| `scripts/seed-emulator-users.cjs` | May still seed personnel | ⚠️ Review and remove personnel seeding |

### 8.2 Migration Scripts

| File | Purpose | Action |
|------|---------|--------|
| `scripts/migrations/phase2-merge-personnel-to-users.cjs` | One-time migration | ✅ Keep for historical reference |
| `scripts/migrations/verify-phase2.cjs` | Verification script | ✅ Keep for auditing |

---

## 9. Recommended Cleanup Order

### Phase A: Fix Active Code References (URGENT)
1. ✅ **PersonnelDetailPage.tsx** - Update to use `users` collection
2. ✅ **AddPersonnelPage.tsx** - Update to create users, not personnel
3. ✅ **DataPrefetchContext.tsx** - Prefetch users instead of personnel
4. ✅ **useUnitsManagement.tsx** - Query/create users instead of personnel
5. ✅ **useAssignmentRequests.tsx** - Get names from users collection
6. ✅ **useEquipment.tsx** - Get personnel data from users
7. ✅ **useTransferHistory.tsx** - Get names from users
8. ✅ **useCanManageRole.tsx** - Check users collection for permissions
9. ✅ **ApprovalsManagement.tsx** - Remove personnel doc creation
10. ✅ **ApprovalsTab.tsx** - Query users instead of personnel

### Phase B: Monitor and Verify (2-4 weeks)
1. Monitor Firebase logs for any `personnel` collection access attempts
2. Verify all user workflows function correctly
3. Collect user feedback
4. Verify no errors in production logs

### Phase C: Documentation and Cleanup (After verification)
1. Update all documentation to reflect new structure
2. Remove commented code from seed scripts
3. Update debug tools or mark as deprecated

### Phase D: Final Deletion (After 4+ weeks of stable operation)
1. Take final backup of `personnel` collection
2. Export collection data to JSON for archival
3. Delete `personnel` collection using admin script
4. Remove personnel security rules from firestore.rules
5. Deploy updated security rules
6. Monitor for any errors (none expected if Phase A is complete)

---

## 10. Verification Checklist

Before deleting the `personnel` collection, verify:

- [ ] All 10 files in Phase A have been updated and deployed
- [ ] Production has been running without personnel collection access for 2+ weeks
- [ ] Firebase logs show zero attempts to access `personnel` collection
- [ ] All users can view/edit their profiles successfully
- [ ] Equipment assignments work correctly
- [ ] Transfer requests work correctly
- [ ] Role management works correctly
- [ ] Leader unit assignments work correctly
- [ ] Signature approvals work correctly (using `approved_user` role)
- [ ] No errors in production logs related to missing personnel data
- [ ] Final backup of `personnel` collection has been taken
- [ ] Exported personnel collection to JSON archive

---

## 11. Rollback Plan

If issues are discovered after deletion:

1. **Immediate Actions:**
   - Restore `personnel` collection from backup
   - Redeploy security rules with personnel access enabled
   - Revert code changes from Phase A if needed

2. **Investigation:**
   - Identify which workflow broke
   - Determine if it's a data issue or code issue
   - Fix the issue before attempting deletion again

3. **Prevention:**
   - Add more comprehensive E2E tests covering all personnel workflows
   - Add monitoring/alerting for personnel-related errors
   - Consider a longer verification period (6-8 weeks)

---

## Summary

**Collections to delete:** 1 (`personnel`)
**Security rules to remove:** 1 section (personnel rules)
**Active code files to fix:** 10 files
**Fields already removed:** 3 fields (dutyPosition, localAddress, readinessStatus)
**Fields replaced:** 1 field (isSignatureApproved → approved_user role)
**Fields changed:** 1 field (locationStatus → location free text)
**Estimated timeline:** 4-6 weeks from code fix completion

**Current Status:**
- ✅ Phase 2 migration complete (personnel → users merge)
- ✅ Phase 3 migration complete (hooks updated to use users)
- ⚠️ **Phase A required:** 10 files still reference personnel collection
- ⏳ **Waiting:** Verification period before final deletion
