# Equipment Access Rules

This document defines who can see and act on equipment in the DTMS system.

---

## User Perspectives

### As an Admin

**I can see:**
- All equipment across all battalions (no restrictions)

**I can create:**
- Equipment in any battalion
- `battalionId` field is required on create

**I can assign:**
- Equipment to any unit or personnel in any battalion
- Assignments are auto-approved (no transfer request needed)

**I can transfer:**
- Equipment anywhere across battalions
- Transfers are auto-approved

**I can delete:**
- Any equipment in the system

**I can update:**
- Any equipment fields
- Quantity, status, description, etc.

---

### As a Leader

**I can see:**
- **Server-side (Firestore rules):** All equipment where `battalionId` matches my battalion
- **Client-side (filtered in UI):**
  - Unassigned equipment in my battalion
  - Equipment assigned to my unit
  - Equipment assigned to me personally
  - **NOT** equipment assigned to other units (even within my battalion)
  - **NOT** equipment with pending transfer OUT from my unit

**I can create:**
- Equipment in my battalion only
- `battalionId` must match my battalion
- Fields required: `name`, `quantity > 0`, `status`

**I can assign:**
- Equipment within my battalion to any unit or personnel
- Creates a transfer request that requires approval

**I can transfer:**
- Equipment within my battalion
- Creates a transfer request (status: `pending`)
- Requires approval from admin or another leader

**I can update:**
- Equipment in my battalion only
- Can modify quantity, status, description
- Cannot modify `battalionId`

**I cannot delete:**
- Any equipment (admin-only action)

---

### As a Regular User

**I can see:**
- **Server-side (Firestore rules):** All equipment where `battalionId` matches my battalion
- **Client-side (filtered in UI):**
  - Unassigned equipment in my battalion (available for request)
  - Equipment assigned to my unit
  - Equipment assigned to me personally
  - **NOT** equipment assigned to other units
  - **NOT** equipment with pending transfer OUT from my unit

**I can request transfer:**
- For any equipment I can see
- Creates a transfer request (status: `pending`)
- Requires approval from admin or leader

**I can delete:**
- Equipment I created (`createdBy` matches my `userId`)
- **AND** equipment is currently assigned to me personally (`currentPersonnelId` matches my personnel record)
- Both conditions must be true

**I cannot:**
- Create equipment directly (must request from leader/admin)
- Assign equipment directly (must submit transfer request)
- Update equipment fields
- Delete equipment not meeting the conditions above

---

## Equipment Visibility Rules

### Rule 1: Battalion Boundary (Server-Side)
**Enforced by:** Firestore security rules (`firestore.rules:213`)

```
allow read: if hasAnyRole() && (isAdmin() || isSameBattalion(resource.data.battalionId))
```

- Admins bypass this check and see all equipment
- All other users can only read equipment where their battalion matches the equipment's `battalionId`
- If `battalionId` is missing (migration mode), access is allowed

**Why:** Firestore cannot efficiently join across collections to check unit ownership, so we restrict at battalion level and filter further on client

---

### Rule 2: Unit/Personal Filter (Client-Side)
**Enforced by:** `src/hooks/useEquipment.tsx:254-294`

After Firestore returns battalion-level equipment, client-side code filters to show:

1. **ALWAYS show:** Unassigned equipment (available for assignment requests)
2. **ALWAYS show:** Equipment assigned to my unit (`currentUnitId === userUnitId`)
3. **ALWAYS show:** Equipment assigned to me personally (`currentPersonnelId === myPersonnelId`)
4. **HIDE:** Equipment assigned to other units (even within my battalion)
5. **HIDE:** Equipment with pending transfer OUT from my unit (entire row hidden if all quantity is pending)

**Quantity Adjustments:**
- Displayed `currentQuantity` is reduced by `pendingTransferOutQuantity`
- If entire quantity is pending transfer OUT, the row is hidden from Equipment tab
- These items appear in the Transfers tab instead

**Why:** Defense-in-depth security. Server rules provide coarse filtering (battalion), client provides fine filtering (unit/personal)

---

### Rule 3: Pending Transfers
**Enforced by:** `src/hooks/useEquipment.tsx:266-280`

When equipment has a pending transfer **OUT** from your unit:
- If **all** items are pending transfer → **hide** the entire row
- If **some** items are pending transfer → **show** the row with adjusted quantity
- The pending items are visible in the **Transfers** tab, not Equipment tab

Example:
- Unit has 10x helmets assigned
- 3x helmets have pending transfer OUT
- Equipment tab shows: 7 helmets remaining
- Transfers tab shows: 3 helmets pending transfer

---

## Permission Checks Summary

| Action | Admin | Leader | User |
|--------|-------|--------|------|
| **View all battalion equipment** | ✓ | ✓ (server) | ✓ (server) |
| **View unit/personal equipment** | ✓ | ✓ (client filtered) | ✓ (client filtered) |
| **Create equipment** | ✓ Any battalion | ✓ Own battalion | ✗ |
| **Assign/Transfer equipment** | ✓ Auto-approved | ✓ Needs approval | ✗ |
| **Request transfer** | N/A | ✓ | ✓ |
| **Update equipment** | ✓ Any | ✓ Own battalion | ✗ |
| **Delete equipment** | ✓ Any | ✗ | ✓ Own created + assigned to self |
| **Approve transfer requests** | ✓ | ✓ | ✗ |
| **Cancel own pending request** | ✓ | ✓ | ✓ |

---

## Special Cases

### Unassigned Equipment
- **Visible to:** All users in the battalion (after client filtering)
- **Purpose:** Shows available equipment that can be requested for assignment
- **Quantity:** Shows unassigned quantity (`equipment.quantity - sum(assignments.quantity)`)

### Equipment Created by User
- Regular users can **delete** equipment they created, but only if:
  1. They created it (`createdBy === userId`)
  2. It's currently assigned to them personally
  3. Both conditions are checked in `canDeleteEquipment()` function

### Migration Mode
- If `battalionId` is missing/null on equipment documents (migration period)
- `isSameBattalion()` returns `true` to allow access
- This is temporary during data migration

### Bulk Equipment vs Serialized
- **Bulk equipment** (no serial number): Can have multiple assignments with quantities
- **Serialized equipment** (has serial number): One assignment per item
- Pending transfer logic accounts for both (partial quantities for bulk, full item for serialized)

---

## Code Locations

| Rule | Location | Type |
|------|----------|------|
| Battalion-level read access | `firestore.rules:196-213` | Server (Firestore) |
| Equipment create validation | `firestore.rules:215-226` | Server (Firestore) |
| Equipment update validation | `firestore.rules:228-236` | Server (Firestore) |
| Equipment delete validation | `firestore.rules:238-239` | Server (Firestore) |
| Client-side visibility filter | `src/hooks/useEquipment.tsx:254-294` | Client (React) |
| Pending transfer filter | `src/hooks/useEquipment.tsx:266-280` | Client (React) |
| Quantity adjustment | `src/hooks/useEquipment.tsx:296-317` | Client (React) |
| Delete permission check | `src/hooks/useEquipment.tsx:405-416` | Client (React) |

---

## Decision Tree: Can I See This Equipment?

```
START
  ↓
Am I authenticated?
  NO → ✗ Denied
  YES ↓
Do I have any role?
  NO → ✗ Denied
  YES ↓
Am I admin?
  YES → ✓ Show (all equipment, no further checks)
  NO ↓
Does equipment.battalionId match my battalion?
  NO → ✗ Denied (Firestore rule blocks)
  YES/NULL ↓
Is equipment unassigned?
  YES → ✓ Show
  NO ↓
Is equipment assigned to my unit?
  YES ↓
    Is entire quantity pending transfer OUT?
      YES → ✗ Hide (show in Transfers tab instead)
      NO → ✓ Show (with adjusted quantity)
  NO ↓
Is equipment assigned to me personally?
  YES → ✓ Show
  NO ↓
✗ Hide (assigned to other unit/person)
```
