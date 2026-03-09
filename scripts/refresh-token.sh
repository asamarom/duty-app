#!/bin/bash

# Refresh Auth Token - Opens the token refresh utility in browser

echo "🔄 Auth Token Refresh Utility"
echo "=============================="
echo ""
echo "This will open the token refresh page in your default browser."
echo "Steps:"
echo "  1. Click 'Refresh Token' button"
echo "  2. Wait for success message"
echo "  3. Return to the app"
echo ""

# Determine the local dev URL
DEV_URL="http://localhost:5173/tools/refresh-auth.html"

# Check if dev server is running
if curl -s --head --fail "$DEV_URL" > /dev/null 2>&1; then
  echo "✓ Dev server detected at $DEV_URL"
  URL="$DEV_URL"
else
  # Try production URL
  PROD_URL="https://duty-app.vercel.app/tools/refresh-auth.html"
  echo "⚠️  Local dev server not running, using production: $PROD_URL"
  URL="$PROD_URL"
fi

echo ""
echo "Opening: $URL"
echo ""

# Detect OS and open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open "$URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  if command -v xdg-open > /dev/null; then
    xdg-open "$URL"
  elif command -v gnome-open > /dev/null; then
    gnome-open "$URL"
  else
    echo "Please open this URL manually: $URL"
  fi
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  # Windows
  start "$URL"
else
  echo "Unable to detect OS. Please open this URL manually: $URL"
fi

echo ""
echo "After refreshing the token, your app should work correctly!"
