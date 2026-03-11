# Testing Guide

> **Comprehensive guide to testing patterns and best practices for the Duty Tactical Management System**

## Quick Reference

### Common Mock Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| `vi.fn()` | Basic function mock | `const mockFn = vi.fn()` |
| `mockResolvedValue()` | Async success | `mockGetDocs.mockResolvedValue({ docs: [] })` |
| `mockRejectedValue()` | Async failure | `mockUpdateDoc.mockRejectedValue(new Error('Failed'))` |
| `mockImplementation()` | Custom logic | `mockOnSnapshot.mockImplementation((q, cb) => { cb({ docs: [] }); return () => {}; })` |
| `vi.clearAllMocks()` | Reset all mocks | Use in `beforeEach()` |
| `vi.unmock()` | Test real code | `vi.unmock('@/contexts/AdminModeContext')` |

### When to Use Which Mock Method

```typescript
// Use vi.fn() for simple spies
const mockCallback = vi.fn();

// Use mockReturnValue for synchronous returns
mockGetId.mockReturnValue('test-id-123');

// Use mockResolvedValue for async success (Promise resolves)
mockGetDocs.mockResolvedValue({ docs: [] });

// Use mockRejectedValue for async errors (Promise rejects)
mockUpdateDoc.mockRejectedValue(new Error('Network error'));

// Use mockImplementation for complex custom logic
mockOnSnapshot.mockImplementation((query, callback) => {
  callback({ docs: mockDocs });
  return () => {}; // cleanup function
});

// Use mockImplementationOnce for one-time behavior
mockGetDocs
  .mockImplementationOnce(() => Promise.resolve({ docs: [doc1] }))
  .mockImplementationOnce(() => Promise.resolve({ docs: [doc2] }));
```

---

## Table of Contents

1. [Firebase Firestore Mocking](#firebase-firestore-mocking)
2. [React Hook Mocking](#react-hook-mocking)
3. [Component Testing](#component-testing)
4. [Async Operation Mocking](#async-operation-mocking)
5. [Test Isolation and Cleanup](#test-isolation-and-cleanup)
6. [TypeScript Typing for Mocks](#typescript-typing-for-mocks)
7. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
8. [Helper Functions and Fixtures](#helper-functions-and-fixtures)
9. [Advanced Patterns](#advanced-patterns)

---

## Firebase Firestore Mocking

### Pattern 1: Module-Level Mock Initialization

Initialize mocks at module level, configure in `beforeEach()`.

**Example from `useEquipment.test.tsx`:**

```typescript
// Declare mocks at module level
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockUpdateDoc = vi.fn();

// Mock the entire module
vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...(args as Parameters<typeof mockOnSnapshot>)),
}));

describe('useEquipment Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configure default behavior
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] });
      return () => {}; // unsubscribe function
    });
  });
});
```

**Why this pattern:**
- Mocks are accessible in all tests
- `vi.clearAllMocks()` resets call counts and mock implementations
- Default behavior set in `beforeEach()` prevents undefined errors
- Individual tests can override with `.mockImplementationOnce()` or `.mockReturnValueOnce()`

### Pattern 2: Smart onSnapshot Mocks

Handle both document refs and collection queries.

**Example from `useEquipment.test.tsx`:**

```typescript
const mockOnSnapshot = vi.fn((
  query: unknown,
  callback: (snap: unknown) => void,
  _onError?: (err: Error) => void,
) => {
  // Check if this is a document reference or collection query
  const isDocRef = query && typeof query === 'object' && 'path' in query;

  if (isDocRef) {
    // Document snapshot
    callback({
      exists: () => false,
      data: () => undefined,
    });
  } else {
    // Collection query snapshot
    callback({ docs: [] });
  }
  return () => {}; // unsubscribe
});
```

**Why this pattern:**
- Single mock handles both document and collection subscriptions
- Prevents "callback is not a function" errors
- Returns cleanup function to prevent memory leaks in tests

### Pattern 3: Batch Operation Mocking

Mock Firestore batch writes for transaction testing.

**Example from `useAssignmentRequests.test.tsx`:**

```typescript
// Create mock batch methods
const mockBatchUpdate = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

const mockWriteBatch = vi.fn(() => ({
  update: mockBatchUpdate,
  set: mockBatchSet,
  delete: mockBatchDelete,
  commit: mockBatchCommit,
}));

vi.mock('firebase/firestore', () => ({
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
  // ... other mocks
}));

// In your test
it('approveRequest updates request status via batch', async () => {
  await act(async () => {
    await result.current.approveRequest('req-1');
  });

  expect(mockBatchCommit).toHaveBeenCalled();
  expect(mockBatchUpdate).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ status: 'approved' })
  );
});
```

**Why this pattern:**
- Tests complex multi-operation transactions
- Verifies all operations in a batch
- Can inspect individual batch operations separately

### Pattern 4: Defensive Mocking

Mock unused dependencies to avoid errors.

**Example from `useEquipment.test.tsx`:**

```typescript
// Even if httpsCallable isn't used in this test, mock it defensively
const mockHttpsCallable = vi.fn();

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}));

beforeEach(() => {
  // Provide safe default even if not used
  mockHttpsCallable.mockReturnValue(
    vi.fn().mockResolvedValue({ data: { success: true } })
  );
});
```

**Why this pattern:**
- Prevents "undefined is not a function" errors
- Makes tests resilient to refactoring
- Documents all external dependencies

---

## React Hook Mocking

### Pattern 5: Custom Hook Mocking with vi.fn()

Create configurable mocks that can be overridden per test.

**Example from `ApprovalsManagement.test.tsx`:**

```typescript
// Create mock function at module level
const mockUseEffectiveRole = vi.fn(() => ({
  isAdmin: true,
  isLeader: false,
  loading: false,
}));

vi.mock('@/hooks/useEffectiveRole', () => ({
  useEffectiveRole: () => mockUseEffectiveRole(),
}));

describe('ApprovalsManagement', () => {
  beforeEach(() => {
    // Reset to default
    mockUseEffectiveRole.mockReturnValue({
      isAdmin: true,
      isLeader: false,
      loading: false,
    });
  });

  it('shows no permission for non-admin users', () => {
    // Override for this specific test
    mockUseEffectiveRole.mockReturnValue({
      isAdmin: false,
      isLeader: false,
      loading: false,
    });

    renderWithProviders(<ApprovalsManagement />);
    expect(screen.getByText('approvals.noPermission')).toBeInTheDocument();
  });
});
```

**Why this pattern:**
- Flexible: each test can customize hook return values
- Type-safe: uses actual hook return types
- Readable: clear what each test is testing

### Pattern 6: Testing Real Implementations

Use `vi.unmock()` to test actual context providers.

**Example from `AdminModeContext.test.tsx`:**

```typescript
// Unmock to test the real implementation
vi.unmock('@/contexts/AdminModeContext');

describe('AdminModeContext', () => {
  it('defaults to admin mode ON when no value in localStorage', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AdminModeProvider>{children}</AdminModeProvider>
    );

    const { result } = renderHook(() => useAdminMode(), { wrapper });

    expect(result.current.isAdminMode).toBe(true);
  });
});
```

**Why this pattern:**
- Tests actual production code, not mocks
- Catches integration issues
- Validates context provider logic

---

## Component Testing

### Pattern 7: Helper Functions for Rendering

Create reusable render helpers with all required providers.

**Example from `ApprovalsManagement.test.tsx`:**

```typescript
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        {ui}
      </LanguageProvider>
    </MemoryRouter>
  );
}

// Use in tests
it('renders component with all providers', () => {
  renderWithProviders(<ApprovalsManagement />);
  expect(screen.getByText('approvals.title')).toBeInTheDocument();
});
```

**Why this pattern:**
- DRY: avoids repeating provider setup
- Consistent: all tests use the same setup
- Maintainable: update providers in one place

### Pattern 8: Mock window APIs

Mock browser APIs like `matchMedia` for responsive components.

**Example from `ApprovalsManagement.test.tsx`:**

```typescript
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
```

**Why this pattern:**
- Enables testing responsive behavior
- Prevents "matchMedia is not a function" errors
- Can customize `matches` value to test different viewports

---

## Async Operation Mocking

### Pattern 9: mockResolvedValue and mockResolvedValueOnce

Handle async operations with appropriate mock methods.

**Example from `useEquipment.test.tsx`:**

```typescript
it('fetches equipment data on mount', async () => {
  const mockEquipmentDocs = [
    {
      id: 'eq-1',
      data: () => ({ name: 'M4 Carbine', quantity: 1 }),
      exists: () => true,
    },
  ];

  // Use mockResolvedValue for consistent async behavior
  mockGetDocs.mockResolvedValue({ docs: mockEquipmentDocs });

  const { result } = renderHook(() => useEquipment());

  // Wait for async operations to complete
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.equipment).toHaveLength(1);
});
```

**Why this pattern:**
- `mockResolvedValue()`: Promise resolves with value
- `mockResolvedValueOnce()`: Only for next call
- `await waitFor()`: Waits for async state updates

### Pattern 10: Chaining mockImplementationOnce

Handle multiple sequential calls with different results.

**Example from `useEquipment.test.tsx`:**

```typescript
it('handles multiple onSnapshot registrations', async () => {
  const mockEquipmentSnapshot = (query: unknown, cb: (snap: unknown) => void) => {
    cb({ docs: mockEquipmentDocs });
    return () => {};
  };
  const mockEmptySnapshot = (query: unknown, cb: (snap: unknown) => void) => {
    cb({ docs: [] });
    return () => {};
  };

  // Chain implementations for sequential calls
  mockOnSnapshot
    // First registration (equipment)
    .mockImplementationOnce(mockEquipmentSnapshot)
    // Second registration (assignments)
    .mockImplementationOnce(mockEmptySnapshot)
    // Third registration (pending)
    .mockImplementationOnce(mockEmptySnapshot);

  const { result } = renderHook(() => useEquipment());
  await waitFor(() => expect(result.current.loading).toBe(false));
});
```

**Why this pattern:**
- Each call gets different behavior
- Models real-world sequential operations
- Avoids test flakiness from call order

---

## Test Isolation and Cleanup

### Best Practice: beforeEach Cleanup

Always reset mocks in `beforeEach()` to ensure test isolation.

**Example from `useEquipment.test.tsx`:**

```typescript
describe('useEquipment Hook', () => {
  beforeEach(() => {
    // Clear all mock call history and implementations
    vi.clearAllMocks();

    // Reset to default behavior
    mockUseUserRole.mockReturnValue({
      isAdmin: false,
      isLeader: false,
      loading: false,
      roles: [],
    });

    // Set safe defaults for all mocks
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockHttpsCallable.mockReturnValue(
      vi.fn().mockResolvedValue({ data: { success: true } })
    );

    // Restore complex mock implementations after clearAllMocks
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] });
      return () => {};
    });
  });
});
```

**Why this is critical:**
- `vi.clearAllMocks()` wipes implementations set in previous tests
- Must restore default implementations after clearing
- Prevents test pollution and flaky tests

### Best Practice: Fake Timers

Use fake timers for time-dependent tests.

**Example from `use-toast.test.tsx`:**

```typescript
describe('use-toast Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('removes toast after delay', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      const { id } = result.current.toast({ title: 'Test' });
      result.current.dismiss(id);
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});
```

**Why this pattern:**
- Instant time progression (no waiting)
- Deterministic test behavior
- Must cleanup with `useRealTimers()`

---

## TypeScript Typing for Mocks

### Strongly-Typed Mocks

Cast mocks to preserve type information.

**Example from `useEquipment.test.tsx`:**

```typescript
it('calls addDoc with correct parameters', async () => {
  const { result } = renderHook(() => useEquipment());
  await waitFor(() => expect(result.current.loading).toBe(false));

  // Import and cast to get type-safe mock
  const firestoreMock = await import('firebase/firestore');
  const mockAddDocFn = vi.mocked(firestoreMock.addDoc);
  mockAddDocFn.mockResolvedValue({ id: 'new-eq-id' } as any);

  await act(async () => {
    await result.current.addEquipment({
      name: 'New Rifle',
      quantity: 1,
    });
  });

  // TypeScript validates the expected call signature
  expect(mockAddDocFn).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ name: 'New Rifle' })
  );
});
```

**Why this pattern:**
- `vi.mocked()` preserves TypeScript types
- Autocomplete works for mock methods
- Compile-time checks for mock calls

### Type-Safe Fixture Helpers

Create helper functions with proper typing.

**Example from `ApprovalsManagement.test.tsx`:**

```typescript
function createMockRequest(
  overrides: Partial<SignupRequestDoc & { id: string }> = {}
): SignupRequestDoc & { id: string } {
  const now = Timestamp.now();
  return {
    id: 'req-1',
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Usage in tests
const mockRequest = createMockRequest({
  status: 'approved',
  email: 'custom@example.com',
});
```

**Why this pattern:**
- Type-safe fixture creation
- Validates overrides match type
- Provides sensible defaults

---

## Common Pitfalls and Solutions

### Pitfall 1: Forgetting to Restore Mock Implementation After clearAllMocks

**Problem:**

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // ❌ mockOnSnapshot implementation was wiped out!
});

it('test', async () => {
  // Error: callback is not a function
  const { result } = renderHook(() => useEquipment());
});
```

**Solution:**

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // ✅ Restore default implementation
  mockOnSnapshot.mockImplementation((query, callback) => {
    callback({ docs: [] });
    return () => {};
  });
});
```

### Pitfall 2: Not Wrapping act() Around State Updates

**Problem:**

```typescript
// ❌ Warning: "An update was not wrapped in act(...)"
result.current.toggleAdminMode();
expect(result.current.isAdminMode).toBe(true);
```

**Solution:**

```typescript
// ✅ Wrap in act
act(() => {
  result.current.toggleAdminMode();
});
expect(result.current.isAdminMode).toBe(true);
```

### Pitfall 3: Not Awaiting Async Operations

**Problem:**

```typescript
// ❌ Test passes but doesn't actually test anything
it('loads data', () => {
  const { result } = renderHook(() => useEquipment());
  expect(result.current.equipment).toHaveLength(1); // Always []
});
```

**Solution:**

```typescript
// ✅ Wait for async completion
it('loads data', async () => {
  const { result } = renderHook(() => useEquipment());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.equipment).toHaveLength(1);
});
```

### Pitfall 4: Mocking in Wrong Order

**Problem:**

```typescript
// ❌ Mock defined after import
import { useEquipment } from '../useEquipment';
vi.mock('firebase/firestore', () => ({ ... }));
```

**Solution:**

```typescript
// ✅ Mock before imports
vi.mock('firebase/firestore', () => ({ ... }));
import { useEquipment } from '../useEquipment';
```

### Pitfall 5: Not Handling onSnapshot Unsubscribe

**Problem:**

```typescript
// ❌ Memory leak - no unsubscribe function
mockOnSnapshot.mockImplementation((query, callback) => {
  callback({ docs: [] });
  // No return value!
});
```

**Solution:**

```typescript
// ✅ Always return unsubscribe function
mockOnSnapshot.mockImplementation((query, callback) => {
  callback({ docs: [] });
  return () => {}; // unsubscribe no-op
});
```

### Pitfall 6: Testing Implementation Details

**Problem:**

```typescript
// ❌ Tests internal state variable name
expect(result.current._internalLoadingState).toBe(false);
```

**Solution:**

```typescript
// ✅ Test public API and behavior
expect(result.current.loading).toBe(false);
expect(result.current.equipment).toHaveLength(1);
```

---

## Helper Functions and Fixtures

### Pattern: Test Data Factories

Create reusable fixtures with builder pattern.

**Example from `useAssignmentRequests.test.tsx`:**

```typescript
/**
 * Build a minimal AssignmentRequestDoc snapshot document.
 * Only the fields that the hook reads are populated.
 */
function makeRequestDoc(overrides: Record<string, unknown> = {}) {
  const data = {
    equipmentId: 'equip-1',
    status: 'pending',
    requestedBy: 'user-99',
    requestedAt: { toDate: () => new Date('2025-01-01') },
    fromUnitType: 'battalion',
    toUnitType: 'individual',
    toPersonnelId: 'pers-1',
    recipientApproved: false,
    ...overrides,
  };
  return {
    id: 'req-1',
    data: () => data,
    ref: { id: 'req-1', path: 'assignmentRequests/req-1' },
  };
}

// Usage
const pendingRequest = makeRequestDoc({ status: 'pending' });
const approvedRequest = makeRequestDoc({ status: 'approved' });
```

### Pattern: Smart Mock Factories

Create intelligent mocks that handle different scenarios.

**Example from `useAssignmentRequests.test.tsx`:**

```typescript
/**
 * Helper to create onSnapshot mock that handles both doc refs and query refs.
 */
function makeOnSnapshotMock(queryDocs: unknown[] = []) {
  return (ref: unknown, onNext: (snap: unknown) => void) => {
    const isDocRef = (ref as { _isDocRef?: boolean })._isDocRef;
    const refPath = (ref as { path?: string }).path;

    if (isDocRef && refPath?.startsWith('users/')) {
      // Return DocumentSnapshot for user doc
      onNext({
        exists: () => true,
        id: 'test-user-id',
        data: () => ({ unitId: null, roles: ['user'] }),
      });
    } else {
      // Return QuerySnapshot for assignment requests query
      onNext({ docs: queryDocs });
    }
    return () => {}; // unsubscribe no-op
  };
}

// Usage
mockOnSnapshot.mockImplementation(makeOnSnapshotMock([doc1, doc2]));
```

---

## Advanced Patterns

### Pattern: Testing Error Boundaries

Test error handling in onSnapshot listeners.

**Example from `useEquipment.test.tsx`:**

```typescript
it('sets loading to false when onSnapshot errors', async () => {
  // Mock error in the first listener
  mockOnSnapshot
    .mockImplementationOnce((_q, _cb, onError?: (err: Error) => void) => {
      if (onError) onError(new Error('Permission denied'));
      return () => {};
    })
    .mockImplementationOnce((_q, cb: (snap: { docs: unknown[] }) => void) => {
      cb({ docs: [] });
      return () => {};
    });

  const { result } = renderHook(() => useEquipment());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
  expect(result.current.equipment).toHaveLength(0);
});
```

### Pattern: Testing Module-Level Cache

Reset module-level state for test isolation.

**Example from `useAssignmentRequests.test.tsx`:**

```typescript
// Hook exports a reset function for testing
export function _resetCacheForTesting() {
  cache.requests = [];
  cache.loading = true;
}

// In tests
beforeEach(() => {
  _resetCacheForTesting();
});
```

### Pattern: Testing Multiple Hook Instances

Verify state synchronization across hook instances.

**Example from `use-toast.test.tsx`:**

```typescript
it('synchronizes state across multiple hook instances', () => {
  const { result: result1 } = renderHook(() => useToast());
  const { result: result2 } = renderHook(() => useToast());

  act(() => {
    result1.current.toast({ title: 'Shared Toast' });
  });

  // Both instances see the same toast
  expect(result1.current.toasts).toHaveLength(1);
  expect(result2.current.toasts).toHaveLength(1);
  expect(result1.current.toasts[0].title).toBe('Shared Toast');
  expect(result2.current.toasts[0].title).toBe('Shared Toast');
});
```

### Pattern: Testing With User Interactions

Use `@testing-library/user-event` for realistic interactions.

**Example from `ApprovalsManagement.test.tsx`:**

```typescript
it('opens decline dialog when button clicked', async () => {
  const user = userEvent.setup();

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
});
```

---

## Testing Checklist

Use this checklist when writing tests:

- [ ] **Mocks declared at module level** (accessible in all tests)
- [ ] **`beforeEach()` resets all mocks** with `vi.clearAllMocks()`
- [ ] **Default mock implementations restored** after `clearAllMocks()`
- [ ] **Async operations wrapped in `act()`** and awaited with `waitFor()`
- [ ] **Mock return values match production structure** (correct shape)
- [ ] **Error cases tested** (rejected promises, error callbacks)
- [ ] **onSnapshot mocks return unsubscribe function** (`() => {}`)
- [ ] **Type-safe mocks** using `vi.mocked()` where appropriate
- [ ] **No testing of implementation details** (only public API)
- [ ] **Fake timers used and cleaned up** if testing time-dependent code
- [ ] **Helper functions** created for repeated patterns
- [ ] **Descriptive test names** that explain what is being tested

---

## Resources

### Key Testing Libraries

- **Vitest**: Test runner and assertion library
- **@testing-library/react**: React component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/react-hooks**: Hook testing (via renderHook)

### Project-Specific Patterns

- All mocks use Vitest (`vi.fn()`, `vi.mock()`)
- Tests co-located with source files (`.test.tsx` next to `.tsx`)
- Firestore mocks follow "smart onSnapshot" pattern
- Helper functions named `make*` or `create*` for fixtures
- All async tests use `waitFor()` for proper timing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests (local)
npm run test:e2e

# Run E2E tests (staging)
npm run test:e2e:staging
```

---

## Coverage Metrics

Current test coverage: **87.09%**

- **310 passing tests**
- Strong coverage of hooks (`useEquipment`, `useAssignmentRequests`, `useToast`)
- Comprehensive component tests (Approvals, Settings, Units)
- Context providers fully tested (AdminModeContext, LanguageContext)

---

**Last Updated:** 2026-03-11
**Version:** 1.0.0
**Maintainer:** Development Team
