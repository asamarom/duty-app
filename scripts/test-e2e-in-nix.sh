#!/usr/bin/env bash

# test-e2e-in-nix.sh - Run E2E tests in Nix development environment
# This script ensures E2E tests run in a reproducible environment with all dependencies
# including Playwright browsers, Firebase emulators, and system libraries

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Nix is installed
if ! command -v nix &> /dev/null; then
    echo -e "${RED}Error: Nix is not installed${NC}"
    echo ""
    echo "Please install Nix to use this script:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install"
    echo ""
    echo "Alternatively, run E2E tests directly:"
    echo "  npm run test:e2e"
    exit 1
fi

# Check if flakes are enabled
if ! nix flake metadata &> /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Nix flakes may not be enabled${NC}"
    echo "Attempting to run with --experimental-features flag..."
fi

echo -e "${GREEN}Running E2E tests in Nix environment...${NC}"
echo ""

# Change to project root directory
cd "$(dirname "$0")/.."

# Parse command-line arguments to pass through to Playwright
PLAYWRIGHT_ARGS="${*:-}"

if [ -z "$PLAYWRIGHT_ARGS" ]; then
    echo -e "${BLUE}Running E2E tests with default configuration (Chromium)${NC}"
    PLAYWRIGHT_ARGS="--project=chromium"
else
    echo -e "${BLUE}Running E2E tests with custom arguments: $PLAYWRIGHT_ARGS${NC}"
fi

echo ""

# Run E2E tests in Nix development shell
# The --command flag runs the command and exits, preserving the exit code
nix develop --command bash -c "npx playwright test $PLAYWRIGHT_ARGS"

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All E2E tests passed!${NC}"
else
    echo ""
    echo -e "${RED}❌ E2E tests failed with exit code: $EXIT_CODE${NC}"
fi

exit $EXIT_CODE
