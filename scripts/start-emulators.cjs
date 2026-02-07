/**
 * Starts Firebase Auth + Firestore emulators and seeds test data.
 * Used by Playwright as a webServer entry.
 *
 * Usage: node scripts/start-emulators.js
 */

const { spawn, execSync } = require('child_process');
const path = require('path');

const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8085;
const ROOT_DIR = path.join(__dirname, '..');

async function waitForEmulators(maxRetries = 60) {
  const endpoints = [
    `http://localhost:${AUTH_PORT}/`,
    `http://localhost:${FIRESTORE_PORT}/`,
  ];

  for (let i = 0; i < maxRetries; i++) {
    let allReady = true;
    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) allReady = false;
      } catch {
        allReady = false;
      }
    }
    if (allReady) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  console.log('Starting Firebase Auth + Firestore emulators...');

  const emulator = spawn(
    'npx',
    ['firebase', 'emulators:start', '--only', 'auth,firestore', '--config', 'firebase.emulators.json'],
    {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true,
    }
  );

  // Forward signals to emulator
  process.on('SIGINT', () => emulator.kill('SIGINT'));
  process.on('SIGTERM', () => emulator.kill('SIGTERM'));

  // Exit when emulator exits
  emulator.on('exit', (code) => process.exit(code ?? 0));

  // Wait for both emulators
  const ready = await waitForEmulators();
  if (!ready) {
    console.error('Emulators failed to start within 60 seconds.');
    emulator.kill();
    process.exit(1);
  }

  console.log('Emulators ready. Seeding test data...');

  // Seed test users and Firestore data
  execSync(
    `node "${path.join(__dirname, 'seed-emulator-users.cjs')}" localhost:${AUTH_PORT} localhost:${FIRESTORE_PORT}`,
    { cwd: ROOT_DIR, stdio: 'inherit' }
  );

  console.log('Test data seeded. Emulators running.');
  // Keep alive — emulator process keeps this script running
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
