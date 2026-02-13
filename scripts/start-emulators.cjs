/**
 * Starts Firebase Auth + Firestore emulators, seeds test data, then
 * signals Playwright via a tiny HTTP "ready" server on READY_PORT.
 *
 * Playwright waits for http://localhost:9098/ (READY_PORT) instead of
 * 9099 so tests never start before seeding is complete.
 *
 * Usage: node scripts/start-emulators.cjs
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8085;
const READY_PORT = 9098; // Playwright waits for this — only opens after seeding
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

function startReadyServer() {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200);
      res.end('ready');
    });
    server.listen(READY_PORT, () => {
      console.log(`Ready server listening on http://localhost:${READY_PORT}/`);
      resolve(server);
    });
  });
}

async function main() {
  console.log('Starting Firebase Auth + Firestore emulators...');

  // Use a UI-free config in CI to save resources
  const emulatorConfig = process.env.CI ? 'firebase.emulators.ci.json' : 'firebase.emulators.json';

  const emulator = spawn(
    'npx',
    ['firebase', 'emulators:start', '--only', 'auth,firestore', '--config', emulatorConfig],
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

  // Wait for both emulators to be ready
  const ready = await waitForEmulators();
  if (!ready) {
    console.error('Emulators failed to start within 60 seconds.');
    emulator.kill();
    process.exit(1);
  }

  console.log('Emulators ready. Seeding test data...');

  // Seed test users and Firestore data — synchronous so we know it's done
  execSync(
    `node "${path.join(__dirname, 'seed-emulator-users.cjs')}" localhost:${AUTH_PORT} localhost:${FIRESTORE_PORT}`,
    { cwd: ROOT_DIR, stdio: 'inherit' }
  );

  console.log('Test data seeded.');

  // NOW open the ready-gate — Playwright starts tests only after this
  await startReadyServer();

  console.log('Emulators running and seeded. Playwright may proceed.');
  // Keep alive — emulator subprocess keeps this script running
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
