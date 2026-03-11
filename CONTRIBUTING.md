# Contributing to Duty Tactical Management System

Thank you for your interest in contributing to the Duty Tactical Management System (DTMS)! This guide will help you set up your development environment and understand our development practices.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
  - [Option 1: Using Nix (Recommended)](#option-1-using-nix-recommended)
  - [Option 2: Traditional Setup](#option-2-traditional-setup)
- [Running Tests](#running-tests)
- [Code Conventions](#code-conventions)
- [Troubleshooting](#troubleshooting)

## Getting Started

The project uses React, TypeScript, and Firebase. We recommend using Nix for a reproducible development environment, but traditional setup is also supported.

## Development Environment Setup

### Option 1: Using Nix (Recommended)

Nix provides a completely reproducible development environment with all dependencies pre-configured. This ensures consistency across all development machines and CI environments.

#### Benefits of Using Nix

- **Reproducible**: Identical environment on all machines (Linux, macOS, WSL)
- **Isolated**: No conflicts with system packages or other projects
- **Declarative**: All dependencies defined in `flake.nix`
- **Version-locked**: Exact dependency versions guaranteed
- **No manual setup**: Node.js, Java, Firebase CLI, Playwright browsers all configured automatically

#### Installing Nix

1. Install Nix with flakes enabled:

   ```bash
   # Install Nix (multi-user installation)
   sh <(curl -L https://nixos.org/nix/install) --daemon
   ```

2. Enable flakes by adding this to `~/.config/nix/nix.conf` (create if it doesn't exist):

   ```
   experimental-features = nix-command flakes
   ```

3. Restart your shell or source your profile:

   ```bash
   source ~/.bashrc  # or ~/.zshrc
   ```

#### Optional: Install direnv for Automatic Environment Loading

direnv automatically loads the Nix environment when you `cd` into the project directory.

```bash
# On macOS with Homebrew
brew install direnv

# On Linux with Nix
nix profile install nixpkgs#direnv

# Add to your shell rc file (~/.bashrc, ~/.zshrc, etc.)
eval "$(direnv hook bash)"  # or zsh, fish, etc.
```

Then, in the project directory:

```bash
direnv allow
```

The environment will now load automatically whenever you enter the directory.

#### Using the Nix Development Shell

If not using direnv, manually enter the development shell:

```bash
cd /path/to/duty-app
nix develop
```

The first time you run this, Nix will:
- Download and install all system dependencies
- Set up environment variables (JAVA_HOME, Playwright paths, etc.)
- Install npm dependencies
- Install Playwright browsers
- Display available commands

Subsequent runs are nearly instant thanks to Nix's caching.

#### What's Included in the Nix Environment

- **Node.js 20.x** - JavaScript runtime
- **npm** - Package manager
- **Java 21 (OpenJDK)** - Required for Firebase emulators
- **Firebase CLI** - Firebase tools and emulators
- **Playwright browsers** - Chromium, Firefox, and WebKit
- **System libraries** - All required dependencies for running tests
- **FFmpeg** - Video recording support for test artifacts

### Option 2: Traditional Setup

If you prefer not to use Nix, you can set up the environment manually.

#### Prerequisites

- Node.js 20.x
- npm 9.x or higher
- Java 21 (OpenJDK) for Firebase emulators
- Git

#### Installation Steps

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd duty-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Install Playwright browsers:

   ```bash
   npx playwright install chromium firefox webkit
   npx playwright install-deps
   ```

4. Verify Java installation:

   ```bash
   java -version  # Should show version 21
   ```

## Running Tests

### With Nix (Recommended)

The Nix environment includes convenient scripts for running tests:

```bash
# Unit tests (in Nix environment)
npm run test:nix

# E2E tests (in Nix environment)
npm run test:e2e:nix

# Or, if you're already in the Nix shell (via nix develop or direnv):
npm run test:run        # Unit tests
npm run test:e2e        # E2E tests with Chromium
npm run test:e2e:ui     # E2E tests in UI mode
```

The Nix test scripts ensure that all dependencies are available and properly configured.

### Without Nix

```bash
# Unit tests
npm run test
npm run test:run

# E2E tests (requires Firebase emulators)
npm run test:e2e
npm run test:e2e:ui

# E2E tests against staging
npm run test:e2e:staging

# Security rules tests
npm run test:rules
```

### Test Types

| Test Type | Command | Description |
|-----------|---------|-------------|
| Unit Tests | `npm run test` or `npm run test:nix` | Vitest unit tests for components and utilities |
| E2E Tests | `npm run test:e2e` or `npm run test:e2e:nix` | Playwright end-to-end tests with Firebase emulators |
| Rules Tests | `npm run test:rules` | Firestore security rules tests |
| Staging Tests | `npm run test:e2e:staging` | E2E tests against staging environment |

### Test Users

E2E tests use pre-seeded test users:

| Type | Email | Status |
|------|-------|--------|
| admin | test-admin@e2e.local | Approved with admin role |
| leader | test-leader@e2e.local | Approved with leader role |
| user | test-user@e2e.local | Approved with user role |
| new | test-new@e2e.local | No signup request |
| pending | test-pending@e2e.local | Pending approval |
| declined | test-declined@e2e.local | Declined |

All test users use the password: `TestPassword123!`

## Code Conventions

- **TypeScript**: Use TypeScript strictly with proper typing
- **Components**: Follow existing patterns in `src/components/`
- **Hooks**: Use Firebase hooks from `src/hooks/`
- **Translations**: Add translations to `src/i18n/translations.ts`
- **Internationalization**: Support both English and Hebrew (RTL)
- **Testing**: Write tests for new features and bug fixes

### File Structure

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
firestore.rules # Firestore security rules
```

## Troubleshooting

### Nix Environment Issues

#### "Nix is not installed"

Install Nix following the instructions in [Installing Nix](#installing-nix).

#### "Nix flakes may not be enabled"

Add `experimental-features = nix-command flakes` to `~/.config/nix/nix.conf` and restart your shell.

#### Playwright browsers not found

Even with Nix, you may need to install Playwright browsers:

```bash
# Inside Nix shell
npx playwright install chromium firefox webkit
npx playwright install-deps
```

#### Firebase emulators fail to start

Ensure Java 21 is being used:

```bash
java -version  # Should show openjdk version "21.x.x"
echo $JAVA_HOME  # Should be set to Nix JDK path
```

If Java is not version 21, you may need to:
- Exit and re-enter the Nix shell
- Or reinstall Java 21 manually

#### npm dependencies out of date

Remove `node_modules` and reinstall:

```bash
rm -rf node_modules
npm install
```

#### Nix cache issues

If you encounter issues with cached builds:

```bash
nix flake update
nix develop --refresh
```

#### direnv not loading environment

Ensure direnv is properly hooked in your shell:

```bash
# Add to ~/.bashrc or ~/.zshrc
eval "$(direnv hook bash)"  # or zsh, fish, etc.
```

Then reload your shell and allow direnv in the project:

```bash
direnv allow
```

### General Development Issues

#### Port already in use

The dev server runs on port 8080. If the port is in use:

```bash
# Find and kill the process using port 8080
lsof -ti:8080 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000
```

#### Firebase emulator ports in use

Default emulator ports:
- Auth: 9099
- Firestore: 8085
- UI: 4000

To kill all Firebase emulators:

```bash
pkill -f firebase
```

#### Type errors after pulling changes

Reinstall dependencies and rebuild:

```bash
npm ci
npm run typecheck
```

## Additional Resources

- [NIX_SETUP.md](NIX_SETUP.md) - Detailed Nix flake documentation
- [CLAUDE.md](CLAUDE.md) - AI assistant instructions and project overview
- [Sprint Workflow](.claude/agents/sprint-workflow.md) - Development workflow and requirements

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [NIX_SETUP.md](NIX_SETUP.md) for Nix-specific details
2. Review existing GitHub issues
3. Ask in the project's communication channel
4. Create a new GitHub issue with:
   - Your operating system and version
   - Steps to reproduce the issue
   - Error messages and logs
   - Whether you're using Nix or traditional setup

Thank you for contributing!
