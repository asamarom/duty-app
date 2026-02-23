/**
 * Generate Firebase custom tokens for staging E2E tests.
 *
 * Usage: node scripts/generate-staging-auth-tokens.cjs
 *
 * Outputs tokens that should be stored as GitHub Secrets:
 * - TEST_USER_ADMIN_TOKEN
 * - TEST_USER_LEADER_TOKEN
 * - TEST_USER_USER_TOKEN
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load Firebase Staging service account
const serviceAccountPath = path.join(__dirname, '..', 'firebase-staging-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account not found:', serviceAccountPath);
  console.error('\nPlease download it from Firebase Console:');
  console.error('https://console.firebase.google.com/project/duty-staging/settings/serviceaccounts/adminsdk');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// NOTE: These UIDs should match the actual UIDs from running seed-firebase-staging.cjs
// Run the seed script first, then update these UIDs from the output
const TEST_USERS = {
  admin: 'pp7voDBZFPTrl4ldASBlcgpwidv1',   // From seed output
  leader: 'vlxirvIybcTHt6VitMNUCvCN1nj2',  // From seed output
  user: 'fcHGizEBWaU2Kj9xiEOvt2ag3eB2',    // From seed output
};

async function generateTokens() {
  console.log('🔑 Generating custom tokens for staging test users...\n');

  const tokens = {};

  for (const [userType, uid] of Object.entries(TEST_USERS)) {
    try {
      const token = await admin.auth().createCustomToken(uid);
      tokens[userType] = token;
      console.log(`✅ ${userType}: ${token.substring(0, 50)}...`);
    } catch (error) {
      console.error(`❌ Failed to generate token for ${userType}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n📝 Add these to GitHub Secrets:');
  console.log('\nGitHub Settings → Secrets and variables → Actions → New repository secret:\n');
  console.log(`Name: TEST_USER_ADMIN_TOKEN`);
  console.log(`Value: ${tokens.admin}\n`);
  console.log(`Name: TEST_USER_LEADER_TOKEN`);
  console.log(`Value: ${tokens.leader}\n`);
  console.log(`Name: TEST_USER_USER_TOKEN`);
  console.log(`Value: ${tokens.user}\n`);

  // Also save to local file for reference (gitignored)
  const tokensFile = path.join(__dirname, '..', '.staging-tokens.json');
  fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
  console.log('💾 Tokens also saved to .staging-tokens.json (gitignored)\n');

  console.log('⚠️  IMPORTANT: These tokens are valid for 1 hour.');
  console.log('For CI, regenerate and update GitHub Secrets if tests start failing with auth errors.\n');

  process.exit(0);
}

generateTokens().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
