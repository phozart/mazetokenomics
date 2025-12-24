#!/bin/sh
set -e

echo "=========================================="
echo "  Maze Tokenomics - Starting Up"
echo "=========================================="

# Wait for database to be ready
echo "Waiting for database connection..."
sleep 3

# Check if database tables exist by checking for User table
echo "Checking database state..."
TABLE_EXISTS=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    await prisma.user.count();
    console.log('true');
  } catch (error) {
    console.log('false');
  } finally {
    await prisma.\$disconnect();
  }
}
check();
" 2>/dev/null)

# Use PG* env vars directly from docker-compose (no parsing needed)
run_psql() {
  PGPASSWORD=$PGPASSWORD psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" "$@"
}

if [ "$TABLE_EXISTS" = "false" ]; then
  echo "Database not initialized. Creating schema..."

  if command -v psql > /dev/null 2>&1; then
    run_psql -f /app/prisma/schema.sql
  else
    echo "psql not available, using Node.js init..."
    node prisma/init-db.js
  fi
else
  # Database exists - run any pending migrations
  echo "Running pending migrations..."
  if command -v psql > /dev/null 2>&1; then
    for migration in /app/prisma/migrations/*.sql; do
      if [ -f "$migration" ]; then
        echo "Applying migration: $(basename $migration)"
        run_psql -f "$migration" 2>/dev/null || true
      fi
    done
  fi
fi

# Always run seed to ensure data exists
echo "Checking seed data..."
node prisma/seed.js 2>/dev/null || echo "Seed already complete or error occurred"

echo "=========================================="
echo "  Database ready! Starting server..."
echo "=========================================="

exec node server.js
