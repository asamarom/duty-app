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

// Mock Firebase Firestore functions
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    addDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    Timestamp: {
        now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
        fromDate: vi.fn((date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
    },
    documentId: vi.fn(() => '__name__'),
}));

// Mock Auth context (use 'uid' to match Firebase Auth property name)
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn(() => ({
        user: { uid: 'test-user-id', id: 'test-user-id', email: 'test@example.com' },
        loading: false,
        signOut: vi.fn(),
    })),
}));

// Mock AdminModeContext
vi.mock('@/contexts/AdminModeContext', () => ({
    useAdminMode: vi.fn(() => ({
        isAdminMode: false,
        toggleAdminMode: vi.fn(),
    })),
    AdminModeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
    useLanguage: vi.fn(() => ({
        language: 'en',
        direction: 'ltr',
        setLanguage: vi.fn(),
        t: (key: string) => key,
    })),
    LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock usePendingRequestsCount
vi.mock('@/hooks/usePendingRequestsCount', () => ({
    usePendingRequestsCount: vi.fn(() => 0),
}));
