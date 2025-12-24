// Token List Utilities
import { SOL_MINT, USDC_MINT } from './client';

// Use Solana Labs token list (reliable CDN)
const TOKEN_LIST_URL = 'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json';

// Popular tokens for quick selection
export const POPULAR_TOKENS = [
  {
    address: SOL_MINT,
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  {
    address: USDC_MINT,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  {
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
  },
  {
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
  },
  {
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter',
    decimals: 6,
    logoURI: 'https://static.jup.ag/jup/icon.png',
  },
  {
    address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
    symbol: 'WETH',
    name: 'Wrapped Ether (Wormhole)',
    decimals: 8,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs/logo.png',
  },
];

// Token list cache
let tokenListCache = null;
let tokenListCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch verified Solana token list
 * @returns {Promise<Array>} Token list
 */
export async function fetchTokenList() {
  const now = Date.now();

  // Return cached list if fresh
  if (tokenListCache && now - tokenListCacheTime < CACHE_DURATION) {
    return tokenListCache;
  }

  const response = await fetch(TOKEN_LIST_URL);

  if (!response.ok) {
    throw new Error('Failed to fetch token list');
  }

  const data = await response.json();
  // Filter for Solana mainnet tokens
  tokenListCache = (data.tokens || []).filter(t => t.chainId === 101);
  tokenListCacheTime = now;

  return tokenListCache;
}

/**
 * Search tokens by query
 * @param {string} query - Search query (symbol, name, or address)
 * @param {Array} tokens - Token list to search
 * @returns {Array} Matching tokens
 */
export function searchTokens(query, tokens) {
  if (!query || !tokens) return [];

  const normalizedQuery = query.toLowerCase().trim();

  // Check if query is an address (44 chars for Solana)
  if (normalizedQuery.length >= 32) {
    return tokens.filter(t =>
      t.address.toLowerCase() === normalizedQuery
    );
  }

  return tokens.filter(t =>
    t.symbol?.toLowerCase().includes(normalizedQuery) ||
    t.name?.toLowerCase().includes(normalizedQuery)
  ).slice(0, 20); // Limit results
}

/**
 * Get token by address
 * @param {string} address - Token mint address
 * @param {Array} tokens - Token list to search
 * @returns {Object|null} Token or null
 */
export function getTokenByAddress(address, tokens) {
  return tokens?.find(t => t.address === address) || null;
}

/**
 * Format token balance for display
 * @param {number} balance - Raw balance
 * @param {number} decimals - Token decimals
 * @param {number} displayDecimals - Decimals to show
 * @returns {string} Formatted balance
 */
export function formatTokenBalance(balance, decimals, displayDecimals = 4) {
  if (balance === 0 || balance === undefined) return '0';

  const value = balance / Math.pow(10, decimals);

  if (value < 0.0001) {
    return '< 0.0001';
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}
