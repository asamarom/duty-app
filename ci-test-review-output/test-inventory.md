# Test Inventory Report
**Duty Tactical Management System (DTMS)**
Generated: 2026-03-10

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Test Files** | 37 |
| **Total Test Cases** | 457 |
| **E2E Tests** | 25 files, 221 test cases |
| **Unit Tests** | 2 files, 106 test cases |
| **Integration/Component Tests** | 10 files, 130 test cases |

---

## Test Coverage by Feature Area

| Feature Area | Test Count | Test Files |
|--------------|-----------|------------|
| **Equipment Management** | 89 | equipment.spec.ts, equipment.mobile.spec.ts, leader-equipment.spec.ts, user-equipment.spec.ts, equipment-missing-battalion.spec.ts, battalion-equipment.spec.ts, useEquipment.test.tsx |
| **Transfers** | 56 | transfers.spec.ts, transfers-role-split.spec.ts, transfers-rtl.spec.ts, equipment-quantity-with-pending-transfers.spec.ts, useAssignmentRequests.test.tsx |
| **Settings** | 54 | settings-navigation.spec.ts, settings-navigation-admin.spec.ts, settings-navigation-leader.spec.ts, settings-navigation-user.spec.ts, ProfileTab.test.tsx, UnitsTab.test.tsx, ApprovalsTab.test.tsx, SettingsTabs.test.tsx |
| **Authentication & User Lifecycle** | 34 | auth.spec.ts, user-lifecycle.spec.ts, admin-approvals.spec.ts |
| **RTL Support** | 31 | rtl.spec.ts, rtl.mobile.spec.ts, transfers-rtl.spec.ts |
| **Personnel** | 7 | personnel.spec.ts |
| **Units** | 18 | units.spec.ts, UnitsTab.test.tsx, useUnitsManagement.test.tsx |
| **Dashboard** | 5 | dashboard.spec.ts |
| **Battalion Scoping** | 10 | battalion-scoping.spec.ts, useUserBattalion.test.tsx |
| **Security** | 87 | firestore-rules.test.ts |
| **Performance** | 3 | performance.spec.ts |
| **Internationalization** | 2 | i18n.spec.ts |
| **Mobile Navigation** | 10 | MobileNav.test.tsx |
| **Role Management** | 8 | useCanManageRole.test.tsx |
| **Utilities** | 19 | version.test.ts |

---

## Test Coverage by User Role

| Role | Test Count | Key Areas |
|------|-----------|-----------|
| **Admin** | 95 | Full CRUD access, approvals, unit management, all transfers, admin mode |
| **Leader** | 68 | Unit-scoped equipment, transfers for their unit, unit management, limited settings |
| **User** | 42 | Personal/unit equipment view, approve incoming transfers, profile settings only |
| **Unauthenticated** | 11 | Auth page display, redirects, protected routes |
| **Cross-Role** | 241 | Security rules, RTL, mobile layout, performance, i18n, utilities |

---

## Test Coverage by Platform

| Platform | Test Count | Test Files |
|----------|-----------|------------|
| **Desktop** | 218 | All .spec.ts files without .mobile suffix |
| **Mobile** | 31 | rtl.mobile.spec.ts, equipment.mobile.spec.ts |
| **Cross-Platform** | 208 | Component tests, hook tests, security rules, utilities |

---

## Detailed Test Inventory

### E2E Tests (25 files, 221 test cases)

#### Authentication & User Lifecycle

**File:** `e2e/auth.spec.ts`
**Test Suite:** Unauthenticated Access
**Test Count:** 5
**Categories:** Authentication, Unauthenticated
**Platform:** Desktop
**Coverage:**
- AUTH-1: Displays authentication page for unauthenticated users
- AUTH-2: Shows login and signup options
- AUTH-3: Redirects to dashboard after authentication
- AUTH-4: Redirects unauthenticated users from protected routes to auth page
- AUTH-5: Shows 404 page for non-existent routes

---

**File:** `e2e/user-lifecycle.spec.ts`
**Test Suite:** User Lifecycle
**Test Count:** 24
**Categories:** User Lifecycle, Authentication, Role-based Access
**Platform:** Desktop
**Coverage:**
- UL-1: Test mode enabled
- UL-2: Approved user can access dashboard
- UL-3: Unapproved user sees pending approval page
- UL-4: Declined user sees declined message
- UL-5: User without signup request sees signup form
- UL-6: User can log out
- UL-7: Admin sees admin-only navigation items
- UL-8: Regular user does not see admin-only items
- UL-9: Session persists across page reloads
- UL-10: Unauthenticated user redirected from protected routes
- UL-11: Admin can toggle admin mode
- UL-12: Admin mode persists in localStorage
- UL-13: Regular user does not see admin mode toggle
- UL-14: New user sees onboarding sheet on first login
- UL-15: Onboarding explains approval process
- UL-16: Onboarding has dismiss button
- UL-17: Dismissed onboarding does not reappear
- UL-18: User sees approval pending message
- UL-19: Pending user cannot access dashboard
- UL-20: Declined user sees declined message
- UL-21: Declined user cannot access dashboard
- UL-22: User can request signup
- UL-23: Signup creates pending request
- UL-24: Admin can see pending request

---

**File:** `e2e/admin-approvals.spec.ts`
**Test Suite:** Admin Approval Workflow
**Test Count:** 5
**Categories:** Admin, Approvals
**Platform:** Desktop
**Coverage:**
- ADMIN-APPR-1: Admin can see pending approval requests
- ADMIN-APPR-2: Admin can approve requests
- ADMIN-APPR-3: Approval creates personnel record
- ADMIN-APPR-4: Admin can assign role after approval
- ADMIN-APPR-5: Admin can decline requests

---

#### Dashboard & Performance

**File:** `e2e/dashboard.spec.ts`
**Test Suite:** Authenticated Dashboard
**Test Count:** 5
**Categories:** Dashboard, Authenticated
**Platform:** Desktop
**Coverage:**
- DASH-1: Authenticated user can access dashboard
- DASH-2: Dashboard shows stats cards
- DASH-3: Dashboard shows personnel overview
- DASH-4: Navigation menu is visible
- DASH-5: User can navigate to equipment page

---

**File:** `e2e/performance.spec.ts`
**Test Suite:** Performance Benchmarks
**Test Count:** 3
**Categories:** Performance
**Platform:** Desktop
**Coverage:**
- PERF-1: Dashboard loads in under 3 seconds
- PERF-2: Navigation between pages completes in under 800ms
- PERF-3: Equipment page loads in under 2 seconds

---

#### Equipment Management

**File:** `e2e/equipment.spec.ts`
**Test Suite:** Equipment Management (Desktop)
**Test Count:** 23
**Categories:** Equipment, Admin, Desktop
**Platform:** Desktop
**Coverage:**
- EQUIP-1: Displays equipment list
- EQUIP-2: Shows equipment details
- EQUIP-3: Admin can add equipment
- EQUIP-4: Admin can edit equipment
- EQUIP-5: Admin can delete equipment
- EQUIP-6: Equipment filtering by status
- EQUIP-7: Equipment search functionality
- EQUIP-8: Equipment pagination
- EQUIP-9: Equipment sorting
- EQUIP-10: Battalion-scoped equipment visibility
- EQUIP-11: Leader sees unit equipment only
- EQUIP-12: User sees personal/unit equipment only
- EQUIP-13: Admin sees all equipment including unassigned
- EQUIP-14: Equipment with pending transfer OUT hidden from Equipment tab
- EQUIP-15: Equipment with pending transfer OUT shown in Transfers tab
- EQUIP-16: Equipment quantity display with pending transfers
- EQUIP-17: Fully transferred equipment hidden from Equipment tab
- EQUIP-18: Admin can create equipment
- EQUIP-19: Admin equipment creation requires name, quantity > 0, status
- EQUIP-20: Leader cannot update equipment fields
- EQUIP-21: User cannot update equipment fields
- EQUIP-22: Leader can delete equipment in their unit
- EQUIP-23: User cannot delete equipment

---

**File:** `e2e/equipment.mobile.spec.ts`
**Test Suite:** Equipment Management (Mobile)
**Test Count:** 18
**Categories:** Equipment, Mobile, Role-based Access
**Platform:** Mobile
**Coverage:**
- EQUIP-MOB-1 to EQUIP-MOB-6: Admin mobile access tests
- EQUIP-MOB-7 to EQUIP-MOB-12: Leader mobile access tests
- EQUIP-MOB-13 to EQUIP-MOB-18: User mobile access tests

---

**File:** `e2e/leader-equipment.spec.ts`
**Test Suite:** Leader Equipment Access
**Test Count:** 8
**Categories:** Equipment, Leader
**Platform:** Desktop
**Coverage:**
- LEADER-EQUIP-1: Leader sees equipment in their unit
- LEADER-EQUIP-2: Leader can create equipment in their unit
- LEADER-EQUIP-2.5: Leader create requires name, quantity > 0, status
- LEADER-EQUIP-3: Leader cannot update equipment fields
- LEADER-EQUIP-4: Leader can delete equipment in their unit
- LEADER-EQUIP-5: Leader can request transfer from their unit
- LEADER-EQUIP-6: Leader sees incoming/outgoing transfers separated
- LEADER-EQUIP-7: Equipment with pending transfer OUT hidden from Equipment tab
- LEADER-EQUIP-8: Leader does NOT see equipment from other units

---

**File:** `e2e/user-equipment.spec.ts`
**Test Suite:** User Equipment Access
**Test Count:** 7
**Categories:** Equipment, User
**Platform:** Desktop
**Coverage:**
- USER-EQUIP-1: User sees equipment assigned to their unit and personally
- USER-EQUIP-2: User cannot create equipment
- USER-EQUIP-3: User cannot update equipment fields
- USER-EQUIP-4: User cannot delete equipment
- USER-EQUIP-5: User can request transfer for personally assigned equipment
- USER-EQUIP-6: User sees pending transfers TO them
- USER-EQUIP-7: User does NOT see equipment with pending transfer OUT

---

**File:** `e2e/equipment-missing-battalion.spec.ts`
**Test Suite:** Equipment Missing BattalionId
**Test Count:** 3
**Categories:** Equipment, Security
**Platform:** Desktop
**Coverage:**
- BATTALION-MISSING-1: Equipment without battalionId blocked for non-admins
- BATTALION-MISSING-2: Admin can see equipment even with missing battalionId
- BATTALION-MISSING-3: Verify all test equipment has battalionId

---

**File:** `e2e/battalion-equipment.spec.ts`
**Test Suite:** Battalion Equipment Access
**Test Count:** 5
**Categories:** Equipment, Leader, Battalion
**Platform:** Desktop
**Coverage:** (Duplicate of leader-equipment.spec.ts tests)

---

**File:** `e2e/equipment-quantity-with-pending-transfers.spec.ts`
**Test Suite:** Equipment Quantity with Pending Transfers
**Test Count:** 2
**Categories:** Equipment, Transfers
**Platform:** Desktop
**Coverage:**
- EQUIP-QUANT-1: Equipment quantity adjusts for pending transfers
- EQUIP-QUANT-2: Fully transferred equipment hidden from Equipment tab

---

#### Personnel Management

**File:** `e2e/personnel.spec.ts`
**Test Suite:** Personnel Management
**Test Count:** 7
**Categories:** Personnel
**Platform:** Desktop
**Coverage:**
- PERS-1: Displays personnel list
- PERS-2: Shows personnel profile details
- PERS-3: Admin can add personnel
- PERS-4: Search personnel by name
- PERS-5: Filter personnel by unit
- PERS-6: Filter personnel by role
- PERS-7: Personnel profile shows equipment assignments

---

#### Units Management

**File:** `e2e/units.spec.ts`
**Test Suite:** Units Management
**Test Count:** 3
**Categories:** Units
**Platform:** Desktop
**Coverage:**
- UNITS-1: Displays battalion hierarchy
- UNITS-2: Shows company units
- UNITS-3: Shows platoon units

---

#### Transfer Workflows

**File:** `e2e/transfers.spec.ts`
**Test Suite:** Transfer Workflows
**Test Count:** 42
**Categories:** Transfers, Admin, Leader, User
**Platform:** Desktop
**Coverage:**
- XFER-1 to XFER-10: Transfer request creation and visibility
- XFER-11 to XFER-15: Transfer approval/rejection workflow
- XFER-16 to XFER-20: Quantity preservation and validation
- XFER-21 to XFER-25: Admin full transfer permissions
- XFER-26 to XFER-30: Leader unit-scoped transfers
- XFER-31 to XFER-35: User incoming transfer approvals only
- XFER-36 to XFER-38: Mobile layout tests
- XFER-39 to XFER-42: Outgoing transfer tracking

---

**File:** `e2e/transfers-role-split.spec.ts`
**Test Suite:** Transfers Role Split
**Test Count:** 8
**Categories:** Transfers, Role-based Access
**Platform:** Desktop
**Coverage:**
- ROLE-SPLIT-1 to ROLE-SPLIT-4: Admin/Leader full access
- ROLE-SPLIT-5 to ROLE-SPLIT-8: User limited access

---

**File:** `e2e/transfers-rtl.spec.ts`
**Test Suite:** Transfers RTL Layout
**Test Count:** 6
**Categories:** Transfers, RTL
**Platform:** Desktop
**Coverage:**
- XFER-RTL-1: Tab direction RTL
- XFER-RTL-2: Transfer cards RTL alignment
- XFER-RTL-3: Arrow icons mirrored in RTL
- XFER-RTL-4: Badge positioning in RTL
- XFER-RTL-5: Tab badge margins in RTL
- XFER-RTL-6: Equipment link direction in RTL

---

#### Settings Management

**File:** `e2e/settings-navigation.spec.ts`
**Test Suite:** Settings Navigation
**Test Count:** 20
**Categories:** Settings, Navigation, Mobile
**Platform:** Desktop + Mobile
**Coverage:**
- SETTINGS-NAV-1 to SETTINGS-NAV-10: Bottom navigation structure
- SETTINGS-NAV-11 to SETTINGS-NAV-15: 3-dot menu functionality
- SETTINGS-NAV-16 to SETTINGS-NAV-20: Mobile responsive and RTL support

---

**File:** `e2e/settings-navigation-admin.spec.ts`
**Test Suite:** Settings Navigation (Admin)
**Test Count:** 10
**Categories:** Settings, Admin
**Platform:** Desktop
**Coverage:**
- SETTINGS-ADMIN-1 to SETTINGS-ADMIN-10: Admin 3-tab settings (Profile, Units, Approvals)

---

**File:** `e2e/settings-navigation-leader.spec.ts`
**Test Suite:** Settings Navigation (Leader)
**Test Count:** 4
**Categories:** Settings, Leader
**Platform:** Desktop
**Coverage:**
- SETTINGS-LEADER-1 to SETTINGS-LEADER-4: Leader 2-tab settings (Profile, Units)

---

**File:** `e2e/settings-navigation-user.spec.ts`
**Test Suite:** Settings Navigation (User)
**Test Count:** 3
**Categories:** Settings, User
**Platform:** Desktop
**Coverage:**
- SETTINGS-USER-1 to SETTINGS-USER-3: User 1-tab settings (Profile only)

---

#### RTL Support

**File:** `e2e/rtl.spec.ts`
**Test Suite:** RTL Layout (Desktop)
**Test Count:** 12
**Categories:** RTL, i18n
**Platform:** Desktop
**Coverage:**
- RTL-1 to RTL-4: Equipment page RTL
- RTL-5 to RTL-8: Personnel page RTL
- RTL-9 to RTL-12: Dashboard RTL

---

**File:** `e2e/rtl.mobile.spec.ts`
**Test Suite:** RTL Layout (Mobile)
**Test Count:** 13
**Categories:** RTL, i18n, Mobile
**Platform:** Mobile
**Coverage:**
- RTL-MOB-1 to RTL-MOB-13: Mobile viewport RTL direction, header, navigation, tabs, search, tables, buttons

---

#### Internationalization

**File:** `e2e/i18n.spec.ts`
**Test Suite:** Internationalization
**Test Count:** 2
**Categories:** i18n
**Platform:** Desktop
**Coverage:**
- I18N-1: Displays bilingual content
- I18N-2: RTL compatibility for Hebrew

---

#### Battalion Scoping

**File:** `e2e/battalion-scoping.spec.ts`
**Test Suite:** Battalion Scoping
**Test Count:** 5
**Categories:** Battalion, Access Control
**Platform:** Desktop
**Coverage:**
- BAT-SCOPE-1: Leader sees full battalion scope
- BAT-SCOPE-2: Equipment loads without infinite spinner
- BAT-SCOPE-3: Battalion filtering works correctly
- BAT-SCOPE-4: Unit-level users see correct scope
- BAT-SCOPE-5: Personal assignments visible across scopes

---

### Unit Tests (2 files, 106 test cases)

#### Version Utilities

**File:** `src/lib/version.test.ts`
**Test Suite:** Version Utilities
**Test Count:** 19
**Categories:** Utilities
**Coverage:**
- getAppVersion() - 4 tests
- getBuildDate() - 4 tests
- compareVersions() - 7 tests
- isNewerVersion() - 4 tests

---

#### Firestore Security Rules

**File:** `src/test/rules/firestore-rules.test.ts`
**Test Suite:** Firestore Security Rules
**Test Count:** 87
**Categories:** Security, Access Control
**Coverage:**
- Unauthenticated access - 5 tests
- Users collection - 8 tests
- Battalion-based access - 12 tests
- Equipment collection - 18 tests
- Signup requests - 8 tests
- Assignment requests - 14 tests
- Units collection - 10 tests
- Equipment assignments - 8 tests
- Regression tests - 4 tests

---

### Integration/Component Tests (10 files, 130 test cases)

#### Settings Components

**File:** `src/components/settings/ProfileTab.test.tsx`
**Test Count:** 11
**Categories:** Settings, Components
**Coverage:**
- User info display - 3 tests
- Language settings - 3 tests
- Admin mode toggle - 3 tests
- Accessibility - 2 tests

---

**File:** `src/components/settings/UnitsTab.test.tsx`
**Test Count:** 11
**Categories:** Settings, Components, Units
**Coverage:**
- Access control - 3 tests
- Summary statistics - 4 tests
- Manage units button - 2 tests
- Role badges - 2 tests

---

**File:** `src/components/settings/SettingsTabs.test.tsx`
**Test Count:** 29
**Categories:** Settings, Components
**Coverage:**
- Tab rendering - 8 tests
- Tab switching - 5 tests
- Role-based visibility - 8 tests
- RTL support - 4 tests
- Accessibility - 4 tests

---

**File:** `src/components/settings/ApprovalsTab.test.tsx`
**Test Count:** 9
**Categories:** Settings, Components, Admin
**Coverage:**
- Admin-only access - 3 tests
- Pending requests display - 4 tests
- Manage approvals button - 2 tests

---

#### Layout Components

**File:** `src/components/layout/MobileNav.test.tsx`
**Test Count:** 10
**Categories:** Navigation, Mobile, Components
**Coverage:**
- 5-button navigation - 3 tests
- Active state highlighting - 3 tests
- Fixed positioning - 1 test
- Role-based display - 3 tests

---

#### Custom Hooks

**File:** `src/hooks/__tests__/useUserBattalion.test.tsx`
**Test Count:** 5
**Categories:** Hooks, Battalion
**Coverage:**
- Battalion-level users - 1 test
- Company-level users - 1 test
- Platoon-level users - 1 test
- Fallback scenarios - 2 tests

---

**File:** `src/hooks/__tests__/useCanManageRole.test.tsx`
**Test Count:** 8
**Categories:** Hooks, Role Management
**Coverage:**
- Admin bypass - 2 tests
- Non-leader rejection - 2 tests
- Leader unit ancestry checks - 2 tests
- httpsCallable replacement - 2 tests

---

**File:** `src/hooks/__tests__/useUnitsManagement.test.tsx`
**Test Count:** 4
**Categories:** Hooks, Units
**Coverage:**
- BattalionId assignment during unit creation - 4 tests

---

**File:** `src/hooks/__tests__/useAssignmentRequests.test.tsx`
**Test Count:** 14
**Categories:** Hooks, Transfers, TDD
**Coverage:**
- fetchRequests - 3 tests
- approveRequest - 3 tests
- rejectRequest - 3 tests
- createRequest with client-side Firestore - 5 tests

---

**File:** `src/hooks/__tests__/useEquipment.test.tsx`
**Test Count:** 11
**Categories:** Hooks, Equipment, TDD
**Coverage:**
- Fetch equipment - 2 tests
- Delete permissions - 2 tests
- Unit matching - 3 tests
- Quantity tracking - 2 tests
- Client-side request creation (TDD red phase) - 2 tests

---

## Test Quality Metrics

### Test Coverage Density

| Category | Test Density | Notes |
|----------|-------------|-------|
| **Critical Paths** | High | Auth, transfers, equipment CRUD well covered |
| **Role-based Access** | High | Admin, leader, user paths thoroughly tested |
| **Security** | High | 87 Firestore rule tests ensure data isolation |
| **Mobile Responsiveness** | Medium | Mobile-specific tests for equipment and RTL |
| **Performance** | Low | Only 3 performance benchmarks |
| **Error Handling** | Low | Limited negative path testing |

### Test Dependencies

**Core Test Utilities:**
- `e2e/utils/test-auth.ts` - Authentication helpers
- `scripts/seed-emulator-users.cjs` - Test data seeding
- `@playwright/test` - E2E framework
- `vitest` - Unit test framework
- `@testing-library/react` - Component testing
- `@firebase/rules-unit-testing` - Security rules testing

### Test Data

**Test Users:**
- test-admin@e2e.local (admin role, approved)
- test-leader@e2e.local (leader role, approved)
- test-user@e2e.local (user role, approved)
- test-new@e2e.local (no signup request)
- test-pending@e2e.local (pending approval)
- test-declined@e2e.local (declined)

**Test Equipment:**
- M4 Carbine (assigned to test-user personally)
- Platoon Vest (assigned to Platoon unit)
- Company Helmet (assigned to Company unit)
- Unassigned Binoculars (unassigned, admin-only visibility)

---

## Test Gaps & Recommendations

### High Priority Gaps

1. **Error Handling**
   - Network failure scenarios
   - Firestore permission denied handling
   - Invalid form input validation
   - Concurrent modification conflicts

2. **Performance**
   - Load testing with large datasets (1000+ equipment items)
   - Pagination performance
   - Search/filter performance with large datasets
   - Concurrent user operations

3. **Integration**
   - End-to-end transfer workflow with multiple approvers
   - Equipment lifecycle from creation to disposal
   - Multi-unit equipment visibility across battalion

### Medium Priority Gaps

4. **Mobile**
   - Touch gesture testing
   - Mobile form validation
   - Mobile navigation edge cases
   - Landscape orientation testing

5. **Internationalization**
   - All pages in Hebrew
   - Date/number formatting
   - Bidirectional text mixing

6. **Accessibility**
   - Screen reader compatibility
   - Keyboard navigation
   - Color contrast validation
   - ARIA label verification

### Low Priority Gaps

7. **Edge Cases**
   - Empty states (no equipment, no personnel)
   - Maximum quantity limits
   - Very long names/descriptions
   - Special characters in inputs

---

## Test Execution Strategy

### Continuous Integration

```bash
# Run all tests
npm run test:e2e        # Local emulator tests
npm run test:e2e:staging # Staging environment tests
npm test                 # Unit/integration tests
```

### Test Environments

| Environment | Purpose | Auth | Database |
|-------------|---------|------|----------|
| **Local Emulator** | Development | Firebase Auth Emulator | Firestore Emulator |
| **Staging** | Pre-production | Firebase Auth (staging project) | Firestore (staging) |
| **Production** | Live system | Firebase Auth (production) | Firestore (production) |

### Test Categorization Tags

Tests are tagged with categories for selective execution:

- `[AUTH]` - Authentication tests
- `[ADMIN]` - Admin-specific tests
- `[LEADER]` - Leader-specific tests
- `[USER]` - User-specific tests
- `[EQUIP]` - Equipment tests
- `[XFER]` - Transfer tests
- `[RTL]` - RTL layout tests
- `[MOBILE]` - Mobile-specific tests
- `[PERF]` - Performance tests

---

## Maintenance Notes

### Test Data Management

- Test users seeded via `scripts/seed-emulator-users.cjs`
- Equipment test data created in setup hooks
- Clean up after tests to avoid state pollution
- Use unique IDs for parallel test execution

### Test Stability

**Known Flaky Tests:**
- Performance tests may fail on slow CI runners (increase timeouts if needed)
- Transfer workflow tests depend on timing (use waitForTimeout strategically)

**Best Practices:**
- Use data-testid attributes for stable selectors
- Avoid hardcoded delays; prefer waitForLoadState
- Clean up test data in afterEach hooks
- Use isolated test accounts per test file

---

## Report Metadata

- **Generated:** 2026-03-10
- **Total Files Analyzed:** 37
- **Total Test Cases:** 457
- **Test Framework:** Playwright (E2E), Vitest (Unit/Integration)
- **Coverage Tool:** Manual inventory (no automated coverage)

---

**End of Report**
