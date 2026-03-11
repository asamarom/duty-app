{
  description = "Duty Tactical Management System - Reproducible Test Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true; # Required for some Playwright browser dependencies
          };
        };

        # Node.js 20.x
        nodejs = pkgs.nodejs_20;

        # System libraries required for Playwright browsers
        playwrightDeps = with pkgs; [
          # Chromium dependencies
          nss
          nspr
          atk
          cups
          libdrm
          expat
          libxkbcommon
          pango
          cairo
          alsa-lib
          dbus
          at-spi2-atk
          at-spi2-core
          libxshmfence
          libxrandr
          mesa
          gtk3
          glib

          # Firefox dependencies
          ffmpeg

          # Webkit dependencies (if needed)
          libsoup
          webkitgtk

          # Font support
          fontconfig
          freetype
        ];

        # Build the shell environment
        buildInputs = with pkgs; [
          # Node.js and package management
          nodejs
          nodejs.pkgs.npm

          # Firebase Emulators require Java 21
          jdk21

          # Firebase CLI tools
          firebase-tools

          # Browsers for Playwright
          chromium
          firefox

          # Video recording support for tests
          ffmpeg

          # Git for version control
          git

          # Process management
          nodejs.pkgs.cross-env

          # Additional utilities
          curl
          wget
          jq
        ] ++ playwrightDeps;

      in
      {
        # Development shell
        devShells.default = pkgs.mkShell {
          inherit buildInputs;

          # Environment variables for test execution
          shellHook = ''
            echo "🚀 Duty Tactical Management System - Test Environment"
            echo "================================================"
            echo "Node.js: $(node --version)"
            echo "npm: $(npm --version)"
            echo "Java: $(java -version 2>&1 | head -n 1)"
            echo "Firebase CLI: $(firebase --version)"
            echo ""

            # Set JAVA_HOME for Firebase emulators
            export JAVA_HOME="${pkgs.jdk21}"

            # Set Playwright browsers path
            export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"

            # Set Node.js to use the Nix-provided version
            export PATH="${nodejs}/bin:$PATH"

            # Chromium path for Playwright (use system chromium)
            export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="${pkgs.chromium}/bin/chromium"

            # Firefox path for Playwright
            export PLAYWRIGHT_FIREFOX_EXECUTABLE_PATH="${pkgs.firefox}/bin/firefox"

            # Install npm dependencies if node_modules doesn't exist
            if [ ! -d "node_modules" ]; then
              echo "📦 Installing npm dependencies..."
              npm install
            fi

            # Install Playwright browsers if not already installed
            if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ]; then
              echo "🎭 Installing Playwright browsers..."
              npx playwright install chromium firefox webkit
              npx playwright install-deps
            fi

            echo ""
            echo "✅ Environment ready!"
            echo ""
            echo "Available commands:"
            echo "  npm run test:e2e        - Run E2E tests with Chromium"
            echo "  npm run test:e2e:ui     - Run E2E tests in UI mode"
            echo "  npm run test            - Run unit tests"
            echo "  npm run emulator:all    - Start Firebase emulators"
            echo "  npm run dev             - Start development server"
            echo ""
          '';

          # Additional environment variables
          FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
          FIREBASE_FIRESTORE_EMULATOR_HOST = "localhost:8085";
          VITE_TEST_MODE = "true";

          # Prevent npm from trying to use system Node.js
          NPM_CONFIG_PREFIX = "$HOME/.npm-global";

          # Set locale for proper character handling
          LANG = "en_US.UTF-8";
          LC_ALL = "en_US.UTF-8";
        };

        # Default package (can be used for CI)
        packages.default = pkgs.stdenv.mkDerivation {
          name = "duty-app-test-env";
          version = "0.1.0";

          src = ./.;

          buildInputs = buildInputs;

          buildPhase = ''
            # This is a development environment package
            # Actual builds happen in devShell
            echo "Development environment package"
          '';

          installPhase = ''
            mkdir -p $out
            echo "Duty Tactical Management System Test Environment" > $out/README
          '';
        };

        # Formatter for `nix fmt`
        formatter = pkgs.nixpkgs-fmt;
      }
    );
}
