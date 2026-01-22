/**
 * Test Authentication Utilities
 *
 * Provides test mode detection and test user credentials for E2E testing.
 * Test mode is only enabled when VITE_TEST_MODE=true AND not in production.
 */

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'leader' | 'user' | 'none';
  approvalStatus: 'approved' | 'pending' | 'declined' | 'none';
  displayName: string;
}

// Predictable UUIDs for test stability
export const TEST_USER_IDS = {
  admin: '00000000-0000-0000-0000-000000000001',
  leader: '00000000-0000-0000-0000-000000000002',
  user: '00000000-0000-0000-0000-000000000003',
  new: '00000000-0000-0000-0000-000000000004',
  pending: '00000000-0000-0000-0000-000000000005',
  declined: '00000000-0000-0000-0000-000000000006',
} as const;

// Test password (same for all test users)
const TEST_PASSWORD = 'TestPassword123!';

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    id: TEST_USER_IDS.admin,
    email: 'test-admin@e2e.local',
    password: TEST_PASSWORD,
    role: 'admin',
    approvalStatus: 'approved',
    displayName: 'Test Admin',
  },
  leader: {
    id: TEST_USER_IDS.leader,
    email: 'test-leader@e2e.local',
    password: TEST_PASSWORD,
    role: 'leader',
    approvalStatus: 'approved',
    displayName: 'Test Leader',
  },
  user: {
    id: TEST_USER_IDS.user,
    email: 'test-user@e2e.local',
    password: TEST_PASSWORD,
    role: 'user',
    approvalStatus: 'approved',
    displayName: 'Test User',
  },
  new: {
    id: TEST_USER_IDS.new,
    email: 'test-new@e2e.local',
    password: TEST_PASSWORD,
    role: 'none',
    approvalStatus: 'none',
    displayName: 'Test New User',
  },
  pending: {
    id: TEST_USER_IDS.pending,
    email: 'test-pending@e2e.local',
    password: TEST_PASSWORD,
    role: 'none',
    approvalStatus: 'pending',
    displayName: 'Test Pending User',
  },
  declined: {
    id: TEST_USER_IDS.declined,
    email: 'test-declined@e2e.local',
    password: TEST_PASSWORD,
    role: 'none',
    approvalStatus: 'declined',
    displayName: 'Test Declined User',
  },
};

export type TestUserKey = keyof typeof TEST_USERS;

/**
 * Check if test mode is enabled.
 * Test mode is enabled when VITE_TEST_MODE=true is explicitly set.
 * This allows test deployments (staging) to have test mode while production doesn't.
 */
export function isTestModeEnabled(): boolean {
  return import.meta.env.VITE_TEST_MODE === 'true';
}

/**
 * Get a test user by key
 */
export function getTestUser(key: TestUserKey): TestUser {
  return TEST_USERS[key];
}

/**
 * Get all available test users
 */
export function getAllTestUsers(): TestUser[] {
  return Object.values(TEST_USERS);
}
