'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, Loader2, Check, X, ExternalLink } from 'lucide-react';
import { SWAP_STATE } from '@/lib/jupiter/hooks';
import { cn } from '@/lib/utils';

export function SwapButton({
  quote,
  state,
  error,
  txSignature,
  inputToken,
  outputToken,
  inputAmount,
  insufficientBalance,
  onSwap,
  onReset,
}) {
  const { connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  // Not connected
  if (!connected && !connecting) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center justify-center gap-2"
      >
        <Wallet className="w-5 h-5" />
        Connect Wallet to Swap
      </button>
    );
  }

  // Connecting
  if (connecting) {
    return (
      <button
        disabled
        className="w-full py-4 bg-dark-hover text-gray-400 rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        Connecting...
      </button>
    );
  }

  // Insufficient balance
  if (insufficientBalance) {
    return (
      <button
        disabled
        className="w-full py-4 bg-dark-hover text-gray-400 rounded-xl font-semibold text-lg"
      >
        Insufficient {inputToken?.symbol} Balance
      </button>
    );
  }

  // No quote or amount
  if (!quote || !inputAmount || parseFloat(inputAmount) <= 0) {
    return (
      <button
        disabled
        className="w-full py-4 bg-dark-hover text-gray-400 rounded-xl font-semibold text-lg"
      >
        Enter an Amount
      </button>
    );
  }

  // Success state
  if (state === SWAP_STATE.SUCCESS) {
    return (
      <div className="space-y-3">
        <button
          className="w-full py-4 bg-green-500/20 text-green-400 rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Swap Complete!
        </button>
        <div className="flex gap-2">
          {txSignature && (
            <a
              href={`https://solscan.io/tx/${txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-dark-card border border-dark-border hover:border-brand-400/50 rounded-lg text-sm text-gray-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on Solscan
            </a>
          )}
          <button
            onClick={onReset}
            className="flex-1 py-2 bg-brand-400/10 hover:bg-brand-400/20 text-brand-400 rounded-lg text-sm font-medium transition-colors"
          >
            New Swap
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (state === SWAP_STATE.ERROR) {
    return (
      <div className="space-y-3">
        <button
          className="w-full py-4 bg-red-500/20 text-red-400 rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" />
          Swap Failed
        </button>
        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}
        <button
          onClick={onReset}
          className="w-full py-2 bg-dark-card border border-dark-border hover:border-brand-400/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Processing states
  if (state === SWAP_STATE.AWAITING_SIGNATURE) {
    return (
      <button
        disabled
        className="w-full py-4 bg-purple-500/20 text-purple-400 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 animate-pulse"
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        Confirm in Wallet...
      </button>
    );
  }

  if (state === SWAP_STATE.CONFIRMING) {
    return (
      <button
        disabled
        className="w-full py-4 bg-brand-400/20 text-brand-400 rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        Confirming Transaction...
      </button>
    );
  }

  // Ready to swap
  return (
    <button
      onClick={() => onSwap(quote)}
      className={cn(
        'w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2',
        'bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-400 hover:to-accent-400 text-white',
        'shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5'
      )}
    >
      Swap {inputToken?.symbol} for {outputToken?.symbol}
    </button>
  );
}
