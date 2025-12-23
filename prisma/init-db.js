const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function initDatabase() {
  console.log('Initializing database...');

  // Check if tables exist by trying a simple query
  try {
    await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
    console.log('Database tables already exist');
    return true;
  } catch (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      console.log('Tables do not exist, creating schema...');
    } else {
      throw error;
    }
  }

  // Create all tables using raw SQL
  await prisma.$executeRawUnsafe(`
    -- Create enums
    DO $$ BEGIN
      CREATE TYPE "Chain" AS ENUM ('ETHEREUM', 'BSC', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BASE', 'SOLANA', 'AVALANCHE', 'FANTOM', 'CRONOS', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "VettingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ON_HOLD');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "RiskLevel" AS ENUM ('SAFE', 'LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'CRITICAL');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "CheckCategory" AS ENUM ('CONTRACT', 'HOLDER', 'LIQUIDITY', 'SOCIAL', 'MARKET', 'TEAM', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "CheckStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'WARNING', 'ERROR', 'SKIPPED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'VIEWER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  // Create User table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "name" TEXT,
      "password" TEXT NOT NULL,
      "role" "Role" NOT NULL DEFAULT 'USER',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Token table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Token" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "contractAddress" TEXT NOT NULL,
      "chain" "Chain" NOT NULL,
      "name" TEXT,
      "symbol" TEXT,
      "decimals" INTEGER,
      "totalSupply" TEXT,
      "website" TEXT,
      "twitter" TEXT,
      "telegram" TEXT,
      "discord" TEXT,
      "description" TEXT,
      "logoUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Token_contractAddress_chain_key" ON "Token"("contractAddress", "chain");
  `);

  // Create VettingProcess table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VettingProcess" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tokenId" TEXT NOT NULL UNIQUE REFERENCES "Token"("id") ON DELETE CASCADE,
      "status" "VettingStatus" NOT NULL DEFAULT 'PENDING',
      "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
      "assignedTo" TEXT,
      "startedAt" TIMESTAMP(3),
      "completedAt" TIMESTAMP(3),
      "automaticScore" DOUBLE PRECISION,
      "manualScore" DOUBLE PRECISION,
      "overallScore" DOUBLE PRECISION,
      "riskLevel" "RiskLevel",
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create AutomatedCheck table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AutomatedCheck" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "vettingId" TEXT NOT NULL REFERENCES "VettingProcess"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "category" "CheckCategory" NOT NULL,
      "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
      "result" JSONB,
      "score" DOUBLE PRECISION,
      "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "message" TEXT,
      "executedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "AutomatedCheck_vettingId_idx" ON "AutomatedCheck"("vettingId");
  `);

  // Create ManualCheck table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ManualCheck" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "vettingId" TEXT NOT NULL REFERENCES "VettingProcess"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "category" "CheckCategory" NOT NULL,
      "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
      "score" DOUBLE PRECISION,
      "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "notes" TEXT,
      "checkedBy" TEXT,
      "checkedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ManualCheck_vettingId_idx" ON "ManualCheck"("vettingId");
  `);

  // Create HolderAnalysis table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HolderAnalysis" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "vettingId" TEXT NOT NULL UNIQUE REFERENCES "VettingProcess"("id") ON DELETE CASCADE,
      "totalHolders" INTEGER,
      "top10HoldersPercent" DOUBLE PRECISION,
      "top20HoldersPercent" DOUBLE PRECISION,
      "top50HoldersPercent" DOUBLE PRECISION,
      "top100HoldersPercent" DOUBLE PRECISION,
      "holderDistribution" JSONB,
      "topHolders" JSONB,
      "analyzedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create WatchlistItem table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WatchlistItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "tokenId" TEXT REFERENCES "Token"("id") ON DELETE CASCADE,
      "contractAddress" TEXT,
      "chain" "Chain",
      "symbol" TEXT,
      "name" TEXT,
      "notes" TEXT,
      "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");
  `);

  console.log('Database schema created successfully!');
  return false;
}

async function seedDatabase() {
  console.log('Seeding database...');

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
      id: require('crypto').randomUUID().replace(/-/g, '').slice(0, 25),
      email: 'maze',
      name: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('Created admin user: maze');
  console.log('Database seeded successfully!');
}

async function main() {
  try {
    await initDatabase();
    await seedDatabase();
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
