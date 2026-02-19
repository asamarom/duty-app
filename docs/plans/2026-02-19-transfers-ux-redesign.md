# Transfers UX Redesign — Design Doc

**Date**: 2026-02-19
**Status**: Approved

---

## Summary

Merge the `/assignment-requests` page into the Equipment page as a second tab. Redesign the transfers list with responsive cards (no horizontal scrolling), role-based sub-tabs, serial/quantity display, and a finger-drawn SVG signature flow for accepting serialized equipment transfers.

---

## 1. Routing & Navigation

- Equipment page (`/equipment`) gains a top-level tab bar: **Equipment | Transfers**
- Tab state is driven by `?tab=transfers` query param (deep-linkable)
- `/assignment-requests` route redirects to `/equipment?tab=transfers`
- `AssignmentRequestsPage.tsx` is deleted
- Sidebar and MobileNav: remove the Transfers nav item; add an incoming-transfer badge to the Equipment nav item (visible to all roles, not just admin/leader)
- `usePendingRequestsCount` is repurposed to count incoming transfers for the current user (not system-wide pending)
- "My Transfer Requests" collapsible removed from Equipment tab

---

## 2. Transfers Tab — Sub-tabs by Role

| Role | Sub-tabs |
|------|----------|
| User | Incoming, History |
| Leader | Incoming, History |
| Admin (mode on) | Incoming, All Pending, History |

---

## 3. Transfer Card Design

Each transfer renders as a card row (no wide table). Layout:

```
[Package icon]  Equipment Name                    [Status badge]
                Serial: SN-123  /  Qty: 5
                From: Platoon A  →  To: Sgt. Cohen
                Requested by: ..., Feb 19         [✓ Accept] [✗ Reject]
```

- Serial number shown if item has one; quantity shown for bulk items (no serial)
- Action buttons only on Incoming cards
- Mobile: full-width stacked cards
- Desktop: same card layout, wider

---

## 4. Signature Flow for Serialized Items

When a user accepts an incoming transfer for a **serialized item** (has a serial number):

### 4a. First-time (no saved signature)
1. Accept button opens a **Signature Dialog**
2. Dialog contains a canvas for finger/stylus drawing (SVG path capture)
3. "Clear" button to redo
4. "Save & Accept" button — saves SVG to `personnel.signature` in Firestore, then completes the transfer acceptance

### 4b. Returning user (signature already saved)
1. Accept button opens a **confirmation dialog** with a "Sign to confirm" checkbox
2. User checks the checkbox and clicks "Confirm"
3. Transfer accepted silently (no re-drawing needed)

### Signature Storage
- Stored as an SVG string in the `personnel` Firestore document under a `signature` field
- No Firebase Storage needed — stays within free tier
- SVG is captured from canvas pointer/touch events as `<path d="...">` elements

---

## 5. Files Affected

| File | Change |
|------|--------|
| `src/pages/EquipmentPage.tsx` | Add tab bar, Transfers tab, remove collapsible |
| `src/pages/AssignmentRequestsPage.tsx` | Delete |
| `src/components/equipment/TransfersList.tsx` | New — card-based transfers list |
| `src/components/equipment/SignatureDialog.tsx` | New — SVG signature capture |
| `src/components/layout/Sidebar.tsx` | Remove transfers nav item, badge Equipment |
| `src/components/layout/MobileNav.tsx` | Remove transfers nav item, badge Equipment |
| `src/hooks/usePendingRequestsCount.tsx` | Scope to current user's incoming transfers |
| `src/App.tsx` | Redirect `/assignment-requests` → `/equipment?tab=transfers`, remove old route |
| `src/i18n/translations.ts` | Add new translation keys |
| `src/hooks/usePersonnel.tsx` | Expose signature read/write on personnel record |

---

## 6. New Requirement IDs

- `[XFER-13]` Transfers tab: role-based sub-tabs (Incoming+History for users/leaders; +All Pending for admins)
- `[XFER-14]` Transfer cards show quantity for bulk items
- `[XFER-15]` Transfer cards show serial number for serialized items
- `[XFER-16]` Transfers integrated into Equipment page as a tab; `/assignment-requests` redirects there
- `[XFER-17]` Accepting a serialized transfer requires a signature
- `[XFER-17.1]` First-time: user draws SVG signature on canvas; saved to personnel record
- `[XFER-17.2]` Returning user: checkbox confirmation uses saved signature silently
