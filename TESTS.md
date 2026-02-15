# Test Coverage Matrix

This document maps product requirements from [PRODUCT.md](./PRODUCT.md) to their covering E2E tests.

**Status values**: `covered` | `partial` | `gap` | `not-testable`

---

## Summary

| Area | Total | Covered | Partial | Gaps |
|------|-------|---------|---------|------|
| UNIT | 3 | 3 | 0 | 0 |
| PERS | 4 | 4 | 0 | 0 |
| EQUIP | 7 | 7 | 0 | 0 |
| AUTH | 12 | 12 | 0 | 0 |
| I18N | 3 | 2 | 0 | 0 |
| ONBOARD | 9 | 7 | 0 | 0 |
| XFER | 12 | 12 | 0 | 0 |
| UI | 8 | 8 | 0 | 0 |
| UX | 2 | 1 | 0 | 0 |
| **Total** | **60** | **56** | **0** | **0** |

---

## Unit Hierarchy [UNIT]

### [UNIT-1] Battalion is the primary command level
- **Status**: covered
- **Tests**:
  - `e2e/units.spec.ts` > "[UNIT-1] should display battalion as primary command level"

### [UNIT-2] Company is mid-level tactical unit
- **Status**: covered
- **Tests**:
  - `e2e/units.spec.ts` > "[UNIT-2] should display company under battalion in hierarchy"

### [UNIT-3] Platoon is core operational unit
- **Status**: covered
- **Tests**:
  - `e2e/units.spec.ts` > "[UNIT-3] should display platoon under company in hierarchy"

---

## Personnel Management [PERS]

### [PERS-1] Profiles include Service Number, Rank, Duty Position, Contact Info
- **Status**: covered
- **Tests**:
  - `e2e/personnel.spec.ts` > "[PERS-1] should display profile with Service Number, Rank, Duty Position, Contact Info"

### [PERS-2] Personnel list is viewable with table or list format
- **Status**: covered
- **Tests**:
  - `e2e/personnel.spec.ts` > "should display personnel page with list"
  - `e2e/personnel.spec.ts` > "should display personnel table or list"

### [PERS-3] Personnel can be searched/filtered
- **Status**: covered
- **Tests**:
  - `e2e/personnel.spec.ts` > "should show search/filter for personnel"
  - `e2e/personnel.spec.ts` > "[PERS-3] should filter personnel and show matching results"

### [PERS-4] Personnel detail page shows individual information
- **Status**: covered
- **Tests**:
  - `e2e/personnel.spec.ts` > "should navigate to personnel detail when clicking on person"

---

## Equipment Inventory [EQUIP]

### [EQUIP-1] Lifecycle Tracking - manage items from acquisition to disposal
- **Status**: covered
- **Tests**:
  - `e2e/equipment.spec.ts` > "[EQUIP-1] should display lifecycle status on equipment"

### [EQUIP-2] Assignment System - issue equipment to individuals, companies, or platoons
- **Status**: covered
- **Tests**:
  - `e2e/equipment.spec.ts` > "[EQUIP-2] should show assignment information on equipment"

### [EQUIP-3] Equipment list is viewable with table or list format
- **Status**: covered
- **Tests**:
  - `e2e/equipment.spec.ts` > "should display equipment page with list"

### [EQUIP-4] Equipment can be searched/filtered
- **Status**: covered
- **Tests**:
  - `e2e/equipment.spec.ts` > "should show equipment search/filter functionality"
  - `e2e/equipment.spec.ts` > "[EQUIP-4] should filter equipment and show matching results"

### [EQUIP-5] Equipment detail page shows individual item information
- **Status**: covered
- **Tests**:
  - `e2e/equipment.spec.ts` > "[EQUIP-5] should navigate to equipment detail page"

### [EQUIP-6] Authorized users can add new equipment
- **Status**: covered
- **Tests**:
  - `e2e/equipment.spec.ts` > "should have add equipment button"
  - `e2e/equipment.spec.ts` > "should navigate to add equipment page"
  - `e2e/equipment.spec.ts` > "should display add equipment form"

### [EQUIP-7] Equipment with serial number can only be assigned to personnel
- **Status**: covered
- **Tests**:
  - `e2e/equipment.spec.ts` > "[EQUIP-7] should enforce serial number assignment rules"

---

## Access & Security [AUTH]

### [AUTH-1] Three-Tier Role System
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "admin user should access dashboard"
  - `e2e/user-lifecycle.spec.ts` > "leader user should access dashboard"
  - `e2e/user-lifecycle.spec.ts` > "regular user should access dashboard"

### [AUTH-1.1] Admin has full system control
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "admin user should access dashboard"
  - `e2e/user-lifecycle.spec.ts` > "admin should see admin menu items"

### [AUTH-1.2] Leader has oversight of assigned units
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "leader user should access dashboard"

### [AUTH-1.3] User has standard access
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "regular user should access dashboard"

### [AUTH-2] Signature Approved - personnel attribute for transfer authority
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[AUTH-2] should verify signature_approved attribute controls transfer permissions"

### [AUTH-3] Signup Requests - manual approval before access
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "new user should be redirected to signup request page"

### [AUTH-4] Admin Mode toggle
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "[AUTH-4] should toggle admin mode on and off"

### [AUTH-4.1] Admin Mode ON shows admin menu items
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "[AUTH-4.1] should show admin menu items when admin mode is ON"

### [AUTH-4.2] Admin Mode OFF shows standard user view
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "[AUTH-4.2] should hide admin items when admin mode is OFF"

### [AUTH-4.3] Toggle accessible via sidebar for admins
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "[AUTH-4.3] should only show toggle to admin users"

### [AUTH-4.4] Admin Mode state persists across sessions
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "[AUTH-4.4] should persist admin mode state across page refresh"

### [AUTH-5] Protected routes redirect unauthenticated users
- **Status**: covered
- **Tests**:
  - `e2e/auth.spec.ts` > "should redirect to auth page when accessing protected route without login"
  - `e2e/auth.spec.ts` > "should redirect to auth when accessing equipment page without login"
  - `e2e/auth.spec.ts` > "should redirect to auth when accessing personnel page without login"
  - `e2e/user-lifecycle.spec.ts` > "unauthenticated user should be redirected to auth page"

### [AUTH-6] Admin users see settings link in navigation
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "admin should see admin menu items"

### [AUTH-7] Regular users have limited navigation
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "regular user should have limited navigation"

### [AUTH-8] Session persists after page refresh
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "should maintain session after page refresh"

---

## Localization [I18N]

### [I18N-1] Bilingual Support - English and Hebrew
- **Status**: covered
- **Tests**:
  - `e2e/i18n.spec.ts` > "[I18N-1] should support bilingual content (English and Hebrew)"

### [I18N-2] RTL Compatibility
- **Status**: covered
- **Tests**:
  - `e2e/i18n.spec.ts` > "[I18N-2] should have RTL compatibility for Hebrew"

### [I18N-3] Custom Translation Engine
- **Status**: not-testable
- **Notes**: Internal implementation detail

---

## Onboarding Workflow [ONBOARD]

### [ONBOARD-1] User signs up via Google Auth only
- **Status**: not-testable
- **Notes**: Cannot fully test Google OAuth in E2E without mocking; test mode uses bypass

### [ONBOARD-2] New user redirected to Signup Request page
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "new user should be redirected to signup request page"
  - `e2e/user-lifecycle.spec.ts` > "new user cannot access dashboard directly"

### [ONBOARD-3] User enters Service Number, Name, Cell phone, Unit
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "[ONBOARD-3] should display signup form with all required fields"

### [ONBOARD-4] Admin/Leader receives notification on Approvals page
- **Status**: covered
- **Tests**:
  - `e2e/admin-approvals.spec.ts` > "[ONBOARD-4] should display pending signup requests on approvals page"

### [ONBOARD-5] On approval, personnel record is created
- **Status**: covered
- **Tests**:
  - `e2e/admin-approvals.spec.ts` > "[ONBOARD-5] should allow admin to approve signup request"

### [ONBOARD-5.1] Personnel record is created on approval
- **Status**: covered
- **Tests**:
  - `e2e/admin-approvals.spec.ts` > "[ONBOARD-5.1] should create personnel record on approval"

### [ONBOARD-5.2] User role is assigned on approval
- **Status**: covered
- **Tests**:
  - `e2e/admin-approvals.spec.ts` > "[ONBOARD-5.2] should assign role during approval"

### [ONBOARD-5.3] User gains access after approval
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "approved user can access dashboard"

### [ONBOARD-6] Pending users see pending approval page
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "pending user should see pending approval page"
  - `e2e/user-lifecycle.spec.ts` > "pending user cannot access dashboard directly"

### [ONBOARD-7] Declined users see their decline reason
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "declined user should see decline reason"

---

## Equipment Transfer Workflow [XFER]

### [XFER-1] Initiation - user requests transfer
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[XFER-1] should allow user to initiate transfer request"

### [XFER-2] Approval - recipient must accept
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[XFER-2] should show pending transfers for recipient to accept"

### [XFER-3] Completion - database updates and logs transaction
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[XFER-3] should update equipment assignment after transfer completion"

### [XFER-4] Unit equipment transferred only by signature_approved users
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[XFER-4] should only allow signature_approved users to transfer unit equipment"

### [XFER-5] Personal equipment transferred only by assigned personnel
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[XFER-5] should only allow assigned personnel to transfer their equipment"

### [XFER-6] Personal equipment accepted only by accepting personnel
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[XFER-6] should only allow intended recipient to accept personal equipment"

### [XFER-7] Equipment can only transfer to lower hierarchy
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[XFER-7] should only allow transfer to lower hierarchy levels"

### [XFER-8] Equipment transfers between personnel and unit
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[XFER-8] should allow transfer between personnel and unit"

### [XFER-9] Pending transfer shows "pending transfer" status
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[XFER-9] should show pending transfer status on equipment"

### [XFER-10] Declined transfer rolls back status and logs failure
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[XFER-10] should rollback status when transfer is declined"

### [XFER-11] Bulk items allow quantity specification in transfer
- **Status**: covered
- **Tests**:
  - `src/hooks/__tests__/useEquipment.test.tsx` > "requestAssignment passes quantity to initiateTransfer Cloud Function"

### [XFER-12] Transfer quantity preserved in request and applied on approval
- **Status**: covered
- **Tests**:
  - `src/hooks/__tests__/useEquipment.test.tsx` > "requestAssignment passes quantity to initiateTransfer Cloud Function"
- **Notes**: Quantity is stored in the assignmentRequest doc by initiateTransfer CF and read by processTransfer CF when creating the new equipmentAssignment.

---

## User Interface [UI]

### [UI-1] Auth page displays app branding
- **Status**: covered
- **Tests**:
  - `e2e/auth.spec.ts` > "should display auth page with Google sign-in button"

### [UI-2] Auth page shows Google sign-in button
- **Status**: covered
- **Tests**:
  - `e2e/auth.spec.ts` > "should display auth page with Google sign-in button"

### [UI-3] Unknown routes display 404 page
- **Status**: covered
- **Tests**:
  - `e2e/auth.spec.ts` > "should show 404 page for unknown routes"

### [UI-4] Dashboard displays stats cards
- **Status**: covered
- **Tests**:
  - `e2e/dashboard.spec.ts` > "should display dashboard with stats cards"

### [UI-5] Dashboard displays personnel overview section
- **Status**: covered
- **Tests**:
  - `e2e/dashboard.spec.ts` > "should display personnel overview section"

### [UI-6] Sidebar navigation to personnel page
- **Status**: covered
- **Tests**:
  - `e2e/dashboard.spec.ts` > "should navigate to personnel page from sidebar"

### [UI-7] Sidebar navigation to equipment page
- **Status**: covered
- **Tests**:
  - `e2e/dashboard.spec.ts` > "should navigate to equipment page from sidebar"

### [UI-8] Logout redirects to auth page
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "should successfully logout and redirect to auth page"
  - `e2e/user-lifecycle.spec.ts` > "complete lifecycle: login -> navigate -> logout -> login as different user"

---

## User Experience [UX]

### [UX-1] Previously visited page shows data immediately without full-page spinner
- **Status**: covered
- **Tests**:
  - `e2e/transfers.spec.ts` > "[UX-1] should not show full-page spinner when returning to transfers page"

### [UX-2] Action (approve/reject) triggers silent background refresh
- **Status**: not-testable
- **Notes**: Behaviour is coupled to loading state internals; covered by module-level cache implementation in useAssignmentRequests.
