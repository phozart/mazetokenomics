// Jupiter API Client - Solana Token Verification
// Documentation: https://station.jup.ag/docs/apis/token-list-api

const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag';

// Cache for verified tokens (refreshed every 5 minutes)
let verifiedTokensCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get Jupiter's verified token list
 * @returns {Promise<Set<string>>} Set of verified token addresses
 */
async function getVerifiedTokens() {
  // Return cached if fresh
  if (verifiedTokensCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return verifiedTokensCache;
  }

  try {
    const response = await fetch(`${JUPITER_TOKEN_LIST_URL}/strict`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const tokens = await response.json();
    verifiedTokensCache = new Set(tokens.map(t => t.address));
    cacheTimestamp = Date.now();

    return verifiedTokensCache;
  } catch (error) {
    console.error('Jupiter API error:', error);
    throw error;
  }
}

/**
 * Check if token is on Jupiter's verified list
 * @param {string} address - Token mint address
 * @returns {Promise<Object>} Verification result
 */
export async function checkJupiterVerified(address) {
  try {
    const verifiedTokens = await getVerifiedTokens();
    const isVerified = verifiedTokens.has(address);

    return {
      verified: isVerified,
      details: isVerified
        ? 'Token is on Jupiter verified list'
        : 'Token is NOT on Jupiter verified list',
    };
  } catch (error) {
    console.error('Jupiter verification check failed:', error);
    return {
      verified: null,
      details: 'Could not verify Jupiter listing status',
      error: error.message,
    };
  }
}

/**
 * Get token info from Jupiter
 * @param {string} address - Token mint address
 * @returns {Promise<Object>} Token info
 */
export async function getJupiterTokenInfo(address) {
  try {
    const response = await fetch(`${JUPITER_TOKEN_LIST_URL}/all`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const tokens = await response.json();
    const token = tokens.find(t => t.address === address);

    return token || null;
  } catch (error) {
    console.error('Jupiter token info error:', error);
    throw error;
  }
}

/**
 * Get token price (uses Jupiter if API key set, otherwise DexScreener)
 * @param {string} address - Token mint address
 * @returns {Promise<Object>} Price info
 */
export async function getJupiterPrice(address) {
  const JUPITER_API_KEY = process.env.JUPITER_API_KEY;

  // Try Jupiter first if we have API key
  if (JUPITER_API_KEY) {
    try {
      const response = await fetch(`https://api.jup.ag/price/v2?ids=${address}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': JUPITER_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.[address]) {
          return data.data[address];
        }
      }
    } catch (error) {
      console.error('Jupiter price error, falling back to DexScreener:', error);
    }
  }

  // Fallback to DexScreener (free, no auth)
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.pairs?.length > 0) {
      const sortedPairs = data.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
      const bestPair = sortedPairs[0];
      return {
        id: address,
        price: parseFloat(bestPair.priceUsd || 0),
        mintSymbol: bestPair.baseToken?.symbol,
      };
    }
    return null;
  } catch (error) {
    console.error('Price fetch error:', error);
    throw error;
  }
}
