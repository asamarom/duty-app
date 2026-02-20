#!/bin/bash

# Script to configure Vercel for preview deployments
# This script:
# 1. Sets environment variables for preview deployments
# 2. Removes Vercel authentication protection
# 3. Configures deployment settings

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Configuring Vercel Preview Environment              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📝 Setting environment variables for preview deployments..."
echo ""

# Set staging Firebase config for preview deployments
vercel env add VITE_TEST_MODE preview <<EOF
true
EOF

vercel env add VITE_FIREBASE_API_KEY preview <<EOF
AIzaSyBCEsDWXYAP-2I6JnbO5rgmdUCCx_7qEd4
EOF

vercel env add VITE_FIREBASE_AUTH_DOMAIN preview <<EOF
duty-staging.firebaseapp.com
EOF

vercel env add VITE_FIREBASE_PROJECT_ID preview <<EOF
duty-staging
EOF

vercel env add VITE_FIREBASE_STORAGE_BUCKET preview <<EOF
duty-staging.firebasestorage.app
EOF

vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID preview <<EOF
37921740435
EOF

vercel env add VITE_FIREBASE_APP_ID preview <<EOF
1:37921740435:web:f89ab09d3541cc47dcdf66
EOF

echo ""
echo "✅ Environment variables configured!"
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   Next Steps                                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "1. Remove Vercel password protection:"
echo "   Go to https://vercel.com/asamarom/duty-app/settings/deployment-protection"
echo "   Disable 'Vercel Authentication'"
echo ""
echo "2. Push to trigger a new preview deployment:"
echo "   git push origin main"
echo ""
echo "3. Test the preview deployment with test users"
echo ""
