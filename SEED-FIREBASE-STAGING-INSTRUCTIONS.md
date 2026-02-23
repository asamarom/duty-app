# Firebase Staging Seed Instructions

## Step 1: Download Service Account Key

1. Go to Firebase Console: https://console.firebase.google.com/project/duty-staging/settings/serviceaccounts/adminsdk

2. Click **"Generate new private key"** button

3. A JSON file will download (e.g., `duty-staging-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`)

4. **Rename it** to: `firebase-staging-service-account.json`

5. **Move it** to the project root: `/home/ubuntu/duty-app/firebase-staging-service-account.json`

## Step 2: Run the Seed Script

```bash
cd /home/ubuntu/duty-app
node scripts/seed-firebase-staging.js
```

## What This Script Does

The script will:
1. ✅ Create 6 test users in Firebase Auth (admin, leader, user, new, pending, declined)
2. ✅ Set custom claims (roles) for authenticated users
3. ✅ Create test data in Firestore:
   - Units (battalion, company, platoon)
   - Personnel records (3 active personnel)
   - Signup requests (5 requests with different statuses)
   - Admin unit assignments
   - Equipment items (bulk and serialized)
   - Equipment assignments

## Expected Output

```
🌱 Seeding Firebase Staging project: duty-staging

⚠️  WARNING: This will DELETE existing test data and recreate it!

1️⃣  Seeding Auth users...
   Created: test-admin@e2e.local (uid: xxx, role: admin)
   Created: test-leader@e2e.local (uid: xxx, role: leader)
   Created: test-user@e2e.local (uid: xxx, role: user)
   Created: test-new@e2e.local (uid: xxx)
   Created: test-pending@e2e.local (uid: xxx)
   Created: test-declined@e2e.local (uid: xxx)

2️⃣  Seeding users collection (roles)...
   Created user doc: xxx
   Created user doc: xxx
   Created user doc: xxx

3️⃣  Seeding units collection...
   Created unit: Test Battalion
   Created unit: Alpha Company
   Created unit: First Platoon

4️⃣  Seeding personnel collection...
   Created personnel: Test Admin
   Created personnel: Test Leader
   Created personnel: Test User

5️⃣  Seeding signupRequests collection...
   Created signup request: Test Admin (approved)
   Created signup request: Test Leader (approved)
   Created signup request: Test User (approved)
   Created signup request: Test Pending User (pending)
   Created signup request: Test Declined User (declined)

6️⃣  Seeding adminUnitAssignments collection...
   Created assignment: admin-bn-assignment
   Created assignment: leader-co-assignment

7️⃣  Seeding equipment and assignments...
   Created bulk equipment: Radio Set (qty: 5)
   Created serialized equipment: M4 Carbine (SN: E2E-SN-001)
   Created assignment: Radio Set (5) → Test Battalion
   Created assignment: M4 Carbine → Test User

✅ All test data seeded successfully!

📧 Test user emails:
   - test-admin@e2e.local (admin)
   - test-leader@e2e.local (leader)
   - test-user@e2e.local (user)
   - test-new@e2e.local (no role)
   - test-pending@e2e.local (pending approval)
   - test-declined@e2e.local (declined)

🔑 Password for all: TestPassword123!
```

## Step 3: Verify in Firebase Console

After running the script, verify the data:

1. **Auth**: https://console.firebase.google.com/project/duty-staging/authentication/users
   - Should see 6 test users

2. **Firestore**: https://console.firebase.google.com/project/duty-staging/firestore/databases/-default-/data
   - Should see collections: users, units, personnel, signupRequests, adminUnitAssignments, equipment, equipmentAssignments

## Step 4: Trigger New Deployment

Now that Firebase Staging has data and Vercel is configured, trigger a new deployment to test:

```bash
cd /home/ubuntu/duty-app
git commit --allow-empty -m "test: trigger deployment to verify Firebase Staging connection"
git push origin main
```

This will:
1. Trigger CI workflow (2-3 min)
2. Trigger Deploy workflow with 3 parallel test jobs
3. Tests should now PASS because:
   - ✅ Vercel preview connects to Firebase Staging
   - ✅ Firebase Staging has test data
   - ✅ Performance test can find equipment table rows

## Security Note

**IMPORTANT**: The `firebase-staging-service-account.json` file contains admin credentials.

- ✅ It's already in `.gitignore` (won't be committed)
- ⚠️ Keep it secure on your machine
- ⚠️ Never share it or commit it to version control

## Troubleshooting

**Error: Service account not found**
- Make sure the file is named exactly: `firebase-staging-service-account.json`
- Make sure it's in the project root: `/home/ubuntu/duty-app/`

**Error: Permission denied**
- Make sure the service account has "Firebase Admin SDK Administrator" role
- Re-download the key from Firebase Console

**Error: Already exists**
- The script automatically deletes existing test users before recreating them
- If you see this error, it means deletion failed - check Firebase Console manually
