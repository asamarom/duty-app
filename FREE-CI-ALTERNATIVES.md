# Free CI Alternatives for Heavy Testing

## Problem Summary

**GitHub Actions Free Tier Limitation**:
- Private repos: **2,000 minutes/month**
- Your current usage: ~15-20 min per push
- With frequent pushes: **~100-130 pushes/month max**

## Root Cause of Long Tests (FIXED ✅)

**The tests were hanging because**:
- Playwright config was using hardcoded `FIREBASE_TEST_URL`
- Ignored the `STAGING_URL` env var (Vercel preview URL)
- Tests ran against wrong URL, causing timeouts

**Fix Applied**:
```typescript
const baseURL = testEnv === 'staging'
  ? (process.env.STAGING_URL || FIREBASE_TEST_URL)  // ✅ Use dynamic URL
  : ...
```

## Free CI Alternatives

### Option 1: GitLab CI/CD (BEST for your case) ⭐

**Free Tier**:
- **400 minutes/month** for private repos
- **50,000 minutes/month** for public repos 🎉
- Shared runners (2 vCPU, 8GB RAM)

**Pros**:
- ✅ **FREE for public repos** (almost unlimited)
- ✅ Can mirror your GitHub repo to GitLab
- ✅ Supports all your tooling (Node, Playwright, Firebase)
- ✅ Good documentation

**Cons**:
- ⚠️ Need to maintain mirror/sync from GitHub
- ⚠️ Another platform to manage

**Setup**:
```yaml
# .gitlab-ci.yml
image: node:20

stages:
  - test
  - deploy

e2e-tests:
  stage: test
  script:
    - npm ci
    - npx playwright install --with-deps chromium
    - npm run test:e2e:staging
  only:
    - main
```

**How to sync**:
```bash
# Auto-sync GitHub → GitLab
git remote add gitlab https://gitlab.com/youruser/duty-app.git
git push gitlab main
```

---

### Option 2: Make Repo Public 🌟

**GitHub Actions for Public Repos**:
- **UNLIMITED minutes** ✨
- Same infrastructure
- No changes needed

**Pros**:
- ✅ **Zero cost**
- ✅ **Zero migration**
- ✅ Same workflow
- ✅ Community contributions possible

**Cons**:
- ⚠️ Code is public (anyone can read)
- ⚠️ Secrets still protected (GitHub Secrets remain private)

**Is your code sensitive?**
- Does it contain proprietary business logic? → Keep private
- Is it a personal/learning project? → Make public

---

### Option 3: CircleCI

**Free Tier**:
- **30,000 credits/month** (~6,000 minutes for small executors)
- Linux executors only on free tier

**Pros**:
- ✅ Generous free tier
- ✅ Good performance
- ✅ Works with GitHub

**Cons**:
- ⚠️ Credits system (confusing)
- ⚠️ Another platform to manage

---

### Option 4: Self-Hosted GitHub Actions Runner

**Cost**: $0 (use your own machine)

**Pros**:
- ✅ **Unlimited minutes**
- ✅ Same GitHub Actions workflows
- ✅ Your own hardware

**Cons**:
- ⚠️ Need always-on machine
- ⚠️ Security risks (runner has repo access)
- ⚠️ Setup complexity

**Setup**:
```bash
# On your server
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure
./config.sh --url https://github.com/asamarom/duty-app --token YOUR_TOKEN
./run.sh
```

Then in workflows:
```yaml
jobs:
  test:
    runs-on: self-hosted  # ← Use your runner
```

---

### Option 5: Buildkite (Free Plan)

**Free Tier**:
- **Unlimited builds**
- **Unlimited minutes**
- Must use your own agents (like self-hosted)

**Pros**:
- ✅ Unlimited
- ✅ Good UI
- ✅ Flexible

**Cons**:
- ⚠️ Need your own runner/agent
- ⚠️ Setup complexity

---

## Recommended Strategy

### For Private Repo (Current):

**Short Term** (Next 2 weeks):
1. ✅ Current fix reduces test time (~50% faster with STAGING_URL fix)
2. ✅ Increase workers to 2 (another 50% faster)
3. Monitor minute usage: Should be ~6-8 min/push = **250-330 pushes/month**

**Long Term** (If hitting limits):
- **Best**: Make repo public (unlimited minutes)
- **Alternative**: Self-hosted runner on a spare machine/VPS

### For Public Repo (Recommended):

1. Make `duty-app` public
2. Keep all secrets in GitHub Secrets (remain private)
3. Get **unlimited GitHub Actions minutes**
4. No migration needed

---

## Current Optimizations Applied

### 1. Fast CI (2-3 min) ✅
- TypeScript, ESLint, Unit, Rules (parallel)
- Blocks deployment if fails

### 2. Efficient E2E (Now ~6-8 min, was ~13 min) ✅
- Uses dynamic `STAGING_URL` (fixed!)
- 2 workers for staging tests
- Sequential (cheaper on minutes than parallel jobs)

### 3. Monthly Minute Usage Estimate

**Per Push**:
- CI: 2 min
- Deploy + E2E: 6-8 min
- **Total: 8-10 min/push**

**Monthly** (assuming 20 working days, 10 pushes/day):
- 200 pushes × 8 min = **1,600 minutes**
- **400 minutes buffer** before hitting limit

**You're now SAFE within free tier!** 🎉

---

## Comparison Table

| CI Platform | Free Minutes | Public Repo | Setup | Recommendation |
|-------------|--------------|-------------|--------|----------------|
| **GitHub Actions** | 2,000/mo | Unlimited | ✅ Current | ⭐ If public |
| **GitLab CI** | 50,000/mo | 50,000/mo | 🔶 Sync needed | ⭐ If staying private |
| **CircleCI** | ~6,000/mo | ~6,000/mo | 🔶 Migration | OK |
| **Self-Hosted** | Unlimited | Unlimited | 🔶 Complex | If have spare machine |
| **Make Public** | Unlimited | Unlimited | ✅ None | ⭐⭐⭐ BEST |

## Final Recommendation

### Option A: Make Repo Public (Easiest) ⭐⭐⭐
1. Go to GitHub repo settings
2. Change visibility to Public
3. Done! Unlimited minutes.

### Option B: Current Setup is NOW FINE ⭐⭐
- With fixes applied: **~8-10 min/push**
- You can do **~200 pushes/month** comfortably
- Only hit limits if pushing > 10 times/day

### Option C: GitLab Mirror (If need private + unlimited) ⭐
- Push to GitHub (visible)
- Auto-mirror to GitLab (runs heavy tests)
- 50,000 min/month on GitLab

**My Recommendation**: Try **Option B** first. With the `STAGING_URL` fix, your tests should be much faster now. Monitor usage for a week, and if you're still hitting limits, go with **Option A** (make public).
