# Test Coverage Matrix

This document maps product requirements from [PRODUCT.md](./PRODUCT.md) to their covering E2E tests.

**Status values**: `covered` | `partial` | `gap` | `not-testable`

---

## Summary

| Area | Total | Covered | Partial | Gaps |
|------|-------|---------|---------|------|
| UNIT | 3 | 0 | 0 | 3 |
| PERS | 4 | 3 | 1 | 0 |
| EQUIP | 7 | 4 | 1 | 2 |
| AUTH | 12 | 7 | 0 | 5 |
| I18N | 3 | 0 | 0 | 3 |
| ONBOARD | 9 | 3 | 0 | 6 |
| XFER | 10 | 0 | 0 | 10 |
| UI | 8 | 8 | 0 | 0 |
| **Total** | **56** | **25** | **2** | **29** |

---

## Unit Hierarchy [UNIT]

### [UNIT-1] Battalion is the primary command level
- **Status**: gap
- **Notes**: No E2E test for unit hierarchy display

### [UNIT-2] Company is mid-level tactical unit
- **Status**: gap
- **Notes**: No E2E test for company level

### [UNIT-3] Platoon is core operational unit
- **Status**: gap
- **Notes**: No E2E test for platoon level

---

## Personnel Management [PERS]

### [PERS-1] Profiles include Service Number, Rank, Duty Position, Contact Info
- **Status**: gap
- **Notes**: Need test to verify profile fields

### [PERS-2] Personnel list is viewable with table or list format
- **Status**: covered
- **Tests**:
  - `e2e/personnel.spec.ts` > "should display personnel page with list"
  - `e2e/personnel.spec.ts` > "should display personnel table or list"

### [PERS-3] Personnel can be searched/filtered
- **Status**: partial
- **Tests**:
  - `e2e/personnel.spec.ts` > "should show search/filter for personnel"
- **Notes**: Test fills search but doesn't verify results

### [PERS-4] Personnel detail page shows individual information
- **Status**: covered
- **Tests**:
  - `e2e/personnel.spec.ts` > "should navigate to personnel detail when clicking on person"

---

## Equipment Inventory [EQUIP]

### [EQUIP-1] Lifecycle Tracking - manage items from acquisition to disposal
- **Status**: gap
- **Notes**: No E2E test for lifecycle states

### [EQUIP-2] Assignment System - issue equipment to individuals, companies, or platoons
- **Status**: gap
- **Notes**: No E2E test for assignment workflow

### [EQUIP-3] Equipment list is viewable with table or list format
- **Status**: covered
- **Tests**:
  - `e2e/equipment.spec.ts` > "should display equipment page with list"

### [EQUIP-4] Equipment can be searched/filtered
- **Status**: partial
- **Tests**:
  - `e2e/equipment.spec.ts` > "should show equipment search/filter functionality"
- **Notes**: Test fills search but doesn't verify results

### [EQUIP-5] Equipment detail page shows individual item information
- **Status**: gap
- **Notes**: No E2E test for equipment detail page

### [EQUIP-6] Authorized users can add new equipment
- **Status**: covered
- **Tests**:
  - `e2e/equipment.spec.ts` > "should have add equipment button"
  - `e2e/equipment.spec.ts` > "should navigate to add equipment page"
  - `e2e/equipment.spec.ts` > "should display add equipment form"

### [EQUIP-7] Equipment with serial number can only be assigned to personnel
- **Status**: gap
- **Notes**: No E2E test for serial number assignment rule

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
- **Status**: gap
- **Notes**: No E2E test for signature_approved attribute

### [AUTH-3] Signup Requests - manual approval before access
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "new user should be redirected to signup request page"

### [AUTH-4] Admin Mode toggle
- **Status**: gap
- **Notes**: Need test for admin mode toggle functionality

### [AUTH-4.1] Admin Mode ON shows admin menu items
- **Status**: gap
- **Notes**: Covered implicitly but no dedicated toggle test

### [AUTH-4.2] Admin Mode OFF shows standard user view
- **Status**: gap
- **Notes**: No E2E test for admin mode OFF state

### [AUTH-4.3] Toggle accessible via sidebar for admins
- **Status**: gap
- **Notes**: No E2E test for toggle accessibility

### [AUTH-4.4] Admin Mode state persists across sessions
- **Status**: gap
- **Notes**: No E2E test for localStorage persistence

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
- **Status**: gap
- **Notes**: No dedicated i18n test (implicitly tested via regex matchers)

### [I18N-2] RTL Compatibility
- **Status**: gap
- **Notes**: No E2E test for RTL layout verification

### [I18N-3] Custom Translation Engine
- **Status**: not-testable
- **Notes**: Internal implementation detail

---

## Onboarding Workflow [ONBOARD]

### [ONBOARD-1] User signs up via Google Auth only
- **Status**: gap
- **Notes**: Cannot fully test Google OAuth in E2E without mocking

### [ONBOARD-2] New user redirected to Signup Request page
- **Status**: covered
- **Tests**:
  - `e2e/user-lifecycle.spec.ts` > "new user should be redirected to signup request page"
  - `e2e/user-lifecycle.spec.ts` > "new user cannot access dashboard directly"

### [ONBOARD-3] User enters Service Number, Name, Cell phone, Unit
- **Status**: gap
- **Notes**: No E2E test for signup form submission

### [ONBOARD-4] Admin/Leader receives notification on Approvals page
- **Status**: gap
- **Notes**: No E2E test for admin approval notifications

### [ONBOARD-5] On approval, personnel record is created
- **Status**: gap
- **Notes**: No E2E test for approval workflow

### [ONBOARD-5.1] Personnel record is created on approval
- **Status**: gap
- **Notes**: No E2E test

### [ONBOARD-5.2] User role is assigned on approval
- **Status**: gap
- **Notes**: No E2E test

### [ONBOARD-5.3] User gains access after approval
- **Status**: gap
- **Notes**: No E2E test for post-approval access

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
- **Status**: gap
- **Notes**: No E2E test for transfer initiation

### [XFER-2] Approval - recipient must accept
- **Status**: gap
- **Notes**: No E2E test for transfer approval

### [XFER-3] Completion - database updates and logs transaction
- **Status**: gap
- **Notes**: No E2E test for transfer completion

### [XFER-4] Unit equipment transferred only by signature_approved users
- **Status**: gap
- **Notes**: No E2E test for transfer permission rules

### [XFER-5] Personal equipment transferred only by assigned personnel
- **Status**: gap
- **Notes**: No E2E test

### [XFER-6] Personal equipment accepted only by accepting personnel
- **Status**: gap
- **Notes**: No E2E test

### [XFER-7] Equipment can only transfer to lower hierarchy
- **Status**: gap
- **Notes**: No E2E test for hierarchy rules

### [XFER-8] Equipment transfers between personnel and unit
- **Status**: gap
- **Notes**: No E2E test

### [XFER-9] Pending transfer shows "pending transfer" status
- **Status**: gap
- **Notes**: No E2E test for pending status display

### [XFER-10] Declined transfer rolls back status and logs failure
- **Status**: gap
- **Notes**: No E2E test for declined transfer handling

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
