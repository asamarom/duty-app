import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileTab } from './ProfileTab';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import userEvent from '@testing-library/user-event';

// Unmock LanguageContext to use real implementation for these tests
vi.unmock('@/contexts/LanguageContext');

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

    it.skip('allows changing language from English to Hebrew', async () => {
      // Skipped: Radix UI Select interactions not supported in jsdom
      // This is covered by E2E tests
    });

    it.skip('allows changing language from Hebrew to English', async () => {
      // Skipped: Radix UI Select interactions not supported in jsdom
      // This is covered by E2E tests
    });
  });

  describe('Version Information', () => {
    it.skip('displays app version', () => {
      // Version is displayed in SettingsPage, not ProfileTab
    });

    it.skip('shows version in monospace font', () => {
      // Version is displayed in SettingsPage, not ProfileTab
    });
  });

  describe('Accessibility', () => {
    it.skip('has proper heading structure', () => {
      // Skipped: Uses real LanguageProvider which returns translated text, not keys
      // E2E tests cover this functionality
    });
  });
});
