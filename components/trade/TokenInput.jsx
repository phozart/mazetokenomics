'use client';

import { ChevronDown, Copy, Check } from 'lucide-react';
import { formatTokenBalance } from '@/lib/jupiter/tokens';
import { cn } from '@/lib/utils';
import { formatAddress } from '@/lib/utils';
import { useState } from 'react';

export function TokenInput({
  label,
  token,
  amount,
  onAmountChange,
  onTokenSelect,
  balance,
  usdValue,
  disabled,
  showMaxButton,
  showAddress = false,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async (e) => {
    e.stopPropagation();
    if (token?.address) {
      await navigator.clipboard.writeText(token.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const handleMaxClick = () => {
    if (balance && token) {
      // Leave a small amount for fees if it's SOL
      const maxAmount = token.symbol === 'SOL'
        ? Math.max(0, balance - 0.01)
        : balance;
      onAmountChange?.(maxAmount.toString());
    }
  };

  return (
    <div className="bg-dark-bg rounded-xl p-4 border border-dark-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        {balance !== undefined && (
          <span className="text-sm text-gray-500">
            Balance: {formatTokenBalance(balance * Math.pow(10, token?.decimals || 9), token?.decimals || 9)}
          </span>
        )}
      </div>

      {/* Input Row */}
      <div className="flex items-center gap-3">
        {/* Token Selector */}
        <button
          onClick={onTokenSelect}
          className="flex items-center gap-2 px-3 py-2 bg-dark-card hover:bg-dark-hover rounded-lg transition-colors shrink-0"
        >
          {token ? (
            <>
              {token.logoURI && (
                <img
                  src={token.logoURI}
                  alt={token.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              <span className="font-medium text-white">{token.symbol}</span>
            </>
          ) : (
            <span className="text-gray-400">Select</span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {/* Amount Input */}
        <div className="flex-1 text-right">
          <input
            type="text"
            inputMode="decimal"
            value={amount || ''}
            onChange={(e) => {
              // Only allow valid decimal numbers
              const value = e.target.value;
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                onAmountChange?.(value);
              }
            }}
            placeholder="0.00"
            disabled={disabled}
            className={cn(
              'w-full text-right bg-transparent text-2xl font-medium text-white placeholder-gray-600 focus:outline-none',
              disabled && 'cursor-not-allowed text-gray-400'
            )}
          />
          {showMaxButton && balance > 0 && !disabled && (
            <button
              onClick={handleMaxClick}
              className="text-xs text-brand-400 hover:text-brand-300 mt-1"
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {/* USD Value */}
      {usdValue && (
        <div className="text-right mt-2">
          <span className="text-sm text-gray-500">${usdValue}</span>
        </div>
      )}

      {/* Contract Address */}
      {showAddress && token?.address && (
        <div className="mt-3 pt-2 border-t border-dark-border/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Contract Address:</span>
            <button
              onClick={handleCopyAddress}
              className="flex items-center gap-1.5 px-2 py-1 bg-dark-card hover:bg-dark-hover rounded text-gray-400 hover:text-white transition-colors font-mono"
              title="Copy full address"
            >
              {formatAddress(token.address, 6)}
              {copied ? (
                <Check className="w-3 h-3 text-green-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
