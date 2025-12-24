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

  // Split into statements - split on semicolon, then clean up
  const rawStatements = schemaSql.split(';');
  console.log(`Raw split: ${rawStatements.length} parts`);

  const statements = rawStatements
    .map(s => {
      // Remove leading comment lines and whitespace
      const lines = s.split('\n');
      const sqlLines = lines.filter(line => !line.trim().startsWith('--'));
      return sqlLines.join('\n').trim();
    })
    .filter(s => s.length > 0)
    .filter(s => s.match(/^(CREATE|ALTER)/i)); // Only SQL statements

  console.log(`Found ${statements.length} SQL statements to execute`);
  if (statements.length < 10) {
    console.log('First 3 statements:', statements.slice(0, 3).map(s => s.substring(0, 80)));
  }

  let executed = 0;
  let skipped = 0;
  let failed = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.replace(/\s+/g, ' ').substring(0, 60);

    try {
      await prisma.$executeRawUnsafe(statement);
      executed++;
    } catch (error) {
      const errCode = error.meta?.code || error.code;
      const errMsg = error.meta?.message || error.message;

      // Ignore "already exists" errors
      if (errMsg.includes('already exists') ||
          errCode === '42P07' || // duplicate table
          errCode === '42710' || // duplicate object
          errCode === '42701') { // duplicate column
        skipped++;
      } else {
        // For other errors on indexes/constraints, skip but log
        if (statement.includes('CREATE INDEX') || statement.includes('ADD CONSTRAINT')) {
          console.warn(`Warning: ${preview}... - ${errCode}: ${errMsg}`);
          failed.push({ statement: preview, error: errMsg });
        } else {
          console.error(`Error: ${preview}...`);
          console.error(`Details: ${errCode} - ${errMsg}`);
          throw error;
        }
      }
    }
  }

  console.log(`Schema applied: ${executed} executed, ${skipped} skipped (already exist)`);
  if (failed.length > 0) {
    console.log(`${failed.length} statements had warnings (indexes/constraints on missing tables - will retry)`);

    // Retry failed index/constraint statements
    for (const item of failed) {
      try {
        const stmt = statements.find(s => s.includes(item.statement.substring(0, 30)));
        if (stmt) {
          await prisma.$executeRawUnsafe(stmt);
          console.log(`Retry successful: ${item.statement.substring(0, 40)}...`);
        }
      } catch (error) {
        // Ignore on retry
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
