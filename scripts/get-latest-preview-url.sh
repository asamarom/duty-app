#!/bin/bash
# Get the latest preview deployment URL from Vercel

# Use Vercel CLI to get deployments
# The latest preview deployment is the first one that's not production
LATEST_URL=$(npx vercel ls --json 2>/dev/null | jq -r '
  .deployments 
  | map(select(.type == "LAMBDAS" and .state == "READY"))
  | sort_by(.created) 
  | reverse 
  | .[0].url 
  | "https://" + .'
)

if [ -z "$LATEST_URL" ] || [ "$LATEST_URL" = "https://" ]; then
  echo "Error: Could not fetch latest preview URL" >&2
  exit 1
fi

echo "$LATEST_URL"
