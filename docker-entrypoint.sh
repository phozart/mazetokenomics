#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --skip-generate

echo "Seeding database (if needed)..."
node prisma/seed.js || echo "Seeding skipped or failed (may already be seeded)"

echo "Starting application..."
exec node server.js
