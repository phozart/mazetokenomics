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

if [ "$TABLE_EXISTS" = "false" ]; then
  echo "Database not initialized. Creating schema..."

  # Use psql to run the schema file directly (most reliable method)
  # First check if psql is available in the container
  if command -v psql > /dev/null 2>&1; then
    PGPASSWORD=$(echo $DATABASE_URL | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
    PGHOST=$(echo $DATABASE_URL | sed 's/.*@\([^:]*\):.*/\1/')
    PGDATABASE=$(echo $DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/')
    PGUSER=$(echo $DATABASE_URL | sed 's/.*:\/\/\([^:]*\):.*/\1/')

    PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f /app/prisma/schema.sql
  else
    # Fallback to Node.js based init
    echo "psql not available, using Node.js init..."
    node prisma/init-db.js
  fi
else
  # Database exists - run any pending migrations
  echo "Running pending migrations..."
  if command -v psql > /dev/null 2>&1; then
    PGPASSWORD=$(echo $DATABASE_URL | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
    PGHOST=$(echo $DATABASE_URL | sed 's/.*@\([^:]*\):.*/\1/')
    PGDATABASE=$(echo $DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/')
    PGUSER=$(echo $DATABASE_URL | sed 's/.*:\/\/\([^:]*\):.*/\1/')

    # Run migration scripts if they exist
    for migration in /app/prisma/migrations/*.sql; do
      if [ -f "$migration" ]; then
        echo "Applying migration: $(basename $migration)"
        PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f "$migration" 2>/dev/null || true
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
