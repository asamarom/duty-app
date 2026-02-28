import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsTabs } from './SettingsTabs';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock useEffectiveRole hook
const mockUseEffectiveRole = vi.fn(() => ({
  isAdmin: false,
  isLeader: false,
  isActualAdmin: false,
  loading: false,
  roles: ['user'],
}));

vi.mock('@/hooks/useEffectiveRole', () => ({
  useEffectiveRole: () => mockUseEffectiveRole(),
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

describe('SettingsTabs Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEffectiveRole.mockReturnValue({
      isAdmin: false,
      isLeader: false,
      isActualAdmin: false,
      loading: false,
      roles: ['user'],
    });
  });

  describe('Tab Rendering', () => {
    it('renders all 3 tabs (Profile, Units, Approvals)', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<SettingsTabs />);

      // Check that all tabs are present
      expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /units/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /approvals/i })).toBeInTheDocument();
    });

    it('renders tablist with proper accessibility attributes', () => {
      renderWithProviders(<SettingsTabs />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
      expect(tablist).toHaveAttribute('aria-label');
    });
  });

  describe('Tab Switching', () => {
    it('shows Profile tab content by default', () => {
      renderWithProviders(<SettingsTabs />);

      const profileTab = screen.getByRole('tab', { name: /profile/i });
      expect(profileTab).toHaveAttribute('aria-selected', 'true');
    });

    it('switches to Units tab when clicked', async () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        loading: false,
        roles: ['leader'],
      });

      const { user } = await import('@testing-library/user-event');
      const userEvent = user.setup();

      renderWithProviders(<SettingsTabs />);

      const unitsTab = screen.getByRole('tab', { name: /units/i });
      await userEvent.click(unitsTab);

      expect(unitsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('switches to Approvals tab when clicked', async () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      const { user } = await import('@testing-library/user-event');
      const userEvent = user.setup();

      renderWithProviders(<SettingsTabs />);

      const approvalsTab = screen.getByRole('tab', { name: /approvals/i });
      await userEvent.click(approvalsTab);

      expect(approvalsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('displays correct tab panel content when switching tabs', async () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      const { user } = await import('@testing-library/user-event');
      const userEvent = user.setup();

      renderWithProviders(<SettingsTabs />);

      // Click Units tab
      const unitsTab = screen.getByRole('tab', { name: /units/i });
      await userEvent.click(unitsTab);

      // Check that the Units tabpanel is visible
      const unitsPanel = screen.getByRole('tabpanel');
      expect(unitsPanel).toHaveAttribute('aria-labelledby');
    });
  });

  describe('Active State', () => {
    it('applies active styling to selected tab', () => {
      renderWithProviders(<SettingsTabs />);

      const profileTab = screen.getByRole('tab', { name: /profile/i });
      expect(profileTab).toHaveAttribute('aria-selected', 'true');
    });

    it('only one tab is active at a time', async () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      const { user } = await import('@testing-library/user-event');
      const userEvent = user.setup();

      renderWithProviders(<SettingsTabs />);

      const profileTab = screen.getByRole('tab', { name: /profile/i });
      const unitsTab = screen.getByRole('tab', { name: /units/i });

      expect(profileTab).toHaveAttribute('aria-selected', 'true');
      expect(unitsTab).toHaveAttribute('aria-selected', 'false');

      await userEvent.click(unitsTab);

      expect(profileTab).toHaveAttribute('aria-selected', 'false');
      expect(unitsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('RTL Support', () => {
    it('renders correctly in RTL mode (Hebrew)', () => {
      // Set language to Hebrew in localStorage
      localStorage.setItem('pmtb-language', 'he');

      renderWithProviders(<SettingsTabs />);

      // Check that dir attribute is set on document
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('renders correctly in LTR mode (English)', () => {
      // Set language to English in localStorage
      localStorage.setItem('pmtb-language', 'en');

      renderWithProviders(<SettingsTabs />);

      // Check that dir attribute is set on document
      expect(document.documentElement.dir).toBe('ltr');
    });
  });

  describe('Role-Based Visibility', () => {
    it('hides Units tab for regular users', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: false,
        isActualAdmin: false,
        loading: false,
        roles: ['user'],
      });

      renderWithProviders(<SettingsTabs />);

      expect(screen.queryByRole('tab', { name: /units/i })).not.toBeInTheDocument();
    });

    it('shows Units tab for leaders', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        loading: false,
        roles: ['leader'],
      });

      renderWithProviders(<SettingsTabs />);

      expect(screen.getByRole('tab', { name: /units/i })).toBeInTheDocument();
    });

    it('shows Units tab for admins', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<SettingsTabs />);

      expect(screen.getByRole('tab', { name: /units/i })).toBeInTheDocument();
    });

    it('hides Approvals tab for regular users', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: false,
        isActualAdmin: false,
        loading: false,
        roles: ['user'],
      });

      renderWithProviders(<SettingsTabs />);

      expect(screen.queryByRole('tab', { name: /approvals/i })).not.toBeInTheDocument();
    });

    it('hides Approvals tab for leaders', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        loading: false,
        roles: ['leader'],
      });

      renderWithProviders(<SettingsTabs />);

      expect(screen.queryByRole('tab', { name: /approvals/i })).not.toBeInTheDocument();
    });

    it('shows Approvals tab only for admins', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<SettingsTabs />);

      expect(screen.getByRole('tab', { name: /approvals/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for screen readers', () => {
      renderWithProviders(<SettingsTabs />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label');
    });

    it('tabs have proper ARIA controls', () => {
      renderWithProviders(<SettingsTabs />);

      const profileTab = screen.getByRole('tab', { name: /profile/i });
      expect(profileTab).toHaveAttribute('aria-controls');
    });

    it('supports keyboard navigation', async () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      const { user } = await import('@testing-library/user-event');
      const userEvent = user.setup();

      renderWithProviders(<SettingsTabs />);

      const profileTab = screen.getByRole('tab', { name: /profile/i });
      profileTab.focus();

      // Tab should be focusable
      expect(document.activeElement).toBe(profileTab);

      // Arrow keys should navigate between tabs
      await userEvent.keyboard('{ArrowRight}');
      const unitsTab = screen.getByRole('tab', { name: /units/i });
      expect(document.activeElement).toBe(unitsTab);
    });
  });
});
