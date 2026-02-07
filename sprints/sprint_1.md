# Sprint 1 Summary

**Date**: 2026-01-24
**Changes since**: Initial

---

## Added Requirements

### UNIT
- [UNIT-1] Battalion: The primary command level
- [UNIT-2] Company: Mid-level tactical unit
- [UNIT-3] Platoon: The core operational unit

### PERS
- [PERS-1] Profiles: Service Number, Rank, Duty Position, Contact Info
- [PERS-2] Personnel list viewable with table or list format
- [PERS-3] Personnel can be searched/filtered
- [PERS-4] Personnel detail page shows individual information

### EQUIP
- [EQUIP-1] Lifecycle Tracking: acquisition to disposal
- [EQUIP-2] Assignment System: issue to individuals, companies, or platoons
- [EQUIP-3] Equipment list viewable with table or list format
- [EQUIP-4] Equipment can be searched/filtered
- [EQUIP-5] Equipment detail page shows individual item information
- [EQUIP-6] Authorized users can add new equipment
- [EQUIP-7] Equipment with serial number can only be assigned to personnel

### AUTH
- [AUTH-1] Three-Tier Role System
- [AUTH-1.1] Admin: Full system control
- [AUTH-1.2] Leader: Oversight of assigned units
- [AUTH-1.3] User: Standard access
- [AUTH-2] Signature Approved: personnel attribute for transfer authority
- [AUTH-3] Signup Requests: manual approval before access
- [AUTH-4] Admin Mode: toggle between admin and user view
- [AUTH-4.1] Admin Mode ON: shows admin menu items
- [AUTH-4.2] Admin Mode OFF: standard user view
- [AUTH-4.3] Toggle accessible via sidebar for admins
- [AUTH-4.4] State persists across sessions (localStorage)
- [AUTH-5] Protected routes redirect unauthenticated users
- [AUTH-6] Admin users see settings link in navigation
- [AUTH-7] Regular users have limited navigation
- [AUTH-8] Session persists after page refresh

### I18N
- [I18N-1] Bilingual Support: English and Hebrew
- [I18N-2] RTL Compatibility
- [I18N-3] Custom Translation Engine

### ONBOARD
- [ONBOARD-1] User signs up via Google Auth only
- [ONBOARD-2] New user redirected to Signup Request page
- [ONBOARD-3] User enters Service Number, Name, Cell phone, Unit
- [ONBOARD-4] Admin/Leader receives notification on Approvals page
- [ONBOARD-5] On approval: personnel record and role assigned
- [ONBOARD-5.1] Personnel record is created
- [ONBOARD-5.2] User role is assigned
- [ONBOARD-5.3] User gains access to application
- [ONBOARD-6] Pending users see pending approval page
- [ONBOARD-7] Declined users see their decline reason

### XFER
- [XFER-1] Initiation: user requests transfer
- [XFER-2] Approval: recipient must accept
- [XFER-3] Completion: database updates and logs transaction
- [XFER-4] Unit equipment transferred only by signature_approved users
- [XFER-5] Personal equipment transferred only by assigned personnel
- [XFER-6] Personal equipment accepted only by accepting personnel
- [XFER-7] Equipment can only transfer to lower hierarchy
- [XFER-8] Equipment transfers between personnel and unit
- [XFER-9] Pending transfer shows "pending transfer" status
- [XFER-10] Declined transfer rolls back status and logs failure

### UI
- [UI-1] Auth page displays app branding
- [UI-2] Auth page shows Google sign-in button
- [UI-3] Unknown routes display 404 page
- [UI-4] Dashboard displays stats cards
- [UI-5] Dashboard displays personnel overview section
- [UI-6] Sidebar navigation to personnel page
- [UI-7] Sidebar navigation to equipment page
- [UI-8] Logout redirects to auth page

---

## Modified Requirements

- None

---

## Removed Requirements

- None

---

## Summary

- **Total Added**: 56
- **Total Modified**: 0
- **Total Removed**: 0
