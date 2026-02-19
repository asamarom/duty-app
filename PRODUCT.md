# Duty Tactical Management System (DTMS)

Duty is a comprehensive, mission-critical application designed for military and security organizations to manage their most vital assets: **Manpower** and **Equipment**.

The system provides real-time operational oversight, ensuring that commanders at every level have an accurate picture of their unit manpower, location, and capability.

---

## Unit Hierarchy

The application follows a standard military organizational structure, allowing for granular management and reporting:

- [UNIT-1] **Battalion**: The primary command level.
- [UNIT-2] **Company**: Mid-level tactical unit (added in v2.0).
- [UNIT-3] **Platoon**: The core operational unit for personnel and equipment tracking.

---

## Core Features

### Personnel Management (Alpha Module)

- [PERS-1] **Profiles**: Detailed records including Service Number, Rank, Duty Position, and Contact Info.
- [PERS-2] Personnel list is viewable with table or list format.
- [PERS-3] Personnel can be searched/filtered.
- [PERS-4] Personnel detail page shows individual information.
- users can only filter/search/view personnels in their battalion.

### Equipment Inventory (Property Book)

- [EQUIP-1] **Lifecycle Tracking**: Manage items from acquisition to disposal.
- [EQUIP-2] **Assignment System**: Issue equipment to individuals, companies, or platoons.
- [EQUIP-3] Equipment list is viewable with table or list format.
- [EQUIP-4] Equipment can be searched/filtered.
- [EQUIP-5] Equipment detail page shows individual item information.
- [EQUIP-6] Authorized users can add new equipment.
- [EQUIP-7] Equipment with serial number can only be assigned to a personnel user, not a unit.

### Access & Security (RBAC)

- [AUTH-1] **Three-Tier Role System**:
  - [AUTH-1.1] **Admin**: Full system control, unit configuration, and role management.
  - [AUTH-1.2] **Leader**: Oversight of assigned units (Battalion/Company/Platoon leaders).
  - [AUTH-1.3] **User**: Standard access for individual personnel.
- [AUTH-2] **Signature Approved**: A personnel attribute (not a role) indicating the user can transfer and accept equipment on behalf of their unit.
- [AUTH-3] **Signup Requests**: Strict onboarding process where new users must be manually approved and assigned a unit before gaining access.
- [AUTH-4] **Admin Mode**: Allows administrators to toggle between full admin privileges and standard user view.
  - [AUTH-4.1] When **ON**: Admin sees all admin-only menu items (Approvals, Transfers) and has full management capabilities.
  - [AUTH-4.2] When **OFF**: Admin sees the application as a regular user would, useful for testing and verifying user experience.
  - [AUTH-4.3] Toggle is accessible via the sidebar for users with admin role.
  - [AUTH-4.4] State persists across sessions (stored in localStorage).
- [AUTH-5] Protected routes redirect unauthenticated users to auth page.
- [AUTH-6] Admin users see settings link in navigation.
- [AUTH-7] Regular users have limited navigation (no admin-only items).
- [AUTH-8] Session persists after page refresh.

---

## Localization

- [I18N-1] **Bilingual Support**: Full support for **English** and **Hebrew**.
- [I18N-2] **RTL Compatibility**: Optimized UI for Hebrew speakers.
- [I18N-3] **Custom Translation Engine**: Centralized management of tactical terminology.

---

## Technology Stack

*   **Frontend**: React (Vite), TypeScript, Tailwind CSS.
*   **UI Components**: shadcn/ui (Radix UI), Lucide Icons.
*   **Data Layer**: TanStack Query (React Query).
*   **Backend**: Firebase (Firestore, Auth).
*   **Database Security**: Firestore Security Rules with custom helper functions.
*   **Deployment**: Vercel.

---

## Workflows

### 1. Onboarding Workflow

- [ONBOARD-1] User signs up via Google Auth only.
- [ONBOARD-2] New user is redirected to the **Signup Request** page.
- [ONBOARD-3] User enters Service Number, Name, Cell phone number and selects their desired Unit.
- [ONBOARD-4] **Admin/Leader** receives notification on the **Approvals** page.
- [ONBOARD-5] On approval:
  - [ONBOARD-5.1] A `personnel` record is created.
  - [ONBOARD-5.2] A `user_role` is assigned.
  - [ONBOARD-5.3] The user gains access to the rest of the application.
- [ONBOARD-6] Pending users see a pending approval page.
- [ONBOARD-7] Declined users see their decline reason.

### 2. Equipment Transfer Workflow

- [XFER-1] **Initiation**: A user requests to transfer an item to another unit/person.
- [XFER-2] **Approval**: The recipient must accept the transfer.
- [XFER-3] **Completion**: The database updates the current assignment and logs the transaction in the `equipment_transfer_history`.

#### 2.1 Transfer Request Rules

- [XFER-4] Unit's equipment can only be transferred and received by the unit's signature_approved users.
- [XFER-5] Personal equipment can only be transferred by personnel that's assigned to the equipment.
- [XFER-6] Personal equipment can only be accepted by the personnel that's accepting the transfer.
- [XFER-7] Equipment can only be transferred to a person or a unit below the current unit it's assigned to.
- [XFER-8] Equipment can be transferred from a personnel to a unit and vice versa, following the rules above.
- [XFER-9] Equipment that was requested to be transferred but wasn't accepted yet - will still be assigned to the source user/unit and its status will be "pending transfer".
- [XFER-10] Equipment that was requested to be transferred but was declined - will still be assigned to the source user/unit and its status will roll back to the original assignment status. The transfer failure will be logged in the `equipment_transfer_history`.
- [XFER-11] For bulk items (no serial number), the user can specify the quantity to transfer (1 to available).
- [XFER-12] Transfer quantity is preserved in the transfer request and applied when the transfer is approved.
- [XFER-13] Transfers tab shows role-based sub-tabs: Incoming + History for users/leaders; Incoming + All Pending + History for admins.
- [XFER-14] Transfer cards display quantity for bulk items (no serial number).
- [XFER-15] Transfer cards display serial number for serialized items.
- [XFER-16] Transfers integrated into Equipment page as a second tab; `/assignment-requests` redirects there.
- [XFER-17] Accepting a serialized transfer requires a signature.
  - [XFER-17.1] First-time: user draws SVG signature on canvas; saved to personnel record in Firestore.
  - [XFER-17.2] Returning user: checkbox confirmation uses saved signature silently.

---

## User Interface

### Auth Page

- [UI-1] Auth page displays app branding (PMTB System).
- [UI-2] Auth page shows Google sign-in button.
- [UI-3] Unknown routes display 404 page.

### Dashboard

- [UI-4] Dashboard displays stats cards (total personnel, equipment items).
- [UI-5] Dashboard displays personnel overview section.
- [UI-6] Sidebar navigation allows access to personnel page.
- [UI-7] Sidebar navigation allows access to equipment page.

### Logout

- [UI-8] Users can logout and are redirected to auth page.

---

## User Experience

- [UX-1] Navigating to a previously visited page must not reset it to a full loading state. Previously loaded data is shown immediately while a background refresh runs.
- [UX-2] After performing an action (approve/reject), data refreshes silently without a full loading spinner.
