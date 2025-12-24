/**
 * Jupiter Trigger Order API Client
 *
 * Creates on-chain limit orders that execute automatically when
 * the target price is reached. No backend monitoring needed.
 *
 * API Docs: https://dev.jup.ag/docs/trigger-api/create-order
 * Note: The old /limit/v2 API is deprecated, using /trigger/v1 now
 */

// Native SOL mint address
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Jupiter Trigger API endpoint (replaces deprecated /limit/v2)
const TRIGGER_API = 'https://api.jup.ag/trigger/v1';

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol) {
  return Math.floor(sol * 1e9);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports) {
  return lamports / 1e9;
}

/**
 * Convert token amount to smallest unit based on decimals
 */
export function toSmallestUnit(amount, decimals) {
  return Math.floor(amount * Math.pow(10, decimals));
}

/**
 * Create a limit buy order (SOL → Token)
 *
 * @param {Object} options
 * @param {string} options.maker - Wallet public key (payer)
 * @param {string} options.outputMint - Token mint to buy
 * @param {number} options.inputAmountSol - Amount of SOL to spend
 * @param {number} options.expectedTokenAmount - Expected tokens to receive (based on limit price)
 * @param {number} options.outputDecimals - Token decimals
 * @param {Date} [options.expireAt] - Optional expiration date
 * @returns {Promise<{order: string, transaction: string, requestId: string}>}
 */
export async function createLimitBuyOrder({
  maker,
  outputMint,
  inputAmountSol,
  expectedTokenAmount,
  outputDecimals = 9,
  expireAt,
}) {
  const makingAmount = solToLamports(inputAmountSol).toString();
  const takingAmount = toSmallestUnit(expectedTokenAmount, outputDecimals).toString();

  const requestBody = {
    inputMint: SOL_MINT,
    outputMint,
    maker,
    payer: maker,
    params: {
      makingAmount,
      takingAmount,
    },
    computeUnitPrice: 'auto',
  };

  if (expireAt) {
    requestBody.expiredAt = Math.floor(expireAt.getTime() / 1000);
  }

  const response = await fetch(`${TRIGGER_API}/createOrder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.cause || `Failed to create limit buy order: ${response.status}`);
  }

  const result = await response.json();
  // Map response to consistent format (transaction field replaces old tx field)
  return {
    order: result.order,
    tx: result.transaction, // Keep backward compatibility
    transaction: result.transaction,
    requestId: result.requestId,
  };
}

/**
 * Create a limit sell order (Token → SOL)
 *
 * @param {Object} options
 * @param {string} options.maker - Wallet public key (payer)
 * @param {string} options.inputMint - Token mint to sell
 * @param {number} options.inputAmount - Amount of tokens to sell
 * @param {number} options.inputDecimals - Token decimals
 * @param {number} options.expectedSolAmount - Expected SOL to receive (based on limit price)
 * @param {Date} [options.expireAt] - Optional expiration date
 * @returns {Promise<{order: string, transaction: string, requestId: string}>}
 */
export async function createLimitSellOrder({
  maker,
  inputMint,
  inputAmount,
  inputDecimals = 9,
  expectedSolAmount,
  expireAt,
}) {
  const makingAmount = toSmallestUnit(inputAmount, inputDecimals).toString();
  const takingAmount = solToLamports(expectedSolAmount).toString();

  const requestBody = {
    inputMint,
    outputMint: SOL_MINT,
    maker,
    payer: maker,
    params: {
      makingAmount,
      takingAmount,
    },
    computeUnitPrice: 'auto',
  };

  if (expireAt) {
    requestBody.expiredAt = Math.floor(expireAt.getTime() / 1000);
  }

  const response = await fetch(`${TRIGGER_API}/createOrder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.cause || `Failed to create limit sell order: ${response.status}`);
  }

  const result = await response.json();
  // Map response to consistent format (transaction field replaces old tx field)
  return {
    order: result.order,
    tx: result.transaction, // Keep backward compatibility
    transaction: result.transaction,
    requestId: result.requestId,
  };
}

/**
 * Cancel an existing order
 *
 * @param {Object} params
 * @param {string} params.maker - Wallet public key
 * @param {string[]} params.orders - Array of order public keys to cancel
 * @returns {Promise<{transactions: string[]}>}
 */
export async function cancelOrders({ maker, orders }) {
  const response = await fetch(`${TRIGGER_API}/cancelOrders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maker, orders }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.cause || `Failed to cancel orders: ${response.status}`);
  }

  return response.json();
}

/**
 * Get open orders for a wallet
 *
 * @param {string} wallet - Wallet public key
 * @returns {Promise<Array>}
 */
export async function getOpenOrders(wallet) {
  const response = await fetch(`${TRIGGER_API}/getTriggerOrders?user=${wallet}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.cause || `Failed to fetch orders: ${response.status}`);
  }

  return response.json();
}

/**
 * Get order history for a wallet
 *
 * @param {string} wallet - Wallet public key
 * @param {number} [page=1] - Page number
 * @returns {Promise<Array>}
 */
export async function getOrderHistory(wallet, page = 1) {
  const response = await fetch(`${TRIGGER_API}/getTriggerOrders?user=${wallet}&page=${page}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.cause || `Failed to fetch order history: ${response.status}`);
  }

  return response.json();
}

/**
 * Calculate limit price from amounts
 *
 * For buy orders: How many tokens per 1 SOL
 * For sell orders: How much SOL per 1 token
 */
export function calculateLimitPrice(makingAmount, takingAmount, makingDecimals, takingDecimals) {
  const making = makingAmount / Math.pow(10, makingDecimals);
  const taking = takingAmount / Math.pow(10, takingDecimals);
  return taking / making;
}

/**
 * Calculate expected output amount from price
 *
 * For limit buy (SOL → Token):
 *   expectedTokens = solAmount / priceInSol
 *
 * For limit sell (Token → SOL):
 *   expectedSol = tokenAmount * priceInSol
 */
export function calculateExpectedOutput(inputAmount, limitPrice, isBuyOrder) {
  if (isBuyOrder) {
    // Buying: limitPrice is USD price of token, need to convert SOL to token amount
    // This assumes you're passing the token's USD price, not the exchange rate
    return inputAmount;
  } else {
    // Selling: limitPrice is expected SOL per token
    return inputAmount * limitPrice;
  }
}

/**
 * Create multiple limit orders for pack tokens with batch signing
 *
 * @param {Object} params
 * @param {string} params.maker - Wallet public key
 * @param {Array} params.orders - Array of order configs
 * @param {Date} [params.expireAt] - Optional expiration for all orders
 * @returns {Promise<Array<{token: string, order: string, transaction: string}>>}
 */
export async function createBatchLimitOrders({ maker, orders, expireAt }) {
  const results = [];

  for (const orderConfig of orders) {
    try {
      let result;

      if (orderConfig.side === 'buy') {
        result = await createLimitBuyOrder({
          maker,
          outputMint: orderConfig.tokenMint,
          inputAmountSol: orderConfig.amountSol,
          expectedTokenAmount: orderConfig.expectedAmount,
          outputDecimals: orderConfig.decimals,
          expireAt,
        });
      } else {
        result = await createLimitSellOrder({
          maker,
          inputMint: orderConfig.tokenMint,
          inputAmount: orderConfig.tokenAmount,
          inputDecimals: orderConfig.decimals,
          expectedSolAmount: orderConfig.expectedSol,
          expireAt,
        });
      }

      results.push({
        token: orderConfig.symbol,
        tokenMint: orderConfig.tokenMint,
        order: result.order,
        tx: result.transaction,
        transaction: result.transaction,
        requestId: result.requestId,
        error: null,
      });
    } catch (error) {
      results.push({
        token: orderConfig.symbol,
        tokenMint: orderConfig.tokenMint,
        order: null,
        tx: null,
        transaction: null,
        error: error.message,
      });
    }
  }

  return results;
}
