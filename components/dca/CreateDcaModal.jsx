'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Package,
  Coins,
  Loader2,
  AlertCircle,
  Calendar,
  CheckCircle,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { DCA, Network } from '@jup-ag/dca-sdk';
import { PublicKey } from '@solana/web3.js';
import { cn } from '@/lib/utils';
import { useSolBalance, useSolPrice } from '@/lib/jupiter/hooks';
import { SOL_MINT } from '@/lib/jupiter/client';
import { DCA_FREQUENCIES, solToLamports } from '@/lib/jupiter/dca';

const frequencies = [
  { id: 'daily', label: 'Daily', seconds: DCA_FREQUENCIES.daily },
  { id: 'weekly', label: 'Weekly', seconds: DCA_FREQUENCIES.weekly },
  { id: 'biweekly', label: 'Every 2 weeks', seconds: DCA_FREQUENCIES.biweekly },
  { id: 'monthly', label: 'Monthly', seconds: DCA_FREQUENCIES.monthly },
];

// Phases for pack DCA creation
const PHASE = {
  INPUT: 'input',
  BUILDING: 'building',
  SIGNING: 'signing',
  CONFIRMING: 'confirming',
  COMPLETE: 'complete',
};

export function CreateDcaModal({
  isOpen,
  onClose,
  packs = [],
  watchlistTokens = [],
  preselectedPackId,
}) {
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const { balance: solBalance } = useSolBalance();
  const { price: solPrice } = useSolPrice();

  const [mode, setMode] = useState('token'); // 'token' or 'pack'
  const [displayMode, setDisplayMode] = useState('sol'); // 'sol' or 'usd'
  const [name, setName] = useState('');
  const [selectedPack, setSelectedPack] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [totalBudget, setTotalBudget] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [amountPerPeriod, setAmountPerPeriod] = useState('');
  const [startDate, setStartDate] = useState('');

  const [phase, setPhase] = useState(PHASE.INPUT);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [buildProgress, setBuildProgress] = useState({ current: 0, total: 0 });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (preselectedPackId) {
        const pack = packs.find((p) => p.id === preselectedPackId);
        if (pack) {
          setSelectedPack(pack);
          setMode('pack');
          setName(`DCA ${pack.name}`);
        }
      } else {
        setMode('token');
        setName('');
        setSelectedPack(null);
        setSelectedToken(null);
      }
      setTotalBudget('');
      setAmountPerPeriod('');
      setError('');
      setSuccess(null);
      setPhase(PHASE.INPUT);
      setBuildProgress({ current: 0, total: 0 });
    }
  }, [isOpen, preselectedPackId, packs]);

  // Auto-generate name based on selection
  useEffect(() => {
    if (mode === 'pack' && selectedPack && !name) {
      setName(`DCA ${selectedPack.name}`);
    } else if (mode === 'token' && selectedToken && !name) {
      setName(`DCA ${selectedToken.symbol}`);
    }
  }, [mode, selectedPack, selectedToken]);

  // Helper to format amount based on display mode
  const formatValue = (solAmount) => {
    if (displayMode === 'usd' && solPrice > 0) {
      return `$${(solAmount * solPrice).toFixed(2)}`;
    }
    return `${solAmount.toFixed(4)} SOL`;
  };

  // Calculate number of buys
  const budgetNum = parseFloat(totalBudget) || 0;
  const perPeriodNum = parseFloat(amountPerPeriod) || 0;
  const numBuys = perPeriodNum > 0 ? Math.ceil(budgetNum / perPeriodNum) : 0;
  const selectedFreq = frequencies.find((f) => f.id === frequency);
  const durationDays = numBuys * (selectedFreq?.seconds / 86400 || 7);

  const handleSubmit = async () => {
    setError('');
    setSuccess(null);

    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a schedule name');
      return;
    }

    if (mode === 'token' && !selectedToken) {
      setError('Please select a token');
      return;
    }

    if (mode === 'pack' && !selectedPack) {
      setError('Please select a pack');
      return;
    }

    if (budgetNum <= 0) {
      setError('Please enter a valid total budget');
      return;
    }

    if (perPeriodNum <= 0) {
      setError('Please enter a valid amount per period');
      return;
    }

    if (perPeriodNum > budgetNum) {
      setError('Amount per period cannot exceed total budget');
      return;
    }

    if (budgetNum > solBalance) {
      setError('Insufficient SOL balance');
      return;
    }

    try {
      setPhase(PHASE.BUILDING);

      // Create Jupiter DCA instance
      const dca = new DCA(connection, Network.MAINNET);

      // Get cycle frequency in seconds
      const cycleSeconds = BigInt(selectedFreq.seconds);

      // Build start time if specified
      let startAt;
      if (startDate) {
        const startTimestamp = new Date(startDate).getTime();
        startAt = BigInt(Math.floor(startTimestamp / 1000));
      }

      if (mode === 'token') {
        // Single token DCA
        const totalLamports = BigInt(solToLamports(budgetNum));
        const perCycleLamports = BigInt(solToLamports(perPeriodNum));

        const params = {
          payer: publicKey,
          user: publicKey,
          inAmount: totalLamports,
          inAmountPerCycle: perCycleLamports,
          cycleSecondsApart: cycleSeconds,
          inputMint: new PublicKey(SOL_MINT),
          outputMint: new PublicKey(selectedToken.address),
          ...(startAt && { startAt }),
        };

        const { tx, dcaPubKey } = await dca.createDcaV2(params);

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        setPhase(PHASE.SIGNING);

        // Sign with wallet
        const signedTx = await signTransaction(tx);

        setPhase(PHASE.CONFIRMING);

        // Send transaction
        const txId = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        // Wait for confirmation
        await connection.confirmTransaction({
          signature: txId,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');

        // Save to database
        await fetch('/api/dca', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            tokenAddress: selectedToken.address,
            symbol: selectedToken.symbol,
            totalBudget: budgetNum,
            amountPerPeriod: perPeriodNum,
            frequency,
            jupiterDcaPubkey: dcaPubKey.toBase58(),
            txSignature: txId,
          }),
        });

        setSuccess({
          mode: 'token',
          dcaPubKey: dcaPubKey.toBase58(),
          txSignature: txId,
        });

      } else {
        // Pack DCA - create multiple Jupiter DCAs
        const tokens = selectedPack.tokens || [];
        setBuildProgress({ current: 0, total: tokens.length });

        const transactions = [];
        const dcaAccounts = [];

        // Build all transactions
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          const tokenBudget = budgetNum * (token.weight / 100);
          const tokenPerPeriod = perPeriodNum * (token.weight / 100);

          if (tokenBudget < 0.001) continue; // Skip tiny amounts

          const totalLamports = BigInt(solToLamports(tokenBudget));
          const perCycleLamports = BigInt(solToLamports(tokenPerPeriod));

          const params = {
            payer: publicKey,
            user: publicKey,
            inAmount: totalLamports,
            inAmountPerCycle: perCycleLamports,
            cycleSecondsApart: cycleSeconds,
            inputMint: new PublicKey(SOL_MINT),
            outputMint: new PublicKey(token.tokenAddress),
            ...(startAt && { startAt }),
          };

          const { tx, dcaPubKey } = await dca.createDcaV2(params);
          transactions.push(tx);
          dcaAccounts.push({
            pubkey: dcaPubKey.toBase58(),
            symbol: token.symbol,
            tokenAddress: token.tokenAddress,
            budget: tokenBudget,
            perPeriod: tokenPerPeriod,
          });

          setBuildProgress({ current: i + 1, total: tokens.length });
        }

        if (transactions.length === 0) {
          throw new Error('No valid tokens to create DCA for');
        }

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        // Set blockhash for all transactions
        transactions.forEach(tx => {
          tx.recentBlockhash = blockhash;
          tx.feePayer = publicKey;
        });

        setPhase(PHASE.SIGNING);

        // Sign all transactions at once
        const signedTransactions = await signAllTransactions(transactions);

        setPhase(PHASE.CONFIRMING);

        // Send all transactions
        const txSignatures = [];
        for (const signedTx of signedTransactions) {
          const txId = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });
          txSignatures.push(txId);
        }

        // Wait for confirmations
        await Promise.all(
          txSignatures.map(sig =>
            connection.confirmTransaction({
              signature: sig,
              blockhash,
              lastValidBlockHeight,
            }, 'confirmed')
          )
        );

        // Save each DCA to database
        for (let i = 0; i < dcaAccounts.length; i++) {
          const account = dcaAccounts[i];
          await fetch('/api/dca', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${name.trim()} - ${account.symbol}`,
              packId: selectedPack.id,
              tokenAddress: account.tokenAddress,
              symbol: account.symbol,
              totalBudget: account.budget,
              amountPerPeriod: account.perPeriod,
              frequency,
              jupiterDcaPubkey: account.pubkey,
              txSignature: txSignatures[i],
            }),
          });
        }

        setSuccess({
          mode: 'pack',
          packName: selectedPack.name,
          dcaCount: dcaAccounts.length,
          dcaAccounts,
          txSignatures,
        });
      }

      setPhase(PHASE.COMPLETE);

    } catch (err) {
      console.error('DCA creation error:', err);

      let errorMessage = err.message;
      if (err.message?.includes('User rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message?.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance for transaction';
      }

      setError(errorMessage);
      setPhase(PHASE.INPUT);
    }
  };

  if (!isOpen) return null;

  // Loading/Building states
  if (phase !== PHASE.INPUT && phase !== PHASE.COMPLETE) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-6">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-brand-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {phase === PHASE.BUILDING && 'Building DCA Transactions...'}
              {phase === PHASE.SIGNING && 'Sign in Wallet'}
              {phase === PHASE.CONFIRMING && 'Confirming Transactions...'}
            </h3>
            <p className="text-gray-400 text-sm">
              {phase === PHASE.BUILDING && mode === 'pack' && buildProgress.total > 0 && (
                `Preparing ${buildProgress.current}/${buildProgress.total} DCA positions`
              )}
              {phase === PHASE.BUILDING && mode === 'token' && 'Preparing Jupiter DCA transaction'}
              {phase === PHASE.SIGNING && 'Please approve the transaction(s) in your wallet'}
              {phase === PHASE.CONFIRMING && 'Waiting for blockchain confirmation'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (phase === PHASE.COMPLETE && success) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {success.mode === 'pack' ? 'Pack DCA Created!' : 'DCA Created!'}
            </h3>
            <p className="text-gray-400 mb-4">
              {success.mode === 'pack'
                ? `Created ${success.dcaCount} Jupiter DCA positions for ${success.packName}`
                : 'Your Jupiter DCA is now active and will execute automatically.'}
            </p>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-green-400 mb-1 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" />
                Auto-executing on Jupiter
              </p>
              <p className="text-xs text-gray-400">
                Your DCA{success.mode === 'pack' ? 's' : ''} will execute automatically
              </p>
            </div>

            {success.mode === 'token' && (
              <div className="bg-dark-bg rounded-lg p-4 mb-4 text-left">
                <p className="text-xs text-gray-500 mb-1">DCA Account</p>
                <p className="text-sm text-white font-mono break-all">{success.dcaPubKey}</p>
              </div>
            )}

            {success.mode === 'pack' && success.dcaAccounts && (
              <div className="bg-dark-bg rounded-lg p-4 mb-4 text-left space-y-2">
                <p className="text-xs text-gray-500 mb-2">DCA Accounts</p>
                {success.dcaAccounts.map((acc, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{acc.symbol}</span>
                    <a
                      href={`https://jup.ag/dca/${acc.pubkey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:text-brand-300 flex items-center gap-1 font-mono text-xs"
                    >
                      {acc.pubkey.slice(0, 8)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {success.txSignature && (
              <a
                href={`https://solscan.io/tx/${success.txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm"
              >
                View Transaction <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="w-full mt-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-xl text-white font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Branding */}
        <div className="flex items-center justify-center gap-2 pt-4 pb-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-lg blur-md opacity-50" />
            <img src="/icon.svg" alt="Maze" className="relative w-7 h-7" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Maze
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-dark-border sticky top-0 bg-dark-card z-10">
          <div>
            <h2 className="text-lg font-semibold text-white">Create DCA Schedule</h2>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Zap className="w-3 h-3 text-green-400" />
              Powered by Jupiter DCA - Auto-executing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* SOL Price Indicator */}
          {solPrice > 0 && (
            <div className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-dark-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">S</span>
                </div>
                <span className="text-gray-400 text-sm">SOL Price</span>
              </div>
              <span className="text-white font-medium">${solPrice.toFixed(2)}</span>
            </div>
          )}

          {/* Display Mode Toggle */}
          <div className="flex items-center justify-end gap-1">
            <span className="text-xs text-gray-500 mr-2">Show values in:</span>
            <button
              onClick={() => setDisplayMode('sol')}
              className={cn(
                'px-2 py-1 rounded text-xs transition-colors',
                displayMode === 'sol'
                  ? 'bg-brand-400/20 text-brand-400'
                  : 'bg-dark-bg text-gray-400 hover:text-white'
              )}
            >
              SOL
            </button>
            <button
              onClick={() => setDisplayMode('usd')}
              className={cn(
                'px-2 py-1 rounded text-xs transition-colors',
                displayMode === 'usd'
                  ? 'bg-brand-400/20 text-brand-400'
                  : 'bg-dark-bg text-gray-400 hover:text-white'
              )}
            >
              USD
            </button>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">What to buy?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('token');
                  setSelectedPack(null);
                }}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                  mode === 'token'
                    ? 'bg-brand-400/10 border-brand-400/50'
                    : 'bg-dark-bg border-dark-border hover:border-gray-600'
                )}
              >
                <Coins className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white">Single Token</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('pack');
                  setSelectedToken(null);
                }}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                  mode === 'pack'
                    ? 'bg-brand-400/10 border-brand-400/50'
                    : 'bg-dark-bg border-dark-border hover:border-gray-600'
                )}
              >
                <Package className="w-4 h-4 text-brand-400" />
                <span className="text-sm text-white">Token Pack</span>
              </button>
            </div>
          </div>

          {/* Token Selection */}
          {mode === 'token' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select Token</label>
              {watchlistTokens.length === 0 ? (
                <p className="text-sm text-gray-500 p-3 bg-dark-bg rounded-lg">
                  No Solana tokens in watchlist. Add some tokens first.
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {watchlistTokens.map((token) => (
                    <button
                      key={token.address}
                      type="button"
                      onClick={() => setSelectedToken(token)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left',
                        selectedToken?.address === token.address
                          ? 'bg-brand-400/10'
                          : 'hover:bg-dark-hover'
                      )}
                    >
                      {token.logoURI ? (
                        <img
                          src={token.logoURI}
                          alt={token.symbol}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-dark-card flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-400">
                            {token.symbol?.slice(0, 2)}
                          </span>
                        </div>
                      )}
                      <span className="text-white">{token.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pack Selection */}
          {mode === 'pack' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select Pack</label>
              {packs.length === 0 ? (
                <p className="text-sm text-gray-500 p-3 bg-dark-bg rounded-lg">
                  No packs created yet. Create a pack first.
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {packs.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => setSelectedPack(pack)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left',
                        selectedPack?.id === pack.id
                          ? 'bg-brand-400/10 border border-brand-400/50'
                          : 'bg-dark-bg hover:bg-dark-hover border border-dark-border'
                      )}
                    >
                      <div>
                        <p className="text-white font-medium">{pack.name}</p>
                        <p className="text-xs text-gray-500">
                          {pack.tokens?.length || 0} tokens
                        </p>
                      </div>
                      <div className="flex -space-x-1">
                        {pack.tokens?.slice(0, 4).map((t, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-full bg-dark-card border border-dark-border flex items-center justify-center"
                          >
                            <span className="text-[8px] text-gray-400">
                              {t.symbol?.slice(0, 2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Pack Distribution Preview */}
              {selectedPack && selectedPack.tokens && budgetNum > 0 && (
                <div className="mt-3 p-3 bg-dark-bg rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">Per-token allocation</p>
                    <p className="text-xs text-white font-medium">Total: {formatValue(budgetNum)}</p>
                  </div>
                  <div className="space-y-1">
                    {selectedPack.tokens.map((token) => {
                      const tokenBudget = budgetNum * (token.weight / 100);
                      return (
                        <div key={token.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{token.symbol} ({token.weight}%)</span>
                          <span className="text-white">{formatValue(tokenBudget)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schedule Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Schedule Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly SOL Accumulation"
              className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-400/50"
            />
          </div>

          {/* Total Budget */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Total Budget (SOL)</label>
            <input
              type="number"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              placeholder="10.0"
              className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-400/50"
              step="0.1"
            />
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>Balance: {solBalance.toFixed(4)} SOL</span>
              {solPrice > 0 && budgetNum > 0 && (
                <span className="text-brand-400">≈ ${(budgetNum * solPrice).toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Frequency</label>
            <div className="grid grid-cols-2 gap-2">
              {frequencies.map((freq) => (
                <button
                  key={freq.id}
                  type="button"
                  onClick={() => setFrequency(freq.id)}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-sm transition-colors',
                    frequency === freq.id
                      ? 'bg-brand-400/20 border-brand-400/50 text-brand-400'
                      : 'bg-dark-bg border-dark-border text-gray-300 hover:border-gray-600'
                  )}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount per Period */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Amount per Buy (SOL)</label>
            <input
              type="number"
              value={amountPerPeriod}
              onChange={(e) => setAmountPerPeriod(e.target.value)}
              placeholder="1.0"
              className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-400/50"
              step="0.1"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Start Date (optional)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-brand-400/50"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Summary */}
          {numBuys > 0 && (
            <div className="p-4 bg-dark-bg rounded-xl">
              <h4 className="text-sm font-medium text-white mb-2">Summary</h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li>
                  Buy {formatValue(perPeriodNum)} worth of{' '}
                  {mode === 'token'
                    ? selectedToken?.symbol || 'token'
                    : `${selectedPack?.tokens?.length || 0} tokens`}{' '}
                  {frequencies.find((f) => f.id === frequency)?.label.toLowerCase()} for{' '}
                  {numBuys} times
                </li>
                <li>Total investment: {formatValue(budgetNum)}</li>
                <li>Duration: ~{Math.round(durationDays)} days</li>
                {mode === 'pack' && (
                  <li className="text-brand-400">
                    Creates {selectedPack?.tokens?.length || 0} separate Jupiter DCA positions
                  </li>
                )}
              </ul>
              <p className="text-xs text-green-400 mt-3 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Executes automatically via Jupiter DCA
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          {connected ? (
            <button
              onClick={handleSubmit}
              disabled={phase !== PHASE.INPUT}
              className={cn(
                'w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
                phase !== PHASE.INPUT
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-500 hover:bg-brand-600 text-white'
              )}
            >
              <Clock className="w-5 h-5" />
              Create Jupiter DCA{mode === 'pack' ? ` (${selectedPack?.tokens?.length || 0} positions)` : ''}
            </button>
          ) : (
            <div className="text-center py-4 bg-dark-bg rounded-xl">
              <p className="text-gray-400">Connect wallet to create DCA</p>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            Funds will be deposited into Jupiter DCA program and swaps will execute automatically.
            {mode === 'pack' && ' You will sign once for all DCA positions.'}
          </p>
        </div>
      </div>
    </div>
  );
}
