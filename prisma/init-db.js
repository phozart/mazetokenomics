const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function initDatabase() {
  console.log('Applying database schema...');

  // Read the SQL schema file
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split into statements and execute each one
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      // Ignore "already exists" errors
      if (error.message.includes('already exists') ||
          error.code === '42P07' || // duplicate table
          error.code === '42710') { // duplicate object
        console.log(`Skipped (already exists): ${statement.substring(0, 50)}...`);
      } else {
        console.error(`Error executing: ${statement.substring(0, 100)}...`);
        throw error;
      }
    }
  }

  console.log('Database schema applied successfully!');
}

async function seedDatabase() {
  console.log('Checking seed data...');

  // Check if admin user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'maze' }
  });

  if (existingUser) {
    console.log('Admin user already exists, skipping seed');
    return;
  }

  // Create admin user
  const adminPassword = await bcrypt.hash('maze', 12);
  await prisma.user.create({
    data: {
      email: 'maze',
      name: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('Created admin user: maze / maze');
}

async function main() {
  try {
    await initDatabase();
    await seedDatabase();
    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
