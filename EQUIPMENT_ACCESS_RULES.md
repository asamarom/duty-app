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

**I can transfer:**
- Equipment to any unit or personnel in any battalion
- Assignments are not auto-approved, but I can also approve the request myself (transfer request needed)

**I can delete:**
- Any equipment in the system

**I can update:**
- Any equipment fields
- Quantity, status, description, etc.

---

### As a Leader or as signature approved user

**I can see:**
- **Server-side (Firestore rules):** All equipment where `battalionId` matches my battalion
- **Client-side (filtered in UI):**
  - Equipment assigned to my unit
  - Equipment assigned to me personally
  - Requests of equipment transfer into and out of my unit
- Requests of equipment transfer into and out of my personal user
  - **NOT** equipment assigned to other units (even within my battalion)
  - Equipment in pending status will not be counted in my equipment view

**I can create:**
- Equipment in my unit only
- `battalionId` must match my battalion
- Fields required: `name`, `quantity > 0`, `status`

**I can request transfer:**
- Creates a transfer request that requires approval of Equipment within my unit to any unit or personnel under or above my unit level (one level up or down only)
- Creates a transfer request that requires approval of Equipment within my unit to any personnel in my unit

**I can not update:**
- Can not modify quantity, status, description of equipment.
- Can not modify `battalionId`

**I can delete:**
- only equipment that was created by my unit and only when it's assigned to my unit.

---

### As a Regular User

**I can see:**
- **Server-side (Firestore rules):** All equipment where `battalionId` matches my battalion
- **Client-side (filtered in UI):**
  - equipment pending transfer approval by me personally (transfered to me)
  - Equipment assigned to my unit
  - Equipment assigned to me personally
  - **NOT** equipment assigned to other units
  - **NOT** equipment with pending transfer OUT from my unit

**I can request transfer:**
- For equipment assigned to me personally 

**I cannot:**
- Create equipment directly
- Update equipment fields
- Delete equipment

---

## Equipment Visibility Rules

### Rule 1: Battalion Boundary (Server-Side)
**Enforced by:** Firestore security rules (`firestore.rules:213')

- Admins bypass this check and see all equipment
- All other users can only read equipment where their battalion matches the equipment's `battalionId`
- If `battalionId` is missing (migration mode), access is not allowed

**Why:** Firestore cannot efficiently join across collections to check unit ownership, so we restrict at battalion level and filter further on client

---

### Rule 2: Unit/Personal Filter (Client-Side)

After Firestore returns battalion-level equipment, client-side code filters to show:

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

## Special Cases

### Unassigned Equipment
- **Visible to:** Admins only
- **Purpose:** Shows available equipment that can be requested for assignment
- **Quantity:** Shows unassigned quantity 


### Bulk Equipment vs Serialized
- **Bulk equipment** (no serial number): Can have multiple assignments with quantities
- **Serialized equipment** (has serial number): One assignment per item and only assigen to a person and not to a unit
- Pending transfer logic accounts for both (partial quantities for bulk, full item for serialized)


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
