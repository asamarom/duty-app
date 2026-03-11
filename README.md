# PMTB - Platoon Management Tool Box
<!-- Last updated: 2026-03-11 -->

Duty Tactical Management System (DTMS) — a comprehensive, mission-critical application designed for military and security organizations to manage their most vital assets: **Manpower** and **Equipment**.

The system provides real-time operational oversight, ensuring that commanders at every level have an accurate picture of their unit manpower, location, and capability.

## Quick Start

### Using Nix (Recommended)

Get up and running in seconds with a fully reproducible environment:

```bash
# Install Nix (one-time setup)
sh <(curl -L https://nixos.org/nix/install) --daemon

# Enable flakes in ~/.config/nix/nix.conf
echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf

# Clone and enter the project
git clone <repository-url>
cd duty-app

# Enter development shell (installs everything automatically)
nix develop

# Start developing
npm run dev
```

The Nix environment includes Node.js 20, Java 21, Firebase CLI, Playwright browsers, and all system dependencies pre-configured.

For automatic environment loading, install [direnv](https://direnv.net/) and run `direnv allow` in the project directory.

### Traditional Setup

```bash
# Prerequisites: Node.js 20.x, npm, Java 21, Git

# Clone and install
git clone <repository-url>
cd duty-app
npm install

# Install Playwright browsers
npx playwright install --with-deps

# Start developing
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Firestore + Auth)
- **Hosting**: Vercel (production auto-deploys from `main`)
- **Testing**: Vitest (unit), Playwright (E2E), @firebase/rules-unit-testing (security rules)
- **CI/CD**: Vercel auto-deploy + Preview deployments for PRs
- **Development**: Nix flakes for reproducible environments

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

### With Nix (Recommended)

```sh
# Enter Nix development shell (or use direnv)
nix develop

# Start dev server (port 8080)
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

### Without Nix

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

### Reproducible Testing with Nix

Nix provides a consistent test environment across all machines and CI:

```sh
# Unit tests (in Nix environment)
npm run test:nix

# E2E tests (in Nix environment)
npm run test:e2e:nix

# Or, if already in Nix shell:
npm run test:run   # Unit tests
npm run test:e2e   # E2E tests
```

**Benefits of Nix for testing:**
- Identical environment on developer machines and CI
- All dependencies (Node.js, Java, Firebase CLI, Playwright) version-locked
- No "works on my machine" issues
- Isolated from system package conflicts

### Traditional Testing

Requires Java (OpenJDK 21+) for Firebase emulators.

```sh
# Unit tests
npm test
npm run test:run

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

## Reproducible Development with Nix

This project uses [Nix flakes](https://nixos.wiki/wiki/Flakes) to provide a completely reproducible development and testing environment. This ensures:

- **Consistency**: Same environment across all developer machines, CI, and production builds
- **Isolation**: No conflicts with system packages or other projects
- **Reproducibility**: Exact dependency versions locked and guaranteed
- **Cross-platform**: Works on Linux, macOS, and WSL
- **Zero-config**: All dependencies installed automatically when entering the shell

### What Nix Provides

- Node.js 20.x
- Java 21 (OpenJDK) for Firebase emulators
- Firebase CLI tools
- Playwright browsers (Chromium, Firefox, WebKit)
- All system libraries and dependencies
- FFmpeg for test video recording

### CI Integration

Our GitHub Actions CI workflow uses Nix for unit tests to ensure identical behavior between local development and CI. This eliminates "works on my machine" problems and catches environment-specific issues early.

See [NIX_SETUP.md](NIX_SETUP.md) for detailed Nix documentation and [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions.

## Code Conventions

- TypeScript strict mode
- Follow existing component patterns in `src/components/`
- Use Firebase hooks in `src/hooks/`
- Translations in `src/i18n/translations.ts`
- Bilingual support: English and Hebrew (RTL)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions on setting up your development environment, running tests, and contributing to the project.
