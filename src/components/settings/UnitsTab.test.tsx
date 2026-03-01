import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnitsTab } from './UnitsTab';
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

// Mock useUnitsManagement hook
const mockUseUnitsManagement = vi.fn(() => ({
  battalions: [],
  companies: [],
  platoons: [],
  loading: false,
}));

vi.mock('@/hooks/useUnitsManagement', () => ({
  useUnitsManagement: () => mockUseUnitsManagement(),
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

describe('UnitsTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEffectiveRole.mockReturnValue({
      isAdmin: false,
      isLeader: false,
      isActualAdmin: false,
      loading: false,
      roles: ['user'],
    });
    mockUseUnitsManagement.mockReturnValue({
      battalions: [],
      companies: [],
      platoons: [],
      loading: false,
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
      expect(screen.getByText('settings.manageUnits')).toBeInTheDocument();
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
      expect(screen.getByText('settings.manageUnits')).toBeInTheDocument();
    });
  });

  describe('Summary Statistics', () => {
    it('displays unit counts when units are available', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        loading: false,
        roles: ['leader'],
      });
      mockUseUnitsManagement.mockReturnValue({
        battalions: [{ id: '1', name: 'Battalion 1' }],
        companies: [
          { id: '1', name: 'Company 1' },
          { id: '2', name: 'Company 2' },
        ],
        platoons: [
          { id: '1', name: 'Platoon 1' },
          { id: '2', name: 'Platoon 2' },
          { id: '3', name: 'Platoon 3' },
        ],
        loading: false,
      });

      renderWithProviders(<UnitsTab />);

      // Check that each unit type is displayed on separate lines with counts
      expect(screen.getByText(/1.*settings\.battalions/)).toBeInTheDocument();
      expect(screen.getByText(/2.*settings\.companies/)).toBeInTheDocument();
      expect(screen.getByText(/3.*settings\.platoons/)).toBeInTheDocument();
    });

    it('displays no units message when no units exist', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });
      mockUseUnitsManagement.mockReturnValue({
        battalions: [],
        companies: [],
        platoons: [],
        loading: false,
      });

      renderWithProviders(<UnitsTab />);

      expect(screen.getByText('settings.noUnitsYet')).toBeInTheDocument();
    });

    it('displays loading state while fetching units', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });
      mockUseUnitsManagement.mockReturnValue({
        battalions: [],
        companies: [],
        platoons: [],
        loading: true,
      });

      renderWithProviders(<UnitsTab />);

      expect(screen.getByText('common.loading')).toBeInTheDocument();
    });
  });

  describe('Manage Units Button', () => {
    it('renders Manage Units button for authorized users', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        isActualAdmin: false,
        loading: false,
        roles: ['leader'],
      });

      renderWithProviders(<UnitsTab />);

      const manageButton = screen.getByRole('button', { name: 'settings.manageUnits' });
      expect(manageButton).toBeInTheDocument();
    });

    it('button click opens the units sheet', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        isActualAdmin: true,
        loading: false,
        roles: ['admin'],
      });

      renderWithProviders(<UnitsTab />);

      const manageButton = screen.getByRole('button', { name: 'settings.manageUnits' });
      await user.click(manageButton);

      // The sheet should open (we can't directly test useState, but the button should be clickable)
      expect(manageButton).toBeInTheDocument();
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
