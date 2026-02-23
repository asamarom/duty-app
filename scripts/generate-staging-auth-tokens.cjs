/**
 * Generate Firebase custom tokens for staging E2E tests.
 *
 * This script is run automatically in CI before E2E tests to generate fresh tokens.
 * Custom tokens expire after 1 hour, so they must be generated on-demand.
 *
 * Usage in CI:
 *   FIREBASE_SERVICE_ACCOUNT='<json>' node scripts/generate-staging-auth-tokens.cjs
 *
 * The tokens are exported as environment variables for the auth setup to use.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load service account from environment variable (CI) or file (local)
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // CI: Use service account from GitHub Secret
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('🔐 Using service account from FIREBASE_SERVICE_ACCOUNT env var');
  } catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', error.message);
    process.exit(1);
  }
} else {
  // Local: Use service account from file
  const serviceAccountPath = path.join(__dirname, '..', 'firebase-staging-service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account not found:', serviceAccountPath);
    console.error('\nPlease download it from Firebase Console:');
    console.error('https://console.firebase.google.com/project/duty-staging/settings/serviceaccounts/adminsdk');
    console.error('\nOr set FIREBASE_SERVICE_ACCOUNT environment variable in CI.');
    process.exit(1);
  }
  serviceAccount = require(serviceAccountPath);
  console.log('🔐 Using service account from local file');
}

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

  // In CI: Export as environment variables for the auth setup to use
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.log('\n📤 Exporting tokens as environment variables...');
    // Write to GITHUB_ENV so subsequent steps can use them
    if (process.env.GITHUB_ENV) {
      fs.appendFileSync(process.env.GITHUB_ENV, `TEST_USER_ADMIN_TOKEN=${tokens.admin}\n`);
      fs.appendFileSync(process.env.GITHUB_ENV, `TEST_USER_LEADER_TOKEN=${tokens.leader}\n`);
      fs.appendFileSync(process.env.GITHUB_ENV, `TEST_USER_USER_TOKEN=${tokens.user}\n`);
      console.log('✅ Tokens exported to GITHUB_ENV for subsequent steps');
    } else {
      // Fallback: print export commands
      console.log('\nExport these in your shell:');
      console.log(`export TEST_USER_ADMIN_TOKEN="${tokens.admin}"`);
      console.log(`export TEST_USER_LEADER_TOKEN="${tokens.leader}"`);
      console.log(`export TEST_USER_USER_TOKEN="${tokens.user}"`);
    }
  } else {
    // Local: Save to file for manual use
    const tokensFile = path.join(__dirname, '..', '.staging-tokens.json');
    fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
    console.log('\n💾 Tokens saved to .staging-tokens.json (gitignored)');
    console.log('\nTo use these tokens locally:');
    console.log('  export TEST_USER_ADMIN_TOKEN="' + tokens.admin + '"');
    console.log('  export TEST_USER_LEADER_TOKEN="' + tokens.leader + '"');
    console.log('  export TEST_USER_USER_TOKEN="' + tokens.user + '"');
  }

  console.log('\n✅ Token generation complete');
  console.log('⏰ Note: Custom tokens are valid for 1 hour from generation time');

  process.exit(0);
}

generateTokens().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
