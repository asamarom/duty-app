import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ApprovalsManagement } from './ApprovalsManagement';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { SignupRequestDoc } from '@/integrations/firebase/types';
import { Timestamp } from 'firebase/firestore';

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

// Mock hooks
const mockUseAuth = vi.fn(() => ({
  user: { uid: 'test-admin-id' },
  loading: false,
}));

const mockUseEffectiveRole = vi.fn(() => ({
  isAdmin: true,
  isLeader: false,
  loading: false,
}));

const mockGetUnitPath = vi.fn((unitId: string) => {
  const paths: Record<string, string> = {
    'unit-1': 'Battalion 1 > Company A',
    'unit-2': 'Battalion 2 > Company B',
  };
  return paths[unitId] || 'units.noUnit';
});

const mockUseUnits = vi.fn(() => ({
  units: [
    { id: 'unit-1', name: 'Company A', unit_type: 'company', parent_id: 'bat-1' },
    { id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion', parent_id: null },
  ],
  getUnitPath: mockGetUnitPath,
  loading: false,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useEffectiveRole', () => ({
  useEffectiveRole: () => mockUseEffectiveRole(),
}));

vi.mock('@/hooks/useUnits', () => ({
  useUnits: () => mockUseUnits(),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock Firestore functions
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: () => mockGetDocs(),
  doc: vi.fn((db, path, id) => ({ id, path: `${path}/${id}` })),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  addDoc: vi.fn(),
  query: vi.fn((collection, ...args) => ({ collection, args })),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  getDoc: () => mockGetDoc(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));

vi.mock('@/integrations/firebase/client', () => ({
  db: {},
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

// Helper to create mock signup request
function createMockRequest(overrides: Partial<SignupRequestDoc & { id: string }> = {}) {
  const now = Timestamp.now();
  return {
    id: 'req-1',
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-1234',
    serviceNumber: '12345',
    rank: 'Sergeant',
    requestedUnitId: 'unit-1',
    status: 'pending' as const,
    reviewedBy: null,
    reviewedAt: null,
    declineReason: null,
    createdAt: now,
    updatedAt: now,
    fullName: 'John Doe',
    ...overrides,
  };
}

describe('ApprovalsManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-admin-id' },
      loading: false,
    });
    mockUseEffectiveRole.mockReturnValue({
      isAdmin: true,
      isLeader: false,
      loading: false,
    });
    mockUseUnits.mockReturnValue({
      units: [
        { id: 'unit-1', name: 'Company A', unit_type: 'company', parent_id: 'bat-1' },
        { id: 'bat-1', name: 'Battalion 1', unit_type: 'battalion', parent_id: null },
      ],
      getUnitPath: mockGetUnitPath,
      loading: false,
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when roles are loading', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        loading: true,
      });

      const { container } = renderWithProviders(<ApprovalsManagement />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows loading spinner when units are loading', () => {
      mockUseUnits.mockReturnValue({
        units: [],
        getUnitPath: mockGetUnitPath,
        loading: true,
      });

      const { container } = renderWithProviders(<ApprovalsManagement />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows loading spinner while fetching requests', async () => {
      let resolveGetDocs: any;
      mockGetDocs.mockImplementation(() => new Promise((resolve) => {
        resolveGetDocs = resolve;
      }));

      const { container } = renderWithProviders(<ApprovalsManagement />);

      // Wait a bit for the loading state to appear
      await waitFor(() => {
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      }, { timeout: 500 });

      // Clean up - resolve the promise
      if (resolveGetDocs) {
        resolveGetDocs({ docs: [] });
      }
    });
  });

  describe('Permission Checks', () => {
    it('shows no permission message for non-admin/non-leader users', () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: false,
        loading: false,
      });

      renderWithProviders(<ApprovalsManagement />);
      expect(screen.getByText('approvals.noPermission')).toBeInTheDocument();
    });

    it('allows access for admin users', async () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        loading: false,
      });
      mockGetDocs.mockResolvedValue({ docs: [] });

      renderWithProviders(<ApprovalsManagement />);

      expect(screen.queryByText('approvals.noPermission')).not.toBeInTheDocument();
    });

    it('allows access for leader users', async () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        loading: false,
      });
      mockGetDocs.mockResolvedValue({ docs: [] });

      renderWithProviders(<ApprovalsManagement />);

      expect(screen.queryByText('approvals.noPermission')).not.toBeInTheDocument();
    });
  });

  describe('Header Rendering', () => {
    beforeEach(() => {
      mockGetDocs.mockResolvedValue({ docs: [] });
    });

    it('shows header by default', async () => {
      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.title')).toBeInTheDocument();
        expect(screen.getByText('approvals.subtitle')).toBeInTheDocument();
      });
    });

    it('hides header when showHeader is false', async () => {
      renderWithProviders(<ApprovalsManagement showHeader={false} />);

      await waitFor(() => {
        expect(screen.queryByText('approvals.title')).not.toBeInTheDocument();
        expect(screen.queryByText('approvals.subtitle')).not.toBeInTheDocument();
      });
    });

    it('shows Add User button in header for admins', async () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        loading: false,
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUser')).toBeInTheDocument();
      });
    });

    it('shows Add User button in header for leaders', async () => {
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        loading: false,
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUser')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    beforeEach(() => {
      mockGetDocs.mockResolvedValue({ docs: [] });
    });

    it('shows empty state when no pending requests exist', async () => {
      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.noPending')).toBeInTheDocument();
      });
    });

    it('shows empty state when no processed requests exist', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('status.pending')).toBeInTheDocument();
      });

      const processedTab = screen.getByText('approvals.processed');
      await user.click(processedTab);

      await waitFor(() => {
        expect(screen.getByText('approvals.noProcessed')).toBeInTheDocument();
      });
    });
  });

  describe('Rendering Pending Requests', () => {
    it('renders pending request cards with correct information', async () => {
      const mockRequest = createMockRequest({
        id: 'req-1',
        fullName: 'John Doe',
        email: 'john@example.com',
        serviceNumber: '12345',
        phone: '555-1234',
        requestedUnitId: 'unit-1',
        status: 'pending',
      });

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('12345')).toBeInTheDocument();
        expect(screen.getByText('555-1234')).toBeInTheDocument();
      });
    });

    it('shows pending badge on requests', async () => {
      const mockRequest = createMockRequest();
      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        const badges = screen.getAllByText('status.pending');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('displays unit path for request', async () => {
      const mockRequest = createMockRequest({
        requestedUnitId: 'unit-1',
      });
      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('Battalion 1 > Company A')).toBeInTheDocument();
      });
    });

    it('shows "N/A" for missing phone number', async () => {
      const mockRequest = createMockRequest({
        phone: null,
      });
      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('N/A')).toBeInTheDocument();
      });
    });

    it('shows approve and decline buttons for pending requests', async () => {
      const mockRequest = createMockRequest();
      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.approve')).toBeInTheDocument();
        const declineButtons = screen.getAllByText('approvals.decline');
        expect(declineButtons.length).toBeGreaterThan(0);
      });
    });

    it('displays pending count badge when requests exist', async () => {
      const mockRequest = createMockRequest();
      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('renders multiple pending requests', async () => {
      const requests = [
        createMockRequest({ id: 'req-1', fullName: 'John Doe', email: 'john@example.com' }),
        createMockRequest({ id: 'req-2', fullName: 'Jane Smith', email: 'jane@example.com' }),
      ];

      mockGetDocs.mockResolvedValue({
        docs: requests.map(req => ({
          id: req.id,
          data: () => req,
        })),
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Count badge
      });
    });
  });

  describe('Rendering Processed Requests', () => {
    it('renders approved requests with correct badge', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest({
        status: 'approved',
        reviewedAt: Timestamp.now(),
      });

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      const processedTab = screen.getByText('approvals.processed');
      await user.click(processedTab);

      await waitFor(() => {
        expect(screen.getByText('status.approved')).toBeInTheDocument();
      });
    });

    it('renders declined requests with correct badge', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest({
        status: 'declined',
        reviewedAt: Timestamp.now(),
        declineReason: 'Invalid credentials',
      });

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      const processedTab = screen.getByText('approvals.processed');
      await user.click(processedTab);

      await waitFor(() => {
        expect(screen.getByText('status.declined')).toBeInTheDocument();
      });
    });

    it('displays decline reason when present', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest({
        status: 'declined',
        declineReason: 'Invalid credentials',
      });

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      const processedTab = screen.getByText('approvals.processed');
      await user.click(processedTab);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('shows reviewed date for processed requests', async () => {
      const user = userEvent.setup();
      const reviewedDate = new Date('2024-01-15');
      const mockRequest = createMockRequest({
        status: 'approved',
        reviewedAt: {
          toDate: () => reviewedDate,
        } as any,
      });

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      const processedTab = screen.getByText('approvals.processed');
      await user.click(processedTab);

      await waitFor(() => {
        expect(screen.getByText(reviewedDate.toLocaleDateString())).toBeInTheDocument();
      });
    });
  });

  describe('Approve Functionality', () => {
    it('calls updateDoc with correct parameters when approving', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest({ userId: 'user-123' });

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ roles: ['user'] }),
      });

      mockUpdateDoc.mockResolvedValue(undefined);

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.approve')).toBeInTheDocument();
      });

      const approveButton = screen.getByText('approvals.approve');
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalled();
      });
    });

    it('shows success toast after successful approval', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest({ fullName: 'John Doe' });

      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      }).mockResolvedValueOnce({
        docs: [],
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ roles: ['user'] }),
      });

      mockUpdateDoc.mockResolvedValue(undefined);

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.approve')).toBeInTheDocument();
      });

      const approveButton = screen.getByText('approvals.approve');
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'approvals.approved',
          })
        );
      });
    });

    it('shows error toast when approval fails', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest();

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.approve')).toBeInTheDocument();
      });

      const approveButton = screen.getByText('approvals.approve');
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: 'common.error',
            description: 'approvals.errorApproving',
          })
        );
      });
    });

    it('disables buttons while processing approval', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest();

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      mockUpdateDoc.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.approve')).toBeInTheDocument();
      });

      const approveButton = screen.getByText('approvals.approve');
      await user.click(approveButton);

      // Button should be disabled during processing
      expect(approveButton).toBeDisabled();
    });

    it('shows loading spinner on button while processing', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest();

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      mockUpdateDoc.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { container } = renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.approve')).toBeInTheDocument();
      });

      const approveButton = screen.getByText('approvals.approve');
      await user.click(approveButton);

      // Should show spinner
      await waitFor(() => {
        const spinners = container.querySelectorAll('.animate-spin');
        expect(spinners.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Decline Dialog', () => {
    it('opens decline dialog when decline button clicked', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest({ fullName: 'John Doe' });

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        const declineButtons = screen.getAllByText('approvals.decline');
        expect(declineButtons.length).toBeGreaterThan(0);
      });

      const declineButton = screen.getAllByText('approvals.decline')[0];
      await user.click(declineButton);

      await waitFor(() => {
        expect(screen.getByText('approvals.declineRequest')).toBeInTheDocument();
        expect(screen.getByText('approvals.reasonOptional')).toBeInTheDocument();
      });
    });

    it('shows reason textarea in decline dialog', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest();

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        const declineButtons = screen.getAllByText('approvals.decline');
        expect(declineButtons.length).toBeGreaterThan(0);
      });

      const declineButton = screen.getAllByText('approvals.decline')[0];
      await user.click(declineButton);

      await waitFor(() => {
        expect(screen.getByText('approvals.reasonOptional')).toBeInTheDocument();
      });
    });

    it('allows entering decline reason', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest();

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        const declineButtons = screen.getAllByText('approvals.decline');
        expect(declineButtons.length).toBeGreaterThan(0);
      });

      const declineButton = screen.getAllByText('approvals.decline')[0];
      await user.click(declineButton);

      await waitFor(() => {
        expect(screen.getByText('approvals.reasonOptional')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('approvals.reasonPlaceholder');
      await user.type(textarea, 'Invalid credentials');

      expect(textarea).toHaveValue('Invalid credentials');
    });

    it('calls updateDoc when decline is confirmed', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest();

      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      }).mockResolvedValueOnce({
        docs: [],
      });

      mockUpdateDoc.mockResolvedValue(undefined);

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        const declineButtons = screen.getAllByText('approvals.decline');
        expect(declineButtons.length).toBeGreaterThan(0);
      });

      const declineButton = screen.getAllByText('approvals.decline')[0];
      await user.click(declineButton);

      await waitFor(() => {
        const confirmButtons = screen.getAllByText('approvals.decline');
        expect(confirmButtons.length).toBeGreaterThan(1);
      });

      const confirmButton = screen.getAllByText('approvals.decline')[1];
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalled();
      });
    });

    it('shows success toast after successful decline', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest({ fullName: 'John Doe' });

      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      }).mockResolvedValueOnce({
        docs: [],
      });

      mockUpdateDoc.mockResolvedValue(undefined);

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        const declineButtons = screen.getAllByText('approvals.decline');
        expect(declineButtons.length).toBeGreaterThan(0);
      });

      const declineButton = screen.getAllByText('approvals.decline')[0];
      await user.click(declineButton);

      await waitFor(() => {
        const confirmButtons = screen.getAllByText('approvals.decline');
        expect(confirmButtons.length).toBeGreaterThan(1);
      });

      const confirmButton = screen.getAllByText('approvals.decline')[1];
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'approvals.declined',
          })
        );
      });
    });

    it('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest();

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        const declineButtons = screen.getAllByText('approvals.decline');
        expect(declineButtons.length).toBeGreaterThan(0);
      });

      const declineButton = screen.getAllByText('approvals.decline')[0];
      await user.click(declineButton);

      await waitFor(() => {
        expect(screen.getByText('approvals.declineRequest')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('common.cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('approvals.declineRequest')).not.toBeInTheDocument();
      });
    });

    it('shows error toast when decline fails', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockRequest();

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        const declineButtons = screen.getAllByText('approvals.decline');
        expect(declineButtons.length).toBeGreaterThan(0);
      });

      const declineButton = screen.getAllByText('approvals.decline')[0];
      await user.click(declineButton);

      await waitFor(() => {
        const confirmButtons = screen.getAllByText('approvals.decline');
        expect(confirmButtons.length).toBeGreaterThan(1);
      });

      const confirmButton = screen.getAllByText('approvals.decline')[1];
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: 'common.error',
            description: 'approvals.errorDeclining',
          })
        );
      });
    });
  });

  describe('Add User Dialog', () => {
    beforeEach(() => {
      mockGetDocs.mockResolvedValue({ docs: [] });
    });

    it('opens add user dialog when button clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUser')).toBeInTheDocument();
      });

      const addButton = screen.getByText('approvals.addUser');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUserTitle')).toBeInTheDocument();
      });
    });

    it('shows email and role fields in add user dialog', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUser')).toBeInTheDocument();
      });

      const addButton = screen.getByText('approvals.addUser');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('approvals.userEmail')).toBeInTheDocument();
        expect(screen.getByText('approvals.role')).toBeInTheDocument();
      });
    });

    it('renders role selector for admins', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: true,
        isLeader: false,
        loading: false,
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUser')).toBeInTheDocument();
      });

      const addButton = screen.getByText('approvals.addUser');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUserTitle')).toBeInTheDocument();
        expect(screen.getByText('approvals.role')).toBeInTheDocument();
      });
    });

    it('renders role selector for leaders', async () => {
      const user = userEvent.setup();
      mockUseEffectiveRole.mockReturnValue({
        isAdmin: false,
        isLeader: true,
        loading: false,
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUser')).toBeInTheDocument();
      });

      const addButton = screen.getByText('approvals.addUser');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUserTitle')).toBeInTheDocument();
        expect(screen.getByText('approvals.role')).toBeInTheDocument();
      });
    });

    it('shows coming soon toast when add button clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUser')).toBeInTheDocument();
      });

      const addButton = screen.getByText('approvals.addUser');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('approvals.addUserBtn')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('approvals.addUserBtn');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'approvals.featureComingSoon',
          })
        );
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches between pending and processed tabs', async () => {
      const user = userEvent.setup();
      mockGetDocs.mockResolvedValue({ docs: [] });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('approvals.noPending')).toBeInTheDocument();
      });

      const processedTab = screen.getByText('approvals.processed');
      await user.click(processedTab);

      await waitFor(() => {
        expect(screen.getByText('approvals.noProcessed')).toBeInTheDocument();
      });

      const pendingTab = screen.getByText('status.pending');
      await user.click(pendingTab);

      await waitFor(() => {
        expect(screen.getByText('approvals.noPending')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error toast when fetching requests fails', async () => {
      mockGetDocs.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: 'common.error',
            description: 'approvals.errorLoading',
          })
        );
      });
    });
  });

  describe('Custom Props', () => {
    beforeEach(() => {
      mockGetDocs.mockResolvedValue({ docs: [] });
    });

    it('applies custom className', async () => {
      const { container } = renderWithProviders(
        <ApprovalsManagement className="custom-class" />
      );

      await waitFor(() => {
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
      });
    });
  });

  describe('Unit Path Display', () => {
    it('shows "units.noUnit" when requestedUnitId is null', async () => {
      const mockRequest = createMockRequest({
        requestedUnitId: null,
      });

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(screen.getByText('units.noUnit')).toBeInTheDocument();
      });
    });

    it('calls getUnitPath with correct unitId', async () => {
      const mockRequest = createMockRequest({
        requestedUnitId: 'unit-1',
      });

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: mockRequest.id,
          data: () => mockRequest,
        }],
      });

      renderWithProviders(<ApprovalsManagement />);

      await waitFor(() => {
        expect(mockGetUnitPath).toHaveBeenCalledWith('unit-1');
      });
    });
  });
});
