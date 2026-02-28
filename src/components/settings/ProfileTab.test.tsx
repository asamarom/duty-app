import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileTab } from './ProfileTab';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import userEvent from '@testing-library/user-event';

// Mock useAuth hook
const mockUseAuth = vi.fn(() => ({
  user: { email: 'test@example.com', uid: 'test-uid' },
  loading: false,
  signInWithGoogle: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock version module
vi.mock('@/lib/version', () => ({
  getAppVersion: () => 'v1.0.0-test',
}));

// Helper to render with all required providers
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        {ui}
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe('ProfileTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { email: 'test@example.com', uid: 'test-uid' },
      loading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    });
  });

  describe('User Information Display', () => {
    it('renders user email when authenticated', () => {
      renderWithProviders(<ProfileTab />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('displays authenticated badge for logged in user', () => {
      renderWithProviders(<ProfileTab />);

      expect(screen.getByText(/authenticated/i)).toBeInTheDocument();
    });

    it('shows user profile icon', () => {
      renderWithProviders(<ProfileTab />);

      // Check for User icon (lucide-react)
      const userIcon = document.querySelector('svg');
      expect(userIcon).toBeInTheDocument();
    });
  });

  describe('Language Settings', () => {
    it('renders language selector', () => {
      renderWithProviders(<ProfileTab />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('allows changing language from English to Hebrew', async () => {
      const user = userEvent.setup();
      localStorage.setItem('pmtb-language', 'en');

      renderWithProviders(<ProfileTab />);

      const languageSelect = screen.getByRole('combobox');
      await user.click(languageSelect);

      const hebrewOption = screen.getByRole('option', { name: /hebrew/i });
      await user.click(hebrewOption);

      // Language should be changed in localStorage
      expect(localStorage.getItem('pmtb-language')).toBe('he');
    });

    it('allows changing language from Hebrew to English', async () => {
      const user = userEvent.setup();
      localStorage.setItem('pmtb-language', 'he');

      renderWithProviders(<ProfileTab />);

      const languageSelect = screen.getByRole('combobox');
      await user.click(languageSelect);

      const englishOption = screen.getByRole('option', { name: /english/i });
      await user.click(englishOption);

      // Language should be changed in localStorage
      expect(localStorage.getItem('pmtb-language')).toBe('en');
    });
  });

  describe('Version Information', () => {
    it('displays app version', () => {
      renderWithProviders(<ProfileTab />);

      expect(screen.getByText(/v1\.0\.0-test/i)).toBeInTheDocument();
    });

    it('shows version in monospace font', () => {
      renderWithProviders(<ProfileTab />);

      const versionText = screen.getByText(/v1\.0\.0-test/i);
      expect(versionText).toHaveClass('font-mono');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<ProfileTab />);

      // Check for proper card titles
      expect(screen.getByText(/language/i)).toBeInTheDocument();
    });
  });
});
