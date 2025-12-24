// Jupiter public API - no auth required
const JUPITER_API_URL = 'https://public.jupiterapi.com';

// Native SOL mint address
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/**
 * Get a quote for a swap
 * @param {Object} params
 * @param {string} params.inputMint - Input token mint address
 * @param {string} params.outputMint - Output token mint address
 * @param {string} params.amount - Amount in smallest unit (lamports for SOL)
 * @param {number} params.slippageBps - Slippage in basis points (100 = 1%)
 * @returns {Promise<Object>} Quote response
 */
export async function getQuote({ inputMint, outputMint, amount, slippageBps = 100 }) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
    // Use auto fee mode for priority fees
    dynamicComputeUnitLimit: 'true',
    // Get the best route
    onlyDirectRoutes: 'false',
  });

  const response = await fetch(`${JUPITER_API_URL}/quote?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `Quote failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get a swap transaction
 * @param {Object} params
 * @param {Object} params.quoteResponse - Quote response from getQuote
 * @param {string} params.userPublicKey - User's wallet public key
 * @param {boolean} params.wrapAndUnwrapSol - Whether to wrap/unwrap SOL automatically
 * @returns {Promise<Object>} Swap transaction response
 */
export async function getSwapTransaction({ quoteResponse, userPublicKey, wrapAndUnwrapSol = true }) {
  const response = await fetch(`${JUPITER_API_URL}/swap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol,
      // Auto-add priority fee
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `Swap transaction failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Parse token amount with decimals
 * @param {string|number} amount - Human-readable amount
 * @param {number} decimals - Token decimals
 * @returns {string} Amount in smallest unit
 */
export function parseAmount(amount, decimals = 9) {
  const [whole, fraction = ''] = String(amount).split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return whole + paddedFraction;
}

/**
 * Format token amount with decimals
 * @param {string|number} amount - Amount in smallest unit
 * @param {number} decimals - Token decimals
 * @returns {string} Human-readable amount
 */
export function formatAmount(amount, decimals = 9) {
  const str = String(amount).padStart(decimals + 1, '0');
  const whole = str.slice(0, -decimals) || '0';
  const fraction = str.slice(-decimals).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

/**
 * Calculate price impact percentage
 * @param {Object} quote - Quote response
 * @returns {number} Price impact percentage
 */
export function calculatePriceImpact(quote) {
  if (!quote?.priceImpactPct) return 0;
  return parseFloat(quote.priceImpactPct) * 100;
}
