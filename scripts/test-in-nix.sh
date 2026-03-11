#!/usr/bin/env bash

# test-in-nix.sh - Run unit tests in Nix development environment
# This script ensures tests run in a reproducible environment with all dependencies

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Nix is installed
if ! command -v nix &> /dev/null; then
    echo -e "${RED}Error: Nix is not installed${NC}"
    echo ""
    echo "Please install Nix to use this script:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install"
    echo ""
    echo "Alternatively, run tests directly:"
    echo "  npm run test"
    exit 1
fi

# Check if flakes are enabled
if ! nix flake metadata &> /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Nix flakes may not be enabled${NC}"
    echo "Attempting to run with --experimental-features flag..."
fi

echo -e "${GREEN}Running unit tests in Nix environment...${NC}"
echo ""

# Change to project root directory
cd "$(dirname "$0")/.."

# Run tests in Nix development shell
# The --command flag runs the command and exits, preserving the exit code
nix develop --command bash -c 'npm run test:run'

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo ""
    echo -e "${RED}❌ Tests failed with exit code: $EXIT_CODE${NC}"
fi

exit $EXIT_CODE
