import { DCA, Network } from '@jup-ag/dca-sdk';
import { Connection, PublicKey } from '@solana/web3.js';

// DCA Program address on mainnet
export const DCA_PROGRAM_ID = 'DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M';

// Frequency options in seconds
export const DCA_FREQUENCIES = {
  hourly: 3600,
  daily: 86400,
  weekly: 604800,
  biweekly: 1209600,
  monthly: 2592000, // ~30 days
};

/**
 * Create a Jupiter DCA instance
 * @param {Connection} connection - Solana connection
 * @returns {DCA} DCA instance
 */
export function createDcaClient(connection) {
  return new DCA(connection, Network.MAINNET);
}

/**
 * Build create DCA transaction parameters
 * @param {Object} params
 * @param {PublicKey} params.userPublicKey - User's wallet public key
 * @param {string} params.inputMint - Input token mint (usually SOL)
 * @param {string} params.outputMint - Output token mint
 * @param {number} params.totalAmount - Total amount to DCA (in token decimals)
 * @param {number} params.amountPerCycle - Amount per cycle (in token decimals)
 * @param {number} params.cycleSeconds - Seconds between cycles
 * @param {number} params.startAt - Optional start timestamp (unix seconds)
 * @returns {Object} DCA parameters for createDcaV2
 */
export function buildDcaParams({
  userPublicKey,
  inputMint,
  outputMint,
  totalAmount,
  amountPerCycle,
  cycleSeconds,
  startAt = null,
}) {
  const params = {
    payer: userPublicKey,
    user: userPublicKey,
    inAmount: BigInt(totalAmount),
    inAmountPerCycle: BigInt(amountPerCycle),
    cycleSecondsApart: BigInt(cycleSeconds),
    inputMint: new PublicKey(inputMint),
    outputMint: new PublicKey(outputMint),
  };

  // Add optional start time
  if (startAt) {
    params.startAt = BigInt(Math.floor(startAt / 1000)); // Convert ms to seconds
  }

  return params;
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports) {
  return Number(lamports) / 1e9;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol) {
  return Math.floor(sol * 1e9);
}

/**
 * Parse DCA account data into readable format
 * @param {Object} dcaAccount - DCA account from SDK
 * @returns {Object} Parsed DCA data
 */
export function parseDcaAccount(dcaAccount) {
  const account = dcaAccount.account;

  return {
    publicKey: dcaAccount.publicKey.toBase58(),
    user: account.user.toBase58(),
    inputMint: account.inputMint.toBase58(),
    outputMint: account.outputMint.toBase58(),
    // Amounts
    inDeposited: account.inDeposited.toString(),
    inWithdrawn: account.inWithdrawn.toString(),
    inUsed: account.inUsed.toString(),
    outWithdrawn: account.outWithdrawn.toString(),
    outReceived: account.outReceived.toString(),
    // Schedule
    inAmountPerCycle: account.inAmountPerCycle.toString(),
    cycleFrequency: Number(account.cycleFrequency),
    nextCycleAt: Number(account.nextCycleAt) * 1000, // Convert to ms
    createdAt: Number(account.createdAt) * 1000,
    // Status calculations
    totalCycles: Math.ceil(
      Number(account.inDeposited) / Number(account.inAmountPerCycle)
    ),
    cyclesCompleted: Math.floor(
      Number(account.inUsed) / Number(account.inAmountPerCycle)
    ),
    remainingBalance: (
      BigInt(account.inDeposited) -
      BigInt(account.inWithdrawn) -
      BigInt(account.inUsed)
    ).toString(),
  };
}

/**
 * Get frequency label from seconds
 */
export function getFrequencyLabel(seconds) {
  if (seconds <= 3600) return 'Hourly';
  if (seconds <= 86400) return 'Daily';
  if (seconds <= 604800) return 'Weekly';
  if (seconds <= 1209600) return 'Every 2 weeks';
  return 'Monthly';
}
