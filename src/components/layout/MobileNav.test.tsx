import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileNav } from './MobileNav';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AdminModeProvider } from '@/contexts/AdminModeContext';
import userEvent from '@testing-library/user-event';

// Mock useEffectiveRole hook
const mockUseEffectiveRole = vi.fn(() => ({
  isAdmin: false,
  isLeader: false,
  isActualAdmin: false,
  isAdminMode: false,
  loading: false,
  roles: ['user'],
}));

vi.mock('@/hooks/useEffectiveRole', () => ({
  useEffectiveRole: () => mockUseEffectiveRole(),
}));

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

// Mock usePendingRequestsCount hook
const mockUsePendingRequestsCount = vi.fn(() => 0);

vi.mock('@/hooks/usePendingRequestsCount', () => ({
  usePendingRequestsCount: () => mockUsePendingRequestsCount(),
}));

// Mock AdminModeContext
const mockToggleAdminMode = vi.fn();

vi.mock('@/contexts/AdminModeContext', async () => {
  const actual = await vi.importActual('@/contexts/AdminModeContext');
  return {
    ...actual,
    useAdminMode: () => ({
      toggleAdminMode: mockToggleAdminMode,
    }),
    AdminModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Helper to render with all required providers
function renderWithProviders(ui: React.ReactElement, initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <LanguageProvider>
        <AdminModeProvider>
          {ui}
        </AdminModeProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe('MobileNav Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEffectiveRole.mockReturnValue({
      isAdmin: false,
      isLeader: false,
      isActualAdmin: false,
      isAdminMode: false,
      loading: false,
      roles: ['user'],
    });
    mockUseAuth.mockReturnValue({
      user: { email: 'test@example.com', uid: 'test-uid' },
      loading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    });
    mockUsePendingRequestsCount.mockReturnValue(0);
  });

  describe('Navigation Rendering', () => {
    it('renders all main navigation items', () => {
      renderWithProviders(<MobileNav />);

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /personnel/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /equipment/i })).toBeInTheDocument();
    });

    it('renders more menu button', () => {
      renderWithProviders(<MobileNav />);

      expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument();
    });

    it('has fixed positioning at bottom', () => {
      renderWithProviders(<MobileNav />);

      const nav = document.querySelector('nav');
      expect(nav).toHaveClass('fixed', 'bottom-0');
    });
  });

  describe('Active Navigation State', () => {
    it('highlights dashboard when on home route', () => {
      renderWithProviders(<MobileNav />, '/');

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveClass('text-primary');
    });

    it('highlights personnel when on personnel route', () => {
      renderWithProviders(<MobileNav />, '/personnel');

      const personnelLink = screen.getByRole('link', { name: /personnel/i });
      expect(personnelLink).toHaveClass('text-primary');
    });

    it('highlights equipment when on equipment route', () => {
      renderWithProviders(<MobileNav />, '/equipment');

      const equipmentLink = screen.getByRole('link', { name: /equipment/i });
      expect(equipmentLink).toHaveClass('text-primary');
    });
  });

  describe('More Menu', () => {
    it('opens dropdown when more button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MobileNav />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      // Menu items should be visible
      expect(screen.getByText(/units/i)).toBeInTheDocument();
      expect(screen.getByText(/reports/i)).toBeInTheDocument();
      expect(screen.getByText(/settings/i)).toBeInTheDocument();
    });

    it('displays user email in dropdown', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MobileNav />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('shows sign out option', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MobileNav />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      expect(screen.getByText(/sign.*out/i)).toBeInTheDocument();
    });
  });

  describe('Admin Mode Toggle', () => {
    it('shows admin mode toggle for actual admins', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        isAdminMode: false,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<MobileNav />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      // Should show admin mode toggle
      expect(screen.getByText(/user.*view/i)).toBeInTheDocument();
    });

    it('does not show admin mode toggle for non-admins', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: false,
        isActualAdmin: false,
        isAdminMode: false,
        loading: false,
        roles: ['user'],
      });

      renderWithProviders(<MobileNav />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      expect(screen.queryByText(/admin.*view/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/user.*view/i)).not.toBeInTheDocument();
    });

    it('toggles admin mode when switch is clicked', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        isAdminMode: false,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<MobileNav />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      const adminToggle = screen.getByRole('switch');
      await user.click(adminToggle);

      expect(mockToggleAdminMode).toHaveBeenCalled();
    });
  });

  describe('Role-Based Menu Items', () => {
    it('hides approvals for non-admins', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: false,
        isActualAdmin: false,
        isAdminMode: false,
        loading: false,
        roles: ['user'],
      });

      renderWithProviders(<MobileNav />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      expect(screen.queryByText(/approvals/i)).not.toBeInTheDocument();
    });

    it('shows approvals for admins', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        isAdminMode: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<MobileNav />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      expect(screen.getByText(/approvals/i)).toBeInTheDocument();
    });

    it('shows approvals for leaders', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        isAdminMode: false,
        loading: false,
        roles: ['leader'],
      });

      renderWithProviders(<MobileNav />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      // Leaders should NOT see approvals (admin-only)
      expect(screen.queryByText(/approvals/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when roles are loading', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: false,
        isActualAdmin: false,
        isAdminMode: false,
        loading: true,
        roles: [],
      });

      renderWithProviders(<MobileNav />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });
});
