import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from './SettingsPage';
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

describe('SettingsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      user: { email: 'test@example.com', uid: 'test-uid' },
      loading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    });
  });

  describe('Page Rendering', () => {
    it('renders the settings page', () => {
      renderWithProviders(<SettingsPage />);

      expect(screen.getByText(/settings/i)).toBeInTheDocument();
    });

    it('shows desktop header on large screens', () => {
      renderWithProviders(<SettingsPage />);

      // Desktop header has specific classes
      const header = document.querySelector('.hidden.lg\\:block');
      expect(header).toBeInTheDocument();
    });

    it('shows mobile header on small screens', () => {
      renderWithProviders(<SettingsPage />);

      // Mobile header has lg:hidden class
      const mobileHeader = document.querySelector('.lg\\:hidden');
      expect(mobileHeader).toBeInTheDocument();
    });
  });

  describe('Language Settings', () => {
    it('displays language selector', () => {
      renderWithProviders(<SettingsPage />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('allows changing language to Hebrew', async () => {
      const user = userEvent.setup();
      localStorage.setItem('pmtb-language', 'en');

      renderWithProviders(<SettingsPage />);

      const languageSelect = screen.getByRole('combobox');
      await user.click(languageSelect);

      const hebrewOption = screen.getByRole('option', { name: /hebrew/i });
      await user.click(hebrewOption);

      expect(localStorage.getItem('pmtb-language')).toBe('he');
    });

    it('allows changing language to English', async () => {
      const user = userEvent.setup();
      localStorage.setItem('pmtb-language', 'he');

      renderWithProviders(<SettingsPage />);

      const languageSelect = screen.getByRole('combobox');
      await user.click(languageSelect);

      const englishOption = screen.getByRole('option', { name: /english/i });
      await user.click(englishOption);

      expect(localStorage.getItem('pmtb-language')).toBe('en');
    });

    it('persists language selection across renders', () => {
      localStorage.setItem('pmtb-language', 'he');

      const { unmount } = renderWithProviders(<SettingsPage />);
      unmount();

      renderWithProviders(<SettingsPage />);

      expect(localStorage.getItem('pmtb-language')).toBe('he');
    });
  });

  describe('Access Control Display', () => {
    it('displays role badges', () => {
      renderWithProviders(<SettingsPage />);

      // Should show admin, leader, and user role descriptions
      expect(screen.getByText(/admin/i)).toBeInTheDocument();
      expect(screen.getByText(/leader/i)).toBeInTheDocument();
      expect(screen.getByText(/user/i)).toBeInTheDocument();
    });

    it('shows access level descriptions', () => {
      renderWithProviders(<SettingsPage />);

      expect(screen.getByText(/full.*access/i)).toBeInTheDocument();
      expect(screen.getByText(/unit.*management/i)).toBeInTheDocument();
      expect(screen.getByText(/standard.*access/i)).toBeInTheDocument();
    });
  });

  describe('Version Information', () => {
    it('displays version number', () => {
      renderWithProviders(<SettingsPage />);

      expect(screen.getByText(/PMTB v1\.0\.0/i)).toBeInTheDocument();
    });

    it('shows version in monospace font', () => {
      renderWithProviders(<SettingsPage />);

      const versionText = screen.getByText(/PMTB v1\.0\.0/i);
      expect(versionText).toHaveClass('font-mono');
    });
  });

  describe('Cards and Sections', () => {
    it('renders language settings card', () => {
      renderWithProviders(<SettingsPage />);

      expect(screen.getByText(/select.*language/i)).toBeInTheDocument();
    });

    it('renders access control card', () => {
      renderWithProviders(<SettingsPage />);

      expect(screen.getByText(/access.*control/i)).toBeInTheDocument();
    });

    it('renders version info card', () => {
      renderWithProviders(<SettingsPage />);

      const versionCard = screen.getByText(/PMTB v1\.0\.0/i).closest('.card-tactical');
      expect(versionCard).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('applies tactical grid layout', () => {
      renderWithProviders(<SettingsPage />);

      const grid = document.querySelector('.tactical-grid');
      expect(grid).toBeInTheDocument();
    });

    it('limits content width on larger screens', () => {
      renderWithProviders(<SettingsPage />);

      const contentArea = document.querySelector('.lg\\:max-w-2xl');
      expect(contentArea).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      renderWithProviders(<SettingsPage />);

      const heading = screen.getByText(/settings/i);
      expect(heading.tagName).toBe('H1');
    });

    it('provides descriptive text for language selector', () => {
      renderWithProviders(<SettingsPage />);

      expect(screen.getByText(/select.*language/i)).toBeInTheDocument();
    });
  });
});
