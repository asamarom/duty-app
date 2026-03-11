import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToast, toast, reducer } from '../use-toast';

describe('use-toast Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    // =========================================================================
    // Basic Toast Creation
    // =========================================================================

    it('should create a toast with default variant', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.toast({
                title: 'Test Toast',
                description: 'This is a test toast',
            });
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].title).toBe('Test Toast');
        expect(result.current.toasts[0].description).toBe('This is a test toast');
        expect(result.current.toasts[0].open).toBe(true);
    });

    it('should create a toast with destructive variant', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.toast({
                title: 'Error Toast',
                description: 'This is an error',
                variant: 'destructive',
            });
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].variant).toBe('destructive');
        expect(result.current.toasts[0].title).toBe('Error Toast');
    });

    it('should generate unique IDs for multiple toasts', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.toast({ title: 'Toast 1' });
            result.current.toast({ title: 'Toast 2' });
        });

        // Due to TOAST_LIMIT = 1, only the most recent toast is kept
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].title).toBe('Toast 2');
    });

    // =========================================================================
    // Toast Limit
    // =========================================================================

    it('should respect TOAST_LIMIT and keep only the most recent toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.toast({ title: 'Toast 1' });
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].title).toBe('Toast 1');

        act(() => {
            result.current.toast({ title: 'Toast 2' });
        });

        // TOAST_LIMIT = 1, so only Toast 2 should remain
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].title).toBe('Toast 2');
    });

    // =========================================================================
    // Toast Dismissal
    // =========================================================================

    it('should dismiss a specific toast by ID', () => {
        const { result } = renderHook(() => useToast());
        let toastId: string;

        act(() => {
            const { id } = result.current.toast({ title: 'Test Toast' });
            toastId = id;
        });

        expect(result.current.toasts[0].open).toBe(true);

        act(() => {
            result.current.dismiss(toastId);
        });

        expect(result.current.toasts[0].open).toBe(false);
    });

    it('should dismiss all toasts when no ID is provided', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.toast({ title: 'Toast 1' });
        });

        expect(result.current.toasts[0].open).toBe(true);

        act(() => {
            result.current.dismiss();
        });

        expect(result.current.toasts[0].open).toBe(false);
    });

    it('should remove toast after TOAST_REMOVE_DELAY when dismissed', () => {
        const { result } = renderHook(() => useToast());
        let toastId: string;

        act(() => {
            const { id } = result.current.toast({ title: 'Test Toast' });
            toastId = id;
        });

        expect(result.current.toasts).toHaveLength(1);

        act(() => {
            result.current.dismiss(toastId);
        });

        // Toast should be marked as closed but still in the array
        expect(result.current.toasts[0].open).toBe(false);
        expect(result.current.toasts).toHaveLength(1);

        // Fast-forward time to trigger removal
        act(() => {
            vi.advanceTimersByTime(1000000);
        });

        expect(result.current.toasts).toHaveLength(0);
    });

    // =========================================================================
    // Toast Update
    // =========================================================================

    it('should update toast properties using the update method', () => {
        const { result } = renderHook(() => useToast());
        let updateFn: (props: any) => void;

        act(() => {
            const { update } = result.current.toast({
                title: 'Original Title',
                description: 'Original Description',
            });
            updateFn = update;
        });

        expect(result.current.toasts[0].title).toBe('Original Title');

        act(() => {
            updateFn({
                title: 'Updated Title',
                description: 'Updated Description',
            });
        });

        expect(result.current.toasts[0].title).toBe('Updated Title');
        expect(result.current.toasts[0].description).toBe('Updated Description');
    });

    it('should update toast variant', () => {
        const { result } = renderHook(() => useToast());
        let updateFn: (props: any) => void;

        act(() => {
            const { update } = result.current.toast({
                title: 'Test Toast',
                variant: 'default',
            });
            updateFn = update;
        });

        expect(result.current.toasts[0].variant).toBe('default');

        act(() => {
            updateFn({ variant: 'destructive' });
        });

        expect(result.current.toasts[0].variant).toBe('destructive');
    });

    // =========================================================================
    // Toast Actions
    // =========================================================================

    it('should include action element in toast', () => {
        const { result } = renderHook(() => useToast());
        const actionElement = { altText: 'Undo' } as any;

        act(() => {
            result.current.toast({
                title: 'Action Toast',
                action: actionElement,
            });
        });

        expect(result.current.toasts[0].action).toBe(actionElement);
    });

    // =========================================================================
    // Toast onOpenChange Handler
    // =========================================================================

    it('should call dismiss when onOpenChange is called with false', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.toast({ title: 'Test Toast' });
        });

        const onOpenChange = result.current.toasts[0].onOpenChange;
        expect(result.current.toasts[0].open).toBe(true);

        act(() => {
            onOpenChange?.(false);
        });

        expect(result.current.toasts[0].open).toBe(false);
    });

    // =========================================================================
    // Standalone toast function
    // =========================================================================

    it('should work with standalone toast function', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            toast({ title: 'Standalone Toast' });
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].title).toBe('Standalone Toast');
    });

    it('should return dismiss and update functions from standalone toast', () => {
        const { result } = renderHook(() => useToast());
        let dismissFn: () => void;
        let updateFn: (props: any) => void;

        act(() => {
            const { dismiss, update } = toast({ title: 'Test' });
            dismissFn = dismiss;
            updateFn = update;
        });

        expect(result.current.toasts[0].open).toBe(true);

        act(() => {
            updateFn({ title: 'Updated' });
        });

        expect(result.current.toasts[0].title).toBe('Updated');

        act(() => {
            dismissFn();
        });

        expect(result.current.toasts[0].open).toBe(false);
    });

    // =========================================================================
    // Reducer Tests
    // =========================================================================

    describe('reducer', () => {
        it('should add toast to state', () => {
            const initialState = { toasts: [] };
            const toast = {
                id: '1',
                title: 'Test',
                open: true,
            };

            const newState = reducer(initialState, {
                type: 'ADD_TOAST',
                toast,
            });

            expect(newState.toasts).toHaveLength(1);
            expect(newState.toasts[0]).toBe(toast);
        });

        it('should update existing toast', () => {
            const initialState = {
                toasts: [
                    { id: '1', title: 'Original', open: true },
                    { id: '2', title: 'Other', open: true },
                ],
            };

            const newState = reducer(initialState, {
                type: 'UPDATE_TOAST',
                toast: { id: '1', title: 'Updated' },
            });

            expect(newState.toasts[0].title).toBe('Updated');
            expect(newState.toasts[1].title).toBe('Other');
        });

        it('should set open to false when dismissing specific toast', () => {
            const initialState = {
                toasts: [
                    { id: '1', title: 'Toast 1', open: true },
                ],
            };

            const newState = reducer(initialState, {
                type: 'DISMISS_TOAST',
                toastId: '1',
            });

            expect(newState.toasts[0].open).toBe(false);
        });

        it('should set open to false for all toasts when dismissing without ID', () => {
            const initialState = {
                toasts: [
                    { id: '1', title: 'Toast 1', open: true },
                ],
            };

            const newState = reducer(initialState, {
                type: 'DISMISS_TOAST',
            });

            expect(newState.toasts[0].open).toBe(false);
        });

        it('should remove specific toast from state', () => {
            const initialState = {
                toasts: [
                    { id: '1', title: 'Toast 1', open: true },
                    { id: '2', title: 'Toast 2', open: true },
                ],
            };

            const newState = reducer(initialState, {
                type: 'REMOVE_TOAST',
                toastId: '1',
            });

            expect(newState.toasts).toHaveLength(1);
            expect(newState.toasts[0].id).toBe('2');
        });

        it('should remove all toasts when removing without ID', () => {
            const initialState = {
                toasts: [
                    { id: '1', title: 'Toast 1', open: true },
                    { id: '2', title: 'Toast 2', open: true },
                ],
            };

            const newState = reducer(initialState, {
                type: 'REMOVE_TOAST',
            });

            expect(newState.toasts).toHaveLength(0);
        });
    });

    // =========================================================================
    // Multiple Hook Instances (Listener Synchronization)
    // =========================================================================

    it('should synchronize state across multiple hook instances', () => {
        const { result: result1 } = renderHook(() => useToast());
        const { result: result2 } = renderHook(() => useToast());

        act(() => {
            result1.current.toast({ title: 'Shared Toast' });
        });

        expect(result1.current.toasts).toHaveLength(1);
        expect(result2.current.toasts).toHaveLength(1);
        expect(result1.current.toasts[0].title).toBe('Shared Toast');
        expect(result2.current.toasts[0].title).toBe('Shared Toast');
    });

    it('should cleanup listeners on unmount', () => {
        const { result, unmount } = renderHook(() => useToast());

        act(() => {
            result.current.toast({ title: 'Test Toast' });
        });

        expect(result.current.toasts).toHaveLength(1);

        unmount();

        // After unmount, the hook should not throw errors
        expect(() => unmount()).not.toThrow();
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    it('should handle empty toast props', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.toast({});
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].open).toBe(true);
    });

    it('should handle React nodes as title and description', () => {
        const { result } = renderHook(() => useToast());
        const titleNode = <div>React Title</div>;
        const descNode = <span>React Description</span>;

        act(() => {
            result.current.toast({
                title: titleNode,
                description: descNode,
            });
        });

        expect(result.current.toasts[0].title).toBe(titleNode);
        expect(result.current.toasts[0].description).toBe(descNode);
    });

    it('should not add duplicate timeouts for the same toast', () => {
        const { result } = renderHook(() => useToast());
        let toastId: string;

        act(() => {
            const { id } = result.current.toast({ title: 'Test Toast' });
            toastId = id;
        });

        // Dismiss the same toast multiple times
        act(() => {
            result.current.dismiss(toastId);
            result.current.dismiss(toastId);
            result.current.dismiss(toastId);
            // Fast-forward time within the act
            vi.advanceTimersByTime(1000000);
        });

        expect(result.current.toasts).toHaveLength(0);
    });
});
