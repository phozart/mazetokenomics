import prisma from '../prisma';
import { CHAINS, AUTO_CHECK_CONFIG } from '../constants';
import { getTokenSecurity, parseGoPlusChecks } from '../api/goplus';
import { getTokenPairs, parseDexScreenerData } from '../api/dexscreener';
import { getContractSource, getContractCreation, parseEtherscanChecks } from '../api/etherscan';
import { getRugCheckReport, parseRugCheckData } from '../api/rugcheck';
import { checkJupiterVerified } from '../api/jupiter';
import { verifySocialPresence } from '../api/social';
import { runHolderAnalysis } from '../api/holder-analysis';
import {
  calculateAutomaticScore,
  calculateOverallScore,
  determineRiskLevel,
  generateRedFlags,
  generateGreenFlags,
} from './scoring';

/**
 * Run all automated checks for a token
 * @param {string} vettingProcessId - Vetting process ID
 * @returns {Promise<Object>} Check results
 */
export async function runAutomatedChecks(vettingProcessId) {
  // Get the vetting process with token
  const vettingProcess = await prisma.vettingProcess.findUnique({
    where: { id: vettingProcessId },
    include: { token: true },
  });

  if (!vettingProcess) {
    throw new Error('Vetting process not found');
  }

  const { token } = vettingProcess;
  const chainConfig = CHAINS[token.chain];

  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${token.chain}`);
  }

  // Update status to running
  await prisma.vettingProcess.update({
    where: { id: vettingProcessId },
    data: {
      status: 'AUTO_RUNNING',
      startedAt: new Date(),
    },
  });

  const results = {
    goplus: null,
    dexscreener: null,
    etherscan: null,
    rugcheck: null,   // Solana-specific
    jupiter: null,    // Solana-specific
    social: null,     // Universal
    holderAnalysis: null, // Advanced holder analysis
    errors: [],
  };

  const isSolana = token.chain === 'SOLANA';

  // Run GoPlus security checks
  try {
    const goplusData = await getTokenSecurity(
      token.contractAddress,
      chainConfig.goplusChainId
    );
    results.goplus = parseGoPlusChecks(goplusData);

    // Update token info if available
    if (results.goplus?.tokenName && !token.name) {
      await prisma.token.update({
        where: { id: token.id },
        data: {
          name: results.goplus.tokenName,
          symbol: results.goplus.tokenSymbol,
        },
      });
    }
  } catch (error) {
    console.error('GoPlus check failed:', error);
    results.errors.push({ source: 'goplus', error: error.message });
  }

  // Run DEXScreener market checks
  try {
    const dexData = await getTokenPairs(token.contractAddress);
    results.dexscreener = parseDexScreenerData(dexData, token.contractAddress);
  } catch (error) {
    console.error('DEXScreener check failed:', error);
    results.errors.push({ source: 'dexscreener', error: error.message });
  }

  // Run Etherscan contract checks (skip for chains without Etherscan support like Solana)
  if (chainConfig.etherscanChainId) {
    try {
      const [sourceData, creationData] = await Promise.all([
        getContractSource(token.contractAddress, chainConfig.etherscanChainId),
        getContractCreation(token.contractAddress, chainConfig.etherscanChainId),
      ]);
      results.etherscan = parseEtherscanChecks(sourceData, creationData);
    } catch (error) {
      console.error('Etherscan check failed:', error);
      results.errors.push({ source: 'etherscan', error: error.message });
    }
  } else {
    // Mark Etherscan checks as skipped for chains without support
    results.etherscan = {
      checks: {
        CONTRACT_VERIFIED: { passed: null, value: null, details: 'Skipped - not supported on this chain' },
        CONTRACT_AGE: { passed: null, value: null, details: 'Skipped - not supported on this chain' },
        CREATOR_ANALYSIS: { passed: null, value: null, details: 'Skipped - not supported on this chain' },
      },
    };
  }

  // Run RugCheck for Solana tokens
  if (isSolana) {
    try {
      const rugcheckData = await getRugCheckReport(token.contractAddress);
      results.rugcheck = parseRugCheckData(rugcheckData);

      // Update token info if available from RugCheck
      if (results.rugcheck?.tokenInfo?.name && !token.name) {
        await prisma.token.update({
          where: { id: token.id },
          data: {
            name: results.rugcheck.tokenInfo.name,
            symbol: results.rugcheck.tokenInfo.symbol,
          },
        });
      }
    } catch (error) {
      console.error('RugCheck check failed:', error);
      results.errors.push({ source: 'rugcheck', error: error.message });
    }

    // Check Jupiter verified list for Solana
    try {
      const jupiterResult = await checkJupiterVerified(token.contractAddress);
      results.jupiter = {
        checks: {
          JUPITER_VERIFIED: {
            passed: jupiterResult.verified === true,
            value: jupiterResult.verified,
            details: jupiterResult.details,
            severity: 'HIGH',
          },
        },
      };
    } catch (error) {
      console.error('Jupiter check failed:', error);
      results.errors.push({ source: 'jupiter', error: error.message });
    }
  }

  // Social presence check (from DEXScreener data)
  if (results.dexscreener?.rawData) {
    try {
      results.social = verifySocialPresence(results.dexscreener.rawData);
    } catch (error) {
      console.error('Social check failed:', error);
      results.errors.push({ source: 'social', error: error.message });
    }
  }

  // Advanced holder analysis (wallet age, connections, wash trading)
  try {
    console.log('Running advanced holder analysis...');
    const holderAnalysisResults = await runHolderAnalysis(token.contractAddress, token.chain);
    results.holderAnalysis = {
      checks: {},
    };

    if (holderAnalysisResults.TOP_HOLDER_WALLET_AGE) {
      results.holderAnalysis.checks.TOP_HOLDER_WALLET_AGE = holderAnalysisResults.TOP_HOLDER_WALLET_AGE;
    }
    if (holderAnalysisResults.CONNECTED_WALLETS) {
      results.holderAnalysis.checks.CONNECTED_WALLETS = holderAnalysisResults.CONNECTED_WALLETS;
    }
    if (holderAnalysisResults.WASH_TRADING_DETECTION) {
      results.holderAnalysis.checks.WASH_TRADING_DETECTION = holderAnalysisResults.WASH_TRADING_DETECTION;
    }

    if (holderAnalysisResults.errors?.length > 0) {
      for (const err of holderAnalysisResults.errors) {
        results.errors.push({ source: 'holder_analysis', check: err.check, error: err.error });
      }
    }
  } catch (error) {
    console.error('Holder analysis failed:', error);
    results.errors.push({ source: 'holder_analysis', error: error.message });
  }

  // Save all automatic checks to database
  const checksToCreate = [];

  // GoPlus checks
  if (results.goplus?.checks) {
    for (const [checkType, checkData] of Object.entries(results.goplus.checks)) {
      const config = AUTO_CHECK_CONFIG[checkType];
      if (!config) continue;

      checksToCreate.push({
        vettingProcessId,
        checkType,
        status: 'COMPLETED',
        passed: checkData.passed,
        score: checkData.passed ? 100 : 0,
        severity: config.severity,
        details: checkData.details,
        rawData: { value: checkData.value },
        checkedAt: new Date(),
      });
    }
  }

  // DEXScreener checks
  if (results.dexscreener?.checks) {
    for (const [checkType, checkData] of Object.entries(results.dexscreener.checks)) {
      const config = AUTO_CHECK_CONFIG[checkType];
      if (!config) continue;

      checksToCreate.push({
        vettingProcessId,
        checkType,
        status: 'COMPLETED',
        passed: checkData.passed,
        score: checkData.passed ? 100 : 0,
        severity: config.severity,
        details: checkData.details,
        rawData: { value: checkData.value },
        checkedAt: new Date(),
      });
    }
  }

  // Etherscan checks
  if (results.etherscan?.checks) {
    for (const [checkType, checkData] of Object.entries(results.etherscan.checks)) {
      const config = AUTO_CHECK_CONFIG[checkType];
      if (!config) continue;

      // Handle skipped checks (e.g., Solana doesn't have Etherscan)
      const isSkipped = checkData.passed === null;
      checksToCreate.push({
        vettingProcessId,
        checkType,
        status: isSkipped ? 'SKIPPED' : 'COMPLETED',
        passed: checkData.passed,
        score: isSkipped ? null : (checkData.passed ? 100 : 0),
        severity: config.severity,
        details: checkData.details,
        rawData: { value: checkData.value },
        checkedAt: new Date(),
      });
    }
  }

  // RugCheck checks (Solana only)
  if (results.rugcheck?.checks) {
    for (const [checkType, checkData] of Object.entries(results.rugcheck.checks)) {
      const config = AUTO_CHECK_CONFIG[checkType];
      if (!config) continue;

      checksToCreate.push({
        vettingProcessId,
        checkType,
        status: 'COMPLETED',
        passed: checkData.passed,
        score: checkData.passed ? 100 : 0,
        severity: checkData.severity || config.severity,
        details: checkData.details,
        rawData: { value: checkData.value },
        checkedAt: new Date(),
      });
    }
  }

  // Jupiter checks (Solana only)
  if (results.jupiter?.checks) {
    for (const [checkType, checkData] of Object.entries(results.jupiter.checks)) {
      const config = AUTO_CHECK_CONFIG[checkType];
      if (!config) continue;

      checksToCreate.push({
        vettingProcessId,
        checkType,
        status: 'COMPLETED',
        passed: checkData.passed,
        score: checkData.passed ? 100 : 0,
        severity: checkData.severity || config.severity,
        details: checkData.details,
        rawData: { value: checkData.value },
        checkedAt: new Date(),
      });
    }
  }

  // Social presence checks
  if (results.social?.checks) {
    for (const [checkType, checkData] of Object.entries(results.social.checks)) {
      const config = AUTO_CHECK_CONFIG[checkType];
      if (!config) continue;

      checksToCreate.push({
        vettingProcessId,
        checkType,
        status: 'COMPLETED',
        passed: checkData.passed,
        score: checkData.passed ? 100 : 0,
        severity: checkData.severity || config.severity,
        details: checkData.details,
        rawData: { value: checkData.value },
        checkedAt: new Date(),
      });
    }
  }

  // Advanced holder analysis checks
  if (results.holderAnalysis?.checks) {
    for (const [checkType, checkData] of Object.entries(results.holderAnalysis.checks)) {
      const config = AUTO_CHECK_CONFIG[checkType];
      if (!config) continue;

      // Handle null passed values (unable to analyze)
      const isSkipped = checkData.passed === null;
      checksToCreate.push({
        vettingProcessId,
        checkType,
        status: isSkipped ? 'SKIPPED' : 'COMPLETED',
        passed: checkData.passed,
        score: isSkipped ? null : (checkData.passed ? 100 : 0),
        severity: checkData.severity || config.severity,
        details: checkData.details,
        rawData: checkData.rawData ? { value: checkData.value, ...checkData.rawData } : { value: checkData.value },
        checkedAt: new Date(),
      });
    }
  }

  // Add failed checks for any errors
  for (const errorInfo of results.errors) {
    const failedCheckTypes = getCheckTypesForSource(errorInfo.source);
    for (const checkType of failedCheckTypes) {
      const config = AUTO_CHECK_CONFIG[checkType];
      if (!config) continue;

      // Only add if not already in list
      if (!checksToCreate.find(c => c.checkType === checkType)) {
        checksToCreate.push({
          vettingProcessId,
          checkType,
          status: 'FAILED',
          passed: null,
          score: null,
          severity: config.severity,
          details: `Check failed: ${errorInfo.error}`,
          rawData: null,
          checkedAt: new Date(),
        });
      }
    }
  }

  // Upsert all checks
  for (const check of checksToCreate) {
    await prisma.automaticCheck.upsert({
      where: {
        vettingProcessId_checkType: {
          vettingProcessId: check.vettingProcessId,
          checkType: check.checkType,
        },
      },
      create: check,
      update: check,
    });
  }

  // Get all checks for scoring
  const allChecks = await prisma.automaticCheck.findMany({
    where: { vettingProcessId },
  });

  // Calculate automatic score
  const automaticScore = calculateAutomaticScore(allChecks);

  // Get existing manual checks for overall score
  const manualChecks = await prisma.manualCheck.findMany({
    where: { vettingProcessId },
  });

  // Calculate overall score
  const manualScore = manualChecks.length > 0 ? calculateAutomaticScore(manualChecks) : null;
  const overallScore = calculateOverallScore(automaticScore, manualScore);
  const riskLevel = determineRiskLevel(overallScore || automaticScore);

  // Generate flags
  const redFlags = generateRedFlags(allChecks, manualChecks);
  const greenFlags = generateGreenFlags(allChecks, manualChecks);

  // Update vetting process
  await prisma.vettingProcess.update({
    where: { id: vettingProcessId },
    data: {
      status: 'AUTO_COMPLETE',
      automaticScore,
      overallScore,
      riskLevel,
    },
  });

  // Clear ALL old flags before saving new ones (prevents duplicates on re-run)
  // This ensures a clean slate - both automatic and manual flags are regenerated fresh
  await prisma.redFlag.deleteMany({
    where: { vettingProcessId },
  });
  await prisma.greenFlag.deleteMany({
    where: { vettingProcessId },
  });

  // Save all flags (both automatic and manual)
  if (redFlags.length > 0) {
    await prisma.redFlag.createMany({
      data: redFlags.map(flag => ({
        vettingProcessId,
        flag: flag.flag,
        severity: flag.severity,
        source: flag.source,
        checkType: flag.checkType,
      })),
    });
  }

  // Save all green flags (both automatic and manual)
  if (greenFlags.length > 0) {
    await prisma.greenFlag.createMany({
      data: greenFlags.map(flag => ({
        vettingProcessId,
        flag: flag.flag,
        source: flag.source,
      })),
    });
  }

  // Log activity
  await prisma.activity.create({
    data: {
      vettingProcessId,
      action: 'AUTOMATED_CHECKS_COMPLETED',
      details: {
        automaticScore,
        checksRun: checksToCreate.length,
        checksPassed: checksToCreate.filter(c => c.passed).length,
        errors: results.errors,
      },
    },
  });

  return {
    automaticScore,
    overallScore,
    riskLevel,
    checks: allChecks,
    redFlags,
    greenFlags,
    errors: results.errors,
  };
}

/**
 * Get check types for a specific API source
 */
function getCheckTypesForSource(source) {
  return Object.entries(AUTO_CHECK_CONFIG)
    .filter(([_, config]) => config.source === source)
    .map(([checkType]) => checkType);
}
