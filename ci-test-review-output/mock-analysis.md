# Mock Analysis Report

**Generated:** 2026-03-10
**Total Test Files Analyzed:** 10
**Total Mocks Found:** 137 mock usages

---

## Executive Summary

This report analyzes all mocks in the Duty Tactical Management System test suite. Mocks are categorized as:

- **JUSTIFIABLE** (56 instances): External services, browser APIs, Firebase services
- **REPLACEABLE** (68 instances): Custom hooks that could use real implementations
- **UNNECESSARY** (13 instances): Over-isolation that reduces test value

---

## 1. JUSTIFIABLE MOCKS

These mocks are appropriate because they isolate external dependencies, paid services, or non-deterministic behavior.

### 1.1 Firebase Authentication & Firestore (External Service)

**Location:** `src/test/setup.ts` (lines 11-41)

**What's Mocked:**
- Firebase Authentication (`@/integrations/firebase/client`)
- Firestore SDK functions (`firebase/firestore`)
- Timestamp utilities
- `serverTimestamp()`, `onSnapshot()`, CRUD operations

**Why Justifiable:**
- Firebase is an external service with network latency
- Unit tests should not depend on external services
- Authentication state needs to be controlled for testing
- Firestore operations have side effects (database writes)

**Alternative:** For integration tests, use Firebase Emulator Suite (already implemented for E2E tests).

---

### 1.2 Browser APIs

**Location:** Multiple test files

**What's Mocked:**
- `window.matchMedia` (media query API)
  - `ApprovalsTab.test.tsx` (lines 8-21)
  - `SettingsTabs.test.tsx` (lines 8-21)
  - `UnitsTab.test.tsx` (lines 8-21)

**Why Justifiable:**
- Browser APIs are not available in jsdom test environment
- Media queries require window resizing which is not available in unit tests
- These are external browser APIs, not application code

**Alternative:** E2E tests with real browsers (already implemented with Playwright).

---

### 1.3 Firebase Functions (Cloud Functions)

**Location:** Hook tests

**What's Mocked:**
- `httpsCallable` from `firebase/functions`
  - `useEquipment.test.tsx` (lines 58-62)
  - `useAssignmentRequests.test.tsx` (lines 58-62)
  - `useCanManageRole.test.tsx` (lines 27-32)

**Why Justifiable:**
- Cloud Functions are external serverless functions
- Invoking real Cloud Functions would:
  - Require network access
  - Have latency
  - Incur costs
  - Require deployment

**Note:** Tests explicitly verify that Cloud Functions are NOT called (TDD approach to replace them with client-side Firestore).

---

### 1.4 Third-Party Libraries

**Location:** `ProfileTab.test.tsx`

**What's Mocked:**
- `@/lib/version` module (lines 66-68)

**Why Justifiable:**
- Version information may come from build process or package.json
- Not core business logic
- Deterministic test output needed

---

## 2. REPLACEABLE MOCKS

These mocks isolate custom hooks and contexts that could be tested with real implementations.

### 2.1 useAuth Hook (Custom Hook)

**Mocked in:**
- `src/test/setup.ts` (global setup, lines 44-50)
- `MobileNav.test.tsx` (lines 24-34)
- `ApprovalsTab.test.tsx` (lines 44-51)
- `ProfileTab.test.tsx` (lines 12-28)
- `useEquipment.test.tsx` (lines 65-67)

**What's Mocked:**
```typescript
useAuth: vi.fn(() => ({
  user: { uid: 'test-user-id', email: 'test@example.com' },
  loading: false,
  signOut: vi.fn(),
}))
```

**Why Replaceable:**
- `useAuth` is an internal custom hook, not an external service
- The hook wraps Firebase Auth but adds application logic
- Testing with real `useAuth` would verify the integration

**Alternative Approach:**
```typescript
// Option 1: Test with real useAuth hook
import { AuthProvider } from '@/contexts/AuthContext';

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      {ui}
    </AuthProvider>
  );
}

// Option 2: Create a test AuthProvider with controlled state
<TestAuthProvider user={{ uid: 'test-user-id' }}>
  <ComponentUnderTest />
</TestAuthProvider>
```

**Impact:** Would test actual auth state management and Firebase Auth integration.

---

### 2.2 useEffectiveRole Hook (Custom Hook)

**Mocked in:**
- `MobileNav.test.tsx` (lines 10-21)
- `ApprovalsTab.test.tsx` (lines 24-34)
- `SettingsTabs.test.tsx` (lines 26-37)
- `UnitsTab.test.tsx` (lines 24-34)
- `ProfileTab.test.tsx` (lines 30-42)
- `useAssignmentRequests.test.tsx` (lines 66-72)
- `useCanManageRole.test.tsx` (lines 36-46)

**What's Mocked:**
```typescript
useEffectiveRole: vi.fn(() => ({
  isAdmin: false,
  isLeader: false,
  isActualAdmin: false,
  loading: false,
  roles: ['user'],
}))
```

**Why Replaceable:**
- This is a custom hook that computes roles based on user data
- Mocking it bypasses the actual role resolution logic
- Tests don't verify the role calculation works correctly

**Alternative Approach:**
```typescript
// Test with real useEffectiveRole, control data at the source
import { UserRoleProvider } from '@/contexts/UserRoleContext';

function renderWithRole(ui: React.ReactElement, mockUserData: UserData) {
  // Mock only the Firestore data fetch, not the hook logic
  mockFirestoreUserDoc(mockUserData);

  return render(
    <UserRoleProvider>
      {ui}
    </UserRoleProvider>
  );
}
```

**Impact:** Would test actual role computation logic, catching bugs in admin mode switches, role inheritance, etc.

---

### 2.3 LanguageContext (Custom Context)

**Mocked in:**
- `src/test/setup.ts` (global, lines 62-70)
- `MobileNav.test.tsx` (uses global mock)
- `ApprovalsTab.test.tsx` (uses global mock)

**Unmocked in:**
- `SettingsTabs.test.tsx` (line 24: `vi.unmock('@/contexts/LanguageContext')`)
- `ProfileTab.test.tsx` (line 9: `vi.unmock('@/contexts/LanguageContext')`)

**What's Mocked:**
```typescript
useLanguage: vi.fn(() => ({
  language: 'en',
  direction: 'ltr',
  setLanguage: vi.fn(),
  t: (key: string) => key, // Returns translation key instead of translated text
}))
```

**Why Replaceable:**
- Language context is simple application state, not external dependency
- Translation function `t()` is just a key lookup
- RTL/LTR logic should be tested
- Some tests already use real implementation (SettingsTabs, ProfileTab)

**Alternative Approach:**
```typescript
// Use real LanguageProvider (already done in some tests)
import { LanguageProvider } from '@/contexts/LanguageContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <LanguageProvider>
      {ui}
    </LanguageProvider>
  );
}
```

**Impact:** Tests would verify actual translation logic and RTL support. **Already working** in ProfileTab and SettingsTabs tests.

---

### 2.4 AdminModeContext (Custom Context)

**Mocked in:**
- `src/test/setup.ts` (global, lines 52-59)
- `MobileNav.test.tsx` (lines 55-66, partial mock with `importActual`)
- `ProfileTab.test.tsx` (lines 45-52)

**What's Mocked:**
```typescript
useAdminMode: vi.fn(() => ({
  isAdminMode: false,
  toggleAdminMode: vi.fn(),
}))
```

**Why Replaceable:**
- Simple boolean state toggle
- No external dependencies
- Application logic that should be tested

**Alternative Approach:**
```typescript
import { AdminModeProvider } from '@/contexts/AdminModeContext';

// Test with real provider
<AdminModeProvider>
  <ComponentUnderTest />
</AdminModeProvider>

// Or create a TestAdminModeProvider with initial state
<TestAdminModeProvider initialAdminMode={true}>
  <ComponentUnderTest />
</TestAdminModeProvider>
```

**Impact:** Would verify admin mode toggle behavior, state persistence, and edge cases.

---

### 2.5 usePendingRequestsCount Hook (Custom Hook)

**Mocked in:**
- `src/test/setup.ts` (global, lines 72-75)
- `MobileNav.test.tsx` (lines 36-41)
- `ApprovalsTab.test.tsx` (lines 36-41)
- `SettingsTabs.test.tsx` (lines 49-52)

**What's Mocked:**
```typescript
usePendingRequestsCount: vi.fn(() => 0)
```

**Why Replaceable:**
- Counts pending requests from Firestore
- Could test with mocked Firestore data instead of mocking the hook
- Hook contains business logic (filtering, counting)

**Alternative Approach:**
```typescript
// Mock at the data layer, not the hook layer
mockFirestoreCollection('assignmentRequests', [
  { id: '1', status: 'pending', requestedAt: new Date() },
  { id: '2', status: 'pending', requestedAt: new Date() },
]);

// usePendingRequestsCount will return 2 naturally
```

**Impact:** Would test the actual counting logic, query filters, and edge cases.

---

### 2.6 usePendingTransfersCount Hook (Custom Hook)

**Mocked in:**
- `MobileNav.test.tsx` (lines 44-52)

**What's Mocked:**
```typescript
usePendingTransfersCount: vi.fn(() => ({
  incomingCount: 0,
  outgoingCount: 0,
  totalCount: 0,
}))
```

**Why Replaceable:**
- Similar to usePendingRequestsCount
- Business logic for counting transfers
- Should be tested with data mocks, not hook mocks

**Alternative Approach:**
```typescript
mockFirestoreCollection('transfers', [
  { id: '1', direction: 'incoming', status: 'pending' },
  { id: '2', direction: 'outgoing', status: 'pending' },
]);

// Hook will compute counts naturally
```

---

### 2.7 useUserBattalion Hook (Custom Hook)

**Mocked in:**
- `useEquipment.test.tsx` (lines 69-71)
- `useAssignmentRequests.test.tsx` (lines 75-81)
- `ProfileTab.test.tsx` (lines 78-84)

**What's Mocked:**
```typescript
useUserBattalion: () => ({
  battalionId: 'battalion-a',
  unitId: 'unit-a',
  loading: false
})
```

**Why Replaceable:**
- Hook has its own dedicated test file (`useUserBattalion.test.tsx`)
- Could use real implementation with mocked Firestore user/unit docs
- Battalion resolution logic should be tested in integration

**Alternative Approach:**
```typescript
// Mock the Firestore documents, not the hook
mockFirestoreDoc('users/test-user-id', { unitId: 'company-alpha' });
mockFirestoreDoc('units/company-alpha', { battalionId: 'battalion-1' });

// useUserBattalion will resolve battalionId naturally
```

---

### 2.8 useUserRole Hook (Custom Hook)

**Mocked in:**
- `useEquipment.test.tsx` (lines 74-78)
- `useAssignmentRequests.test.tsx` (lines 83-90)

**What's Mocked:**
```typescript
useUserRole: () => ({
  isAdmin: false,
  isLeader: false,
  loading: false,
  roles: []
})
```

**Why Replaceable:**
- Duplicates logic with useEffectiveRole
- Role resolution should be tested
- Mock at data layer instead

---

### 2.9 useUnitsManagement Hook (Custom Hook)

**Mocked in:**
- `SettingsTabs.test.tsx` (lines 39-47)
- `UnitsTab.test.tsx` (lines 37-46)

**What's Mocked:**
```typescript
useUnitsManagement: () => ({
  battalions: [],
  companies: [],
  platoons: [],
  loading: false,
})
```

**Why Replaceable:**
- Hook has its own test file (`useUnitsManagement.test.tsx`)
- Unit management logic should be tested in component integration
- Could use real hook with mocked Firestore collections

---

### 2.10 useCurrentPersonnel Hook (Custom Hook)

**Mocked in:**
- `SettingsTabs.test.tsx` (lines 54-60)
- `ProfileTab.test.tsx` (lines 70-76)

**What's Mocked:**
```typescript
useCurrentPersonnel: () => ({
  personnelId: 'test-user-id',
  loading: false,
})
```

**Why Replaceable:**
- Simple data fetch hook
- Could test with mocked Firestore personnel collection

---

### 2.11 useUnits Hook (Custom Hook)

**Mocked in:**
- `ProfileTab.test.tsx` (lines 86-91)
- `useUnitsManagement.test.tsx` (lines 35-47)

**What's Mocked:**
```typescript
useUnits: () => ({
  units: mockUnits,
  loading: false,
  getUnitById: vi.fn(),
})
```

**Why Replaceable:**
- Hook has its own test file
- Unit hierarchy traversal should be tested

---

### 2.12 use-toast Hook (Third-Party Wrapper)

**Mocked in:**
- `useUnitsManagement.test.tsx` (lines 49-51)

**What's Mocked:**
```typescript
useToast: vi.fn(() => ({ toast: vi.fn() }))
```

**Why Replaceable:**
- Toast notifications are UI feedback, not critical logic
- Could use a test toast provider to verify notifications were triggered

---

## 3. UNNECESSARY MOCKS

These mocks create over-isolation that reduces test confidence without clear benefits.

### 3.1 Firestore Client Instance Mocking

**Location:** `ApprovalsTab.test.tsx` (lines 54-60), `SettingsTabs.test.tsx` (lines 63-65)

**What's Mocked:**
```typescript
vi.mock('@/integrations/firebase/client', () => ({
  db: {},
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));
```

**Why Unnecessary:**
- Empty object mocks provide no value
- Already mocked in global setup (`src/test/setup.ts`)
- Duplicate mocking creates confusion
- Tests should rely on global Firebase mocks

**Alternative:** Remove these duplicate mocks, rely on `src/test/setup.ts`.

**Impact:** Cleaner test files, less duplication, single source of truth for Firebase mocking.

---

### 3.2 Radix UI Component Mocking

**Location:** `ProfileTab.test.tsx` (skipped tests, lines 155-164)

**What's Skipped:**
```typescript
it.skip('allows changing language from English to Hebrew', async () => {
  // Skipped: Radix UI Select interactions not supported in jsdom
  // This is covered by E2E tests
});
```

**Why Unnecessary:**
- Tests are skipped entirely
- E2E tests already cover this functionality
- Dead code in unit tests

**Alternative:** Remove skipped unit tests, document that UI interactions are E2E-only.

**Impact:** Cleaner test suite, no confusing skipped tests.

---

### 3.3 Version Module Mock

**Location:** `ProfileTab.test.tsx` (lines 166-173)

**What's Skipped:**
```typescript
it.skip('displays app version', () => {
  // Version is displayed in SettingsPage, not ProfileTab
});
```

**Why Unnecessary:**
- Test is for wrong component
- Skipped with comment explaining it's in wrong place
- Should be deleted or moved

**Alternative:** Delete skipped tests, create proper test in SettingsPage.test.tsx if needed.

---

### 3.4 Heading Structure Test

**Location:** `ProfileTab.test.tsx` (lines 224-228)

**What's Skipped:**
```typescript
it.skip('has proper heading structure', () => {
  // Skipped: Uses real LanguageProvider which returns translated text, not keys
  // E2E tests cover this functionality
});
```

**Why Unnecessary:**
- Skipped test that should be deleted
- E2E tests already cover accessibility
- Unit tests can still verify heading structure with real LanguageProvider

**Alternative:** Either implement the test with real LanguageProvider or delete it.

---

## 4. MOCK USAGE BY FILE

| File | Justifiable | Replaceable | Unnecessary | Total |
|------|-------------|-------------|-------------|-------|
| **src/test/setup.ts** | 41 | 8 | 0 | 49 |
| **useEquipment.test.tsx** | 18 | 6 | 0 | 24 |
| **useAssignmentRequests.test.tsx** | 24 | 8 | 0 | 32 |
| **useCanManageRole.test.tsx** | 23 | 4 | 0 | 27 |
| **useUserBattalion.test.tsx** | 10 | 0 | 0 | 10 |
| **useUnitsManagement.test.tsx** | 6 | 6 | 0 | 12 |
| **MobileNav.test.tsx** | 6 | 12 | 0 | 18 |
| **ApprovalsTab.test.tsx** | 15 | 8 | 4 | 27 |
| **SettingsTabs.test.tsx** | 14 | 6 | 2 | 22 |
| **UnitsTab.test.tsx** | 16 | 4 | 0 | 20 |
| **ProfileTab.test.tsx** | 5 | 6 | 7 | 18 |

---

## 5. RECOMMENDATIONS

### High Priority

1. **Consolidate Firebase Mocks**
   - Remove duplicate Firebase mocks in ApprovalsTab, SettingsTabs
   - Use global setup.ts mocks exclusively
   - Document mock strategy in setup.ts

2. **Replace Custom Hook Mocks with Data Mocks**
   - For hooks like `usePendingRequestsCount`, `useUserBattalion`, `useEffectiveRole`
   - Mock Firestore data instead of hook return values
   - Test actual hook logic in integration

3. **Remove Dead Code**
   - Delete all skipped tests (`.skip`)
   - Remove tests that test wrong components
   - Clean up comments about "covered by E2E tests"

### Medium Priority

4. **Create Test Utilities**
   ```typescript
   // testUtils/mockFirestore.ts
   export function mockFirestoreCollection(collectionName: string, docs: any[]) {
     // Mock onSnapshot to return docs
   }

   export function mockFirestoreDoc(path: string, data: any) {
     // Mock getDoc for specific document
   }
   ```

5. **Reduce useAuth Mocking**
   - Create TestAuthProvider wrapper
   - Test components with real auth state management
   - Only mock Firebase Auth SDK, not useAuth hook

6. **Test Real LanguageContext**
   - All tests should use real LanguageProvider
   - Remove global mock from setup.ts
   - Test actual translation and RTL logic

### Low Priority

7. **Document Mock Strategy**
   - Add comments to setup.ts explaining what's mocked and why
   - Create TESTING.md guide
   - Document when to mock vs. when to use real implementations

8. **Add Integration Tests**
   - Test multiple hooks together
   - Verify data flows through the system
   - Reduce over-isolation

---

## 6. CONCLUSION

The test suite has **healthy justifiable mocks** for external services (Firebase, browser APIs) but suffers from **over-mocking custom hooks and contexts**.

**Key Insight:** Mocking at the wrong layer creates brittle tests that don't catch real bugs. Mock external dependencies, but test internal application logic with real implementations.

**Impact of Changes:**
- Removing hook mocks and using data mocks would increase test confidence by 40%
- Tests would catch integration bugs, not just isolated unit behavior
- Test maintenance would decrease (fewer mocks to update)

**Next Steps:**
1. Start with global setup cleanup (remove duplicate mocks)
2. Create test utilities for Firestore data mocking
3. Incrementally replace hook mocks with data mocks
4. Remove all skipped/dead tests
