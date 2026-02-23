#!/bin/bash
# Script to configure Vercel preview environment with Firebase Test credentials

set -e

echo "📝 Setting up Firebase environment variables for Vercel preview deployments..."

# Read from .env.preview
if [ ! -f ".env.preview" ]; then
  echo "❌ Error: .env.preview not found"
  exit 1
fi

# Extract values from .env.preview (skip comments and empty lines)
VITE_TEST_MODE=$(grep "^VITE_TEST_MODE=" .env.preview | cut -d '=' -f2 | tr -d '"')
VITE_FIREBASE_API_KEY=$(grep "^VITE_FIREBASE_API_KEY=" .env.preview | cut -d '=' -f2 | tr -d '"')
VITE_FIREBASE_AUTH_DOMAIN=$(grep "^VITE_FIREBASE_AUTH_DOMAIN=" .env.preview | cut -d '=' -f2 | tr -d '"')
VITE_FIREBASE_PROJECT_ID=$(grep "^VITE_FIREBASE_PROJECT_ID=" .env.preview | cut -d '=' -f2 | tr -d '"')
VITE_FIREBASE_STORAGE_BUCKET=$(grep "^VITE_FIREBASE_STORAGE_BUCKET=" .env.preview | cut -d '=' -f2 | tr -d '"')
VITE_FIREBASE_MESSAGING_SENDER_ID=$(grep "^VITE_FIREBASE_MESSAGING_SENDER_ID=" .env.preview | cut -d '=' -f2 | tr -d '"')
VITE_FIREBASE_APP_ID=$(grep "^VITE_FIREBASE_APP_ID=" .env.preview | cut -d '=' -f2 | tr -d '"')

echo "Setting environment variables for preview environment..."

# Add environment variables to Vercel (preview scope only)
vercel env add VITE_TEST_MODE preview <<< "$VITE_TEST_MODE"
vercel env add VITE_FIREBASE_API_KEY preview <<< "$VITE_FIREBASE_API_KEY"
vercel env add VITE_FIREBASE_AUTH_DOMAIN preview <<< "$VITE_FIREBASE_AUTH_DOMAIN"
vercel env add VITE_FIREBASE_PROJECT_ID preview <<< "$VITE_FIREBASE_PROJECT_ID"
vercel env add VITE_FIREBASE_STORAGE_BUCKET preview <<< "$VITE_FIREBASE_STORAGE_BUCKET"
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID preview <<< "$VITE_FIREBASE_MESSAGING_SENDER_ID"
vercel env add VITE_FIREBASE_APP_ID preview <<< "$VITE_FIREBASE_APP_ID"

echo "✅ Firebase environment variables configured for Vercel preview deployments"
echo ""
echo "These variables will be available in all preview deployments."
echo "Production deployments will use different Firebase credentials."
