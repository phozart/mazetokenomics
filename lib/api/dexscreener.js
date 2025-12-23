// DEXScreener API Client
// Documentation: https://docs.dexscreener.com/api/reference

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com';

/**
 * Get token pairs from DEXScreener
 * @param {string} address - Token contract address
 * @returns {Promise<Object>} Token pairs data
 */
export async function getTokenPairs(address) {
  try {
    const url = `${DEXSCREENER_BASE_URL}/latest/dex/tokens/${address}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DEXScreener API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('DEXScreener API error:', error);
    throw error;
  }
}

/**
 * Get specific pair data from DEXScreener
 * @param {string} chain - Chain identifier (e.g., 'ethereum')
 * @param {string} pairAddress - Pair contract address
 * @returns {Promise<Object>} Pair data
 */
export async function getPairData(chain, pairAddress) {
  try {
    const url = `${DEXSCREENER_BASE_URL}/latest/dex/pairs/${chain}/${pairAddress}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DEXScreener API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('DEXScreener API error:', error);
    throw error;
  }
}

/**
 * Parse DEXScreener response into structured market data
 * @param {Object} dexData - Raw DEXScreener API response
 * @param {string} tokenAddress - The token address we searched for (to filter relevant pairs)
 * @returns {Object} Structured market data
 */
export function parseDexScreenerData(dexData, tokenAddress) {
  if (!dexData || !dexData.pairs || dexData.pairs.length === 0) {
    return null;
  }

  // Filter to only pairs where the searched token is the BASE token
  // This gives accurate liquidity for the token we're analyzing
  const normalizedAddress = tokenAddress?.toLowerCase();
  const relevantPairs = dexData.pairs.filter(pair => {
    const baseAddress = pair.baseToken?.address?.toLowerCase();
    return baseAddress === normalizedAddress;
  });

  // If no pairs have this token as base, fall back to all pairs (shouldn't happen normally)
  const pairsToUse = relevantPairs.length > 0 ? relevantPairs : dexData.pairs;

  // Get the pair with highest liquidity
  const pairs = pairsToUse.sort((a, b) => {
    const liquidityA = parseFloat(a.liquidity?.usd || '0');
    const liquidityB = parseFloat(b.liquidity?.usd || '0');
    return liquidityB - liquidityA;
  });

  const mainPair = pairs[0];

  // Aggregate data across pairs where token is the base token
  const totalLiquidity = pairs.reduce((sum, pair) => {
    return sum + parseFloat(pair.liquidity?.usd || '0');
  }, 0);

  const totalVolume24h = pairs.reduce((sum, pair) => {
    return sum + parseFloat(pair.volume?.h24 || '0');
  }, 0);

  const checks = {
    // Liquidity depth
    LIQUIDITY_DEPTH: {
      passed: totalLiquidity >= 10000,
      value: totalLiquidity,
      details: `Total liquidity: $${formatNumber(totalLiquidity)}`,
    },

    // 24h trading volume
    TRADING_VOLUME_24H: {
      passed: totalVolume24h >= 1000,
      value: totalVolume24h,
      details: `24h volume: $${formatNumber(totalVolume24h)}`,
    },

    // Price impact (estimated from liquidity)
    PRICE_IMPACT: {
      passed: totalLiquidity >= 50000, // Low impact if high liquidity
      value: totalLiquidity < 10000 ? 'High' : totalLiquidity < 50000 ? 'Medium' : 'Low',
      details: totalLiquidity < 10000
        ? 'High price impact - low liquidity'
        : totalLiquidity < 50000
          ? 'Medium price impact'
          : 'Low price impact - good liquidity',
    },
  };

  // Calculate market score
  const passedChecks = Object.values(checks).filter(c => c.passed).length;
  const totalChecks = Object.keys(checks).length;
  const score = (passedChecks / totalChecks) * 100;

  return {
    checks,
    score,
    rawData: dexData,
    mainPair: {
      dex: mainPair.dexId,
      pairAddress: mainPair.pairAddress,
      baseToken: mainPair.baseToken,
      quoteToken: mainPair.quoteToken,
      priceUsd: mainPair.priceUsd,
      priceNative: mainPair.priceNative,
    },
    aggregated: {
      totalLiquidity,
      totalVolume24h,
      pairCount: pairs.length,
      priceUsd: mainPair.priceUsd,
      priceChange24h: mainPair.priceChange?.h24,
      priceChange1h: mainPair.priceChange?.h1,
      txns24h: {
        buys: pairs.reduce((sum, p) => sum + (p.txns?.h24?.buys || 0), 0),
        sells: pairs.reduce((sum, p) => sum + (p.txns?.h24?.sells || 0), 0),
      },
    },
    chains: [...new Set(pairs.map(p => p.chainId))],
    dexes: [...new Set(pairs.map(p => p.dexId))],
  };
}

// Helper to format numbers
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}
