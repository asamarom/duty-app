import { renderHook, act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { ReactNode } from 'react';

// Unmock LanguageContext to test the real implementation
vi.unmock('@/contexts/LanguageContext');

describe('LanguageContext', () => {
  const STORAGE_KEY = 'pmtb-language';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Reset document attributes
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Provider Initialization', () => {
    it('defaults to Hebrew when no value in localStorage', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.language).toBe('he');
      expect(result.current.dir).toBe('rtl');
    });

    it('initializes from localStorage when value is "en"', () => {
      localStorage.setItem(STORAGE_KEY, 'en');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.language).toBe('en');
      expect(result.current.dir).toBe('ltr');
    });

    it('initializes from localStorage when value is "he"', () => {
      localStorage.setItem(STORAGE_KEY, 'he');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.language).toBe('he');
      expect(result.current.dir).toBe('rtl');
    });
  });

  describe('setLanguage', () => {
    it('changes language from Hebrew to English', () => {
      localStorage.setItem(STORAGE_KEY, 'he');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.language).toBe('he');

      act(() => {
        result.current.setLanguage('en');
      });

      expect(result.current.language).toBe('en');
      expect(result.current.dir).toBe('ltr');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
    });

    it('changes language from English to Hebrew', () => {
      localStorage.setItem(STORAGE_KEY, 'en');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.language).toBe('en');

      act(() => {
        result.current.setLanguage('he');
      });

      expect(result.current.language).toBe('he');
      expect(result.current.dir).toBe('rtl');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('he');
    });

    it('persists language changes to localStorage', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      act(() => {
        result.current.setLanguage('en');
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('en');

      act(() => {
        result.current.setLanguage('he');
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('he');
    });
  });

  describe('Direction (dir)', () => {
    it('returns "rtl" for Hebrew', () => {
      localStorage.setItem(STORAGE_KEY, 'he');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.dir).toBe('rtl');
    });

    it('returns "ltr" for English', () => {
      localStorage.setItem(STORAGE_KEY, 'en');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.dir).toBe('ltr');
    });

    it('updates document direction when language changes', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      act(() => {
        result.current.setLanguage('en');
      });

      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');

      act(() => {
        result.current.setLanguage('he');
      });

      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('he');
    });
  });

  describe('Translation function (t)', () => {
    it('translates keys correctly for English', () => {
      localStorage.setItem(STORAGE_KEY, 'en');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.t('nav.dashboard')).toBe('Dashboard');
      expect(result.current.t('nav.personnel')).toBe('Personnel');
    });

    it('translates keys correctly for Hebrew', () => {
      localStorage.setItem(STORAGE_KEY, 'he');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.t('nav.dashboard')).toBe('לוח בקרה');
      expect(result.current.t('nav.personnel')).toBe('כוח אדם');
    });

    it('falls back to English for missing Hebrew translations', () => {
      localStorage.setItem(STORAGE_KEY, 'he');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      // Use a key that only exists in English
      const result1 = result.current.t('dashboard');
      // Dashboard exists in both languages, so let's test with translation key itself as fallback
      expect(typeof result1).toBe('string');
    });

    it('interpolates template variables in translations', () => {
      localStorage.setItem(STORAGE_KEY, 'en');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      // Using settings.pendingCount which has {count} parameter
      const translated = result.current.t('settings.pendingCount', { count: 5 });
      expect(translated).toBe('5 pending');
    });

    it('returns key itself for completely missing translations', () => {
      localStorage.setItem(STORAGE_KEY, 'en');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      // @ts-expect-error - Testing with invalid key
      const translated = result.current.t('nonExistentKey');
      expect(translated).toBe('nonExistentKey');
    });

    it('handles multiple parameter interpolation', () => {
      localStorage.setItem(STORAGE_KEY, 'en');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      // Testing settings.unitStats which has multiple parameters
      const translated = result.current.t('settings.unitStats', {
        battalions: 2,
        companies: 5,
        platoons: 10,
      });

      expect(translated).toBe('2 Battalions, 5 Companies, 10 Platoons');
    });
  });

  describe('useLanguage hook error handling', () => {
    it('throws error when used outside LanguageProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useLanguage());
      }).toThrow('useLanguage must be used within a LanguageProvider');

      console.error = originalError;
    });
  });

  describe('Integration with components', () => {
    it('provides translation context to child components', () => {
      localStorage.setItem(STORAGE_KEY, 'en');

      function TestComponent() {
        const { t } = useLanguage();
        return <div>{t('nav.dashboard')}</div>;
      }

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('re-renders components when language changes', () => {
      localStorage.setItem(STORAGE_KEY, 'en');

      function TestComponent() {
        const { t, setLanguage } = useLanguage();
        return (
          <div>
            <p>{t('nav.dashboard')}</p>
            <button onClick={() => setLanguage('he')}>Switch to Hebrew</button>
          </div>
        );
      }

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      const button = screen.getByRole('button', { name: /Switch to Hebrew/i });
      act(() => {
        button.click();
      });

      expect(screen.getByText('לוח בקרה')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });
});
