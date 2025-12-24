'use client';

import { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Target,
  ShieldAlert,
  Loader2,
  X,
  ExternalLink,
  Clock,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const orderTypeConfig = {
  limit_buy: {
    icon: TrendingDown,
    label: 'Limit Buy',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    description: 'Buy when price drops to',
  },
  limit_sell: {
    icon: TrendingUp,
    label: 'Limit Sell',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    description: 'Sell when price rises to',
  },
  stop_loss: {
    icon: ShieldAlert,
    label: 'Stop Loss',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    description: 'Sell if price drops to',
  },
  take_profit: {
    icon: Target,
    label: 'Take Profit',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    description: 'Sell when price reaches',
  },
};

export function OrderCard({ order, onCancel }) {
  const [cancelling, setCancelling] = useState(false);

  const config = orderTypeConfig[order.orderType] || orderTypeConfig.limit_buy;
  const Icon = config.icon;
  const isJupiterOrder = !!order.jupiterOrderPubkey;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await onCancel?.(order.id);
    } finally {
      setCancelling(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    if (price < 0.0001) return `$${price.toExponential(2)}`;
    if (price < 1) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(2)}`;
  };

  const priceChange = order.currentPrice && order.triggerPrice
    ? ((order.triggerPrice - order.currentPrice) / order.currentPrice) * 100
    : null;

  const isExpired = order.expiresAt && new Date(order.expiresAt) < new Date();

  return (
    <div
      className={cn(
        'bg-dark-card border rounded-xl p-4 transition-colors',
        order.status === 'active' ? 'border-dark-border' : 'border-dark-border/50 opacity-60'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', config.bgColor)}>
            <Icon className={cn('w-5 h-5', config.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
              {isJupiterOrder && (
                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Auto
                </span>
              )}
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded capitalize',
                  order.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : order.status === 'executed'
                    ? 'bg-blue-500/20 text-blue-400'
                    : order.status === 'triggered'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-gray-500/20 text-gray-400'
                )}
              >
                {isExpired && order.status === 'active' ? 'Expired' : order.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-white font-medium">{order.symbol}</span>
              <a
                href={`https://solscan.io/token/${order.tokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-brand-400"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {order.status === 'active' && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-dark-hover rounded-lg transition-colors"
          >
            {cancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">{config.description}</span>
          <span className="text-white font-medium">{formatPrice(order.triggerPrice)}</span>
        </div>

        {order.currentPrice && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Current price</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-300">{formatPrice(order.currentPrice)}</span>
              {priceChange !== null && (
                <span
                  className={cn(
                    'text-xs',
                    priceChange > 0 ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-400">Amount</span>
          <span className="text-white">
            {order.side === 'buy'
              ? `${order.amountSol} SOL`
              : `${order.amountTokens?.toLocaleString()} ${order.symbol}`}
          </span>
        </div>

        {order.expiresAt && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Expires
            </span>
            <span className={cn('text-gray-300', isExpired && 'text-red-400')}>
              {new Date(order.expiresAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {(order.txSignature || isJupiterOrder) && (
          <div className="pt-2 border-t border-dark-border space-y-1">
            {order.txSignature && (
              <a
                href={`https://solscan.io/tx/${order.txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1"
              >
                View transaction <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {isJupiterOrder && (
              <a
                href={`https://jup.ag/limit/${order.jupiterOrderPubkey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
              >
                View on Jupiter <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
