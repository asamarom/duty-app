import { render, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminModeProvider, useAdminMode } from './AdminModeContext';
import { ReactNode } from 'react';

// Unmock AdminModeContext to test the real implementation
vi.unmock('@/contexts/AdminModeContext');

describe('AdminModeContext', () => {
  const STORAGE_KEY = 'pmtb_admin_mode';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Provider Initialization', () => {
    it('defaults to admin mode ON when no value in localStorage', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      expect(result.current.isAdminMode).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('initializes from localStorage when value is "true"', () => {
      localStorage.setItem(STORAGE_KEY, 'true');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      expect(result.current.isAdminMode).toBe(true);
    });

    it('initializes from localStorage when value is "false"', () => {
      localStorage.setItem(STORAGE_KEY, 'false');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      expect(result.current.isAdminMode).toBe(false);
    });
  });

  describe('toggleAdminMode', () => {
    it('toggles from false to true', () => {
      localStorage.setItem(STORAGE_KEY, 'false');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      expect(result.current.isAdminMode).toBe(false);

      act(() => {
        result.current.toggleAdminMode();
      });

      expect(result.current.isAdminMode).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('toggles from true to false', () => {
      localStorage.setItem(STORAGE_KEY, 'true');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      expect(result.current.isAdminMode).toBe(true);

      act(() => {
        result.current.toggleAdminMode();
      });

      expect(result.current.isAdminMode).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('toggles multiple times', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      // Start at true (default)
      expect(result.current.isAdminMode).toBe(true);

      // Toggle to false
      act(() => {
        result.current.toggleAdminMode();
      });
      expect(result.current.isAdminMode).toBe(false);

      // Toggle back to true
      act(() => {
        result.current.toggleAdminMode();
      });
      expect(result.current.isAdminMode).toBe(true);

      // Toggle to false again
      act(() => {
        result.current.toggleAdminMode();
      });
      expect(result.current.isAdminMode).toBe(false);
    });
  });

  describe('setAdminMode', () => {
    it('sets admin mode to true', () => {
      localStorage.setItem(STORAGE_KEY, 'false');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      expect(result.current.isAdminMode).toBe(false);

      act(() => {
        result.current.setAdminMode(true);
      });

      expect(result.current.isAdminMode).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('sets admin mode to false', () => {
      localStorage.setItem(STORAGE_KEY, 'true');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      expect(result.current.isAdminMode).toBe(true);

      act(() => {
        result.current.setAdminMode(false);
      });

      expect(result.current.isAdminMode).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('can set to same value multiple times', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      act(() => {
        result.current.setAdminMode(true);
      });
      expect(result.current.isAdminMode).toBe(true);

      act(() => {
        result.current.setAdminMode(true);
      });
      expect(result.current.isAdminMode).toBe(true);

      act(() => {
        result.current.setAdminMode(false);
      });
      expect(result.current.isAdminMode).toBe(false);

      act(() => {
        result.current.setAdminMode(false);
      });
      expect(result.current.isAdminMode).toBe(false);
    });
  });

  describe('localStorage Persistence', () => {
    it('persists admin mode changes to localStorage on toggle', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      // Initial state - default true
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

      // Toggle to false
      act(() => {
        result.current.toggleAdminMode();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');

      // Toggle back to true
      act(() => {
        result.current.toggleAdminMode();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('persists admin mode changes to localStorage on setAdminMode', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminModeProvider>{children}</AdminModeProvider>
      );

      const { result } = renderHook(() => useAdminMode(), { wrapper });

      act(() => {
        result.current.setAdminMode(false);
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');

      act(() => {
        result.current.setAdminMode(true);
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });
  });

  describe('useAdminMode hook error handling', () => {
    it('throws error when used outside AdminModeProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useAdminMode());
      }).toThrow('useAdminMode must be used within an AdminModeProvider');

      console.error = originalError;
    });
  });
});
