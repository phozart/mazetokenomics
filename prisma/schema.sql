-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'VIEWER');

-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('ETHEREUM', 'BSC', 'POLYGON', 'ARBITRUM', 'BASE', 'OPTIMISM', 'AVALANCHE', 'SOLANA');

-- CreateEnum
CREATE TYPE "VettingStatus" AS ENUM ('PENDING', 'AUTO_RUNNING', 'AUTO_COMPLETE', 'IN_REVIEW', 'REVIEW_COMPLETE', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXTREME');

-- CreateEnum
CREATE TYPE "AutoCheckType" AS ENUM ('HONEYPOT_DETECTION', 'BUY_TAX_ANALYSIS', 'SELL_TAX_ANALYSIS', 'MINT_FUNCTION', 'PROXY_CONTRACT', 'OWNER_CHANGE_CAPABILITY', 'TRADING_COOLDOWN', 'BLACKLIST_FUNCTION', 'HIDDEN_OWNER', 'EXTERNAL_CALL_RISK', 'CONTRACT_VERIFIED', 'CONTRACT_AGE', 'CREATOR_ANALYSIS', 'LIQUIDITY_DEPTH', 'TRADING_VOLUME_24H', 'PRICE_IMPACT', 'HOLDER_COUNT', 'TOP_HOLDER_CONCENTRATION', 'WHALE_DISTRIBUTION', 'MINT_AUTHORITY', 'FREEZE_AUTHORITY', 'LP_LOCKED', 'MUTABLE_METADATA', 'RUGCHECK_SCORE', 'JUPITER_VERIFIED', 'HAS_TWITTER', 'HAS_TELEGRAM', 'HAS_WEBSITE', 'SOCIAL_SCORE', 'TOP_HOLDER_WALLET_AGE', 'CONNECTED_WALLETS', 'WASH_TRADING_DETECTION', 'GINI_COEFFICIENT', 'NAKAMOTO_COEFFICIENT', 'EFFECTIVE_HOLDER_COUNT', 'SYBIL_SCORE', 'INSIDER_SCORE', 'EXIT_RISK_SCORE', 'SMART_MONEY_RATIO', 'COORDINATED_BUYING', 'SNIPER_ACTIVITY', 'HOLDING_DURATIONS', 'FUNDING_CHAIN_DEPTH');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ManualCheckType" AS ENUM ('TEAM_KYC', 'AUDIT_REVIEW', 'TOKENOMICS_ANALYSIS', 'WHITEPAPER_REVIEW', 'ROADMAP_ASSESSMENT', 'COMMUNITY_ANALYSIS', 'PARTNERSHIP_VERIFICATION', 'LEGAL_COMPLIANCE', 'LIQUIDITY_LOCK_VERIFY', 'HISTORICAL_BEHAVIOR');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('MANUAL_CHECK_REVIEW', 'FINAL_APPROVAL', 'ESCALATION');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'ESCALATE');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('INDIVIDUAL', 'EXCHANGE', 'INSTITUTION', 'FOUNDATION', 'CONTRACT', 'DEX', 'MIXER', 'UNKNOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "name" TEXT,
    "symbol" TEXT,
    "decimals" INTEGER,
    "totalSupply" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VettingProcess" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "status" "VettingStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "automaticScore" DOUBLE PRECISION,
    "manualScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "riskLevel" "RiskLevel",
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VettingProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomaticCheck" (
    "id" TEXT NOT NULL,
    "vettingProcessId" TEXT NOT NULL,
    "checkType" "AutoCheckType" NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
    "passed" BOOLEAN,
    "score" DOUBLE PRECISION,
    "severity" "Severity" NOT NULL,
    "rawData" JSONB,
    "details" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomaticCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualCheck" (
    "id" TEXT NOT NULL,
    "vettingProcessId" TEXT NOT NULL,
    "checkType" "ManualCheckType" NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
    "passed" BOOLEAN,
    "score" DOUBLE PRECISION,
    "severity" "Severity" NOT NULL,
    "notes" TEXT,
    "evidenceUrls" TEXT[],
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "vettingProcessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkTypes" "ManualCheckType"[],
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "vettingProcessId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "type" "ReviewType" NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedFlag" (
    "id" TEXT NOT NULL,
    "vettingProcessId" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "source" TEXT NOT NULL,
    "checkType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GreenFlag" (
    "id" TEXT NOT NULL,
    "vettingProcessId" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GreenFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "vettingProcessId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolderAnalysis" (
    "id" TEXT NOT NULL,
    "vettingProcessId" TEXT NOT NULL,
    "giniCoefficient" DOUBLE PRECISION,
    "nakamotoCoefficient" INTEGER,
    "effectiveHolders" INTEGER,
    "top10Percent" DOUBLE PRECISION,
    "top50Percent" DOUBLE PRECISION,
    "top100Percent" DOUBLE PRECISION,
    "sybilScore" DOUBLE PRECISION,
    "insiderScore" DOUBLE PRECISION,
    "exitRiskScore" DOUBLE PRECISION,
    "smartMoneyRatio" DOUBLE PRECISION,
    "coordinatedBuyingPct" DOUBLE PRECISION,
    "sniperWalletCount" INTEGER,
    "avgHoldingDuration" DOUBLE PRECISION,
    "diamondHandsRatio" DOUBLE PRECISION,
    "paperHandsRatio" DOUBLE PRECISION,
    "clusterCount" INTEGER,
    "suspiciousClusterCount" INTEGER,
    "largestClusterSize" INTEGER,
    "graphDensity" DOUBLE PRECISION,
    "hubWalletCount" INTEGER,
    "fundingGraph" JSONB,
    "clusters" JSONB,
    "topHoldersDetailed" JSONB,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolderAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTrace" (
    "id" TEXT NOT NULL,
    "holderAnalysisId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "label" TEXT,
    "walletType" "WalletType" NOT NULL DEFAULT 'UNKNOWN',
    "balance" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "rank" INTEGER,
    "firstTxDate" TIMESTAMP(3),
    "ageInDays" INTEGER,
    "fundingChain" JSONB,
    "fundingDepth" INTEGER,
    "primaryFundingSource" TEXT,
    "fundingSourceType" TEXT,
    "clusterId" TEXT,
    "riskFlags" JSONB,
    "riskFlagCount" INTEGER NOT NULL DEFAULT 0,
    "hasCriticalFlag" BOOLEAN NOT NULL DEFAULT false,
    "knownScamAssociation" BOOLEAN NOT NULL DEFAULT false,
    "smartMoneyScore" DOUBLE PRECISION,
    "historicalRugPulls" INTEGER NOT NULL DEFAULT 0,
    "transactionCount" INTEGER,
    "avgTradeSize" DOUBLE PRECISION,
    "preferredDexes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenId" TEXT,
    "contractAddress" TEXT,
    "chain" "Chain",
    "symbol" TEXT,
    "name" TEXT,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Token_contractAddress_chain_key" ON "Token"("contractAddress", "chain");

-- CreateIndex
CREATE UNIQUE INDEX "VettingProcess_tokenId_key" ON "VettingProcess"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomaticCheck_vettingProcessId_checkType_key" ON "AutomaticCheck"("vettingProcessId", "checkType");

-- CreateIndex
CREATE UNIQUE INDEX "ManualCheck_vettingProcessId_checkType_key" ON "ManualCheck"("vettingProcessId", "checkType");

-- CreateIndex
CREATE UNIQUE INDEX "HolderAnalysis_vettingProcessId_key" ON "HolderAnalysis"("vettingProcessId");

-- CreateIndex
CREATE INDEX "WalletTrace_holderAnalysisId_idx" ON "WalletTrace"("holderAnalysisId");

-- CreateIndex
CREATE INDEX "WalletTrace_walletAddress_chain_idx" ON "WalletTrace"("walletAddress", "chain");

-- CreateIndex
CREATE INDEX "WalletTrace_clusterId_idx" ON "WalletTrace"("clusterId");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_tokenId_key" ON "WatchlistItem"("userId", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_contractAddress_chain_key" ON "WatchlistItem"("userId", "contractAddress", "chain");

-- AddForeignKey
ALTER TABLE "VettingProcess" ADD CONSTRAINT "VettingProcess_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomaticCheck" ADD CONSTRAINT "AutomaticCheck_vettingProcessId_fkey" FOREIGN KEY ("vettingProcessId") REFERENCES "VettingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualCheck" ADD CONSTRAINT "ManualCheck_vettingProcessId_fkey" FOREIGN KEY ("vettingProcessId") REFERENCES "VettingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualCheck" ADD CONSTRAINT "ManualCheck_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_vettingProcessId_fkey" FOREIGN KEY ("vettingProcessId") REFERENCES "VettingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_vettingProcessId_fkey" FOREIGN KEY ("vettingProcessId") REFERENCES "VettingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlag" ADD CONSTRAINT "RedFlag_vettingProcessId_fkey" FOREIGN KEY ("vettingProcessId") REFERENCES "VettingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreenFlag" ADD CONSTRAINT "GreenFlag_vettingProcessId_fkey" FOREIGN KEY ("vettingProcessId") REFERENCES "VettingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_vettingProcessId_fkey" FOREIGN KEY ("vettingProcessId") REFERENCES "VettingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolderAnalysis" ADD CONSTRAINT "HolderAnalysis_vettingProcessId_fkey" FOREIGN KEY ("vettingProcessId") REFERENCES "VettingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTrace" ADD CONSTRAINT "WalletTrace_holderAnalysisId_fkey" FOREIGN KEY ("holderAnalysisId") REFERENCES "HolderAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

