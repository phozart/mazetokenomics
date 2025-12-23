#!/bin/sh
set -e

echo "Seeding database (if needed)..."
node prisma/seed.js || echo "Seeding skipped (may already exist)"

echo "Starting application..."
exec node server.js
