'use client';

import { useState } from 'react';
import { Settings, ChevronDown, AlertTriangle, Info } from 'lucide-react';
import { formatAmount } from '@/lib/jupiter/client';
import { cn } from '@/lib/utils';

export function SwapDetails({
  quote,
  inputToken,
  outputToken,
  slippageBps,
  onSlippageChange,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!quote || !inputToken || !outputToken) return null;

  const inAmount = parseFloat(formatAmount(quote.inAmount, inputToken.decimals));
  const outAmount = parseFloat(formatAmount(quote.outAmount, outputToken.decimals));
  const rate = outAmount / inAmount;
  const priceImpact = parseFloat(quote.priceImpactPct) * 100;
  const minReceived = outAmount * (1 - slippageBps / 10000);

  // Network fee estimate (rough)
  const networkFee = 0.000005 * (quote.routePlan?.length || 1);

  const isHighImpact = priceImpact > 1;
  const isVeryHighImpact = priceImpact > 5;

  return (
    <div className="bg-dark-bg/50 rounded-xl border border-dark-border/30">
      {/* Main Info Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-sm cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400">
            1 {inputToken.symbol} = {rate.toFixed(6)} {outputToken.symbol}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isHighImpact && (
            <span className={cn(
              'flex items-center gap-1 text-xs px-2 py-0.5 rounded',
              isVeryHighImpact
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
            )}>
              <AlertTriangle className="w-3 h-3" />
              {priceImpact.toFixed(2)}%
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(!showSettings);
            }}
            className="p-1 text-gray-400 hover:text-white hover:bg-dark-hover rounded transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <ChevronDown className={cn(
            'w-4 h-4 text-gray-400 transition-transform',
            expanded && 'rotate-180'
          )} />
        </div>
      </div>

      {/* Slippage Settings Popover */}
      {showSettings && (
        <div className="px-3 pb-3">
          <div className="p-3 bg-dark-card rounded-lg border border-dark-border">
            <p className="text-xs text-gray-400 mb-2">Slippage Tolerance</p>
            <div className="flex gap-2">
              {[50, 100, 200].map((bps) => (
                <button
                  key={bps}
                  onClick={() => {
                    onSlippageChange(bps);
                    setShowSettings(false);
                  }}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-colors',
                    slippageBps === bps
                      ? 'bg-brand-400/20 text-brand-400 border border-brand-400/50'
                      : 'bg-dark-hover text-gray-300 hover:bg-dark-border'
                  )}
                >
                  {bps / 100}%
                </button>
              ))}
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={slippageBps / 100}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value > 0 && value <= 50) {
                      onSlippageChange(Math.round(value * 100));
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm bg-dark-hover rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-brand-400/50"
                  min="0.1"
                  max="50"
                  step="0.1"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
            {slippageBps > 500 && (
              <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                High slippage may result in unfavorable rates
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-sm border-t border-dark-border/30 pt-3">
          <div className="flex justify-between">
            <span className="text-gray-400 flex items-center gap-1">
              Price Impact
              <Info className="w-3 h-3" />
            </span>
            <span className={cn(
              isVeryHighImpact && 'text-red-400',
              isHighImpact && !isVeryHighImpact && 'text-yellow-400',
              !isHighImpact && 'text-gray-300'
            )}>
              {priceImpact.toFixed(4)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Slippage Tolerance</span>
            <span className="text-gray-300">{slippageBps / 100}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Minimum Received</span>
            <span className="text-gray-300">
              {minReceived.toFixed(6)} {outputToken.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Network Fee</span>
            <span className="text-gray-300">~{networkFee.toFixed(6)} SOL</span>
          </div>
          {quote.routePlan && (
            <div className="flex justify-between">
              <span className="text-gray-400">Route</span>
              <span className="text-gray-300 text-right">
                {quote.routePlan.map(r => r.swapInfo?.label || 'DEX').join(' → ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
