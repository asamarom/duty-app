# Database Structure Optimization Analysis

## Current Structure

### Equipment Data Model

```
equipment/
  {equipmentId}:
    - name: string
    - quantity: number
    - serialNumber: string | null
    - description: string
    - status: 'serviceable' | 'unserviceable' | 'in_maintenance' | 'missing' | 'pending_transfer'
    - battalionId: string (for Firestore security rules)
    - createdBy: string | null
    - createdAt: Timestamp
    - updatedAt: Timestamp

equipmentAssignments/
  {assignmentId}:
    - equipmentId: string (ref to equipment)
    - personnelId: string | null (if assigned to person)
    - unitId: string | null (if assigned to unit)
    - quantity: number
    - assignedBy: string
    - assignedAt: Timestamp
    - returnedAt: Timestamp | null (null = active assignment)
    - notes: string

assignmentRequests/
  {requestId}:
    - equipmentId: string
    - requestedBy: string
    - fromUnitId: string | null
    - fromPersonnelId: string | null
    - toUnitId: string | null
    - toPersonnelId: string | null
    - quantity: number
    - status: 'pending' | 'approved' | 'rejected'
    - createdAt: Timestamp
    - resolvedAt: Timestamp | null
```

## Current Issues

### 1. Missing Denormalization for Equipment Assignment

**Problem:**
- Equipment documents don't contain current assignment information
- Requires complex client-side JOIN between `equipment` and `equipmentAssignments` collections
- Firestore security rules cannot filter equipment by unit assignment
- Result: Over-fetching at battalion level, then client-side filtering

**Evidence:**
From `firestore.rules` lines 210-212:
```javascript
// Future improvement: Denormalize assignedUnitId onto equipment documents
// to enable unit-level filtering in Firestore rules.
allow read: if hasAnyRole() && (isAdmin() || isSameBattalion(resource.data.battalionId));
```

**Impact:**
- Non-admin users fetch ALL equipment in their battalion
- Client-side filtering reduces this to unit-level
- Inefficient for large battalions with many units
- Cannot leverage Firestore's server-side filtering capabilities

### 2. Query Performance

**Current Query Pattern (after fix):**
```typescript
// Admin: Fetch all equipment
query(collection(db, 'equipment'), orderBy('name'))

// Non-admin: Filter by battalion
query(collection(db, 'equipment'),
  where('battalionId', '==', battalionId),
  orderBy('name'))
```

**Required Composite Index:**
- `(battalionId, name)` - Should be in `firestore.indexes.json`

**Performance Characteristics:**
- ✅ Good: Single query to fetch equipment metadata
- ❌ Bad: Requires separate queries for assignments
- ❌ Bad: Client-side JOIN in memory
- ❌ Bad: Cannot filter by unit at database level

### 3. Security Model Limitations

**Current Security:**
- Server-side: Battalion-level access (Firestore rules)
- Client-side: Unit-level filtering (useEquipment hook)

**Defense-in-Depth:**
- ✅ Firestore rules prevent unauthorized battalion access
- ✅ Client filtering restricts to unit level
- ❌ Client-side filtering is not a security boundary
- ❌ Sophisticated users could bypass client filtering to see battalion data

## Recommended Optimizations

### Option 1: Denormalize Current Assignment ⭐ RECOMMENDED

**Changes:**
Add denormalized fields to equipment documents:

```typescript
equipment/
  {equipmentId}:
    // ... existing fields ...

    // NEW: Denormalized current assignment
    currentUnitId: string | null          // Unit equipment is assigned to
    currentPersonnelId: string | null      // Person equipment is assigned to
    currentQuantityAssigned: number        // How many items are assigned
    lastAssignedAt: Timestamp | null       // When last assignment occurred
```

**Benefits:**
- ✅ Single query to get equipment with current assignment
- ✅ Firestore rules can filter: `where('currentUnitId', '==', userUnitId)`
- ✅ No client-side JOIN needed
- ✅ Better security - server-side unit filtering
- ✅ Improved performance - fetch only relevant equipment
- ✅ Maintains assignment history in separate collection

**Trade-offs:**
- ❌ Requires updating equipment doc when assignment changes
- ❌ Two writes per assignment operation (equipment + equipmentAssignments)
- ✅ Acceptable trade-off: Reads >> Writes for equipment

**Updated Security Rules:**
```javascript
// Allow unit-level filtering
allow read: if hasAnyRole() && (
  isAdmin() ||
  isSameBattalion(resource.data.battalionId) &&
  (resource.data.currentUnitId == null ||
   resource.data.currentUnitId == request.auth.token.unitId ||
   resource.data.currentPersonnelId == getUserPersonnelId())
);
```

**Updated Query:**
```typescript
// Non-admin users: Filter by unit
query(collection(db, 'equipment'),
  where('battalionId', '==', battalionId),
  where('currentUnitId', '==', unitId),
  orderBy('name'))
```

### Option 2: Subcollection Pattern

**Structure:**
```
equipment/{equipmentId}/
  - metadata (main document with denormalized current assignment)
  - assignments/{assignmentId} (subcollection for history)
```

**Benefits:**
- ✅ Clean separation of current vs historical assignments
- ✅ Easier to paginate assignment history
- ✅ Document size stays small (history in subcollection)

**Trade-offs:**
- ❌ More complex queries (need to specify document path)
- ❌ Cannot query across all equipment assignments easily
- ❌ Breaks existing queries

### Option 3: Materialized View Pattern (NOT RECOMMENDED)

**Structure:**
```
equipmentByUnit/{unitId}/
  - equipment: [] (array of equipment refs visible to this unit)
```

**Why NOT recommended:**
- ❌ Complex to maintain consistency
- ❌ Firestore pricing penalty for index writes
- ❌ Array size limits (10MB per document)
- ❌ Difficult to handle personnel assignments

## Migration Plan for Option 1

### Phase 1: Add Fields (Non-Breaking)
1. Add new fields to equipment documents (nullable)
2. Update TypeScript interfaces
3. Update createEquipment to populate new fields

### Phase 2: Backfill Data
```typescript
// Migration script
async function backfillEquipmentAssignments() {
  const equipment = await db.collection('equipment').get();

  for (const equipDoc of equipment.docs) {
    const equipId = equipDoc.id;

    // Find active assignment (returnedAt == null)
    const activeAssignment = await db
      .collection('equipmentAssignments')
      .where('equipmentId', '==', equipId)
      .where('returnedAt', '==', null)
      .get();

    if (!activeAssignment.empty) {
      const assignment = activeAssignment.docs[0].data();

      await equipDoc.ref.update({
        currentUnitId: assignment.unitId || null,
        currentPersonnelId: assignment.personnelId || null,
        currentQuantityAssigned: assignment.quantity,
        lastAssignedAt: assignment.assignedAt,
      });
    } else {
      // No active assignment - set to null
      await equipDoc.ref.update({
        currentUnitId: null,
        currentPersonnelId: null,
        currentQuantityAssigned: 0,
        lastAssignedAt: null,
      });
    }
  }
}
```

### Phase 3: Update Write Operations
Update `assignEquipment` and `unassignEquipment` to write to both:
1. Create/update equipmentAssignments document
2. Update denormalized fields on equipment document

### Phase 4: Update Firestore Rules
Add unit-level filtering to security rules

### Phase 5: Update Queries
Change equipment queries to filter by currentUnitId

### Phase 6: Remove Client-Side JOINs
Simplify useEquipment hook to use denormalized fields

## Performance Comparison

### Current (After battalionId Filter Fix)

**Scenario:** Battalion with 5 units, 100 equipment items total, user in unit with 20 items

| Operation | Documents Read | Network Transfer | Client Processing |
|-----------|---------------|------------------|-------------------|
| Load equipment page | 100 equipment + 100 assignments | ~200KB | JOIN 200 docs, filter to 20 |

### After Denormalization

**Scenario:** Same battalion and unit

| Operation | Documents Read | Network Transfer | Client Processing |
|-----------|---------------|------------------|-------------------|
| Load equipment page | 20 equipment | ~40KB | Display 20 items |

**Improvement:**
- 🚀 80% fewer documents read
- 🚀 80% less network transfer
- 🚀 90% less client processing
- 🚀 Better security (server-side filtering)

## Implementation Priority

### High Priority
1. ✅ **DONE:** Fix immediate issue (add battalionId filter for non-admin users)
2. **Implement denormalization** (Option 1) - Improves performance and security

### Medium Priority
3. Add composite indexes for equipment queries
4. Optimize equipmentAssignments queries (add unitId index)

### Low Priority
5. Consider subcollection pattern for equipment with >100 assignments
6. Add caching layer for equipment metadata

## Testing Requirements

After implementing denormalization:
1. Verify E2E tests pass (especially equipment access rules tests)
2. Add tests for assignment update edge cases:
   - Multiple assignments to same equipment (serialized items)
   - Concurrent assignment updates
   - Assignment rollback scenarios
3. Performance testing with large datasets (1000+ equipment items)
4. Verify Firestore rules enforce unit-level access correctly

## Cost Analysis

### Current Cost Model
- Read: 1 equipment doc + 1 assignment doc per item = 2 reads
- Write: 1 assignment doc per assignment = 1 write

### After Denormalization
- Read: 1 equipment doc per item = 1 read (50% reduction ✅)
- Write: 1 equipment doc + 1 assignment doc = 2 writes (100% increase ❌)

**Net Impact:**
For typical usage (10:1 read:write ratio):
- Current: 10 × 2 reads + 1 × 1 write = 21 operations
- Denormalized: 10 × 1 read + 1 × 2 writes = 12 operations
- **Savings: 43% fewer Firestore operations**

## Conclusion

The current database structure requires client-side JOINs and cannot leverage Firestore's server-side filtering for unit-level access. Implementing Option 1 (denormalize current assignment) provides:

1. **Better Performance:** 80% fewer documents read, 80% less network transfer
2. **Better Security:** Server-side unit-level filtering in Firestore rules
3. **Better Cost:** 43% fewer Firestore operations overall
4. **Acceptable Trade-offs:** Slightly more complex write operations, maintains full assignment history

**Recommendation:** Proceed with Option 1 migration in next sprint.
