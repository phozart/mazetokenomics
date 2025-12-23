// RugCheck.xyz API Client - Solana Token Security
// Documentation: https://api.rugcheck.xyz/swagger/index.html

const RUGCHECK_BASE_URL = 'https://api.rugcheck.xyz/v1';

/**
 * Get token security report from RugCheck (Solana only)
 * @param {string} mintAddress - Solana token mint address
 * @returns {Promise<Object>} Security report
 */
export async function getRugCheckReport(mintAddress) {
  try {
    const url = `${RUGCHECK_BASE_URL}/tokens/${mintAddress}/report`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Token not found
      }
      throw new Error(`RugCheck API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('RugCheck API error:', error);
    throw error;
  }
}

/**
 * Get token summary from RugCheck
 * @param {string} mintAddress - Solana token mint address
 * @returns {Promise<Object>} Token summary
 */
export async function getRugCheckSummary(mintAddress) {
  try {
    const url = `${RUGCHECK_BASE_URL}/tokens/${mintAddress}/report/summary`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`RugCheck API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('RugCheck API error:', error);
    throw error;
  }
}

/**
 * Parse RugCheck response into structured security checks
 * @param {Object} rugcheckData - Raw RugCheck API response
 * @returns {Object} Structured check results
 */
export function parseRugCheckData(rugcheckData) {
  if (!rugcheckData) return null;

  const risks = rugcheckData.risks || [];
  const riskMap = {};
  risks.forEach(risk => {
    riskMap[risk.name] = risk;
  });

  // Get token info
  const tokenMeta = rugcheckData.tokenMeta || {};
  const markets = rugcheckData.markets || [];
  const topHolders = rugcheckData.topHolders || [];

  // Calculate total LP value
  const totalLpUsd = markets.reduce((sum, m) => sum + (m.lp?.lpLockedUSD || 0), 0);
  const totalLpLocked = markets.reduce((sum, m) => sum + (m.lp?.lpLockedPct || 0), 0) / Math.max(markets.length, 1);

  // Calculate top holder concentration
  const top10Holdings = topHolders.slice(0, 10).reduce((sum, h) => sum + (h.pct || 0), 0);

  const checks = {
    // Mint Authority - can more tokens be created?
    MINT_AUTHORITY: {
      passed: rugcheckData.mintAuthority === null,
      value: rugcheckData.mintAuthority,
      details: rugcheckData.mintAuthority === null
        ? 'Mint authority revoked - no new tokens can be created'
        : `Mint authority active: ${formatAddress(rugcheckData.mintAuthority)}`,
      severity: 'CRITICAL',
    },

    // Freeze Authority - can tokens be frozen?
    FREEZE_AUTHORITY: {
      passed: rugcheckData.freezeAuthority === null,
      value: rugcheckData.freezeAuthority,
      details: rugcheckData.freezeAuthority === null
        ? 'Freeze authority revoked - tokens cannot be frozen'
        : `Freeze authority active: ${formatAddress(rugcheckData.freezeAuthority)}`,
      severity: 'HIGH',
    },

    // LP Status
    LP_LOCKED: {
      passed: totalLpLocked >= 80,
      value: totalLpLocked,
      details: `${totalLpLocked.toFixed(1)}% of LP locked ($${formatNumber(totalLpUsd)})`,
      severity: 'HIGH',
    },

    // Top Holder Concentration
    TOP_HOLDER_CONCENTRATION: {
      passed: top10Holdings <= 50,
      value: top10Holdings,
      details: `Top 10 holders own ${top10Holdings.toFixed(1)}% of supply`,
      severity: 'HIGH',
    },

    // Mutable Metadata
    MUTABLE_METADATA: {
      passed: !tokenMeta.mutable,
      value: tokenMeta.mutable,
      details: tokenMeta.mutable
        ? 'Token metadata is mutable - can be changed'
        : 'Token metadata is immutable',
      severity: 'MEDIUM',
    },

    // Overall Risk Score from RugCheck
    RUGCHECK_SCORE: {
      passed: rugcheckData.score >= 500, // RugCheck uses 0-1000 scale, higher is safer
      value: rugcheckData.score,
      details: `RugCheck score: ${rugcheckData.score}/1000 (${getRiskLabel(rugcheckData.score)})`,
      severity: 'CRITICAL',
    },
  };

  // Add any specific risks flagged by RugCheck
  const flaggedRisks = risks.filter(r => r.level === 'danger' || r.level === 'warn');

  return {
    checks,
    score: rugcheckData.score,
    riskLevel: rugcheckData.score >= 700 ? 'Good' : rugcheckData.score >= 400 ? 'Moderate' : 'Risky',
    risks: flaggedRisks,
    tokenInfo: {
      name: tokenMeta.name,
      symbol: tokenMeta.symbol,
      decimals: rugcheckData.decimals,
      supply: rugcheckData.supply,
      mintAuthority: rugcheckData.mintAuthority,
      freezeAuthority: rugcheckData.freezeAuthority,
    },
    markets: markets.map(m => ({
      marketType: m.marketType,
      lpLocked: m.lp?.lpLockedPct,
      lpLockedUsd: m.lp?.lpLockedUSD,
    })),
    topHolders: topHolders.slice(0, 10).map(h => ({
      address: h.address,
      pct: h.pct,
      isInsider: h.insider,
    })),
    rawData: rugcheckData,
  };
}

// Helper functions
function formatAddress(address) {
  if (!address) return 'N/A';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toFixed(2);
}

function getRiskLabel(score) {
  if (score >= 700) return 'Good';
  if (score >= 500) return 'Moderate';
  if (score >= 300) return 'Risky';
  return 'High Risk';
}
