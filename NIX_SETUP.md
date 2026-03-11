# Nix Flake Setup for Duty Tactical Management System

This document describes the Nix flake configuration for creating a reproducible test environment.

## Overview

The Nix flake provides a complete, reproducible development and testing environment with all dependencies pre-configured:

- **Node.js 20.x** - JavaScript runtime
- **npm** - Package manager
- **Java 21 (OpenJDK)** - Required for Firebase emulators
- **Firebase CLI** - Firebase tools and emulators
- **Playwright browsers** - Chromium, Firefox, and WebKit
- **System libraries** - All required dependencies for running tests
- **FFmpeg** - Video recording support for test artifacts

## Prerequisites

1. **Install Nix** (with flakes enabled):
   ```bash
   # Install Nix
   sh <(curl -L https://nixos.org/nix/install) --daemon

   # Enable flakes (add to ~/.config/nix/nix.conf or /etc/nix/nix.conf)
   experimental-features = nix-command flakes
   ```

2. **Optional: Install direnv** for automatic environment loading:
   ```bash
   # On macOS with Homebrew
   brew install direnv

   # On Linux
   nix profile install nixpkgs#direnv

   # Add to your shell rc file (~/.bashrc, ~/.zshrc)
   eval "$(direnv hook bash)"  # or zsh, fish, etc.
   ```

## Usage

### Option 1: Using Nix Flake Directly

Enter the development shell:
```bash
nix develop
```

This will:
- Install all system dependencies
- Set up environment variables
- Install npm dependencies (if not already installed)
- Install Playwright browsers (if not already installed)
- Display available commands

### Option 2: Using direnv (Recommended)

If you have direnv installed:

1. Allow direnv in the project directory:
   ```bash
   direnv allow
   ```

2. The environment will automatically load when you `cd` into the project directory

3. To reload the environment:
   ```bash
   direnv reload
   ```

## Running Tests

Once in the Nix environment, you can run all test commands:

```bash
# Unit tests
npm run test
npm run test:run

# E2E tests (local with emulators)
npm run test:e2e
npm run test:e2e:ui

# E2E tests (staging)
npm run test:e2e:staging

# Start Firebase emulators
npm run emulator:all

# Development server
npm run dev
```

## Environment Variables

The Nix shell automatically sets:

- `JAVA_HOME` - Points to JDK 21 for Firebase emulators
- `PLAYWRIGHT_BROWSERS_PATH` - Playwright browser cache location
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` - System Chromium path
- `PLAYWRIGHT_FIREFOX_EXECUTABLE_PATH` - System Firefox path
- `VITE_TEST_MODE` - Enables test mode for the application
- `FIREBASE_AUTH_EMULATOR_HOST` - Firebase Auth emulator address
- `FIREBASE_FIRESTORE_EMULATOR_HOST` - Firestore emulator address

## Troubleshooting

### Playwright browsers not found

If Playwright can't find browsers, run:
```bash
npx playwright install chromium firefox webkit
npx playwright install-deps
```

### Firebase emulators fail to start

Ensure Java 21 is being used:
```bash
java -version  # Should show openjdk version "21.x.x"
echo $JAVA_HOME  # Should be set to Nix JDK path
```

### npm dependencies out of date

Remove node_modules and reinstall:
```bash
rm -rf node_modules
npm install
```

### Clear Nix cache

If you encounter issues with cached builds:
```bash
nix flake update
nix develop --refresh
```

## CI/CD Integration

For CI environments, you can use Nix to ensure consistent dependencies:

```yaml
# Example GitHub Actions workflow
- name: Install Nix
  uses: cachix/install-nix-action@v24
  with:
    extra_nix_config: |
      experimental-features = nix-command flakes

- name: Run tests in Nix environment
  run: nix develop --command npm run test:e2e
```

## Customization

To modify the Nix environment, edit `flake.nix`:

- **Add packages**: Add to the `buildInputs` list
- **Change Node.js version**: Modify `nodejs = pkgs.nodejs_XX;`
- **Add environment variables**: Add to `shellHook` or root level in `devShells.default`

After modifying, reload the environment:
```bash
# With nix develop
exit
nix develop

# With direnv
direnv reload
```

## Benefits

- **Reproducible**: Same environment across all machines
- **Isolated**: No conflicts with system packages
- **Declarative**: All dependencies defined in one place
- **Cross-platform**: Works on Linux, macOS, and WSL
- **Version-locked**: Exact dependency versions guaranteed

## Learn More

- [Nix Flakes Documentation](https://nixos.wiki/wiki/Flakes)
- [direnv Documentation](https://direnv.net/)
- [Nix Pills](https://nixos.org/guides/nix-pills/)
