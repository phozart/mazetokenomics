'use client';

import { useState, useEffect } from 'react';
import { X, ShoppingCart, AlertCircle, Check, Loader2, ExternalLink, Wallet, FileSignature, DollarSign } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import { cn } from '@/lib/utils';
import { useSolBalance, useSolPrice } from '@/lib/jupiter/hooks';
import { SOL_MINT, parseAmount } from '@/lib/jupiter/client';

// Execution phases
const PHASE = {
  INPUT: 'input',
  BUILDING: 'building',
  SIGNING: 'signing',
  EXECUTING: 'executing',
  COMPLETE: 'complete',
};

export function BuyPackModal({ isOpen, onClose, pack }) {
  const { connected, publicKey, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const { balance: solBalance } = useSolBalance();
  const { price: solPrice } = useSolPrice();

  const [amount, setAmount] = useState('');
  const [displayMode, setDisplayMode] = useState('sol'); // 'sol' or 'usd'
  const [phase, setPhase] = useState(PHASE.INPUT);
  const [purchase, setPurchase] = useState(null);
  const [buildProgress, setBuildProgress] = useState({ current: 0, total: 0 });
  const [currentTx, setCurrentTx] = useState(-1);
  const [txResults, setTxResults] = useState([]);
  const [error, setError] = useState('');

  // Helper to format amount based on display mode
  const formatValue = (solAmount) => {
    if (displayMode === 'usd' && solPrice > 0) {
      return `$${(solAmount * solPrice).toFixed(2)}`;
    }
    return `${solAmount.toFixed(4)} SOL`;
  };

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum >= 0.001 && amountNum <= solBalance;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setPhase(PHASE.INPUT);
      setPurchase(null);
      setBuildProgress({ current: 0, total: 0 });
      setCurrentTx(-1);
      setTxResults([]);
      setError('');
    }
  }, [isOpen]);

  // Calculate distribution
  const distribution = pack?.tokens?.map((token) => ({
    ...token,
    amountSol: (amountNum * token.weight) / 100,
    skipSwap: token.tokenAddress === SOL_MINT,
  })) || [];

  const handleBuyPack = async () => {
    if (!isValidAmount || !pack) return;
    setError('');

    try {
      // Phase 1: Create purchase record
      setPhase(PHASE.BUILDING);

      const response = await fetch(`/api/packs/${pack.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalAmountSol: amountNum }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate purchase');
      }

      const data = await response.json();
      setPurchase(data.purchase);

      // Initialize results
      const initialResults = data.distribution.map((d) => ({
        ...d,
        status: d.skipSwap ? 'success' : 'pending',
        txSignature: null,
        transaction: null,
        quote: null,
      }));
      setTxResults(initialResults);

      // Phase 2: Build all transactions
      const tokensToSwap = data.distribution.filter((d) => !d.skipSwap);
      setBuildProgress({ current: 0, total: tokensToSwap.length });

      const transactionsToSign = [];
      const transactionMeta = []; // Keep track of which result index each tx corresponds to

      for (let i = 0; i < data.distribution.length; i++) {
        const item = data.distribution[i];

        if (item.skipSwap) continue;

        setBuildProgress((prev) => ({ ...prev, current: prev.current + 1 }));

        try {
          // Get quote
          const quoteParams = new URLSearchParams({
            inputMint: SOL_MINT,
            outputMint: item.tokenAddress,
            amount: parseAmount(item.amountSol, 9),
            slippageBps: '100',
          });

          const quoteRes = await fetch(`/api/jupiter/quote?${quoteParams}`);
          if (!quoteRes.ok) throw new Error(`Failed to get quote for ${item.symbol}`);
          const quote = await quoteRes.json();

          // Get swap transaction
          const swapRes = await fetch('/api/jupiter/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quoteResponse: quote,
              userPublicKey: publicKey.toBase58(),
            }),
          });
          if (!swapRes.ok) throw new Error(`Failed to build transaction for ${item.symbol}`);
          const { swapTransaction } = await swapRes.json();

          // Deserialize transaction
          const tx = VersionedTransaction.deserialize(
            Buffer.from(swapTransaction, 'base64')
          );

          transactionsToSign.push(tx);
          transactionMeta.push({
            resultIndex: i,
            quote,
            item,
            dbTransaction: data.purchase.transactions[i],
          });

          // Update result with quote info
          setTxResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, quote, status: 'ready' } : r
            )
          );
        } catch (err) {
          console.error(`Failed to build tx for ${item.symbol}:`, err);
          setTxResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: 'failed', error: err.message } : r
            )
          );
        }
      }

      if (transactionsToSign.length === 0) {
        throw new Error('No transactions to execute');
      }

      // Phase 3: Sign all transactions at once
      setPhase(PHASE.SIGNING);

      let signedTransactions;
      try {
        signedTransactions = await signAllTransactions(transactionsToSign);
      } catch (err) {
        if (err.message?.includes('User rejected')) {
          throw new Error('Transaction signing was rejected');
        }
        throw err;
      }

      // Phase 4: Execute transactions sequentially
      setPhase(PHASE.EXECUTING);

      for (let i = 0; i < signedTransactions.length; i++) {
        const signedTx = signedTransactions[i];
        const meta = transactionMeta[i];
        const resultIdx = meta.resultIndex;

        setCurrentTx(resultIdx);

        try {
          // Send transaction
          const txId = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });

          // Wait for confirmation
          await connection.confirmTransaction(txId, 'confirmed');

          // Update result
          setTxResults((prev) =>
            prev.map((r, idx) =>
              idx === resultIdx
                ? { ...r, status: 'success', txSignature: txId }
                : r
            )
          );

          // Update backend
          await fetch(`/api/packs/${pack.id}/buy`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              purchaseId: data.purchase.id,
              transactionId: meta.dbTransaction.id,
              status: 'success',
              txSignature: txId,
              amountReceived: parseFloat(meta.quote.outAmount) / Math.pow(10, meta.item.decimals),
            }),
          });
        } catch (err) {
          console.error(`Execution failed for ${meta.item.symbol}:`, err);

          let errorMessage = err.message;
          if (err.message?.includes('insufficient lamports')) {
            errorMessage = 'Insufficient SOL balance';
          } else if (err.message?.includes('Simulation failed')) {
            errorMessage = 'Transaction failed - check balance';
          }

          setTxResults((prev) =>
            prev.map((r, idx) =>
              idx === resultIdx
                ? { ...r, status: 'failed', error: errorMessage }
                : r
            )
          );

          // Update backend
          await fetch(`/api/packs/${pack.id}/buy`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              purchaseId: data.purchase.id,
              transactionId: meta.dbTransaction.id,
              status: 'failed',
              error: err.message,
            }),
          });
        }
      }

      setPhase(PHASE.COMPLETE);
      setCurrentTx(-1);

    } catch (err) {
      console.error('Pack purchase error:', err);
      setError(err.message);
      setPhase(PHASE.INPUT);
    }
  };

  if (!isOpen || !pack) return null;

  const allComplete = phase === PHASE.COMPLETE;
  const successCount = txResults.filter((t) => t.status === 'success').length;
  const failedCount = txResults.filter((t) => t.status === 'failed').length;
  const allSuccess = allComplete && failedCount === 0;
  const tokensToSwap = distribution.filter((d) => !d.skipSwap).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={phase === PHASE.INPUT ? onClose : undefined} />

      <div className="relative w-full max-w-md bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
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
          <h2 className="text-lg font-semibold text-white">Buy Pack: {pack.name}</h2>
          <button
            onClick={onClose}
            disabled={phase !== PHASE.INPUT && phase !== PHASE.COMPLETE}
            className={cn(
              "p-2 rounded-lg transition-colors",
              phase !== PHASE.INPUT && phase !== PHASE.COMPLETE
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-400 hover:text-white hover:bg-dark-hover"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {phase === PHASE.INPUT ? (
            <>
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

              {/* Amount Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Investment Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-brand-400/50"
                    step="0.001"
                    min="0.001"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-gray-400">SOL</span>
                    <button
                      onClick={() => setAmount((solBalance * 0.95).toFixed(4))}
                      className="px-2 py-1 bg-dark-hover rounded text-xs text-brand-400 hover:bg-dark-border transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
                  <span>Balance: {solBalance.toFixed(4)} SOL</span>
                  {solPrice > 0 && amountNum > 0 && (
                    <span className="text-brand-400">≈ ${(amountNum * solPrice).toFixed(2)}</span>
                  )}
                </div>
              </div>

              {/* Distribution Preview */}
              {amountNum > 0 && (
                <div className="bg-dark-bg rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-400">Distribution Preview</p>
                    <p className="text-sm text-white font-medium">
                      Total: {formatValue(amountNum)}
                    </p>
                  </div>
                  {distribution.map((item) => (
                    <div key={item.tokenAddress} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.logoURI ? (
                          <img src={item.logoURI} alt={item.symbol} className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-dark-card" />
                        )}
                        <span className="text-gray-300">{item.symbol}</span>
                        <span className="text-xs text-gray-500">{item.weight}%</span>
                      </div>
                      <span className="text-gray-300">{formatValue(item.amountSol)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Info about single approval */}
              {amountNum > 0 && tokensToSwap > 1 && (
                <div className="flex items-start gap-2 p-3 bg-brand-400/10 border border-brand-400/20 rounded-lg text-sm">
                  <FileSignature className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                  <p className="text-gray-300">
                    You'll sign <span className="text-brand-400 font-medium">once</span> to approve all {tokensToSwap} swaps
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Buy Button */}
              {connected ? (
                <button
                  onClick={handleBuyPack}
                  disabled={!isValidAmount}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
                    !isValidAmount
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-brand-500 hover:bg-brand-600 text-white'
                  )}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Buy Pack - {amountNum.toFixed(4)} SOL
                  {solPrice > 0 && amountNum > 0 && (
                    <span className="text-white/70">(${(amountNum * solPrice).toFixed(2)})</span>
                  )}
                </button>
              ) : (
                <div className="text-center py-4">
                  <Wallet className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">Connect wallet to buy</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Progress Header */}
              {phase !== PHASE.COMPLETE && (
                <div className="text-center py-2">
                  {phase === PHASE.BUILDING && (
                    <>
                      <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-2" />
                      <p className="text-white font-medium">Building Transactions</p>
                      <p className="text-sm text-gray-400">
                        {buildProgress.current} / {buildProgress.total} quotes fetched
                      </p>
                    </>
                  )}
                  {phase === PHASE.SIGNING && (
                    <>
                      <FileSignature className="w-8 h-8 text-brand-400 mx-auto mb-2" />
                      <p className="text-white font-medium">Approve in Wallet</p>
                      <p className="text-sm text-gray-400">
                        Sign all {tokensToSwap} transactions at once
                      </p>
                    </>
                  )}
                  {phase === PHASE.EXECUTING && (
                    <>
                      <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-2" />
                      <p className="text-white font-medium">Executing Swaps</p>
                      <p className="text-sm text-gray-400">
                        {successCount} / {tokensToSwap} completed
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Transaction List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {txResults.map((item, idx) => (
                  <div
                    key={item.tokenAddress}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      item.status === 'success'
                        ? 'bg-green-500/10 border-green-500/30'
                        : item.status === 'failed'
                        ? 'bg-red-500/10 border-red-500/30'
                        : item.status === 'ready'
                        ? 'bg-brand-400/5 border-brand-400/20'
                        : currentTx === idx
                        ? 'bg-brand-400/10 border-brand-400/30'
                        : 'bg-dark-bg border-dark-border'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.status === 'success' ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : item.status === 'failed' ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      ) : currentTx === idx ? (
                        <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                      ) : item.status === 'ready' ? (
                        <Check className="w-5 h-5 text-brand-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                      )}
                      <div>
                        <span className="text-white">{item.symbol}</span>
                        <span className="text-gray-500 text-sm ml-2">
                          {item.amountSol.toFixed(4)} SOL
                        </span>
                      </div>
                    </div>
                    {item.txSignature && (
                      <a
                        href={`https://solscan.io/tx/${item.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-400 hover:text-brand-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Complete Status */}
              {allComplete && (
                <div
                  className={cn(
                    'p-4 rounded-xl text-center',
                    allSuccess
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-yellow-500/10 border border-yellow-500/30'
                  )}
                >
                  {allSuccess ? (
                    <>
                      <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-green-400 font-medium">Purchase Complete!</p>
                      <p className="text-sm text-gray-400 mt-1">
                        All {successCount} swaps executed successfully
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <p className="text-yellow-400 font-medium">
                        Partial Success
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {successCount} succeeded, {failedCount} failed
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Close Button */}
              {allComplete && (
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-dark-bg border border-dark-border rounded-xl text-white hover:bg-dark-hover transition-colors"
                >
                  Close
                </button>
              )}

              {/* Warning */}
              {phase === PHASE.EXECUTING && (
                <p className="text-center text-sm text-gray-500">
                  Please do not close this window while swaps are executing.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
