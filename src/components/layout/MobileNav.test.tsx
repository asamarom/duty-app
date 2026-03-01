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
    it('renders all 5 main navigation items', () => {
      renderWithProviders(<MobileNav />);

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /personnel/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /equipment/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    });

    it('does not render more menu button', () => {
      renderWithProviders(<MobileNav />);

      expect(screen.queryByRole('button', { name: /more/i })).not.toBeInTheDocument();
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

  describe('Fixed Navigation Items', () => {
    it('shows Settings link for all users', () => {
      renderWithProviders(<MobileNav />);

      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    });

    it('shows all 5 navigation items regardless of role', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: false,
        isActualAdmin: false,
        isAdminMode: false,
        loading: false,
        roles: ['user'],
      });

      renderWithProviders(<MobileNav />);

      const navLinks = screen.getAllByRole('link');
      expect(navLinks).toHaveLength(5);
    });

    it('shows all 5 navigation items for admins too', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        isAdminMode: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<MobileNav />);

      const navLinks = screen.getAllByRole('link');
      expect(navLinks).toHaveLength(5);
    });
  });
});
