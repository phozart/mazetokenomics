// GoPlus Security API Client
// Documentation: https://docs.gopluslabs.io/reference/token-security-api

const GOPLUS_BASE_URL = 'https://api.gopluslabs.io/api/v1';

/**
 * Get token security information from GoPlus
 * @param {string} address - Token contract address
 * @param {string} chainId - GoPlus chain ID (e.g., '1' for Ethereum, 'solana' for Solana)
 * @returns {Promise<Object>} Security data
 */
export async function getTokenSecurity(address, chainId) {
  try {
    // Solana addresses are case-sensitive, EVM addresses should be lowercased
    const isSolana = chainId === 'solana';
    const normalizedAddress = isSolana ? address : address.toLowerCase();

    const url = `${GOPLUS_BASE_URL}/token_security/${chainId}?contract_addresses=${normalizedAddress}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GoPlus API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 1) {
      throw new Error(data.message || 'GoPlus API returned error');
    }

    // GoPlus returns results keyed by the address - try both cases for safety
    const tokenData = data.result?.[normalizedAddress] || data.result?.[address];

    if (!tokenData) {
      return null;
    }

    return tokenData;
  } catch (error) {
    console.error('GoPlus API error:', error);
    throw error;
  }
}

/**
 * Parse GoPlus response into structured security checks
 * @param {Object} goplusData - Raw GoPlus API response
 * @returns {Object} Structured check results
 */
export function parseGoPlusChecks(goplusData) {
  if (!goplusData) return null;

  const checks = {
    // Honeypot detection
    HONEYPOT_DETECTION: {
      passed: goplusData.is_honeypot !== '1',
      value: goplusData.is_honeypot === '1',
      details: goplusData.is_honeypot === '1'
        ? 'Token detected as honeypot - cannot sell'
        : 'No honeypot detected',
    },

    // Buy tax
    BUY_TAX_ANALYSIS: {
      passed: parseFloat(goplusData.buy_tax || '0') <= 0.1,
      value: parseFloat(goplusData.buy_tax || '0') * 100,
      details: `Buy tax: ${(parseFloat(goplusData.buy_tax || '0') * 100).toFixed(1)}%`,
    },

    // Sell tax
    SELL_TAX_ANALYSIS: {
      passed: parseFloat(goplusData.sell_tax || '0') <= 0.1,
      value: parseFloat(goplusData.sell_tax || '0') * 100,
      details: `Sell tax: ${(parseFloat(goplusData.sell_tax || '0') * 100).toFixed(1)}%`,
    },

    // Mint function
    MINT_FUNCTION: {
      passed: goplusData.is_mintable !== '1',
      value: goplusData.is_mintable === '1',
      details: goplusData.is_mintable === '1'
        ? 'Contract has mint function - supply can increase'
        : 'No mint function detected',
    },

    // Proxy contract
    PROXY_CONTRACT: {
      passed: goplusData.is_proxy !== '1',
      value: goplusData.is_proxy === '1',
      details: goplusData.is_proxy === '1'
        ? 'Contract is a proxy - implementation can change'
        : 'Not a proxy contract',
    },

    // Owner change capability
    OWNER_CHANGE_CAPABILITY: {
      passed: goplusData.can_take_back_ownership !== '1',
      value: goplusData.can_take_back_ownership === '1',
      details: goplusData.can_take_back_ownership === '1'
        ? 'Owner can reclaim ownership after renouncing'
        : 'No ownership recovery detected',
    },

    // Trading cooldown
    TRADING_COOLDOWN: {
      passed: goplusData.trading_cooldown !== '1',
      value: goplusData.trading_cooldown === '1',
      details: goplusData.trading_cooldown === '1'
        ? 'Trading cooldown enabled'
        : 'No trading cooldown',
    },

    // Blacklist function
    BLACKLIST_FUNCTION: {
      passed: goplusData.is_blacklisted !== '1' && goplusData.is_anti_whale !== '1',
      value: goplusData.is_blacklisted === '1' || goplusData.is_anti_whale === '1',
      details: (goplusData.is_blacklisted === '1' || goplusData.is_anti_whale === '1')
        ? 'Contract can blacklist addresses or has anti-whale'
        : 'No blacklist function detected',
    },

    // Hidden owner
    HIDDEN_OWNER: {
      passed: goplusData.hidden_owner !== '1',
      value: goplusData.hidden_owner === '1',
      details: goplusData.hidden_owner === '1'
        ? 'Hidden owner detected - contract may have undisclosed control'
        : 'No hidden owner detected',
    },

    // External call risk
    EXTERNAL_CALL_RISK: {
      passed: goplusData.external_call !== '1',
      value: goplusData.external_call === '1',
      details: goplusData.external_call === '1'
        ? 'Contract makes external calls - potential risk'
        : 'No risky external calls detected',
    },

    // Holder count (used for holder check)
    HOLDER_COUNT: {
      passed: parseInt(goplusData.holder_count || '0') >= 100,
      value: parseInt(goplusData.holder_count || '0'),
      details: `${goplusData.holder_count || '0'} holders`,
    },
  };

  // Calculate overall GoPlus score
  const passedChecks = Object.values(checks).filter(c => c.passed).length;
  const totalChecks = Object.keys(checks).length;
  const score = (passedChecks / totalChecks) * 100;

  return {
    checks,
    score,
    rawData: goplusData,
    tokenName: goplusData.token_name,
    tokenSymbol: goplusData.token_symbol,
    totalSupply: goplusData.total_supply,
    holderCount: goplusData.holder_count,
    creatorAddress: goplusData.creator_address,
    creatorPercent: goplusData.creator_percent,
    isOpenSource: goplusData.is_open_source === '1',
  };
}
