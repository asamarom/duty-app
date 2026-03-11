#!/usr/bin/env bash
# Nix Flake Validation Script
# This script validates the flake.nix syntax and structure

set -e

echo "🔍 Validating Nix flake configuration..."
echo ""

# Check if flake.nix exists
if [ ! -f "flake.nix" ]; then
  echo "❌ Error: flake.nix not found"
  exit 1
fi
echo "✅ flake.nix exists"

# Check if .envrc exists
if [ ! -f ".envrc" ]; then
  echo "❌ Error: .envrc not found"
  exit 1
fi
echo "✅ .envrc exists"

# Check if Nix is installed
if command -v nix &> /dev/null; then
  echo "✅ Nix is installed"

  # Validate flake.nix syntax
  echo ""
  echo "🔍 Checking flake syntax..."
  nix flake check --no-build 2>&1 || {
    echo "❌ Flake syntax validation failed"
    exit 1
  }
  echo "✅ Flake syntax is valid"

  # Show flake metadata
  echo ""
  echo "📋 Flake metadata:"
  nix flake metadata

  # Try to build the devShell (dry-run)
  echo ""
  echo "🔍 Testing devShell build (dry-run)..."
  nix develop --dry-run
  echo "✅ devShell configuration is valid"

else
  echo "⚠️  Nix is not installed - skipping syntax validation"
  echo "   Install Nix to run full validation: https://nixos.org/download.html"

  # Basic syntax check (grep for required sections)
  echo ""
  echo "🔍 Performing basic structure validation..."

  if grep -q "description = " flake.nix; then
    echo "✅ Has description"
  else
    echo "❌ Missing description"
    exit 1
  fi

  if grep -q "inputs = {" flake.nix; then
    echo "✅ Has inputs section"
  else
    echo "❌ Missing inputs section"
    exit 1
  fi

  if grep -q "outputs = " flake.nix; then
    echo "✅ Has outputs section"
  else
    echo "❌ Missing outputs section"
    exit 1
  fi

  if grep -q "devShells.default" flake.nix; then
    echo "✅ Has devShells.default"
  else
    echo "❌ Missing devShells.default"
    exit 1
  fi
fi

echo ""
echo "✅ Validation complete!"
echo ""
echo "Next steps:"
echo "  1. Install Nix: https://nixos.org/download.html"
echo "  2. Enable flakes in nix.conf"
echo "  3. Run: nix develop"
echo "  4. Optional: Install direnv and run: direnv allow"
