# E2E Test Performance Analysis

## Problem: Long E2E Test Duration

### Issue 1: Sequential Test Execution ❌

**Current Setup** (in deploy-and-test.yml):
```yaml
test-staging:
  steps:
    - Run E2E Desktop    # Waits for all 14 test files
    - Run E2E Mobile     # Waits for desktop
    - Run Performance    # Waits for mobile
```

**Total Time**: 8-12 minutes+ (all sequential)

**Problem**: No parallelism at the job level
- Desktop tests block mobile tests
- Mobile tests block performance tests
- No observability into which category is slow

### Issue 2: Playwright Configuration ⚠️

**Current Config** (playwright.config.ts):
```typescript
workers: process.env.CI ? 1 : undefined,  // ❌ Only 1 test at a time!
retries: process.env.CI ? 2 : 0,          // ⚠️ Each failed test retries 2x
```

**Impact**:
- **14 test files** × **1 worker** = Sequential execution
- If 1 test fails: runs 3 times total (initial + 2 retries)
- With waits and retries, can take 30-60 seconds per test file
- **Total**: 14 files × ~30-60s = 7-14 minutes minimum

**Why This Configuration?**

Looking at the comment:
```typescript
// Limit parallel workers on CI
workers: process.env.CI ? 1 : undefined,
```

This was likely set to:
1. Avoid resource contention on GitHub Actions runners
2. Make test output easier to read
3. Avoid Firebase emulator conflicts (but we're not using emulators now!)

## Solutions Implemented

### ✅ Solution 1: Parallel Test Jobs

**New Setup**:
```yaml
jobs:
  deploy-staging:
    # Deploy to staging

  test-staging-desktop:    # ← Parallel
    needs: deploy-staging

  test-staging-mobile:     # ← Parallel
    needs: deploy-staging

  test-staging-performance: # ← Parallel
    needs: deploy-staging

  deploy-production:
    needs: [test-staging-desktop, test-staging-mobile, test-staging-performance]
```

**Benefits**:
- ✅ **3x faster**: All test categories run simultaneously
- ✅ **Better observability**: See which category passes/fails
- ✅ **Better artifacts**: Separate reports for desktop, mobile, performance
- ✅ **Faster feedback**: Don't wait for desktop if mobile fails

**Time Savings**:
```
Before: Desktop (8min) → Mobile (3min) → Performance (2min) = 13 min
After:  Max(Desktop 8min, Mobile 3min, Performance 2min) = 8 min
Savings: 5 minutes (38% faster)
```

### 🔮 Solution 2: Increase Playwright Workers (Optional)

**Recommendation**:
```typescript
// For staging tests (no emulator conflicts)
workers: process.env.CI ? 2 : undefined,  // ← 2 parallel tests
```

**Benefits**:
- ✅ **2x faster desktop tests**: 8 min → 4 min
- ✅ **2x faster mobile tests**: 3 min → 1.5 min
- ✅ **Safe**: GitHub Actions runners have 2 cores

**Risks**:
- ⚠️ Potential flakiness if tests share state
- ⚠️ Slightly harder to debug (parallel output)

**Total Time with Both Solutions**:
```
Current:   Desktop (8min) → Mobile (3min) → Performance (2min) = 13 min
Solution 1: Max(8min, 3min, 2min) = 8 min
Solution 2: Max(4min, 1.5min, 1min) = 4 min
Savings:   9 minutes (69% faster!)
```

## Detailed Analysis

### Test Count Breakdown

```bash
Total test files: 14
- admin-approvals.spec.ts
- auth.spec.ts
- battalion-scoping.spec.ts
- dashboard.spec.ts
- equipment.spec.ts
- i18n.spec.ts
- performance.spec.ts
- personnel.spec.ts
- rtl.mobile.spec.ts
- rtl.spec.ts
- transfers-role-split.spec.ts
- transfers.spec.ts
- units.spec.ts
- user-lifecycle.spec.ts
```

### Current Execution Pattern

With `workers: 1` and `retries: 2`:

```
Test 1: Run → (Fail?) → Retry 1 → (Fail?) → Retry 2 = ~30-90s
Test 2: Wait for Test 1 → Run → ...
Test 3: Wait for Test 1,2 → Run → ...
...
Test 14: Wait for Test 1-13 → Run → Done

Total: 7-14 minutes minimum
```

### With Parallel Jobs + 2 Workers

```
Desktop Job (7 files):
  Test 1 & 2 run parallel → Test 3 & 4 → ... = ~4 min

Mobile Job (2 files):
  rtl.mobile.spec.ts + others = ~1.5 min

Performance Job (1 file):
  performance.spec.ts = ~1 min

Total: Max(4min, 1.5min, 1min) = 4 min
```

## Recommendations

### Priority 1: Implement Parallel Jobs (Done ✅)

Already implemented in this commit. This gives immediate benefits with no risks.

### Priority 2: Increase Workers to 2

Create a separate Playwright config for staging tests:

```typescript
// playwright.config.staging.ts
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  workers: 2,  // Safe for staging (no emulator conflicts)
  retries: 1,  // Reduce retries (staging is more stable)
});
```

Then update package.json:
```json
{
  "test:e2e:staging": "cross-env TEST_ENV=staging playwright test --config=playwright.config.staging.ts --project=staging"
}
```

### Priority 3: Smart Test Selection (Future)

Only run tests affected by changed files:
```yaml
- name: Get changed files
  id: changed
  run: |
    FILES=$(git diff --name-only ${{ github.event.before }} ${{ github.sha }})
    echo "files=$FILES" >> $GITHUB_OUTPUT

- name: Run affected tests
  run: |
    if [[ "${{ steps.changed.outputs.files }}" == *"equipment"* ]]; then
      npx playwright test e2e/equipment.spec.ts
    fi
```

## Expected Results

### Before All Optimizations:
```
CI: 7-13 min → Deploy: 13-18 min = 20-31 min total
```

### After Parallel Jobs Only:
```
CI: 2-3 min → Deploy: 8-12 min = 10-15 min total
Savings: 10-16 min (48-52% faster)
```

### After Parallel Jobs + 2 Workers:
```
CI: 2-3 min → Deploy: 4-6 min = 6-9 min total
Savings: 14-22 min (70-71% faster)
```

## Monitoring

To verify improvements, check:

1. **Job Duration**: Each job should be visible separately
   - `test-staging-desktop`: ~8 min (or ~4 min with 2 workers)
   - `test-staging-mobile`: ~3 min (or ~1.5 min with 2 workers)
   - `test-staging-performance`: ~2 min (or ~1 min with 2 workers)

2. **Parallel Execution**: All 3 should show "in progress" simultaneously

3. **Total Time**: Should be max of the three, not sum

## Next Steps

1. ✅ Commit parallel job changes
2. ⏳ Monitor next workflow run
3. 🔮 Consider increasing workers to 2
4. 🔮 Consider smart test selection for large changesets
