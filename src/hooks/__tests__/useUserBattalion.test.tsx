import { renderHook, waitFor } from '@testing-library/react';
import { useUserBattalion } from '../useUserBattalion';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '@/hooks/useAuth';

// Mock getDoc and doc from firebase/firestore.
// The hook uses Promise.race([getDoc(...), timeoutPromise]) so getDoc must
// resolve immediately (before the 10 s timeout fires).
const mockGetDoc = vi.fn();
const mockDocFn = vi.fn((...args: unknown[]) => {
    const segs = args.slice(1) as string[];
    return { id: segs[segs.length - 1] ?? 'mock-doc-id', path: segs.join('/') };
});

vi.mock('firebase/firestore', () => ({
    doc: (...args: unknown[]) => mockDocFn(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

// ---------------------------------------------------------------------------
// Helpers to build Firestore document snapshot stubs
// ---------------------------------------------------------------------------

function makeSnap(exists: boolean, data?: Record<string, unknown>) {
    return {
        exists: () => exists,
        data: () => data ?? {},
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useUserBattalion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    // 1. Battalion-level user: unitId and battalionId both resolve to battalion
    // -----------------------------------------------------------------------
    it('battalion-level user: unitId and battalionId both resolve to battalion', async () => {
        // useAuth is mocked globally in setup.ts to return uid: 'test-user-id'.
        // We do NOT override it here — the default is fine.

        // Call 1: users/test-user-id → unitId: 'battalion-id'
        mockGetDoc.mockResolvedValueOnce(
            makeSnap(true, { unitId: 'battalion-id' })
        );
        // Call 2: units/battalion-id → battalionId: 'battalion-id' (self-referential)
        mockGetDoc.mockResolvedValueOnce(
            makeSnap(true, { battalionId: 'battalion-id' })
        );

        const { result } = renderHook(() => useUserBattalion());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.unitId).toBe('battalion-id');
        expect(result.current.battalionId).toBe('battalion-id');
        expect(result.current.error).toBeNull();
    });

    // -----------------------------------------------------------------------
    // 2. Company-level user (the bug scenario): battalionId must be battalion,
    //    NOT the company's own id
    // -----------------------------------------------------------------------
    it('company-level user: battalionId resolves to battalion, NOT company', async () => {
        // Call 1: users/test-user-id → unitId: 'company-id'
        mockGetDoc.mockResolvedValueOnce(
            makeSnap(true, { unitId: 'company-id' })
        );
        // Call 2: units/company-id → battalionId: 'battalion-id'
        mockGetDoc.mockResolvedValueOnce(
            makeSnap(true, { battalionId: 'battalion-id' })
        );

        const { result } = renderHook(() => useUserBattalion());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.unitId).toBe('company-id');
        // The key assertion: battalionId must NOT equal unitId here
        expect(result.current.battalionId).toBe('battalion-id');
        expect(result.current.battalionId).not.toBe('company-id');
        expect(result.current.error).toBeNull();
    });

    // -----------------------------------------------------------------------
    // 3. Platoon-level user: battalionId resolves through unit hierarchy
    // -----------------------------------------------------------------------
    it('platoon-level user: battalionId resolves through unit hierarchy', async () => {
        // Call 1: users/test-user-id → unitId: 'platoon-id'
        mockGetDoc.mockResolvedValueOnce(
            makeSnap(true, { unitId: 'platoon-id' })
        );
        // Call 2: units/platoon-id → battalionId: 'battalion-id'
        mockGetDoc.mockResolvedValueOnce(
            makeSnap(true, { battalionId: 'battalion-id' })
        );

        const { result } = renderHook(() => useUserBattalion());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.unitId).toBe('platoon-id');
        expect(result.current.battalionId).toBe('battalion-id');
        expect(result.current.error).toBeNull();
    });

    // -----------------------------------------------------------------------
    // 4. Missing unit doc: falls back to unitId as battalionId
    // -----------------------------------------------------------------------
    it('missing unit doc: falls back to unitId as battalionId', async () => {
        // Call 1: users/test-user-id → unitId: 'company-id'
        mockGetDoc.mockResolvedValueOnce(
            makeSnap(true, { unitId: 'company-id' })
        );
        // Call 2: units/company-id → does NOT exist
        mockGetDoc.mockResolvedValueOnce(makeSnap(false));

        const { result } = renderHook(() => useUserBattalion());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.unitId).toBe('company-id');
        // Fallback: battalionId === unitId when unit doc is missing
        expect(result.current.battalionId).toBe('company-id');
        expect(result.current.error).toBeNull();
    });

    // -----------------------------------------------------------------------
    // 5. No user logged in: returns null values, getDoc never called
    // -----------------------------------------------------------------------
    it('no user logged in: returns null values', async () => {
        // Override the global useAuth mock for all renders in this test
        // (mockReturnValueOnce is not enough — the hook re-renders via useEffect)
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            loading: false,
            signInWithGoogle: vi.fn(),
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
        });

        const { result } = renderHook(() => useUserBattalion());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.unitId).toBeNull();
        expect(result.current.battalionId).toBeNull();
        expect(result.current.error).toBeNull();
        // Firestore must NOT be queried when there is no authenticated user
        expect(mockGetDoc).not.toHaveBeenCalled();
    });
});
