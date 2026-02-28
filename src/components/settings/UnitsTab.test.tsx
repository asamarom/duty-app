import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnitsTab } from './UnitsTab';
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

describe('UnitsTab Component', () => {
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
  });

  describe('Access Control', () => {
    it('shows no access message for regular users', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: false,
        isActualAdmin: false,
        loading: false,
        roles: ['user'],
      });

      renderWithProviders(<UnitsTab />);

      expect(screen.getByText(/no.*access/i)).toBeInTheDocument();
    });

    it('shows unit management for leaders', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        loading: false,
        roles: ['leader'],
      });

      renderWithProviders(<UnitsTab />);

      expect(screen.queryByText(/no.*access/i)).not.toBeInTheDocument();
      expect(screen.getByText('settings.viewAllUnits')).toBeInTheDocument();
    });

    it('shows unit management for admins', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<UnitsTab />);

      expect(screen.queryByText(/no.*access/i)).not.toBeInTheDocument();
      expect(screen.getByText('settings.viewAllUnits')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to units page when view button is clicked', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        loading: false,
        roles: ['leader'],
      });

      renderWithProviders(<UnitsTab />);

      const viewButton = screen.getByRole('button', { name: /view/i });
      await user.click(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith('/units');
    });
  });

  describe('Permissions Display', () => {
    it('shows admin-specific permissions for admins', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<UnitsTab />);

      expect(screen.getByText(/create.*units/i)).toBeInTheDocument();
      expect(screen.getByText(/delete.*units/i)).toBeInTheDocument();
    });

    it('does not show admin permissions for leaders', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        loading: false,
        roles: ['leader'],
      });

      renderWithProviders(<UnitsTab />);

      expect(screen.queryByText(/create.*units/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/delete.*units/i)).not.toBeInTheDocument();
    });
  });

  describe('Role Badge Display', () => {
    it('displays admin badge for admins', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<UnitsTab />);

      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it('displays leader badge for leaders', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        loading: false,
        roles: ['leader'],
      });

      renderWithProviders(<UnitsTab />);

      expect(screen.getByText(/leader/i)).toBeInTheDocument();
    });
  });
});
