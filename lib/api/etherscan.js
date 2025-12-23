// Etherscan V2 API Client
// Documentation: https://docs.etherscan.io/etherscan-v2

const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/v2/api';

/**
 * Get contract source code verification status
 * @param {string} address - Contract address
 * @param {string} chainId - Etherscan chain ID
 * @returns {Promise<Object>} Contract source data
 */
export async function getContractSource(address, chainId) {
  const apiKey = process.env.ETHERSCAN_API_KEY;

  try {
    const params = new URLSearchParams({
      chainid: chainId,
      module: 'contract',
      action: 'getsourcecode',
      address: address,
      ...(apiKey && { apikey: apiKey }),
    });

    const url = `${ETHERSCAN_BASE_URL}?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== '1') {
      // Not verified or error - return null instead of throwing
      if (data.message === 'NOTOK' || data.result === 'Contract source code not verified') {
        return { verified: false, data: null };
      }
      throw new Error(data.message || 'Etherscan API error');
    }

    return { verified: true, data: data.result?.[0] || data.result };
  } catch (error) {
    console.error('Etherscan API error:', error);
    throw error;
  }
}

/**
 * Get contract creation info
 * @param {string} address - Contract address
 * @param {string} chainId - Etherscan chain ID
 * @returns {Promise<Object>} Contract creation data
 */
export async function getContractCreation(address, chainId) {
  const apiKey = process.env.ETHERSCAN_API_KEY;

  try {
    const params = new URLSearchParams({
      chainid: chainId,
      module: 'contract',
      action: 'getcontractcreation',
      contractaddresses: address,
      ...(apiKey && { apikey: apiKey }),
    });

    const url = `${ETHERSCAN_BASE_URL}?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== '1') {
      return null;
    }

    return data.result?.[0];
  } catch (error) {
    console.error('Etherscan API error:', error);
    throw error;
  }
}

/**
 * Get transaction details
 * @param {string} txHash - Transaction hash
 * @param {string} chainId - Etherscan chain ID
 * @returns {Promise<Object>} Transaction data
 */
export async function getTransaction(txHash, chainId) {
  const apiKey = process.env.ETHERSCAN_API_KEY;

  try {
    const params = new URLSearchParams({
      chainid: chainId,
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash: txHash,
      ...(apiKey && { apikey: apiKey }),
    });

    const url = `${ETHERSCAN_BASE_URL}?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Etherscan API error:', error);
    throw error;
  }
}

/**
 * Parse Etherscan response into structured checks
 * @param {Object} sourceData - Contract source data
 * @param {Object} creationData - Contract creation data
 * @returns {Object} Structured check results
 */
export function parseEtherscanChecks(sourceData, creationData) {
  const checks = {
    // Contract verification
    CONTRACT_VERIFIED: {
      passed: sourceData?.verified === true && sourceData?.data?.SourceCode !== '',
      value: sourceData?.verified === true,
      details: sourceData?.verified
        ? `Verified: ${sourceData?.data?.ContractName || 'Unknown'}`
        : 'Contract source code not verified',
    },

    // Contract age
    CONTRACT_AGE: {
      passed: true, // Will be updated based on creation date
      value: null,
      details: 'Contract age could not be determined',
    },

    // Creator analysis
    CREATOR_ANALYSIS: {
      passed: !!creationData?.contractCreator,
      value: creationData?.contractCreator,
      details: creationData?.contractCreator
        ? `Creator: ${creationData.contractCreator.slice(0, 10)}...`
        : 'Creator address unknown',
    },
  };

  // Calculate contract age if we have creation tx
  if (creationData?.txHash) {
    // Note: Would need block timestamp for accurate age calculation
    checks.CONTRACT_AGE.details = `Created in tx: ${creationData.txHash.slice(0, 10)}...`;
  }

  // Calculate score
  const passedChecks = Object.values(checks).filter(c => c.passed).length;
  const totalChecks = Object.keys(checks).length;
  const score = (passedChecks / totalChecks) * 100;

  return {
    checks,
    score,
    rawData: {
      source: sourceData?.data,
      creation: creationData,
    },
    contractInfo: sourceData?.data ? {
      name: sourceData.data.ContractName,
      compiler: sourceData.data.CompilerVersion,
      optimization: sourceData.data.OptimizationUsed === '1',
      runs: sourceData.data.Runs,
      evmVersion: sourceData.data.EVMVersion,
      licenseType: sourceData.data.LicenseType,
    } : null,
    creatorInfo: creationData ? {
      creator: creationData.contractCreator,
      txHash: creationData.txHash,
    } : null,
  };
}
