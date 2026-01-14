# Duty Tactical Management System (DTMS)

Duty is a comprehensive, mission-critical application designed for military and security organizations to manage their most vital assets: **Manpower**, **Equipment**, and **Unit Readiness**.

The system provides real-time operational oversight, ensuring that commanders at every level have an accurate picture of their unit's status, location, and capability.

---

## 🏗 Unit Hierarchy
The application follows a standard military organizational structure, allowing for granular management and reporting:

1.  **Battalion**: The primary command level.
2.  **Company**: Mid-level tactical unit (added in v2.0).
3.  **Platoon**: The core operational unit for personnel and equipment tracking.
---

## ✨ Core Features

### 👤 Personnel Management (Alpha Module)
*   **Profiles**: Detailed records including Service Number, Rank, Duty Position, and Contact Info.

### 🛠 Equipment Inventory (Property Book)
*   **Lifecycle Tracking**: Manage items from acquisition to disposal.
*   **Assignment System**: Issue equipment to individuals, companies, or platoons.
*   **Transfer Requests**: Secure workflow for moving property between units with digital signatures/approvals.

### 🛂 Access & Security (RBAC)
*   **Three-Tier Role System**:
    *   **Admin**: Full system control, unit configuration, and role management.
    *   **Leader**: Oversight of assigned units (Battalion/Company/Platoon leaders).
    *   **User**: Standard access for individual personnel.
    *   **signeture_approved**: A user that has been approved to transfer and accepts equipment from and to his unit.
*   **Signup Requests**: Strict onboarding process where new users must be manually approved and assigned a unit before gaining access.
*   **Admin Mode**: Ability for officials to toggle between administrative oversight and standard user views.

### 📊 Reporting & Analytics
TBD

---

## 🌍 Localization
*   **Bilingual Support**: Full support for **English** and **Hebrew**.
*   **RTL Compatibility**: Optimized UI for Hebrew speakers.
*   **Custom Translation Engine**: Centralized management of tactical terminology.

---

## 💻 Technology Stack
*   **Frontend**: React (Vite), TypeScript, Tailwind CSS.
*   **UI Components**: shadcn/ui (Radix UI), Lucide Icons.
*   **Data Layer**: TanStack Query (React Query).
*   **Backend**: Supabase (PostgreSQL, Auth, Realtime).
*   **Database Security**: Row Level Security (RLS) with custom PostgreSQL functions.

---

## 🚀 Workflows

### 1. Onboarding Workflow
1.  User signs up via Google Auth only.
2.  User is redirected to the **Signup Request** page.
3.  User enters Service Number, Name, Cell phone number and selects their desired Unit.
4.  **Admin/Leader** receives notification on the **Approvals** page.
5.  On approval:
    *   A `personnel` record is created.
    *   A `user_role` is assigned.
    *   The user gains access to the rest of the application.

### 2. Equipment Transfer Workflow
1.  **Initiation**: A user requests to transfer an item to another unit/person.
2.  **Approval**: The recipient must accept the transfer.
3.  **Completion**: The database updates the current assignment and logs the transaction in the `equipment_transfer_history`.

#### 2.1 Transfer Request rules:
*   Unit's equipment can only be transferred and received by the unit's signeture_approved users.
*   Personal equipment can only be transferred personnel that's assigned to the equipment.
*   Personal equipment can only be accepted by the personnel that's accepting the transfer.
*   Equipment can only be transferred to a person or a unit below the current unit it's assign to.
*   Equipment can be transfered from a personnal to a unit and viseversa, following the rules above.
*   Equipment with serial number can only be assigned for a personnel user and not a unit.
*   Equipment that was requested to be transfered but wasn't accepted yet by the target user/unit - will still be assigned to the source user/unit and his status will be "pending transfer".
*   Equipment that was requested to be transfered but was declined to accept - will still be assigned to the source user/unit and his status will roll back to the original assignment status. the transfer failure will be logged in the `equipment_transfer_history`.