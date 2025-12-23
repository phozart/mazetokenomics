#!/bin/sh
set -e

echo "Initializing database..."
node prisma/init-db.js

echo "Starting application..."
exec node server.js
