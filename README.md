# PMTB - Platoon Management Tool Box

Duty Tactical Management System (DTMS) — a military/security asset management application for small-unit administration.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Firestore + Auth)
- **Hosting**: Vercel
- **Testing**: Vitest (unit), Playwright (E2E), @firebase/rules-unit-testing (security rules)

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

# E2E tests (starts emulators + dev server automatically)
npm run test:e2e
```

## Deployment

Vercel auto-deploys from the `main` branch. The Firebase project `duty-82f42` is used for Firestore and Auth only.

```sh
npm run build
```

## Project Structure

```
src/
  components/   # UI components
  hooks/        # Firebase data hooks
  pages/        # Route pages
  i18n/         # English + Hebrew translations
  types/        # TypeScript types
e2e/            # Playwright E2E tests
scripts/        # Emulator + seeding scripts
firestore.rules # Firestore security rules
```
