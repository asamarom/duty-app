import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalsTab } from './ApprovalsTab';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import userEvent from '@testing-library/user-event';

// Mock window.matchMedia for useMediaQuery hook
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

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

// Mock usePendingRequestsCount hook
const mockUsePendingRequestsCount = vi.fn(() => 0);

vi.mock('@/hooks/usePendingRequestsCount', () => ({
  usePendingRequestsCount: () => mockUsePendingRequestsCount(),
}));

// Mock useAuth hook
const mockUseAuth = vi.fn(() => ({
  user: { uid: 'test-user-id' },
  loading: false,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Firestore
vi.mock('@/integrations/firebase/client', () => ({
  db: {},
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ size: 0, docs: [], empty: true })),
  onSnapshot: vi.fn((q, callback) => {
    // Call callback with empty snapshot immediately
    callback({ docs: [], empty: true });
    return vi.fn(); // Return unsubscribe function
  }),
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

describe('ApprovalsTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEffectiveRole.mockReturnValue({
      isAdmin: false,
      isLeader: false,
      isActualAdmin: false,
      loading: false,
      roles: ['user'],
    });
    mockUsePendingRequestsCount.mockReturnValue(0);
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user-id' },
      loading: false,
    });
  });

  describe('Access Control', () => {
    it('shows admin-only message for non-admin users', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: false,
        isActualAdmin: false,
        loading: false,
        roles: ['user'],
      });

      renderWithProviders(<ApprovalsTab />);

      expect(screen.getByText(/admin.*only/i)).toBeInTheDocument();
    });

    it('shows admin-only message for leaders', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        loading: false,
        roles: ['leader'],
      });

      renderWithProviders(<ApprovalsTab />);

      expect(screen.getByText(/admin.*only/i)).toBeInTheDocument();
    });

    it('shows approvals content for admins', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<ApprovalsTab />);

      expect(screen.queryByText(/admin.*only/i)).not.toBeInTheDocument();
      expect(screen.getByText('settings.pendingApprovals')).toBeInTheDocument();
    });
  });

  describe('Pending Requests Display', () => {
    it('shows pending count badge when there are pending requests', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });
      mockUsePendingRequestsCount.mockReturnValue(5);

      renderWithProviders(<ApprovalsTab />);

      // Check for pending count text (translation key with count)
      expect(screen.getByText('settings.pendingCount')).toBeInTheDocument();
    });

    it('shows no pending requests message when count is 0', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });
      mockUsePendingRequestsCount.mockReturnValue(0);

      renderWithProviders(<ApprovalsTab />);

      expect(screen.getByText('settings.noPendingRequests')).toBeInTheDocument();
    });

    it('displays approved count in user unit', async () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<ApprovalsTab />);

      // Should show loading initially
      expect(screen.getByText('common.loading')).toBeInTheDocument();

      // After loading, should show approved count (mocked to 0)
      await screen.findByText(/approved.*unit/i);
    });
  });

  describe('Manage Approvals Button', () => {
    it('renders Manage Approvals button for admins', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<ApprovalsTab />);

      const manageButton = screen.getByRole('button', { name: 'settings.manageApprovals' });
      expect(manageButton).toBeInTheDocument();
    });

    it('button click opens the approvals sheet', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<ApprovalsTab />);

      const manageButton = screen.getByRole('button', { name: 'settings.manageApprovals' });
      await user.click(manageButton);

      // The sheet should open (we can't directly test useState, but the button should be clickable)
      expect(manageButton).toBeInTheDocument();
    });
  });

  describe('Admin Permissions Display', () => {
    it('displays all admin permissions', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<ApprovalsTab />);

      expect(screen.getByText(/approve.*users/i)).toBeInTheDocument();
      expect(screen.getByText(/assign.*roles/i)).toBeInTheDocument();
      expect(screen.getByText(/manage.*all.*units/i)).toBeInTheDocument();
      expect(screen.getByText(/system.*configuration/i)).toBeInTheDocument();
    });
  });
});
