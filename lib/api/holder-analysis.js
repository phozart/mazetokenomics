/**
 * Advanced Holder Analysis
 * Analyzes wallet ages, connections, and trading patterns
 */

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const SOLANA_RPC_URL = HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : 'https://api.mainnet-beta.solana.com';

/**
 * Get top token holders for Solana tokens
 * Uses Helius API if available, falls back to RugCheck
 */
export async function getSolanaTopHolders(mintAddress, limit = 50) {
  try {
    // Try Helius API first (most reliable)
    if (HELIUS_API_KEY) {
      const holders = await getHeliusTokenHolders(mintAddress, limit);
      if (holders.length > 0) {
        console.log(`[Solana Holders] Found ${holders.length} holders via Helius`);
        return holders;
      }
    }

    // Fallback to RugCheck
    console.log('[Solana Holders] Trying RugCheck fallback...');
    const rugcheckResponse = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mintAddress}/report`);
    if (rugcheckResponse.ok) {
      const data = await rugcheckResponse.json();
      if (data.topHolders && data.topHolders.length > 0) {
        console.log(`[Solana Holders] Found ${data.topHolders.length} holders via RugCheck`);
        return data.topHolders.slice(0, limit).map(h => ({
          address: h.owner || h.address,
          balance: h.uiAmount || h.amount,
          percentage: h.pct || h.percentage,
        }));
      }
    }

    console.warn('[Solana Holders] No holder data found from any source');
    return [];
  } catch (error) {
    console.error('Error fetching Solana holders:', error);
    return [];
  }
}

/**
 * Get token holders using Helius API
 */
async function getHeliusTokenHolders(mintAddress, limit = 50) {
  try {
    // Use Helius RPC to get token largest accounts
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenLargestAccounts',
        params: [mintAddress],
      }),
    });

    if (!response.ok) {
      console.error('Helius API error:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error('Helius RPC error:', data.error);
      return [];
    }

    if (!data.result?.value || data.result.value.length === 0) {
      return [];
    }

    // Get token supply for percentage calculation
    const supplyResponse = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenSupply',
        params: [mintAddress],
      }),
    });

    let totalSupply = 0;
    if (supplyResponse.ok) {
      const supplyData = await supplyResponse.json();
      if (supplyData.result?.value) {
        totalSupply = parseFloat(supplyData.result.value.uiAmount) || 0;
      }
    }

    // Map token accounts to holder format
    const holders = data.result.value.slice(0, limit).map(account => {
      const balance = parseFloat(account.uiAmount) || 0;
      return {
        address: account.address,
        balance: balance,
        percentage: totalSupply > 0 ? (balance / totalSupply) * 100 : 0,
      };
    });

    // Get owner addresses for each token account
    const holdersWithOwners = await Promise.all(
      holders.map(async (holder) => {
        try {
          const ownerResponse = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getAccountInfo',
              params: [holder.address, { encoding: 'jsonParsed' }],
            }),
          });

          if (ownerResponse.ok) {
            const ownerData = await ownerResponse.json();
            const owner = ownerData.result?.value?.data?.parsed?.info?.owner;
            if (owner) {
              return { ...holder, address: owner, tokenAccount: holder.address };
            }
          }
        } catch (e) {
          // Keep original address if owner lookup fails
        }
        return holder;
      })
    );

    return holdersWithOwners;
  } catch (error) {
    console.error('Error fetching Helius token holders:', error);
    return [];
  }
}

/**
 * Get top token holders for EVM tokens using Etherscan
 * Analyzes token transfers to identify top holders
 */
export async function getEVMTopHolders(contractAddress, chain, limit = 50) {
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  if (!ETHERSCAN_API_KEY) {
    console.warn('No Etherscan API key configured');
    return [];
  }

  const chainIdMap = {
    ETHEREUM: '1',
    BSC: '56',
    POLYGON: '137',
    ARBITRUM: '42161',
    BASE: '8453',
    OPTIMISM: '10',
    AVALANCHE: '43114',
  };

  const chainId = chainIdMap[chain];
  if (!chainId) {
    console.warn(`Unsupported chain for Etherscan: ${chain}`);
    return [];
  }

  try {
    // Fetch token transfers (max 10000 with free API)
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=tokentx&contractaddress=${contractAddress}&page=1&offset=10000&sort=desc&apikey=${ETHERSCAN_API_KEY}`
    );

    if (!response.ok) {
      console.error('Etherscan API error:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.status !== '1' || !data.result || !Array.isArray(data.result)) {
      console.warn('No token transfers found or API error:', data.message);
      return [];
    }

    // Calculate balances from transfers
    const balances = new Map();
    const decimals = data.result[0]?.tokenDecimal ? parseInt(data.result[0].tokenDecimal) : 18;

    for (const tx of data.result) {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      const value = parseFloat(tx.value) / Math.pow(10, decimals);

      // Subtract from sender
      if (from !== '0x0000000000000000000000000000000000000000') {
        balances.set(from, (balances.get(from) || 0) - value);
      }

      // Add to receiver
      balances.set(to, (balances.get(to) || 0) + value);
    }

    // Filter out zero/negative balances and sort by balance
    const holders = Array.from(balances.entries())
      .filter(([addr, balance]) => balance > 0)
      .map(([address, balance]) => ({ address, balance }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);

    // Calculate total supply from positive balances for percentage
    const totalSupply = holders.reduce((sum, h) => sum + h.balance, 0);

    // Add percentage
    return holders.map(h => ({
      address: h.address,
      balance: h.balance,
      percentage: totalSupply > 0 ? (h.balance / totalSupply) * 100 : 0,
    }));
  } catch (error) {
    console.error('Error fetching EVM holders:', error);
    return [];
  }
}

/**
 * Get wallet's first transaction date (wallet age)
 * @param {string} address - Wallet address
 * @param {string} chain - Chain identifier
 */
export async function getWalletAge(address, chain) {
  try {
    if (chain === 'SOLANA') {
      return await getSolanaWalletAge(address);
    } else {
      return await getEVMWalletAge(address, chain);
    }
  } catch (error) {
    console.error('Error getting wallet age:', error);
    return null;
  }
}

/**
 * Get Solana wallet's first transaction
 */
async function getSolanaWalletAge(address) {
  try {
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [
          address,
          { limit: 1, before: null }
        ],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();

    if (data.result && data.result.length > 0) {
      // Get the oldest transaction we can see
      // Note: This gets recent transactions, for true first tx we'd need to paginate backwards
      const oldestSig = data.result[data.result.length - 1];
      if (oldestSig.blockTime) {
        const firstTxDate = new Date(oldestSig.blockTime * 1000);
        const ageInDays = Math.floor((Date.now() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24));
        return { firstTxDate, ageInDays };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting Solana wallet age:', error);
    return null;
  }
}

/**
 * Get EVM wallet's first transaction via Etherscan
 */
async function getEVMWalletAge(address, chain) {
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  if (!ETHERSCAN_API_KEY) return null;

  const chainIdMap = {
    ETHEREUM: '1',
    BSC: '56',
    POLYGON: '137',
    ARBITRUM: '42161',
    BASE: '8453',
    OPTIMISM: '10',
    AVALANCHE: '43114',
  };

  const chainId = chainIdMap[chain];
  if (!chainId) return null;

  try {
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc&apikey=${ETHERSCAN_API_KEY}`
    );

    if (!response.ok) return null;
    const data = await response.json();

    if (data.result && data.result.length > 0) {
      const firstTx = data.result[0];
      const firstTxDate = new Date(parseInt(firstTx.timeStamp) * 1000);
      const ageInDays = Math.floor((Date.now() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24));
      return { firstTxDate, ageInDays };
    }

    return null;
  } catch (error) {
    console.error('Error getting EVM wallet age:', error);
    return null;
  }
}

/**
 * Get wallet's funding source (where they got their initial funds)
 */
export async function getWalletFundingSource(address, chain) {
  try {
    if (chain === 'SOLANA') {
      return await getSolanaFundingSource(address);
    } else {
      return await getEVMFundingSource(address, chain);
    }
  } catch (error) {
    console.error('Error getting funding source:', error);
    return null;
  }
}

/**
 * Get Solana wallet's funding source
 */
async function getSolanaFundingSource(address) {
  try {
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [address, { limit: 10 }],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();

    // For each signature, we'd need to get transaction details
    // This is simplified - in production you'd trace back funding
    if (data.result && data.result.length > 0) {
      return {
        hasTransactions: true,
        transactionCount: data.result.length,
      };
    }

    return { hasTransactions: false };
  } catch (error) {
    console.error('Error getting Solana funding source:', error);
    return null;
  }
}

/**
 * Get EVM wallet's funding source
 */
async function getEVMFundingSource(address, chain) {
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  if (!ETHERSCAN_API_KEY) return null;

  const chainIdMap = {
    ETHEREUM: '1',
    BSC: '56',
    POLYGON: '137',
    ARBITRUM: '42161',
    BASE: '8453',
    OPTIMISM: '10',
    AVALANCHE: '43114',
  };

  const chainId = chainIdMap[chain];
  if (!chainId) return null;

  try {
    // Get first few incoming transactions
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=5&sort=asc&apikey=${ETHERSCAN_API_KEY}`
    );

    if (!response.ok) return null;
    const data = await response.json();

    if (data.result && data.result.length > 0) {
      // Find first incoming transaction (funding source)
      const incomingTxs = data.result.filter(tx => tx.to.toLowerCase() === address.toLowerCase());
      if (incomingTxs.length > 0) {
        return {
          fundingAddress: incomingTxs[0].from,
          fundingTxHash: incomingTxs[0].hash,
          fundingDate: new Date(parseInt(incomingTxs[0].timeStamp) * 1000),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting EVM funding source:', error);
    return null;
  }
}

/**
 * Get recent transactions for a token to analyze trading patterns
 */
export async function getTokenTransactions(contractAddress, chain, limit = 100) {
  try {
    if (chain === 'SOLANA') {
      return await getSolanaTokenTransactions(contractAddress, limit);
    } else {
      return await getEVMTokenTransactions(contractAddress, chain, limit);
    }
  } catch (error) {
    console.error('Error getting token transactions:', error);
    return [];
  }
}

/**
 * Get Solana token transactions
 */
async function getSolanaTokenTransactions(mintAddress, limit) {
  try {
    // Use Helius API if available for better data
    if (HELIUS_API_KEY) {
      const response = await fetch(
        `https://api.helius.xyz/v0/addresses/${mintAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`
      );

      if (response.ok) {
        const data = await response.json();
        return data.map(tx => ({
          signature: tx.signature,
          timestamp: tx.timestamp,
          type: tx.type,
          source: tx.source,
          feePayer: tx.feePayer,
          nativeTransfers: tx.nativeTransfers || [],
          tokenTransfers: tx.tokenTransfers || [],
        }));
      }
    }

    // Fallback to basic RPC
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [mintAddress, { limit }],
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();

    return (data.result || []).map(sig => ({
      signature: sig.signature,
      timestamp: sig.blockTime ? new Date(sig.blockTime * 1000) : null,
      slot: sig.slot,
    }));
  } catch (error) {
    console.error('Error getting Solana token transactions:', error);
    return [];
  }
}

/**
 * Get EVM token transactions
 */
async function getEVMTokenTransactions(contractAddress, chain, limit) {
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  if (!ETHERSCAN_API_KEY) return [];

  const chainIdMap = {
    ETHEREUM: '1',
    BSC: '56',
    POLYGON: '137',
    ARBITRUM: '42161',
    BASE: '8453',
    OPTIMISM: '10',
    AVALANCHE: '43114',
  };

  const chainId = chainIdMap[chain];
  if (!chainId) return [];

  try {
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=tokentx&contractaddress=${contractAddress}&page=1&offset=${limit}&sort=desc&apikey=${ETHERSCAN_API_KEY}`
    );

    if (!response.ok) return [];
    const data = await response.json();

    return (data.result || []).map(tx => ({
      hash: tx.hash,
      timestamp: new Date(parseInt(tx.timeStamp) * 1000),
      from: tx.from,
      to: tx.to,
      value: tx.value,
      tokenDecimal: tx.tokenDecimal,
    }));
  } catch (error) {
    console.error('Error getting EVM token transactions:', error);
    return [];
  }
}

/**
 * Analyze top holders for wallet age
 * Returns check result
 */
export async function analyzeTopHolderWalletAge(holders, chain) {
  if (!holders || holders.length === 0) {
    return {
      passed: null,
      value: null,
      details: 'Unable to fetch holder data',
      severity: 'HIGH',
    };
  }

  const ageThresholdDays = 7;
  const walletAges = [];
  let freshWalletCount = 0;
  let analyzedCount = 0;

  // Analyze top 10 holders
  const topHolders = holders.slice(0, 10);

  for (const holder of topHolders) {
    const age = await getWalletAge(holder.address, chain);
    if (age) {
      analyzedCount++;
      walletAges.push({
        address: holder.address,
        percentage: holder.percentage,
        ageInDays: age.ageInDays,
      });

      if (age.ageInDays < ageThresholdDays) {
        freshWalletCount++;
      }
    }
  }

  if (analyzedCount === 0) {
    return {
      passed: null,
      value: null,
      details: 'Could not analyze wallet ages',
      severity: 'HIGH',
    };
  }

  const freshWalletPercentage = (freshWalletCount / analyzedCount) * 100;
  const passed = freshWalletPercentage < 30; // Pass if less than 30% are fresh wallets

  return {
    passed,
    value: freshWalletPercentage,
    details: passed
      ? `${analyzedCount} wallets analyzed, ${freshWalletCount} fresh wallets (${freshWalletPercentage.toFixed(1)}%)`
      : `Warning: ${freshWalletCount}/${analyzedCount} top holders (${freshWalletPercentage.toFixed(1)}%) have wallets younger than ${ageThresholdDays} days`,
    severity: 'HIGH',
    rawData: walletAges,
  };
}

/**
 * Detect connected wallets (shared funding sources)
 */
export async function detectConnectedWallets(holders, chain) {
  if (!holders || holders.length === 0) {
    return {
      passed: null,
      value: null,
      details: 'Unable to fetch holder data',
      severity: 'CRITICAL',
    };
  }

  const fundingSources = new Map();
  const topHolders = holders.slice(0, 10);
  let analyzedCount = 0;

  for (const holder of topHolders) {
    const funding = await getWalletFundingSource(holder.address, chain);
    if (funding && funding.fundingAddress) {
      analyzedCount++;
      const source = funding.fundingAddress.toLowerCase();
      if (!fundingSources.has(source)) {
        fundingSources.set(source, []);
      }
      fundingSources.get(source).push(holder.address);
    }
  }

  // Find clusters (funding sources used by multiple holders)
  const clusters = [];
  for (const [source, wallets] of fundingSources) {
    if (wallets.length > 1) {
      clusters.push({
        fundingSource: source,
        connectedWallets: wallets,
        count: wallets.length,
      });
    }
  }

  const connectedWalletCount = clusters.reduce((sum, c) => sum + c.count, 0);
  const connectionPercentage = analyzedCount > 0 ? (connectedWalletCount / analyzedCount) * 100 : 0;
  const passed = connectionPercentage < 30; // Pass if less than 30% are connected

  if (analyzedCount === 0) {
    return {
      passed: null,
      value: null,
      details: 'Could not analyze wallet connections (API key may be required)',
      severity: 'CRITICAL',
    };
  }

  return {
    passed,
    value: connectionPercentage,
    details: passed
      ? `No significant wallet clustering detected among top ${analyzedCount} holders`
      : `Warning: ${connectedWalletCount} wallets (${connectionPercentage.toFixed(1)}%) share funding sources - possible coordinated buying`,
    severity: 'CRITICAL',
    rawData: { clusters, analyzedCount },
  };
}

/**
 * Detect wash trading patterns
 */
export async function detectWashTrading(transactions, contractAddress) {
  if (!transactions || transactions.length === 0) {
    return {
      passed: null,
      value: null,
      details: 'Unable to fetch transaction data',
      severity: 'CRITICAL',
    };
  }

  // Analyze trading patterns
  const tradePairs = new Map(); // Track trades between wallet pairs
  let suspiciousVolume = 0;
  let totalVolume = 0;

  for (const tx of transactions) {
    if (!tx.from || !tx.to) continue;

    const from = tx.from.toLowerCase();
    const to = tx.to.toLowerCase();
    const value = parseFloat(tx.value) || 0;
    totalVolume += value;

    // Create pair key (sorted to group both directions)
    const pairKey = [from, to].sort().join('-');

    if (!tradePairs.has(pairKey)) {
      tradePairs.set(pairKey, {
        addresses: [from, to],
        trades: [],
        totalVolume: 0,
      });
    }

    const pair = tradePairs.get(pairKey);
    pair.trades.push({
      from,
      to,
      value,
      timestamp: tx.timestamp,
    });
    pair.totalVolume += value;
  }

  // Identify suspicious pairs (multiple back-and-forth trades)
  const suspiciousPairs = [];
  for (const [pairKey, pair] of tradePairs) {
    // Check for back-and-forth trading
    const fromTrades = pair.trades.filter(t => t.from === pair.addresses[0]);
    const toTrades = pair.trades.filter(t => t.to === pair.addresses[0]);

    // If both directions have multiple trades, it's suspicious
    if (fromTrades.length >= 2 && toTrades.length >= 2) {
      suspiciousPairs.push({
        addresses: pair.addresses,
        tradeCount: pair.trades.length,
        volume: pair.totalVolume,
      });
      suspiciousVolume += pair.totalVolume;
    }
  }

  const washTradingPercentage = totalVolume > 0 ? (suspiciousVolume / totalVolume) * 100 : 0;
  const passed = washTradingPercentage < 20; // Pass if less than 20% appears to be wash trading

  return {
    passed,
    value: washTradingPercentage,
    details: passed
      ? `Analyzed ${transactions.length} transactions, no significant wash trading detected (${washTradingPercentage.toFixed(1)}%)`
      : `Warning: ${washTradingPercentage.toFixed(1)}% of trading volume appears to be wash trading between ${suspiciousPairs.length} wallet pairs`,
    severity: 'CRITICAL',
    rawData: {
      totalTransactions: transactions.length,
      suspiciousPairs: suspiciousPairs.slice(0, 5), // Top 5 suspicious pairs
      washTradingPercentage,
    },
  };
}

// ============================================================================
// ADVANCED HOLDER ANALYSIS - DEEP FUNDING CHAIN TRACING
// ============================================================================

/**
 * Known exchange and mixer addresses for identification
 */
const KNOWN_ADDRESSES = {
  exchanges: {
    '0x28c6c06298d514db089934071355e5743bf21d60': { name: 'Binance 14', type: 'exchange' },
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549': { name: 'Binance 15', type: 'exchange' },
    '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': { name: 'Binance 16', type: 'exchange' },
    '0x56eddb7aa87536c09ccc2793473599fd21a8b17f': { name: 'Binance 17', type: 'exchange' },
    '0x9696f59e4d72e237be84ffd425dcad154bf96976': { name: 'Binance 18', type: 'exchange' },
    '0x4976a4a02f38326660d17bf34b431dc6e2eb2327': { name: 'Binance 19', type: 'exchange' },
    '0xf977814e90da44bfa03b6295a0616a897441acec': { name: 'Binance 8', type: 'exchange' },
    '0x5a52e96bacdabb82fd05763e25335261b270efcb': { name: 'Binance 9', type: 'exchange' },
    '0x2f47a1c2db4a3b78cda44eade915c3b19107ddcc': { name: 'Coinbase', type: 'exchange' },
    '0x503828976d22510aad0201ac7ec88293211d23da': { name: 'Coinbase 2', type: 'exchange' },
    '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': { name: 'Coinbase 3', type: 'exchange' },
    '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640': { name: 'Uniswap V3 Pool', type: 'dex' },
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': { name: 'Uniswap Router', type: 'dex' },
  },
  mixers: {
    '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b': { name: 'Tornado Cash', type: 'mixer' },
    '0x722122df12d4e14e13ac3b6895a86e84145b6967': { name: 'Tornado Cash 2', type: 'mixer' },
    '0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc': { name: 'Tornado Cash 3', type: 'mixer' },
  },
};

/**
 * Identify address type from known addresses or heuristics
 */
function identifyAddressType(address) {
  const lower = address.toLowerCase();

  // Check known addresses
  if (KNOWN_ADDRESSES.exchanges[lower]) {
    return KNOWN_ADDRESSES.exchanges[lower];
  }
  if (KNOWN_ADDRESSES.mixers[lower]) {
    return KNOWN_ADDRESSES.mixers[lower];
  }

  return { name: null, type: 'unknown' };
}

/**
 * Trace funding chain for a wallet - recursive multi-level tracing
 * @param {string} address - Wallet address to trace
 * @param {string} chain - Chain identifier
 * @param {number} depth - Maximum depth to trace
 * @param {Set} visited - Already visited addresses to prevent cycles
 * @returns {Object} Funding chain with all hops
 */
export async function traceFundingChain(address, chain, depth = 4, visited = new Set()) {
  if (depth <= 0 || visited.has(address.toLowerCase())) {
    return null;
  }

  visited.add(address.toLowerCase());

  const result = {
    address,
    addressInfo: identifyAddressType(address),
    fundingSource: null,
    fundingAmount: null,
    fundingTimestamp: null,
    fundingTxHash: null,
    children: [],
    depth: 4 - depth,
    flags: [],
  };

  try {
    const funding = await getWalletFundingSource(address, chain);

    if (funding && funding.fundingAddress) {
      result.fundingSource = funding.fundingAddress;
      result.fundingTxHash = funding.fundingTxHash;
      result.fundingTimestamp = funding.fundingDate;

      // Check for suspicious patterns
      const sourceInfo = identifyAddressType(funding.fundingAddress);
      if (sourceInfo.type === 'mixer') {
        result.flags.push({ type: 'mixer_funded', severity: 'critical', description: 'Funded through mixer' });
      }
      if (sourceInfo.type === 'exchange') {
        result.flags.push({ type: 'cex_funded', severity: 'low', description: `Funded from ${sourceInfo.name}` });
      }

      // Get wallet age
      const age = await getWalletAge(address, chain);
      if (age && age.ageInDays < 7) {
        result.flags.push({ type: 'fresh_wallet', severity: 'high', description: `Wallet only ${age.ageInDays} days old` });
      }

      // Recursively trace the funding source
      if (sourceInfo.type === 'unknown' && depth > 1) {
        const parentChain = await traceFundingChain(funding.fundingAddress, chain, depth - 1, visited);
        if (parentChain) {
          result.children.push(parentChain);
        }
      }
    }
  } catch (error) {
    console.error(`Error tracing funding chain for ${address}:`, error);
  }

  return result;
}

/**
 * Build a funding graph for all holders
 * Identifies hub wallets and connection patterns
 */
export async function buildFundingGraph(holders, chain) {
  const graph = {
    nodes: new Map(), // address -> node info
    edges: [],        // {from, to, amount, timestamp}
    hubs: [],         // Addresses that funded multiple holders
    clusters: [],     // Groups of connected wallets
    metrics: {
      density: 0,
      avgClusterSize: 0,
      maxClusterSize: 0,
    },
  };

  const fundingMap = new Map(); // source -> [funded wallets]

  // Trace each holder's funding
  for (const holder of holders.slice(0, 20)) {
    const chain_trace = await traceFundingChain(holder.address, chain, 2);

    if (chain_trace) {
      // Add node
      graph.nodes.set(holder.address.toLowerCase(), {
        address: holder.address,
        balance: holder.balance,
        percentage: holder.percentage,
        type: 'holder',
        flags: chain_trace.flags,
      });

      // Track funding relationships
      if (chain_trace.fundingSource) {
        const source = chain_trace.fundingSource.toLowerCase();

        // Add edge
        graph.edges.push({
          from: source,
          to: holder.address.toLowerCase(),
          amount: chain_trace.fundingAmount,
          timestamp: chain_trace.fundingTimestamp,
        });

        // Track for hub detection
        if (!fundingMap.has(source)) {
          fundingMap.set(source, []);
        }
        fundingMap.get(source).push(holder.address);

        // Add source node if not exists
        if (!graph.nodes.has(source)) {
          graph.nodes.set(source, {
            address: chain_trace.fundingSource,
            type: identifyAddressType(chain_trace.fundingSource).type,
            flags: [],
          });
        }
      }
    }
  }

  // Identify hub wallets (funded 2+ holders)
  for (const [source, funded] of fundingMap) {
    if (funded.length >= 2) {
      graph.hubs.push({
        address: source,
        fundedCount: funded.length,
        fundedWallets: funded,
        info: identifyAddressType(source),
      });
    }
  }

  // Build clusters using Union-Find
  const clusters = buildClusters(graph.edges);
  graph.clusters = clusters;

  // Calculate metrics
  const edgeCount = graph.edges.length;
  const nodeCount = graph.nodes.size;
  graph.metrics.density = nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0;
  graph.metrics.avgClusterSize = clusters.length > 0
    ? clusters.reduce((sum, c) => sum + c.members.length, 0) / clusters.length
    : 0;
  graph.metrics.maxClusterSize = clusters.length > 0
    ? Math.max(...clusters.map(c => c.members.length))
    : 0;

  return graph;
}

/**
 * Union-Find algorithm for clustering connected wallets
 */
function buildClusters(edges) {
  const parent = new Map();

  function find(x) {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)));
    }
    return parent.get(x);
  }

  function union(x, y) {
    const px = find(x);
    const py = find(y);
    if (px !== py) {
      parent.set(px, py);
    }
  }

  // Union connected addresses
  for (const edge of edges) {
    union(edge.from, edge.to);
  }

  // Group by cluster
  const clusterMap = new Map();
  for (const [addr] of parent) {
    const root = find(addr);
    if (!clusterMap.has(root)) {
      clusterMap.set(root, []);
    }
    clusterMap.get(root).push(addr);
  }

  // Convert to array, filter single-member clusters
  const clusters = [];
  let clusterId = 0;
  for (const [root, members] of clusterMap) {
    if (members.length > 1) {
      clusters.push({
        id: `cluster_${clusterId++}`,
        root,
        members,
        size: members.length,
      });
    }
  }

  return clusters;
}

// ============================================================================
// CONCENTRATION METRICS
// ============================================================================

/**
 * Calculate Gini coefficient for holder distribution
 * 0 = perfect equality, 1 = perfect inequality (one holder owns all)
 */
export function calculateGiniCoefficient(holders) {
  if (!holders || holders.length === 0) return null;

  // Sort by balance ascending
  const sorted = [...holders].sort((a, b) => (a.balance || a.percentage) - (b.balance || b.percentage));
  const n = sorted.length;

  // Calculate cumulative values
  let sumOfProducts = 0;
  let cumulative = 0;
  const total = sorted.reduce((sum, h) => sum + (h.balance || h.percentage), 0);

  for (let i = 0; i < n; i++) {
    cumulative += (sorted[i].balance || sorted[i].percentage);
    sumOfProducts += (i + 1) * (sorted[i].balance || sorted[i].percentage);
  }

  // Gini formula
  const gini = (2 * sumOfProducts) / (n * total) - (n + 1) / n;

  return Math.max(0, Math.min(1, gini));
}

/**
 * Calculate Nakamoto coefficient
 * Minimum number of wallets needed to control 51% of supply
 */
export function calculateNakamotoCoefficient(holders) {
  if (!holders || holders.length === 0) return null;

  // Sort by percentage descending
  const sorted = [...holders].sort((a, b) => b.percentage - a.percentage);

  let cumulative = 0;
  let count = 0;

  for (const holder of sorted) {
    cumulative += holder.percentage;
    count++;
    if (cumulative >= 51) {
      return count;
    }
  }

  return sorted.length; // All holders needed
}

/**
 * Calculate effective holder count (adjusted for coordination)
 * Reduces count based on detected clusters
 */
export function calculateEffectiveHolderCount(holders, clusters) {
  if (!holders || holders.length === 0) return 0;

  let effectiveCount = holders.length;

  // Reduce count for each cluster (treat cluster as single entity)
  for (const cluster of clusters || []) {
    // Each cluster reduces count by (size - 1)
    effectiveCount -= (cluster.size - 1);
  }

  return Math.max(1, effectiveCount);
}

/**
 * Get holder distribution percentages
 */
export function getHolderDistribution(holders) {
  if (!holders || holders.length === 0) {
    return { top10: 0, top50: 0, top100: 0 };
  }

  const sorted = [...holders].sort((a, b) => b.percentage - a.percentage);

  const top10 = sorted.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
  const top50 = sorted.slice(0, 50).reduce((sum, h) => sum + h.percentage, 0);
  const top100 = sorted.slice(0, 100).reduce((sum, h) => sum + h.percentage, 0);

  return { top10, top50, top100 };
}

// ============================================================================
// RISK SCORING
// ============================================================================

/**
 * Calculate Sybil score - probability that holders are fake/coordinated
 * @returns Score 0-100 (higher = more suspicious)
 */
export async function calculateSybilScore(holders, clusters, fundingGraph, walletAges) {
  let score = 0;

  // Factor 1: Funding overlap (0-30 points)
  // Higher overlap = more suspicious
  if (fundingGraph && fundingGraph.hubs.length > 0) {
    const connectedHolders = fundingGraph.hubs.reduce((sum, h) => sum + h.fundedCount, 0);
    const overlapRatio = connectedHolders / (holders?.length || 1);
    score += Math.min(30, overlapRatio * 50);
  }

  // Factor 2: Cluster size (0-25 points)
  // Larger clusters = more suspicious
  if (clusters && clusters.length > 0) {
    const maxCluster = Math.max(...clusters.map(c => c.size));
    const clusterRatio = maxCluster / (holders?.length || 1);
    score += Math.min(25, clusterRatio * 40);
  }

  // Factor 3: Fresh wallet ratio (0-20 points)
  if (walletAges && walletAges.length > 0) {
    const freshCount = walletAges.filter(w => w.ageInDays < 7).length;
    const freshRatio = freshCount / walletAges.length;
    score += Math.min(20, freshRatio * 40);
  }

  // Factor 4: Similar balance distribution (0-15 points)
  if (holders && holders.length > 2) {
    const balances = holders.map(h => h.percentage);
    const avg = balances.reduce((a, b) => a + b, 0) / balances.length;
    const variance = balances.reduce((sum, b) => sum + Math.pow(b - avg, 2), 0) / balances.length;
    const cv = Math.sqrt(variance) / avg; // Coefficient of variation
    // Low CV = suspiciously similar balances
    if (cv < 0.3) {
      score += 15;
    } else if (cv < 0.5) {
      score += 10;
    } else if (cv < 0.7) {
      score += 5;
    }
  }

  // Factor 5: Hub concentration (0-10 points)
  if (fundingGraph && fundingGraph.hubs.length > 0) {
    const singleHubFunded = Math.max(...fundingGraph.hubs.map(h => h.fundedCount));
    if (singleHubFunded >= 5) score += 10;
    else if (singleHubFunded >= 3) score += 5;
  }

  return Math.min(100, Math.round(score));
}

/**
 * Calculate Insider score - likelihood of insider accumulation
 * @returns Score 0-100 (higher = more suspicious)
 */
export async function calculateInsiderScore(holders, chain, tokenCreationDate, deployerAddress) {
  let score = 0;
  const creationTime = tokenCreationDate ? new Date(tokenCreationDate).getTime() : null;

  // Factor 1: Pre-creation buyers (0-30 points)
  // Wallets that existed before token but bought immediately
  if (creationTime && holders) {
    let preLaunchBuyers = 0;
    for (const holder of holders.slice(0, 20)) {
      const age = await getWalletAge(holder.address, chain);
      if (age && age.firstTxDate) {
        const walletCreation = new Date(age.firstTxDate).getTime();
        // Wallet created within 24h before token launch
        if (walletCreation > creationTime - 86400000 && walletCreation < creationTime + 3600000) {
          preLaunchBuyers++;
        }
      }
    }
    const ratio = preLaunchBuyers / Math.min(20, holders.length);
    score += Math.min(30, ratio * 60);
  }

  // Factor 2: Deployer connections (0-25 points)
  if (deployerAddress && holders) {
    let deployerConnections = 0;
    for (const holder of holders.slice(0, 10)) {
      const funding = await getWalletFundingSource(holder.address, chain);
      if (funding && funding.fundingAddress?.toLowerCase() === deployerAddress.toLowerCase()) {
        deployerConnections++;
      }
    }
    score += Math.min(25, deployerConnections * 8);
  }

  // Factor 3: First-block concentration (0-25 points)
  // Estimated based on wallet ages being very similar
  if (holders && holders.length > 5) {
    const topHolderPercentage = holders.slice(0, 5).reduce((sum, h) => sum + h.percentage, 0);
    if (topHolderPercentage > 50) score += 25;
    else if (topHolderPercentage > 30) score += 15;
    else if (topHolderPercentage > 20) score += 8;
  }

  // Factor 4: Team wallet patterns (0-20 points)
  // Very large single holders in new tokens
  if (holders && holders.length > 0) {
    const largestHolder = holders[0]?.percentage || 0;
    if (largestHolder > 20) score += 20;
    else if (largestHolder > 10) score += 12;
    else if (largestHolder > 5) score += 5;
  }

  return Math.min(100, Math.round(score));
}

/**
 * Calculate Exit Risk score - risk of large holder liquidation impact
 * @returns Score 0-100 (higher = more risky)
 */
export function calculateExitRiskScore(holders, liquidityUSD) {
  if (!holders || holders.length === 0 || !liquidityUSD) {
    return null;
  }

  let score = 0;

  // Factor 1: Top holder vs liquidity (0-40 points)
  // If top holder can drain significant liquidity
  const top10Total = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
  // Estimate top 10 value as percentage of total supply
  // If top 10 could cause > 50% slippage, very risky
  const estimatedImpact = (top10Total / 100) * 5; // Rough 5x multiplier for impact

  if (estimatedImpact > 100) score += 40;
  else if (estimatedImpact > 50) score += 30;
  else if (estimatedImpact > 20) score += 20;
  else if (estimatedImpact > 10) score += 10;

  // Factor 2: Liquidity depth (0-30 points)
  if (liquidityUSD < 10000) score += 30;
  else if (liquidityUSD < 50000) score += 20;
  else if (liquidityUSD < 100000) score += 15;
  else if (liquidityUSD < 500000) score += 8;

  // Factor 3: Concentration risk (0-30 points)
  const gini = calculateGiniCoefficient(holders);
  if (gini !== null) {
    if (gini > 0.9) score += 30;
    else if (gini > 0.8) score += 22;
    else if (gini > 0.7) score += 15;
    else if (gini > 0.6) score += 8;
  }

  return Math.min(100, Math.round(score));
}

/**
 * Identify smart money wallets
 * Based on wallet age, transaction history, and known addresses
 */
export async function calculateSmartMoneyRatio(holders, chain) {
  if (!holders || holders.length === 0) return 0;

  let smartMoneyCount = 0;
  const analyzed = Math.min(20, holders.length);

  for (const holder of holders.slice(0, analyzed)) {
    let isSmartMoney = false;

    // Check wallet age (> 180 days is a positive signal)
    const age = await getWalletAge(holder.address, chain);
    if (age && age.ageInDays > 180) {
      isSmartMoney = true;
    }

    // Check if known exchange/institution
    const info = identifyAddressType(holder.address);
    if (info.type === 'exchange' || info.type === 'institution') {
      isSmartMoney = true;
    }

    if (isSmartMoney) smartMoneyCount++;
  }

  return (smartMoneyCount / analyzed) * 100;
}

// ============================================================================
// TEMPORAL ANALYSIS
// ============================================================================

/**
 * Detect coordinated buying - purchases within a short time window
 */
export function detectCoordinatedBuying(transactions, timeWindowSeconds = 300) {
  if (!transactions || transactions.length < 2) {
    return {
      detected: false,
      coordinatedPercentage: 0,
      groups: [],
    };
  }

  // Sort by timestamp
  const sorted = [...transactions]
    .filter(tx => tx.timestamp)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const groups = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const timeDiff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / 1000;

    if (timeDiff <= timeWindowSeconds) {
      currentGroup.push(sorted[i]);
    } else {
      if (currentGroup.length >= 3) {
        groups.push({
          transactions: currentGroup,
          count: currentGroup.length,
          startTime: currentGroup[0].timestamp,
          endTime: currentGroup[currentGroup.length - 1].timestamp,
          uniqueWallets: new Set(currentGroup.map(tx => tx.to || tx.from)).size,
        });
      }
      currentGroup = [sorted[i]];
    }
  }

  // Don't forget the last group
  if (currentGroup.length >= 3) {
    groups.push({
      transactions: currentGroup,
      count: currentGroup.length,
      startTime: currentGroup[0].timestamp,
      endTime: currentGroup[currentGroup.length - 1].timestamp,
      uniqueWallets: new Set(currentGroup.map(tx => tx.to || tx.from)).size,
    });
  }

  const coordinatedCount = groups.reduce((sum, g) => sum + g.count, 0);
  const coordinatedPercentage = (coordinatedCount / sorted.length) * 100;

  return {
    detected: groups.length > 0,
    coordinatedPercentage,
    groups: groups.slice(0, 10), // Top 10 groups
  };
}

/**
 * Detect sniper activity - first-block buyers
 */
export function detectSniperActivity(transactions, tokenLaunchTime) {
  if (!transactions || transactions.length === 0 || !tokenLaunchTime) {
    return {
      detected: false,
      sniperCount: 0,
      sniperWallets: [],
    };
  }

  const launchTime = new Date(tokenLaunchTime).getTime();
  const sniperWindow = 60000; // First 60 seconds

  const sniperTxs = transactions.filter(tx => {
    if (!tx.timestamp) return false;
    const txTime = new Date(tx.timestamp).getTime();
    return txTime >= launchTime && txTime <= launchTime + sniperWindow;
  });

  const sniperWallets = [...new Set(sniperTxs.map(tx => tx.to || tx.from))];

  return {
    detected: sniperWallets.length > 0,
    sniperCount: sniperWallets.length,
    sniperWallets: sniperWallets.slice(0, 20),
    firstMinuteVolume: sniperTxs.reduce((sum, tx) => sum + (parseFloat(tx.value) || 0), 0),
  };
}

/**
 * Analyze holding durations for all holders
 */
export async function analyzeHoldingDurations(holders, transactions) {
  if (!holders || holders.length === 0) {
    return {
      avgHoldingDays: 0,
      diamondHandsRatio: 0,
      paperHandsRatio: 0,
    };
  }

  // Simplified: estimate based on first transaction dates
  // In production, you'd track actual buy/sell events per wallet

  const holdingDays = [];
  const now = Date.now();

  for (const holder of holders.slice(0, 30)) {
    // Find first buy transaction for this holder
    const buyTx = transactions?.find(tx =>
      tx.to?.toLowerCase() === holder.address.toLowerCase()
    );

    if (buyTx && buyTx.timestamp) {
      const buyTime = new Date(buyTx.timestamp).getTime();
      const days = (now - buyTime) / (1000 * 60 * 60 * 24);
      holdingDays.push(days);
    }
  }

  if (holdingDays.length === 0) {
    return {
      avgHoldingDays: 0,
      diamondHandsRatio: 0,
      paperHandsRatio: 0,
    };
  }

  const avgHoldingDays = holdingDays.reduce((a, b) => a + b, 0) / holdingDays.length;
  const diamondHands = holdingDays.filter(d => d > 30).length;
  const paperHands = holdingDays.filter(d => d < 7).length;

  return {
    avgHoldingDays: Math.round(avgHoldingDays),
    diamondHandsRatio: (diamondHands / holdingDays.length) * 100,
    paperHandsRatio: (paperHands / holdingDays.length) * 100,
  };
}

// ============================================================================
// ENHANCED HOLDER ANALYSIS - MAIN FUNCTION
// ============================================================================

/**
 * Run all holder analysis checks (enhanced version)
 */
export async function runHolderAnalysis(contractAddress, chain, options = {}) {
  const {
    tokenCreationDate = null,
    deployerAddress = null,
    liquidityUSD = null,
  } = options;

  const results = {
    // Basic checks (existing)
    TOP_HOLDER_WALLET_AGE: null,
    CONNECTED_WALLETS: null,
    WASH_TRADING_DETECTION: null,

    // New concentration metrics
    GINI_COEFFICIENT: null,
    NAKAMOTO_COEFFICIENT: null,
    HOLDER_DISTRIBUTION: null,
    EFFECTIVE_HOLDER_COUNT: null,

    // New risk scores
    SYBIL_SCORE: null,
    INSIDER_SCORE: null,
    EXIT_RISK_SCORE: null,
    SMART_MONEY_RATIO: null,

    // New temporal analysis
    COORDINATED_BUYING: null,
    SNIPER_ACTIVITY: null,
    HOLDING_DURATIONS: null,

    // Graph data for visualization
    FUNDING_GRAPH: null,

    errors: [],
  };

  try {
    // Get holders
    let holders = [];
    if (chain === 'SOLANA') {
      holders = await getSolanaTopHolders(contractAddress);
    } else {
      // EVM chains - use Etherscan
      holders = await getEVMTopHolders(contractAddress, chain);
    }

    console.log(`[Holder Analysis] Found ${holders.length} holders for ${chain} token`)

    // Get transactions
    const transactions = await getTokenTransactions(contractAddress, chain, 200);

    // ========== BASIC CHECKS ==========
    if (holders.length > 0) {
      try {
        results.TOP_HOLDER_WALLET_AGE = await analyzeTopHolderWalletAge(holders, chain);
      } catch (error) {
        console.error('Wallet age analysis error:', error);
        results.errors.push({ check: 'TOP_HOLDER_WALLET_AGE', error: error.message });
      }

      try {
        results.CONNECTED_WALLETS = await detectConnectedWallets(holders, chain);
      } catch (error) {
        console.error('Connected wallets analysis error:', error);
        results.errors.push({ check: 'CONNECTED_WALLETS', error: error.message });
      }
    } else {
      results.TOP_HOLDER_WALLET_AGE = {
        passed: null,
        value: null,
        details: 'No holder data available',
        severity: 'HIGH',
      };
      results.CONNECTED_WALLETS = {
        passed: null,
        value: null,
        details: 'No holder data available',
        severity: 'CRITICAL',
      };
    }

    // Wash trading analysis
    try {
      results.WASH_TRADING_DETECTION = await detectWashTrading(transactions, contractAddress);
    } catch (error) {
      console.error('Wash trading analysis error:', error);
      results.errors.push({ check: 'WASH_TRADING_DETECTION', error: error.message });
    }

    // ========== CONCENTRATION METRICS ==========
    try {
      const gini = calculateGiniCoefficient(holders);
      results.GINI_COEFFICIENT = {
        passed: gini !== null ? gini < 0.8 : null,
        value: gini,
        details: gini !== null
          ? `Gini coefficient: ${gini.toFixed(3)} (${gini < 0.6 ? 'healthy' : gini < 0.8 ? 'moderate' : 'highly concentrated'})`
          : 'Unable to calculate',
        severity: 'HIGH',
      };
    } catch (error) {
      results.errors.push({ check: 'GINI_COEFFICIENT', error: error.message });
    }

    try {
      const nakamoto = calculateNakamotoCoefficient(holders);
      results.NAKAMOTO_COEFFICIENT = {
        passed: nakamoto !== null ? nakamoto > 5 : null,
        value: nakamoto,
        details: nakamoto !== null
          ? `${nakamoto} wallets needed for 51% control`
          : 'Unable to calculate',
        severity: 'HIGH',
      };
    } catch (error) {
      results.errors.push({ check: 'NAKAMOTO_COEFFICIENT', error: error.message });
    }

    try {
      results.HOLDER_DISTRIBUTION = {
        passed: true,
        value: getHolderDistribution(holders),
        details: 'Distribution calculated',
        severity: 'MEDIUM',
      };
    } catch (error) {
      results.errors.push({ check: 'HOLDER_DISTRIBUTION', error: error.message });
    }

    // ========== BUILD FUNDING GRAPH ==========
    let fundingGraph = null;
    let clusters = [];
    try {
      fundingGraph = await buildFundingGraph(holders, chain);
      clusters = fundingGraph?.clusters || [];
      results.FUNDING_GRAPH = {
        passed: true,
        value: fundingGraph,
        details: `Graph built with ${fundingGraph?.nodes?.size || 0} nodes and ${fundingGraph?.edges?.length || 0} edges`,
        severity: 'MEDIUM',
      };
    } catch (error) {
      console.error('Funding graph error:', error);
      results.errors.push({ check: 'FUNDING_GRAPH', error: error.message });
    }

    // Effective holder count
    try {
      const effective = calculateEffectiveHolderCount(holders, clusters);
      results.EFFECTIVE_HOLDER_COUNT = {
        passed: effective > 10,
        value: effective,
        details: `${effective} effective holders (adjusted for ${clusters.length} clusters)`,
        severity: 'HIGH',
      };
    } catch (error) {
      results.errors.push({ check: 'EFFECTIVE_HOLDER_COUNT', error: error.message });
    }

    // ========== RISK SCORES ==========
    const walletAges = results.TOP_HOLDER_WALLET_AGE?.rawData || [];

    try {
      const sybilScore = await calculateSybilScore(holders, clusters, fundingGraph, walletAges);
      results.SYBIL_SCORE = {
        passed: sybilScore < 60,
        value: sybilScore,
        details: sybilScore !== null
          ? `Sybil probability: ${sybilScore}% (${sybilScore < 30 ? 'low' : sybilScore < 60 ? 'moderate' : 'high'})`
          : 'Unable to calculate',
        severity: 'CRITICAL',
      };
    } catch (error) {
      results.errors.push({ check: 'SYBIL_SCORE', error: error.message });
    }

    try {
      const insiderScore = await calculateInsiderScore(holders, chain, tokenCreationDate, deployerAddress);
      results.INSIDER_SCORE = {
        passed: insiderScore < 50,
        value: insiderScore,
        details: insiderScore !== null
          ? `Insider likelihood: ${insiderScore}%`
          : 'Unable to calculate',
        severity: 'CRITICAL',
      };
    } catch (error) {
      results.errors.push({ check: 'INSIDER_SCORE', error: error.message });
    }

    try {
      const exitRisk = calculateExitRiskScore(holders, liquidityUSD);
      results.EXIT_RISK_SCORE = {
        passed: exitRisk !== null ? exitRisk < 70 : null,
        value: exitRisk,
        details: exitRisk !== null
          ? `Exit risk: ${exitRisk}% (${exitRisk < 40 ? 'low' : exitRisk < 70 ? 'moderate' : 'high'})`
          : 'Unable to calculate (liquidity data required)',
        severity: 'HIGH',
      };
    } catch (error) {
      results.errors.push({ check: 'EXIT_RISK_SCORE', error: error.message });
    }

    try {
      const smartMoney = await calculateSmartMoneyRatio(holders, chain);
      results.SMART_MONEY_RATIO = {
        passed: smartMoney > 20,
        value: smartMoney,
        details: `${smartMoney.toFixed(1)}% smart money among top holders`,
        severity: 'MEDIUM',
      };
    } catch (error) {
      results.errors.push({ check: 'SMART_MONEY_RATIO', error: error.message });
    }

    // ========== TEMPORAL ANALYSIS ==========
    try {
      const coordinated = detectCoordinatedBuying(transactions);
      results.COORDINATED_BUYING = {
        passed: !coordinated.detected || coordinated.coordinatedPercentage < 25,
        value: coordinated.coordinatedPercentage,
        details: coordinated.detected
          ? `${coordinated.coordinatedPercentage.toFixed(1)}% of transactions appear coordinated (${coordinated.groups.length} groups)`
          : 'No significant coordinated buying detected',
        severity: 'HIGH',
        rawData: coordinated,
      };
    } catch (error) {
      results.errors.push({ check: 'COORDINATED_BUYING', error: error.message });
    }

    try {
      const snipers = detectSniperActivity(transactions, tokenCreationDate);
      results.SNIPER_ACTIVITY = {
        passed: !snipers.detected || snipers.sniperCount < 5,
        value: snipers.sniperCount,
        details: snipers.detected
          ? `${snipers.sniperCount} sniper wallets detected in first minute`
          : 'No sniper activity detected',
        severity: 'MEDIUM',
        rawData: snipers,
      };
    } catch (error) {
      results.errors.push({ check: 'SNIPER_ACTIVITY', error: error.message });
    }

    try {
      const holding = await analyzeHoldingDurations(holders, transactions);
      results.HOLDING_DURATIONS = {
        passed: holding.diamondHandsRatio > 30,
        value: holding.avgHoldingDays,
        details: `Avg holding: ${holding.avgHoldingDays} days | Diamond hands: ${holding.diamondHandsRatio.toFixed(1)}% | Paper hands: ${holding.paperHandsRatio.toFixed(1)}%`,
        severity: 'LOW',
        rawData: holding,
      };
    } catch (error) {
      results.errors.push({ check: 'HOLDING_DURATIONS', error: error.message });
    }

  } catch (error) {
    console.error('Holder analysis error:', error);
    results.errors.push({ check: 'general', error: error.message });
  }

  return results;
}
