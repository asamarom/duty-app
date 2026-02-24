import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to localStorage instead of IndexedDB
// This is required for Playwright storage state to capture Firebase auth
// (storage state only captures cookies and localStorage, not IndexedDB)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('[Firebase] Failed to set persistence:', error);
});
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators when running E2E tests locally
const authEmulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
if (authEmulatorHost) {
  console.log('[Firebase] Connecting to Auth emulator:', authEmulatorHost);
  connectAuthEmulator(auth, `http://${authEmulatorHost}`, { disableWarnings: true });
}

const firestoreEmulatorHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST;
if (firestoreEmulatorHost) {
  const [host, port] = firestoreEmulatorHost.split(':');
  console.log('[Firebase] Connecting to Firestore emulator:', host, port);
  connectFirestoreEmulator(db, host, parseInt(port, 10));
}

// Expose auth instance on window for E2E tests to access
// This allows staging auth setup to use the same Firebase instance as the app
if (typeof window !== 'undefined') {
  (window as any).auth = auth;
}
