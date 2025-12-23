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
 * Get Jupiter price for token
 * @param {string} address - Token mint address
 * @returns {Promise<Object>} Price info
 */
export async function getJupiterPrice(address) {
  try {
    const response = await fetch(`https://price.jup.ag/v6/price?ids=${address}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Jupiter Price API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data?.[address] || null;
  } catch (error) {
    console.error('Jupiter price error:', error);
    throw error;
  }
}
