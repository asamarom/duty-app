import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Automatically cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock Firebase
vi.mock('@/integrations/firebase/client', () => ({
    auth: {
        currentUser: { uid: 'test-user-id', email: 'test@example.com' },
        onAuthStateChanged: vi.fn(),
    },
    db: {},
    functions: {},
}));

// Mock Auth context (use 'uid' to match Firebase Auth property name)
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn(() => ({
        user: { uid: 'test-user-id', id: 'test-user-id' },
        loading: false,
    })),
}));
