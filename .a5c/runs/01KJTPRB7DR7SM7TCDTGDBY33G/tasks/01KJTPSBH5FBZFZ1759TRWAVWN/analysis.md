# Equipment Access Gap Analysis

**Date:** 2026-03-03
**Analyst:** Security & Access Control Analyst
**Status:** Complete

---

## Executive Summary

This analysis identifies critical gaps between the documented equipment access rules in `EQUIPMENT_ACCESS_RULES.md` and the current implementation across Firestore security rules (`firestore.rules`) and client-side code (`src/hooks/useEquipment.tsx`).

**Key Findings:**
- **Admin role:** 5 implementation gaps identified
- **Leader role:** 8 implementation gaps identified
- **User role:** 4 implementation gaps identified

**Severity:** HIGH - Multiple security-critical gaps exist that could allow unauthorized access or prevent legitimate operations.

---

## Methodology

1. **Document Review:** Analyzed EQUIPMENT_ACCESS_RULES.md (175 lines) for all documented access rules by role
2. **Firestore Rules Analysis:** Reviewed firestore.rules (lines 196-240) for server-side equipment access controls
3. **Client Code Analysis:** Reviewed src/hooks/useEquipment.tsx (630 lines) for client-side filtering and operations
4. **Gap Identification:** Cross-referenced documented rules against actual implementation

---

## Detailed Gap Analysis

### 1. Admin Role Gaps

#### Gap 1.1: Equipment Deletion - Missing Battalion Restriction
**Documented Rule:** "I can delete: Any equipment in the system"
**Current Implementation:**
- Firestore rules (line 238-239): `allow delete: if isAdmin();` ✓ CORRECT
- Client code (lines 548-554): Implements `deleteEquipment` without restrictions ✓ CORRECT

**Status:** ✓ NO GAP - Implementation matches documentation

#### Gap 1.2: Equipment Update - Missing Field-Level Permissions
**Documented Rule:** "I can update: Any equipment fields - Quantity, status, description, etc."
**Current Implementation:**
- Firestore rules (lines 228-236): Allows updates with basic validation ✓
- Client code: **NO UPDATE FUNCTION EXISTS** ✗

**Gap:** The client hook does not expose an `updateEquipment` function for admins to modify equipment fields like quantity, status, or description.

**Impact:** Admins cannot perform documented updates through the application.

#### Gap 1.3: Transfer Approval - Self-Approval Not Implemented
**Documented Rule:** "Assignments are not auto-approved, but I can also approve the request myself (transfer request needed)"
**Current Implementation:**
- Transfer requests create assignmentRequests documents (lines 427-531)
- **NO APPROVAL MECHANISM** in useEquipment hook ✗

**Gap:** No function to approve/reject assignment requests exists in the equipment hook.

**Impact:** Admins cannot approve their own transfer requests as documented.

#### Gap 1.4: Equipment Creation - Battalion Enforcement
**Documented Rule:** "`battalionId` field is required on create"
**Current Implementation:**
- Firestore rules (line 226): `(isAdmin() || !request.resource.data.keys().hasAny(['battalionId']) || isSameBattalionCreate(request.resource.data.battalionId))`
- This allows admins to create WITHOUT battalionId ✗

**Gap:** Firestore rules do not enforce battalionId requirement for admin creates.

**Impact:** Admins can create equipment without battalion assignment, violating documented requirement.

#### Gap 1.5: Visibility - Unassigned Equipment Filter
**Documented Rule:** "I can see: All equipment across all battalions (no restrictions)"
**Current Implementation:**
- Client filter (lines 254-317) applies visibility rules to ALL users
- Line 259-261: `if (item.assignmentLevel === 'unassigned') { return true; }`
- This shows unassigned equipment to everyone, not just admins ✗

**Gap:** Client-side filtering does not check admin role before applying visibility restrictions.

**Impact:** Admins may not see all equipment if client filters are applied before role check.

---

### 2. Leader Role Gaps

#### Gap 2.1: Equipment Creation - Unit Restriction Not Enforced Client-Side
**Documented Rule:** "I can create: Equipment in my unit only"
**Current Implementation:**
- Firestore rules (line 226): Battalion restriction only ✓
- Client code (lines 331-403): No unit-level restriction check ✗

**Gap:** `addEquipment` function does not validate that the leader is creating equipment only in their unit.

**Impact:** Leaders might create equipment in other units within their battalion (blocked by server, but should fail faster client-side).

#### Gap 2.2: Equipment Update - Complete Block Missing
**Documented Rule:** "I can not update: Can not modify quantity, status, description of equipment. Can not modify `battalionId`"
**Current Implementation:**
- Firestore rules (lines 228-236): Allows leaders to update equipment (`isAdminOrLeader()`) ✗
- Client code: No update function exists (partially correct by omission)

**Gap:** Firestore rules explicitly allow leaders to update equipment, violating the documented restriction.

**Impact:** Leaders can modify equipment fields they shouldn't have access to.

#### Gap 2.3: Equipment Deletion - Incorrect Scope
**Documented Rule:** "I can delete: only equipment that was created by my unit and only when it's assigned to my unit"
**Current Implementation:**
- Firestore rules (line 270): `allow delete: if isAdminOrLeader();` - allows ALL deletions ✗
- Client code (lines 405-416): `canDeleteEquipment` checks `currentPersonnelId` not unit ✗

**Gap:** Both server and client incorrectly implement deletion permissions.

**Impact:**
- Server: Leaders can delete any equipment in their battalion
- Client: Function checks personal assignment, not unit assignment + creator check

#### Gap 2.4: Transfer Restrictions - Level Restrictions Not Implemented
**Documented Rule:** "I can request transfer: Creates a transfer request... to any unit or personnel under or above my unit level (one level up or down only)"
**Current Implementation:**
- Client code (lines 533-546, 580-593): No level validation ✗
- Function `isWithinSameUnit` (lines 608-614) only checks same unit

**Gap:** No enforcement of "one level up or down only" restriction for unit transfers.

**Impact:** Leaders can create transfer requests to any unit in the battalion, not just adjacent levels.

#### Gap 2.5: Transfer to Personnel - Unit Restriction Missing
**Documented Rule:** "Creates a transfer request... to any personnel in my unit"
**Current Implementation:**
- No validation that personnel belongs to leader's unit ✗

**Gap:** Leaders can create transfer requests to personnel outside their unit.

**Impact:** Security violation - leaders can transfer equipment to unauthorized personnel.

#### Gap 2.6: Visibility - Pending Equipment Exclusion
**Documented Rule:** "Equipment in pending status will not be counted in my equipment view"
**Current Implementation:**
- Client filter (lines 266-280): Hides equipment with pending transfers OUT ✓
- But does not filter based on `status === 'pending_transfer'` alone ✗

**Gap:** Filter checks pending transfers, but not equipment.status field directly.

**Impact:** Equipment with status='pending_transfer' but no assignmentRequest might still show.

#### Gap 2.7: Visibility - Request Scope
**Documented Rule:** "Requests of equipment transfer into and out of my unit"
**Current Implementation:**
- Firestore rules (lines 311-323): Checks unit transfers ✓
- But this is in assignmentRequests, not equipment hook ✗

**Gap:** Equipment hook does not integrate with assignment request visibility.

**Impact:** Leaders may not see transfer requests associated with equipment in the equipment view.

#### Gap 2.8: Signature Approved User - Missing Client Filter
**Documented Rule:** "As a Leader or as signature approved user"
**Current Implementation:**
- No check for `isSignatureApproved` in client filtering ✗
- Firestore rules enforce battalion boundary only

**Gap:** Signature-approved users should have same visibility as leaders, but client code doesn't check this field.

**Impact:** Signature-approved users may not see equipment they should have access to.

---

### 3. Regular User Role Gaps

#### Gap 3.1: Visibility - Pending Transfer TO User
**Documented Rule:** "I can see: equipment pending transfer approval by me personally (transferred to me)"
**Current Implementation:**
- Client filter (lines 254-294): Shows equipment assigned to user ✓
- But does not show equipment with PENDING transfer TO the user ✗

**Gap:** Users cannot see equipment that is pending transfer to them (before approval).

**Impact:** Users are unaware of pending equipment transfers directed to them.

#### Gap 3.2: Visibility - Pending Transfer OUT Restriction
**Documented Rule:** "**NOT** equipment with pending transfer OUT from my unit"
**Current Implementation:**
- Lines 266-280: Hides equipment with ALL quantity pending transfer ✓
- Correctly implements this rule

**Status:** ✓ NO GAP

#### Gap 3.3: Transfer Request - Ownership Validation
**Documented Rule:** "I can request transfer: For equipment assigned to me personally"
**Current Implementation:**
- `requestAssignment` function (lines 580-593): No ownership validation ✗
- Creates transfer request without checking if equipment is assigned to user

**Gap:** No client-side validation that user owns the equipment before creating transfer request.

**Impact:** Users can create transfer requests for equipment not assigned to them (may be blocked by business logic elsewhere, but should validate here).

#### Gap 3.4: Equipment Creation/Update/Delete - Block Enforcement
**Documented Rule:** "I cannot: Create equipment directly, Update equipment fields, Delete equipment"
**Current Implementation:**
- Firestore rules: Enforced correctly ✓
  - Create (line 218): `isAdminOrLeader()` ✓
  - Update (line 231): `isAdminOrLeader()` ✓
  - Delete (line 239): `isAdmin()` ✓
- Client code: Functions exist but would fail at server level ✓

**Status:** ✓ NO GAP - Server-side enforcement is sufficient

---

## Critical Security Issues

### High Severity

1. **Leader Update Permissions (Gap 2.2):** Firestore rules allow leaders to update equipment when they should be completely blocked
2. **Leader Deletion Permissions (Gap 2.3):** Leaders can delete any equipment in their battalion, not just equipment created by and assigned to their unit
3. **Transfer Level Restrictions (Gap 2.4, 2.5):** No enforcement of organizational hierarchy limits on transfers

### Medium Severity

4. **Admin battalionId Requirement (Gap 1.4):** Admins can create equipment without required battalion assignment
5. **User Pending Transfer Visibility (Gap 3.1):** Users cannot see equipment pending transfer to them
6. **Signature Approved User Support (Gap 2.8):** Client code doesn't support signature-approved users having leader-like visibility

### Low Severity

7. **Missing Update Function (Gap 1.2):** Admin update capability not exposed in hook
8. **Missing Approval Function (Gap 1.3):** Transfer approval logic not in equipment hook (may exist elsewhere)

---

## Recommendations by Role

### Admin Role Changes Needed

1. **Add `updateEquipment` function** to expose equipment field updates
2. **Add transfer approval functions** or integrate with existing approval mechanisms
3. **Enforce battalionId requirement** in Firestore rules for admin creates
4. **Add admin bypass** to client visibility filters to show all equipment

### Leader Role Changes Needed

1. **Remove update permission** from Firestore rules (line 231)
2. **Restrict delete permission** in Firestore rules to check:
   - Equipment `createdBy` field matches a user in leader's unit
   - Equipment is currently assigned to leader's unit
3. **Add level validation** to transfer functions:
   - Calculate unit hierarchy levels
   - Enforce "one level up or down" rule
4. **Add personnel unit validation** for personnel transfers
5. **Add signature approval check** to client filtering logic
6. **Integrate assignment request visibility** with equipment view

### Regular User Role Changes Needed

1. **Show pending transfers TO user** in equipment list
2. **Add ownership validation** to `requestAssignment` function
3. **Hide function exposure** for create/update/delete (UI-level restriction)

---

## Implementation Priority

### Phase 1: Critical Security Fixes (Immediate)
- Fix Leader update permissions (Gap 2.2)
- Fix Leader deletion permissions (Gap 2.3)
- Add transfer level restrictions (Gap 2.4, 2.5)

### Phase 2: Required Functionality (Next Sprint)
- Add admin update function (Gap 1.2)
- Implement pending transfer visibility for users (Gap 3.1)
- Add signature approved user support (Gap 2.8)

### Phase 3: Validation & UX Improvements
- Add client-side validation for all operations
- Enforce battalionId requirement for admins (Gap 1.4)
- Integrate transfer requests with equipment view

---

## Testing Requirements

Each gap fix requires:
1. **Unit tests** for individual functions
2. **Integration tests** for Firestore rule changes
3. **E2E tests** for user workflows by role
4. **Security audit** to verify no privilege escalation

Test users should cover:
- Admin user
- Leader user (with and without signature approval)
- Signature-approved user (non-leader)
- Regular user
- User with no unit assignment

---

## Appendix: Rules Cross-Reference

### Server-Side Rules (firestore.rules)
- Equipment read: Line 213
- Equipment create: Lines 218-226
- Equipment update: Lines 228-236
- Equipment delete: Lines 238-239

### Client-Side Implementation (useEquipment.tsx)
- Visibility filter: Lines 254-317
- Equipment creation: Lines 331-403
- Equipment deletion: Lines 548-554
- Transfer requests: Lines 427-593
- Ownership check: Lines 405-416

### Documentation (EQUIPMENT_ACCESS_RULES.md)
- Admin rules: Lines 9-28
- Leader rules: Lines 31-58
- User rules: Lines 61-78
- Visibility rules: Lines 82-174
