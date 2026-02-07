# E2E Test Patterns Reference

## Project Test Structure

```
e2e/
├── auth.spec.ts           # Auth page, redirects
├── dashboard.spec.ts      # Dashboard UI
├── equipment.spec.ts      # Equipment features
├── personnel.spec.ts      # Personnel features
├── user-lifecycle.spec.ts # Login flows, roles, approval states
├── fixtures/
│   └── auth.ts            # Authenticated page fixture
└── utils/
    └── test-auth.ts       # Login utilities
```

## Test User Types

| Type | Email | Status | Expected Route |
|------|-------|--------|----------------|
| admin | test-admin@e2e.local | Approved, admin role | `/` |
| leader | test-leader@e2e.local | Approved, leader role | `/` |
| user | test-user@e2e.local | Approved, user role | `/` |
| new | test-new@e2e.local | No signup request | `/signup-request` |
| pending | test-pending@e2e.local | Pending approval | `/pending-approval` |
| declined | test-declined@e2e.local | Declined | `/pending-approval` |

## Common Patterns

### Login and Navigate

```typescript
import { loginAsTestUser } from './utils/test-auth';

test('admin feature', async ({ page }) => {
  await loginAsTestUser(page, 'admin');
  await page.goto('/some-page');
  // assertions
});
```

### Bilingual Text Matching

```typescript
// Match English OR Hebrew
await expect(page.getByText(/Dashboard|לוח בקרה/i)).toBeVisible();
await expect(page.getByRole('button', { name: /Save|שמור/i })).toBeVisible();
```

### Data-testid Selectors

```typescript
const element = page.getByTestId('test-login-form');
const button = page.getByTestId('test-login-button');
```

### Wait for Navigation

```typescript
await page.waitForURL('**/dashboard', { timeout: 10000 });
await page.waitForLoadState('networkidle');
```

### Check Visibility with Timeout

```typescript
await expect(element).toBeVisible({ timeout: 10000 });
```

### Table/List Assertions

```typescript
// Check table has rows
const rows = page.locator('table tbody tr');
await expect(rows).toHaveCount(5);

// Check list items
const items = page.locator('[data-testid="list-item"]');
await expect(items.first()).toBeVisible();
```

### Form Interactions

```typescript
// Fill input
await page.getByLabel(/Name|שם/i).fill('Test Value');

// Select dropdown
await page.getByTestId('select-trigger').click();
await page.getByTestId('option-value').click();

// Submit form
await page.getByRole('button', { name: /Submit|שלח/i }).click();
```

### Error State Testing

```typescript
// Trigger error
await page.getByRole('button', { name: /Submit/i }).click();

// Check error message
await expect(page.getByText(/Error|שגיאה/i)).toBeVisible();
```

### Permission Testing

```typescript
test('regular user cannot access admin page', async ({ page }) => {
  await loginAsTestUser(page, 'user');
  await page.goto('/admin');
  // Should redirect or show unauthorized
  await expect(page).toHaveURL(/\/(auth|unauthorized)/);
});
```

## Test Naming Convention

Format: `should {action} when {condition}`

Examples:
- `should display dashboard when logged in as admin`
- `should redirect to auth when accessing protected route`
- `should show error message when form validation fails`
