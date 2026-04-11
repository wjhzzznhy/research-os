#!/bin/sh
set -e

echo "Starting Next.js dev server..."
cd /app/apps/web && WATCHPACK_POLLING=false npx next dev --webpack -H 0.0.0.0
