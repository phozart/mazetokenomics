#!/bin/sh
set -e

echo "Pushing database schema..."
./node_modules/.bin/prisma db push --accept-data-loss

echo "Seeding database (if needed)..."
node prisma/seed.js || echo "Seeding skipped or failed (may already be seeded)"

echo "Starting application..."
exec node server.js
