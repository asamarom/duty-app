import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalsTab } from './ApprovalsTab';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import userEvent from '@testing-library/user-event';

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

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
    mockNavigate.mockClear();
    mockUseEffectiveRole.mockReturnValue({
      isAdmin: false,
      isLeader: false,
      isActualAdmin: false,
      loading: false,
      roles: ['user'],
    });
    mockUsePendingRequestsCount.mockReturnValue(0);
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
      expect(screen.getByText(/pending.*approvals/i)).toBeInTheDocument();
    });
  });

  describe('Pending Requests Badge', () => {
    it('shows badge when there are pending requests', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });
      mockUsePendingRequestsCount.mockReturnValue(5);

      renderWithProviders(<ApprovalsTab />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('does not show badge when there are no pending requests', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });
      mockUsePendingRequestsCount.mockReturnValue(0);

      renderWithProviders(<ApprovalsTab />);

      // Badge with count should not exist when count is 0
      const badges = screen.queryAllByText('0');
      expect(badges.length).toBe(0);
    });
  });

  describe('Navigation', () => {
    it('navigates to approvals page when view button is clicked', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<ApprovalsTab />);

      const viewButton = screen.getByRole('button', { name: /view/i });
      await user.click(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith('/approvals');
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
