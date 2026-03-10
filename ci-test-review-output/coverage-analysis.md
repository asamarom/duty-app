# Test Coverage Analysis

## Current Coverage: 59.23%
Based on Vitest coverage report (v8 provider):

- **Statements**: 57.5%
- **Branches**: 41.6%
- **Functions**: 42.9%
- **Lines**: 59.23%

## Target Coverage: 85%

## Coverage Gap: 25.77%

**Gap to target:** Need to increase coverage by approximately **26 percentage points** to reach the 85% target.

---

## Coverage Breakdown by Area

### ✅ Well-Covered Areas (>80%)

| Component/Module | Coverage | Status |
|------------------|----------|--------|
| **MobileNav** | 100% | ✅ Excellent |
| **i18n/translations** | 100% | ✅ Excellent |
| **lib/utils** | 100% | ✅ Excellent |
| **lib/version** | 92.3% | ✅ Great |
| **Settings Components** | 86.95% avg | ✅ Great |
| **UI Components** | 89.28% avg | ✅ Great |
| **useMediaQuery hook** | 90.9% | ✅ Great |

### ⚠️ Moderately Covered Areas (50-80%)

| Component/Module | Coverage | Gaps |
|------------------|----------|------|
| **LanguageContext** | 76% | Missing edge cases |
| **useCanManageRole** | 80.39% | Missing error paths |
| **useUserBattalion** | 75.86% | Missing boundary conditions |
| **useAssignmentRequests** | 63.88% | Missing error handling |
| **useUnitsManagement** | 60% | Missing failure scenarios |

### 🔴 Low/No Coverage Areas (<50%)

| Component/Module | Coverage | Priority |
|------------------|----------|----------|
| **ApprovalManagement** | 40.42% | 🔴 HIGH |
| **UnitsManagement** | 26.31% | 🔴 HIGH |
| **useEquipment** | 47.5% | 🔴 HIGH |
| **useUnits** | 41.79% | 🔴 HIGH |
| **useAuth (AdminModeContext)** | 11.76% | 🔴 CRITICAL |
| **use-toast** | 33.33% | 🟡 MEDIUM |

---

## Critical Gaps Identified

### 1. **AdminModeContext (11.76% coverage)** 🔴 CRITICAL
- **Location**: `contexts/AdminModeContext.tsx`
- **Issue**: Core admin mode toggle logic is almost entirely untested
- **Impact**: Admin mode switching, persistence, role switching all untested
- **Recommendation**: Add integration tests for admin mode workflows

### 2. **ApprovalManagement Component (40.42%)** 🔴 HIGH
- **Location**: `components/approvals/ApprovalManagement.tsx`
- **Uncovered**: Lines 117, 232, 267-480
- **Issue**: Approval workflows, state updates, error handling mostly untested
- **Impact**: Critical business logic for user approvals
- **Recommendation**: Add tests for approval/decline workflows, assignment creation, error states

### 3. **UnitsManagement Component (26.31%)** 🔴 HIGH
- **Location**: `components/units/UnitsManagement.tsx`
- **Uncovered**: Lines 103, 415, 436-508
- **Issue**: Unit CRUD operations, hierarchy management untested
- **Impact**: Organizational structure management
- **Recommendation**: Add tests for create/update/delete unit operations

### 4. **useEquipment Hook (47.5%)** 🔴 HIGH
- **Location**: `hooks/useEquipment.tsx`
- **Uncovered**: Lines 177-685, 706-707
- **Issue**: Equipment filtering, assignment logic, transfer handling
- **Impact**: Core equipment management business logic
- **Recommendation**: Add tests for equipment operations beyond basic CRUD

### 5. **useUnits Hook (41.79%)** 🔴 HIGH
- **Location**: `hooks/useUnits.tsx`
- **Uncovered**: Lines 39-158, 162, 166
- **Issue**: Unit hierarchy traversal, filtering by battalion
- **Impact**: Organizational navigation and scoping
- **Recommendation**: Add tests for hierarchy traversal, filtering logic

---

## Files Needing Coverage

### Components (Priority Order)

1. **ApprovalManagement.tsx** - 40.42% → Target 80%
2. **UnitsManagement.tsx** - 26.31% → Target 80%

### Hooks (Priority Order)

1. **useAuth / AdminModeContext.tsx** - 11.76% → Target 80%
2. **useUnits.tsx** - 41.79% → Target 80%
3. **useEquipment.tsx** - 47.5% → Target 80%
4. **useAssignmentRequests.tsx** - 63.88% → Target 80%

### UI Components (Lower Priority)

Most UI components already have good coverage (>80%). Focus on:
- Input, Textarea, Label components (66-75% coverage)
- These are simple presentational components - lower priority

---

## Coverage by Feature Area

Based on test inventory and coverage data:

| Feature | Test Count | Coverage Estimate | Gap |
|---------|-----------|-------------------|-----|
| **Equipment** | 89 tests | ~60% (useEquipment 47.5%) | Medium |
| **Approvals** | 5 tests | ~40% (ApprovalMgmt 40.42%) | 🔴 HIGH |
| **Units** | 18 tests | ~35% (UnitsMgmt 26%, useUnits 41%) | 🔴 HIGH |
| **Settings** | 54 tests | ~87% (excellent) | ✅ Good |
| **Authentication** | 34 tests | ~30% (AdminMode 11.76%) | 🔴 HIGH |
| **Transfers** | 56 tests | ~64% (useAssignReq 63.88%) | Medium |

---

## Recommendations

### Immediate Actions (Close Gap by ~15%)

1. **Add AdminModeContext tests** (+8%)
   - Test admin mode toggle on/off
   - Test persistence to localStorage
   - Test role switching with admin mode
   - Test restrictions for non-admin users

2. **Add ApprovalManagement component tests** (+5%)
   - Test approval workflow (pending → approved)
   - Test decline workflow
   - Test personnel assignment after approval
   - Test batch operations
   - Test error states

3. **Add UnitsManagement tests** (+2%)
   - Test unit creation with hierarchy
   - Test unit update operations
   - Test unit deletion with validation
   - Test battalion inheritance

### Secondary Actions (Close remaining ~10%)

4. **Expand useEquipment hook tests** (+5%)
   - Test equipment filtering by status, battalion, unit
   - Test transfer request creation
   - Test equipment assignment logic
   - Test quantity calculations with pending transfers

5. **Expand useUnits hook tests** (+3%)
   - Test hierarchy traversal (battalion → company → platoon)
   - Test filtering by battalion
   - Test parent/child relationship queries

6. **Add useUnitsManagement tests** (+2%)
   - Test create/update/delete operations
   - Test error handling
   - Test toast notifications

---

## Testing Strategy

### Recommended Approach

1. **Unit Tests First** (Hooks & Contexts)
   - AdminModeContext
   - useEquipment
   - useUnits
   - These are pure logic - fastest to test

2. **Integration Tests Second** (Components)
   - ApprovalManagement
   - UnitsManagement
   - These need component rendering + data mocking

3. **E2E Coverage** (Already Good)
   - Current E2E tests (244 tests) provide excellent end-to-end coverage
   - Focus unit/integration tests on logic not covered by E2E

---

## Current vs Target

```
Current Coverage:  59.23% ████████████░░░░░░░░░░░░
Target Coverage:   85.00% █████████████████░░░░░░░
Gap:              -25.77% ░░░░░░░░░░░░░
```

### Coverage Increase Needed: +26%

**Estimated Tests Needed:**
- 15-20 additional unit/integration tests
- Focus on AdminModeContext (1), ApprovalManagement (3-4), UnitsManagement (2-3), useEquipment (3-4), useUnits (2-3)

---

## Next Steps

1. ✅ Coverage analysis complete
2. 📋 Move to Phase 5: Generate comprehensive report
3. 🎯 Move to Phase 6: Identify specific test gaps with prioritization
4. 🔨 Move to Phase 7: Fill gaps following TDD

**Note:** E2E tests provide excellent functional coverage. The coverage gap is primarily in **unit tests for business logic** (hooks, contexts, complex components).
