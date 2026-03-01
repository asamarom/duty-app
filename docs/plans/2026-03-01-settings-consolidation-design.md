# Settings Page Consolidation Design

**Date:** 2026-03-01
**Status:** Approved
**Approach:** Modal/Sheet Pattern

## Overview

Consolidate all settings functionality into a clean 3-tab Settings page, removing the 3-dot menu from bottom navigation. Each tab shows a summary view with action buttons that open modals/sheets for full functionality.

## Goals

1. ✅ Remove unwanted labels (`settings.permissions`, `settings.userProfile`)
2. ✅ Ensure complete Hebrew translations for all UI elements
3. ✅ Redesign Units & Approvals tabs to show inline summaries with manage buttons
4. ✅ Remove 3-dot menu from bottom nav (fixed 5 icons)

## Architecture

### Component Structure

```
SettingsPage
├── SettingsTabs
    ├── ProfileTab (cleanup labels only)
    ├── UnitsTab (summary + "Manage Units" button → UnitsSheet)
    │   └── UnitsSheet (contains UnitsManagement)
    └── ApprovalsTab (summary + "Manage Approvals" button → ApprovalsSheet)
        └── ApprovalsSheet (contains ApprovalsManagement)
```

### New Components

1. **UnitsManagement.tsx** - Core units CRUD logic (extracted from UnitsPage)
2. **ApprovalsManagement.tsx** - Core approvals logic (extracted from AdminApprovalsPage)
3. **UnitsSheet.tsx** - Sheet/modal wrapper for units management
4. **ApprovalsSheet.tsx** - Sheet/modal wrapper for approvals management

### Existing Pages

- Keep `/units` and `/approvals` routes (use extracted components)
- Maintains deep linking and direct access
- Tests continue to work

## UI/UX Design

### Profile Tab (Cleanup Only)

- ❌ Remove card title `{t('settings.userProfile')}`
- ✅ Keep: Email display, Language selector, Version info, Logout
- Clean, simple cards without confusing labels

### Units Tab (Summary View)

**Quick Stats Card:**
- Icon + "Unit Management" title
- Show count within user's **battalion only**: "1 Battalion, 3 Companies, 8 Platoons"
- Role badge (Admin/Leader)

**"Manage Units" Button:**
- Primary action button
- Opens full-screen sheet (mobile) or large modal (desktop)
- Contains full units CRUD functionality

### Approvals Tab (Summary View)

**Pending Requests Card:**
- Icon + "Signup Approvals" title
- Show pending count with badge: "3 pending"
- Quick stats: "12 approved in your unit" (scoped to user's unit only)

**"Manage Approvals" Button:**
- Opens sheet/modal with full approval interface
- Shows pending/approved/declined tabs

### Modal/Sheet Behavior

- **Mobile (< 1024px):** Full-screen sheet slides from bottom
- **Desktop (≥ 1024px):** Large modal (80% viewport width, scrollable)
- Close button (X) + dim backdrop
- Scrollable content area

## Translation Keys

### Keys to Remove

- ❌ `settings.userProfile` (card title - not needed)
- ❌ `settings.permissions` (confusing label in UnitsTab)

### New English Keys

```typescript
'settings.manageUnits': 'Manage Units'
'settings.manageApprovals': 'Manage Approvals'
'settings.unitsInYourBattalion': 'Units in your battalion'
'settings.approvedInYourUnit': 'approved in your unit'
'settings.unitStats': '{battalions} Battalions, {companies} Companies, {platoons} Platoons'
'settings.pendingCount': '{count} pending'
'settings.noUnitsYet': 'No units configured yet'
'settings.noPendingRequests': 'No pending requests'
```

### New Hebrew Keys

```typescript
'settings.manageUnits': 'נהל יחידות'
'settings.manageApprovals': 'נהל אישורים'
'settings.unitsInYourBattalion': 'יחידות בגדוד שלך'
'settings.approvedInYourUnit': 'אושרו ביחידה שלך'
'settings.unitStats': '{battalions} גדודים, {companies} פלוגות, {platoons} מחלקות'
'settings.pendingCount': '{count} ממתינים'
'settings.noUnitsYet': 'אין יחידות שהוגדרו עדיין'
'settings.noPendingRequests': 'אין בקשות ממתינות'
```

### Missing Hebrew Translations

Add Hebrew translations for all existing Settings keys currently missing translations.

## Bottom Navigation

### Changes

- **Remove:** 3-dot "More" menu entirely
- **Show:** Fixed 5 icons for all users:
  1. Dashboard (🏠)
  2. Personnel (👥)
  3. Equipment (📦)
  4. Reports (📊)
  5. Settings (⚙️)

### Behavior

- **Mobile:** Bottom nav visible, 5 icons always shown
- **Desktop:** Sidebar navigation (existing), bottom nav hidden
- **No role-based rendering:** Same 5 icons for everyone

## Data Scoping

### Units Tab

- Show counts **within user's battalion only**
- Leaders: their battalion's hierarchy
- Admins: system-wide counts (all battalions)
- Use existing `useUnitsManagement` hook with battalion filter

### Approvals Tab

- Show approved count **within user's unit only**
- Filter requests by battalion ID
- Use existing permission checks (`isAdmin`, `isLeader`)

## Testing Strategy

### Existing Tests to Preserve

- `/units` route tests ✅ (same functionality, different wrapper)
- `/approvals` route tests ✅ (same functionality)
- Settings navigation tests (update for new behavior)

### New Tests to Add

**Settings Tab Behavior:**
- Units tab shows summary with battalion-scoped counts
- Approvals tab shows summary with unit-scoped counts
- "Manage Units" button opens sheet/modal
- "Manage Approvals" button opens sheet/modal
- Sheet/modal close button works
- Full CRUD operations work within sheets

**Translation & RTL:**
- All Settings content has Hebrew translations
- Settings tabs flow right-to-left in Hebrew mode
- Summary cards display correctly in RTL
- Modal/sheet content is RTL in Hebrew
- "Manage" buttons align correctly in RTL
- Unit counts and stats display properly in RTL

### Test Updates Required

- `settings-navigation.spec.ts` - Verify summary cards instead of links
- `settings-navigation-admin.spec.ts` - Admin sees 3 tabs with manage buttons
- `settings-navigation-leader.spec.ts` - Leader sees Units (no Approvals)
- `settings-navigation-user.spec.ts` - Regular user sees only Profile
- Add RTL tests for Hebrew mode
- Keep `/units` and `/approvals` E2E tests unchanged

## Implementation Details

### Component Extraction

1. Extract `UnitsPage.tsx` core logic → `UnitsManagement.tsx`
2. Extract `AdminApprovalsPage.tsx` core logic → `ApprovalsManagement.tsx`
3. Both accept props for flexibility (standalone vs embedded context)

### Sheet/Modal Implementation

- Use shadcn/ui `Sheet` component for mobile
- Use shadcn/ui `Dialog` component for desktop
- Responsive switch based on viewport width
- Full-height on mobile, 80% width + scrollable on desktop

### ProfileTab Cleanup

- Remove `{t('settings.userProfile')}` from card title (line 23)
- Just show email directly in CardDescription
- Remove confusing labels, keep functional content

### UnitsTab Cleanup

- Remove `{t('settings.permissions')}` card (lines 72-105)
- Replace with summary stats + "Manage Units" button
- Calculate battalion-scoped counts

### ApprovalsTab Enhancement

- Keep existing structure, add summary stats
- Add "Manage Approvals" button
- Filter approved count by user's unit

## Success Criteria

- ✅ Settings page has exactly 3 tabs (Profile, Units, Approvals)
- ✅ No confusing labels (`settings.userProfile`, `settings.permissions`)
- ✅ All UI elements have Hebrew translations
- ✅ Units/Approvals show summaries with manage buttons
- ✅ Modals/sheets contain full functionality
- ✅ Bottom nav shows fixed 5 icons (no 3-dot menu)
- ✅ Existing `/units` and `/approvals` tests pass
- ✅ RTL works correctly in Hebrew mode
- ✅ Data scoped to user's battalion/unit

## Deployment Notes

- Notify user of staging URL when deployment succeeds
- Visual review on staging before E2E tests complete
- Existing tests should pass (no breaking changes to routes)
