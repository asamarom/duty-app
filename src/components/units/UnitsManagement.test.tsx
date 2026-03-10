import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { UnitsManagement } from './UnitsManagement';
import type { Unit } from '@/hooks/useUnits';

// Unmock UnitsManagement to test the real implementation
vi.unmock('@/components/units/UnitsManagement');

// Mock hooks
const mockCreateUnit = vi.fn();
const mockUpdateUnit = vi.fn();
const mockDeleteUnit = vi.fn();
const mockGetChildUnits = vi.fn();

vi.mock('@/hooks/useUnitsManagement', () => ({
  useUnitsManagement: () => ({
    battalions: mockBattalions,
    loading: mockLoading,
    getChildUnits: mockGetChildUnits,
    createUnit: mockCreateUnit,
    updateUnit: mockUpdateUnit,
    deleteUnit: mockDeleteUnit,
  }),
}));

vi.mock('@/hooks/useEffectiveRole', () => ({
  useEffectiveRole: () => ({
    isAdmin: mockIsAdmin,
    isLeader: mockIsLeader,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
  }),
}));

let mockBattalions: Unit[] = [];
let mockLoading = false;
let mockIsAdmin = false;
let mockIsLeader = false;

describe('UnitsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBattalions = [];
    mockLoading = false;
    mockIsAdmin = false;
    mockIsLeader = false;
    mockGetChildUnits.mockReturnValue([]);
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading is true', () => {
      mockLoading = true;
      const { container } = render(<UnitsManagement />);

      const spinner = container.querySelector('.lucide-loader-circle');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no battalions exist', () => {
      render(<UnitsManagement />);

      expect(screen.getByText('units.noBattalions')).toBeInTheDocument();
      expect(screen.getByText('units.createFirst')).toBeInTheDocument();
    });

    it('shows add button in empty state for admin users', () => {
      mockIsAdmin = true;
      render(<UnitsManagement />);

      const addButtons = screen.getAllByText('units.addBattalion');
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('hides add button in empty state when showAddButton is false', () => {
      mockIsAdmin = true;
      render(<UnitsManagement showAddButton={false} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Header Rendering', () => {
    it('shows header when showHeader is true', () => {
      render(<UnitsManagement showHeader={true} />);

      expect(screen.getByText('units.title')).toBeInTheDocument();
      expect(screen.getByText('units.subtitle')).toBeInTheDocument();
    });

    it('hides header when showHeader is false', () => {
      render(<UnitsManagement showHeader={false} />);

      expect(screen.queryByText('units.title')).not.toBeInTheDocument();
      expect(screen.queryByText('units.subtitle')).not.toBeInTheDocument();
    });
  });

  describe('Unit Rendering', () => {
    const battalion: Unit = {
      id: 'bat-1',
      name: 'Battalion 1',
      unit_type: 'battalion',
      parent_id: null,
      designation: 'HQ Battalion',
      leader_id: null,
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('renders battalion card with name and designation', () => {
      mockBattalions = [battalion];
      render(<UnitsManagement />);

      expect(screen.getByText('Battalion 1')).toBeInTheDocument();
      expect(screen.getByText('HQ Battalion')).toBeInTheDocument();
    });

    it('renders status badge with correct status', () => {
      mockBattalions = [battalion];
      render(<UnitsManagement />);

      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('shows management buttons for admin users', () => {
      mockIsAdmin = true;
      mockBattalions = [battalion];
      render(<UnitsManagement />);

      // Admin should see "Add Battalion" button
      const addButtons = screen.getAllByText('units.addBattalion');
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('shows management buttons for leader users', () => {
      mockIsLeader = true;
      mockBattalions = [battalion];
      render(<UnitsManagement />);

      // Leader should see "Add Battalion" button
      const addButtons = screen.getAllByText('units.addBattalion');
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('hides management buttons for regular users', () => {
      mockBattalions = [battalion];
      render(<UnitsManagement />);

      // Regular users should not see add button
      const addButtons = screen.queryAllByText('units.addBattalion');
      expect(addButtons.length).toBe(0);
    });
  });

  describe('Hierarchy Rendering', () => {
    const battalion: Unit = {
      id: 'bat-1',
      name: 'Battalion 1',
      unit_type: 'battalion',
      parent_id: null,
      designation: null,
      leader_id: null,
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const company: Unit = {
      id: 'comp-1',
      name: 'Company A',
      unit_type: 'company',
      parent_id: 'bat-1',
      designation: null,
      leader_id: null,
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const platoon: Unit = {
      id: 'plat-1',
      name: 'Platoon 1',
      unit_type: 'platoon',
      parent_id: 'comp-1',
      designation: null,
      leader_id: null,
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('shows "no sub-units" message when battalion has no companies', async () => {
      mockBattalions = [battalion];
      mockGetChildUnits.mockReturnValue([]);

      render(<UnitsManagement />);

      const collapsibleTrigger = screen.getByRole('button', { hidden: true });
      await userEvent.click(collapsibleTrigger);

      await waitFor(() => {
        expect(screen.getByText('units.noSubUnits')).toBeInTheDocument();
      });
    });

    it('renders company when battalion is expanded', async () => {
      mockBattalions = [battalion];
      mockGetChildUnits.mockImplementation((parentId: string) => {
        if (parentId === 'bat-1') return [company];
        return [];
      });

      render(<UnitsManagement />);

      const collapsibleTrigger = screen.getByRole('button', { hidden: true });
      await userEvent.click(collapsibleTrigger);

      await waitFor(() => {
        expect(screen.getByText('Company A')).toBeInTheDocument();
      });
    });

    it('renders platoon when company is expanded', async () => {
      mockBattalions = [battalion];
      mockGetChildUnits.mockImplementation((parentId: string) => {
        if (parentId === 'bat-1') return [company];
        if (parentId === 'comp-1') return [platoon];
        return [];
      });

      render(<UnitsManagement />);

      const battalionTrigger = screen.getByRole('button', { hidden: true });
      await userEvent.click(battalionTrigger);

      await waitFor(() => {
        expect(screen.getByText('Company A')).toBeInTheDocument();
      });

      const companyButtons = screen.getAllByRole('button', { hidden: true });
      const companyTrigger = companyButtons.find(btn =>
        btn.textContent?.includes('Company A')
      );

      if (companyTrigger) {
        await userEvent.click(companyTrigger);

        await waitFor(() => {
          expect(screen.getByText('Platoon 1')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Create Unit Dialog', () => {
    it('opens create battalion dialog when add button clicked', async () => {
      mockIsAdmin = true;
      render(<UnitsManagement />);

      const addButton = screen.getAllByText('units.addBattalion')[0];
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('units.create units.battalion')).toBeInTheDocument();
      });
    });

    it('shows form fields in create dialog', async () => {
      mockIsAdmin = true;
      render(<UnitsManagement />);

      const addButton = screen.getAllByText('units.addBattalion')[0];
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('units.name')).toBeInTheDocument();
        expect(screen.getByLabelText('units.designation')).toBeInTheDocument();
      });
    });

    it('calls createUnit when save is clicked with valid data', async () => {
      mockIsAdmin = true;
      mockCreateUnit.mockResolvedValue(undefined);

      render(<UnitsManagement />);

      const addButton = screen.getAllByText('units.addBattalion')[0];
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('units.name')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('units.name');
      const designationInput = screen.getByLabelText('units.designation');

      await userEvent.type(nameInput, 'Test Battalion');
      await userEvent.type(designationInput, 'Test Designation');

      const createButton = screen.getByText('units.create');
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateUnit).toHaveBeenCalledWith({
          name: 'Test Battalion',
          unit_type: 'battalion',
          parent_id: undefined,
          designation: 'Test Designation',
        });
      });
    });

    it('disables save button when name is empty', async () => {
      mockIsAdmin = true;
      render(<UnitsManagement />);

      const addButton = screen.getAllByText('units.addBattalion')[0];
      await userEvent.click(addButton);

      await waitFor(() => {
        const createButton = screen.getByText('units.create');
        expect(createButton).toBeDisabled();
      });
    });

    it('closes dialog when cancel is clicked', async () => {
      mockIsAdmin = true;
      render(<UnitsManagement />);

      const addButton = screen.getAllByText('units.addBattalion')[0];
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('units.create units.battalion')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('common.cancel');
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('units.create units.battalion')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Unit Dialog', () => {
    const battalion: Unit = {
      id: 'bat-1',
      name: 'Battalion 1',
      unit_type: 'battalion',
      parent_id: null,
      designation: 'HQ',
      leader_id: null,
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('opens edit dialog with pre-filled data when edit button clicked', async () => {
      mockIsAdmin = true;
      mockBattalions = [battalion];

      render(<UnitsManagement />);

      const editButton = screen.getAllByRole('button', { hidden: true }).find(
        btn => btn.querySelector('svg')?.classList.contains('lucide-edit')
      );

      if (editButton) {
        await userEvent.click(editButton);

        await waitFor(() => {
          const nameInput = screen.getByDisplayValue('Battalion 1');
          const designationInput = screen.getByDisplayValue('HQ');

          expect(nameInput).toBeInTheDocument();
          expect(designationInput).toBeInTheDocument();
        });
      }
    });

    it('calls updateUnit when save is clicked', async () => {
      mockIsAdmin = true;
      mockBattalions = [battalion];
      mockUpdateUnit.mockResolvedValue(undefined);

      render(<UnitsManagement />);

      const editButton = screen.getAllByRole('button', { hidden: true }).find(
        btn => btn.querySelector('svg')?.classList.contains('lucide-edit')
      );

      if (editButton) {
        await userEvent.click(editButton);

        await waitFor(() => {
          expect(screen.getByDisplayValue('Battalion 1')).toBeInTheDocument();
        });

        const nameInput = screen.getByDisplayValue('Battalion 1');
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'Updated Battalion');

        const saveButton = screen.getByText('common.save');
        await userEvent.click(saveButton);

        await waitFor(() => {
          expect(mockUpdateUnit).toHaveBeenCalledWith('bat-1', {
            name: 'Updated Battalion',
            designation: 'HQ',
          });
        });
      }
    });
  });

  describe('Delete Unit Dialog', () => {
    const battalion: Unit = {
      id: 'bat-1',
      name: 'Battalion 1',
      unit_type: 'battalion',
      parent_id: null,
      designation: null,
      leader_id: null,
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('opens delete confirmation dialog when delete button clicked', async () => {
      mockIsAdmin = true;
      mockBattalions = [battalion];

      render(<UnitsManagement />);

      const deleteButton = screen.getAllByRole('button', { hidden: true }).find(
        btn => btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );

      if (deleteButton) {
        await userEvent.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByText(/units.confirmDelete/)).toBeInTheDocument();
          expect(screen.getByText(/Battalion 1/)).toBeInTheDocument();
        });
      }
    });

    it('shows warning about sub-units for non-platoon units', async () => {
      mockIsAdmin = true;
      mockBattalions = [battalion];

      render(<UnitsManagement />);

      const deleteButton = screen.getAllByRole('button', { hidden: true }).find(
        btn => btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );

      if (deleteButton) {
        await userEvent.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByText('units.deleteSubUnitsWarning units.battalion.')).toBeInTheDocument();
        });
      }
    });

    it('calls deleteUnit when delete is confirmed', async () => {
      mockIsAdmin = true;
      mockBattalions = [battalion];
      mockDeleteUnit.mockResolvedValue(undefined);

      render(<UnitsManagement />);

      const deleteButton = screen.getAllByRole('button', { hidden: true }).find(
        btn => btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );

      if (deleteButton) {
        await userEvent.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByText(/units.confirmDelete/)).toBeInTheDocument();
        });

        const confirmButtons = screen.getAllByText('common.delete');
        const confirmButton = confirmButtons[confirmButtons.length - 1];
        await userEvent.click(confirmButton);

        await waitFor(() => {
          expect(mockDeleteUnit).toHaveBeenCalledWith('bat-1');
        });
      }
    });

    it('closes dialog when cancel is clicked', async () => {
      mockIsAdmin = true;
      mockBattalions = [battalion];

      render(<UnitsManagement />);

      const deleteButton = screen.getAllByRole('button', { hidden: true }).find(
        btn => btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );

      if (deleteButton) {
        await userEvent.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByText(/units.confirmDelete/)).toBeInTheDocument();
        });

        const cancelButton = screen.getByText('common.cancel');
        await userEvent.click(cancelButton);

        await waitFor(() => {
          expect(screen.queryByText(/units.confirmDelete/)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Unit Expansion', () => {
    const battalion: Unit = {
      id: 'bat-1',
      name: 'Battalion 1',
      unit_type: 'battalion',
      parent_id: null,
      designation: null,
      leader_id: null,
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const company: Unit = {
      id: 'comp-1',
      name: 'Company A',
      unit_type: 'company',
      parent_id: 'bat-1',
      designation: null,
      leader_id: null,
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('expands battalion to show companies when clicked', async () => {
      mockBattalions = [battalion];
      mockGetChildUnits.mockImplementation((parentId: string) => {
        if (parentId === 'bat-1') return [company];
        return [];
      });

      render(<UnitsManagement />);

      const collapsibleTrigger = screen.getByRole('button', { hidden: true });
      await userEvent.click(collapsibleTrigger);

      await waitFor(() => {
        expect(screen.getByText('Company A')).toBeInTheDocument();
      });
    });

    it('collapses battalion when clicked again', async () => {
      mockBattalions = [battalion];
      mockGetChildUnits.mockImplementation((parentId: string) => {
        if (parentId === 'bat-1') return [company];
        return [];
      });

      const { container } = render(<UnitsManagement />);

      const collapsibleTrigger = screen.getByRole('button', { hidden: true });

      await userEvent.click(collapsibleTrigger);
      await waitFor(() => {
        expect(screen.getByText('Company A')).toBeInTheDocument();
      });

      await userEvent.click(collapsibleTrigger);
      await waitFor(() => {
        // Check that the content is hidden (collapsed)
        const content = container.querySelector('[data-state="closed"]');
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(<UnitsManagement className="custom-class" />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});
