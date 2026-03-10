# CI & Test Coverage Review Process

## Overview
Comprehensive orchestration process for reviewing CI pipeline, mapping all tests, finding and analyzing mocks, generating reports, filling test gaps, and verifying quality locally and on staging.

## Process ID
`ci-test-coverage-review`

## Inputs
- **projectPath**: Path to the project (default: `/home/ubuntu/duty-app`)
- **outputDir**: Directory for reports and artifacts (default: `ci-test-review-output`)
- **targetCoverage**: Target test coverage percentage (default: 85%)
- **stagingVerification**: Whether to verify on staging (default: true)

## Process Flow

### Phase 1: CI Pipeline Analysis 📋
**Goal**: Understand the current CI/CD pipeline configuration

**Actions**:
- Read and parse `.github/workflows/ci-and-deploy.yml`
- Identify all jobs, stages, and dependencies
- Map test-related steps (typecheck, lint, unit, rules, E2E)
- Identify quality checks and gates
- Document deployment flow
- Find gaps in the pipeline

**Output**: `ci-pipeline-analysis.md`

**Breakpoint**: Review CI analysis before proceeding

---

### Phase 2: Test Mapping & Inventory 🗺️
**Goal**: Create comprehensive inventory of all tests

**Actions**:
- Find all E2E test files (`e2e/**/*.spec.ts`)
- Find all unit/integration tests (`src/**/*.test.{ts,tsx}`)
- Extract test suites and individual test cases
- Categorize by type, feature area, user role, platform
- Generate test inventory report

**Output**: `test-inventory.md`

**Metrics**:
- E2E tests count
- Unit tests count
- Integration tests count
- Tests by feature/role

---

### Phase 3: Mock Discovery & Analysis 🔍
**Goal**: Find all mocks and determine if they're necessary

**Actions**:
- Find all `vi.mock`, `jest.mock`, `mock()` calls
- Analyze each mock to understand WHY it exists
- Categorize mocks:
  - **Justifiable**: External APIs, Firebase Auth, paid services (keep with documentation)
  - **Replaceable**: Internal functions, simple utilities (replace with real implementation)
  - **Unnecessary**: Over-mocking that hurts test quality (remove)
- Suggest alternatives for replaceable mocks

**Output**: `mock-analysis.md`

**Metrics**:
- Total mocks
- Justifiable mocks
- Replaceable mocks
- Unnecessary mocks

---

### Phase 4: Coverage Analysis 📊
**Goal**: Understand current test coverage and gaps

**Actions**:
- Run tests with coverage (`npm run test:run -- --coverage`)
- Parse coverage report
- Calculate overall coverage percentage
- Identify uncovered files and code paths
- Calculate gap to target coverage

**Output**: `coverage-analysis.md`

**Metrics**:
- Current coverage %
- Target coverage %
- Gap %
- Uncovered files

---

### Phase 5: Comprehensive Report Generation 📄
**Goal**: Combine all findings into one report

**Actions**:
- Read all individual reports
- Combine into comprehensive report with sections:
  1. Executive Summary
  2. CI Pipeline Review
  3. Test Inventory
  4. Mock Analysis
  5. Coverage Analysis
  6. Identified Gaps
  7. Recommendations

**Output**: `COMPREHENSIVE-TEST-REPORT.md`

**Breakpoint**: Review comprehensive report and choose next action:
- Fill test gaps and fix mocks (Recommended)
- Only fill test gaps (keep mocks)
- Only fix mocks
- Stop here for manual review

---

### Phase 6: Gap Identification & Prioritization 🎯
**Goal**: Identify missing tests and prioritize them

**Actions**:
- Analyze codebase for untested components/hooks/functions
- Cross-reference with coverage data
- Create prioritized list:
  - **HIGH**: Critical business logic, auth, data integrity
  - **MEDIUM**: UI components, user flows
  - **LOW**: Edge cases, minor utilities
- For each gap, specify what's needed and suggested approach
- Identify mocks to fix based on strategy

**Output**: `test-gaps.md`

**Metrics**:
- Missing tests count
- Mocks to fix count
- Priority breakdown (High/Medium/Low)

---

### Phase 7: Iterative Gap Filling & Mock Fixing 🔨
**Goal**: Write missing tests and fix/replace mocks using TDD

**Actions**:
- Follow TDD: Red-Green-Refactor for each gap
- Work through gaps in priority order (High → Medium → Low)
- For each missing test:
  1. Write test first (fails)
  2. Confirm it fails for right reason
  3. Write minimal code to pass
  4. Confirm it passes
  5. Refactor
- For mocks:
  - Replaceable: Replace with real implementation/factory
  - Unnecessary: Remove and use real code
  - Justifiable: Document why it stays
- Follow existing project patterns
- Run tests after each addition
- Track progress continuously

**Output**: `gap-filling-summary.md`

**Metrics**:
- Tests added
- Mocks fixed
- Mocks removed
- New coverage %

---

### Phase 8: Prepare for Staging Verification 📦
**Goal**: Skip local testing, proceed directly to staging verification

**Actions**:
- Prepare for staging deployment
- Skip local test run (will verify on staging)

**Note**: Tests will be verified in the staging environment only

---

### Phase 9: Staging Verification 🌐
**Goal**: Verify changes work on staging environment

**Actions** (if `stagingVerification = true`):
- Deploy to Vercel staging
- Wait for deployment to be ready
- Run E2E tests against staging URL
- Collect results

**Output**: `staging-test-results.md`

**Breakpoint (if tests fail)**:
- Manual investigation required for environment-specific issues
- Debug and fix on staging
- Review staging logs and deployment

---

### Phase 10: Final Report & Recommendations 📊
**Goal**: Generate final report with complete journey

**Actions**:
- Combine all phase results
- Generate final comprehensive report with:
  1. Executive Summary
  2. CI Pipeline Status
  3. Test Coverage Journey (before → after)
  4. Mock Analysis Results
  5. Tests Added (list with descriptions)
  6. Verification Results (local + staging)
  7. Recommendations (immediate, short-term, long-term)
  8. Next Steps

**Output**: `FINAL-CI-TEST-REVIEW-REPORT.md`

**Final Metrics**:
- Initial coverage → Final coverage
- Tests added
- Mocks fixed/removed
- Staging tests: PASSED/FAILED

---

## Quality Gates

### ✅ Success Criteria
- Target coverage achieved or all high-priority gaps filled
- All local tests passing
- Staging tests passing (if enabled)
- Mocks justified or replaced
- Comprehensive documentation generated

### ⚠️ Partial Success Criteria
- Coverage improved significantly but not to target
- Most tests passing with few failures
- Most mocks justified or replaced

### ❌ Failure Criteria
- Local tests failing after fixes
- Staging tests failing due to code issues
- Unable to fill critical gaps

---

## Breakpoints

1. **Review CI Analysis**: After analyzing CI pipeline
2. **Review Comprehensive Report**: After generating full report (user chooses strategy)
3. **Staging Tests Failed**: If staging tests fail

---

## Artifacts Generated

- `ci-pipeline-analysis.md`
- `test-inventory.md`
- `mock-analysis.md`
- `coverage-analysis.md`
- `COMPREHENSIVE-TEST-REPORT.md`
- `test-gaps.md`
- `gap-filling-summary.md`
- `staging-test-results.md` (if staging verification enabled)
- `FINAL-CI-TEST-REVIEW-REPORT.md`

---

## Skills & Agents Used

### Skills
- `code-coverage` - Test coverage analysis and reporting
- `playwright-e2e` - E2E testing with Playwright
- `jest-testing` - Unit testing with Jest/Vitest

### Agents
- `ci-analyzer` - Analyzes CI pipeline configuration
- `test-mapper` - Maps and inventories all tests
- `mock-analyzer` - Analyzes mocks and categorizes them
- `report-generator` - Generates comprehensive reports
- `gap-identifier` - Identifies test gaps and prioritizes
- `test-developer` - Writes tests following TDD principles
- `test-debugger` - Debugs and fixes failing tests
- `final-report-generator` - Creates final comprehensive report

---

## Iterative & Convergent

This process is **iterative** and **convergent**:
- TDD loop for each test (Red → Green → Refactor)
- Continuous verification after each test addition
- Debug and fix loop if tests fail
- Converges toward target coverage
- Quality gates at each phase ensure correctness

---

## Time Estimate

- **Small project** (<100 tests, <10 mocks): 1-2 hours
- **Medium project** (100-500 tests, 10-50 mocks): 3-6 hours
- **Large project** (500+ tests, 50+ mocks): 6-12 hours

*Actual time depends on:*
- Number of gaps to fill
- Complexity of missing tests
- Number of mocks to replace
- Test failures encountered
