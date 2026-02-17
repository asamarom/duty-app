# PMTB - Platoon Management Tool Box
<!-- Last updated: 2026-02-17 -->

Duty Tactical Management System (DTMS) — a comprehensive, mission-critical application designed for military and security organizations to manage their most vital assets: **Manpower** and **Equipment**.

The system provides real-time operational oversight, ensuring that commanders at every level have an accurate picture of their unit manpower, location, and capability.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Firestore + Auth)
- **Hosting**: Vercel (production auto-deploys from `main`)
- **Testing**: Vitest (unit), Playwright (E2E), @firebase/rules-unit-testing (security rules)
- **CI/CD**: Vercel auto-deploy + Preview deployments for PRs

## Core Features

### Personnel Management
- Detailed personnel profiles (Service Number, Rank, Duty Position, Contact Info)
- Table and list view formats with search/filter capabilities
- Personnel scoped to battalion-level access

### Equipment Inventory (Property Book)
- Full lifecycle tracking from acquisition to disposal
- Assignment system for individuals, companies, or platoons
- Serial-numbered equipment enforced to personnel-only assignment
- Table and list views with search/filter

### Access & Security (RBAC)
- **Admin**: Full system control, unit configuration, and role management
- **Leader**: Oversight of assigned units (Battalion/Company/Platoon)
- **User**: Standard access for individual personnel
- **Admin Mode Toggle**: Admins can switch between full admin and standard user view
- Signup request approval workflow for onboarding new users

### Unit Hierarchy
- **Battalion**: Primary command level
- **Company**: Mid-level tactical unit
- **Platoon**: Core operational unit for personnel and equipment tracking

### Internationalization
- Bilingual support: English and Hebrew (RTL)

## Development

```sh
# Install dependencies
npm install

# Start dev server (port 8080)
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

## Testing

Requires Java (OpenJDK 21+) for Firebase emulators.

```sh
# Unit tests
npm test

# Firestore security rules tests
npm run test:rules

# E2E tests (local with emulators)
npm run test:e2e

# E2E tests (against staging)
npm run test:e2e:staging

# E2E tests (against production)
npm run test:e2e:prod
```

### Test Users (E2E)

| Type     | Email                    | Status                    |
|----------|--------------------------|---------------------------|
| admin    | test-admin@e2e.local     | Approved with admin role  |
| leader   | test-leader@e2e.local    | Approved with leader role |
| user     | test-user@e2e.local      | Approved with user role   |
| new      | test-new@e2e.local       | No signup request         |
| pending  | test-pending@e2e.local   | Pending approval          |
| declined | test-declined@e2e.local  | Declined                  |

## Deployment

Vercel auto-deploys from the `main` branch. Preview deployments are created automatically for PRs. The Firebase project `duty-82f42` is used for Firestore and Auth only.

```sh
npm run build
```

## Project Structure

```
src/
  components/   # UI components (shadcn/ui based)
  hooks/        # Firebase data hooks
  pages/        # Route pages
  i18n/         # English + Hebrew translations
  types/        # TypeScript types
e2e/            # Playwright E2E tests
scripts/        # Emulator + seeding scripts
functions/      # Firebase Cloud Functions
sprints/        # Sprint summary documents
sprint_tasks/   # Sprint task breakdowns
firestore.rules # Firestore security rules
```

## Code Conventions

- TypeScript strict mode
- Follow existing component patterns in `src/components/`
- Use Firebase hooks in `src/hooks/`
- Translations in `src/i18n/translations.ts`
- Bilingual support: English and Hebrew (RTL)
