# Firestore Indexes Deployment

## Date: 2026-03-06

Deployed composite indexes to `duty-staging` project:
- `(battalionId, name)` for equipment queries
- `(battalionId, currentUnitId, name)` for filtered equipment queries

### Command Used:
```bash
firebase use staging
firebase deploy --only firestore:indexes
```

### Status:
✅ Indexes deployed successfully
⏳ Index building in progress (may take several minutes)

### Notes:
- E2E tests were failing with "The query requires an index" error
- This was the final missing piece after implementing custom claims
- Indexes must be manually deployed when added to firestore.indexes.json

### Verification:
Check index build status at:
https://console.firebase.google.com/project/duty-staging/firestore/indexes
