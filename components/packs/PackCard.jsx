'use client';

import Link from 'next/link';
import { Package, ShoppingCart, Edit2, TrendingUp, Coins, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PackCard({ pack, onBuy, onDca }) {
  const riskColors = {
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 hover:border-dark-border/80 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-400/10 rounded-lg">
            <Package className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{pack.name}</h3>
            {pack.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{pack.description}</p>
            )}
          </div>
        </div>
        <span
          className={cn(
            'text-xs px-2 py-1 rounded-full border capitalize',
            riskColors[pack.riskLevel] || riskColors.medium
          )}
        >
          {pack.riskLevel} risk
        </span>
      </div>

      {/* Token Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {pack.tokens.slice(0, 4).map((token) => (
          <div
            key={token.id}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-bg rounded-full"
          >
            {token.logoURI ? (
              <img src={token.logoURI} alt={token.symbol} className="w-4 h-4 rounded-full" />
            ) : (
              <Coins className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-sm text-gray-300">{token.symbol}</span>
            <span className="text-xs text-gray-500">{token.weight}%</span>
          </div>
        ))}
        {pack.tokens.length > 4 && (
          <span className="text-xs text-gray-500 px-2 py-1">
            +{pack.tokens.length - 4} more
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
        <span>{pack.tokens.length} tokens</span>
        <span className="text-gray-600">|</span>
        <span>{pack._count?.purchases || 0} purchases</span>
        {pack._count?.dcaSchedules > 0 && (
          <>
            <span className="text-gray-600">|</span>
            <span className="text-brand-400">{pack._count.dcaSchedules} active DCA</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          href={`/packs/${pack.id}`}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-lg text-sm text-gray-300 transition-colors"
          title="View Pack"
        >
          <TrendingUp className="w-4 h-4" />
          <span className="hidden sm:inline">View</span>
        </Link>
        <button
          onClick={() => onBuy?.(pack)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg text-sm text-white font-medium transition-colors"
          title="Buy Pack"
        >
          <ShoppingCart className="w-4 h-4" />
          Buy
        </button>
        <button
          onClick={() => onDca?.(pack)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm text-purple-400 transition-colors"
          title="Setup DCA"
        >
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">DCA</span>
        </button>
        <Link
          href={`/packs/${pack.id}?edit=true`}
          className="p-2 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Edit Pack"
        >
          <Edit2 className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
