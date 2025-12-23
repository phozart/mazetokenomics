'use client';

import Link from 'next/link';
import { ChainBadge, RiskBadge } from '@/components/ui/Badge';
import { formatAddress } from '@/lib/utils';
import { Trash2, ExternalLink, TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';
import { useState } from 'react';

function formatPrice(price) {
  if (!price) return '-';
  const num = parseFloat(price);
  if (num < 0.00001) return `$${num.toExponential(2)}`;
  if (num < 1) return `$${num.toFixed(6)}`;
  if (num < 1000) return `$${num.toFixed(2)}`;
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatMarketCap(mc) {
  if (!mc) return '-';
  const num = parseFloat(mc);
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function PriceChange({ change, compact = false }) {
  if (change === null || change === undefined) return <span className="text-gray-500">-</span>;

  const isPositive = change >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-400' : 'text-red-400';

  if (compact) {
    return (
      <span className={`text-xs font-medium ${colorClass}`}>
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-1 ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(change).toFixed(2)}%
    </span>
  );
}

// Compact card for mobile grid view
function CompactCard({ item, priceData, onRemove, isLoading }) {
  const [showMenu, setShowMenu] = useState(false);
  const symbol = item.token?.symbol || item.symbol || '???';
  const name = item.token?.name || item.name;
  const vettingProcess = item.token?.vettingProcess;
  const change = priceData?.priceChange24h;
  const isPositive = change >= 0;

  return (
    <div
      className="relative bg-dark-card border border-dark-border rounded-xl p-3 flex flex-col"
      onClick={() => setShowMenu(false)}
    >
      {/* Menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-300 z-10"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute top-8 right-2 z-20 bg-dark-card border border-dark-border rounded-lg shadow-xl py-1 min-w-[120px]">
          {vettingProcess?.id && (
            <Link
              href={`/tokens/${vettingProcess.id}`}
              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-dark-hover"
            >
              <ExternalLink className="w-3 h-3" />
              View Analysis
            </Link>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
              setShowMenu(false);
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-dark-hover w-full text-left"
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        </div>
      )}

      {/* Token icon & symbol */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/30 to-accent-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-brand-300 font-bold text-xs">{symbol.slice(0, 2)}</span>
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <div className="font-semibold text-gray-100 text-sm truncate">{symbol}</div>
          {name && <div className="text-[10px] text-gray-500 truncate">{name}</div>}
        </div>
      </div>

      {/* Price */}
      <div className="text-base font-mono font-semibold text-gray-100 mb-1">
        {isLoading ? (
          <span className="text-gray-500 animate-pulse">...</span>
        ) : (
          formatPrice(priceData?.priceUsd)
        )}
      </div>

      {/* 24h change & MCap */}
      <div className="flex items-center justify-between text-xs">
        <div className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isLoading ? '...' : <PriceChange change={change} compact />}
        </div>
        <div className="text-gray-500">
          {isLoading ? '...' : formatMarketCap(priceData?.marketCap)}
        </div>
      </div>
    </div>
  );
}

// Full card for tablet/larger mobile
function MobileCard({ item, priceData, onRemove, isLoading }) {
  const [showActions, setShowActions] = useState(false);
  const symbol = item.token?.symbol || item.symbol || 'Unknown';
  const name = item.token?.name || item.name;
  const chain = item.token?.chain || item.chain;
  const address = item.token?.contractAddress || item.contractAddress;
  const vettingProcess = item.token?.vettingProcess;

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-3">
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500/20 to-accent-400/20 flex items-center justify-center">
            <span className="text-brand-400 font-bold text-sm">{symbol.slice(0, 2)}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-100">{symbol}</div>
            {name && <div className="text-xs text-gray-500">{name}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chain && <ChainBadge chain={chain} />}
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Price & Change Row */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Price</div>
          <div className="text-lg font-mono font-semibold text-gray-100">
            {isLoading ? (
              <span className="text-gray-500 animate-pulse">...</span>
            ) : (
              formatPrice(priceData?.priceUsd)
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-0.5">24h</div>
          <div className="text-base font-medium">
            {isLoading ? (
              <span className="text-gray-500 animate-pulse">...</span>
            ) : (
              <PriceChange change={priceData?.priceChange24h} />
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between pt-2 border-t border-dark-border/50">
        <div>
          <div className="text-xs text-gray-500">MCap</div>
          <div className="text-sm text-gray-300">
            {isLoading ? '...' : formatMarketCap(priceData?.marketCap)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Risk</div>
          <div className="text-sm">
            {vettingProcess?.riskLevel ? (
              <RiskBadge riskLevel={vettingProcess.riskLevel} />
            ) : vettingProcess?.overallScore != null ? (
              <span className="text-gray-300">{Math.round(vettingProcess.overallScore)}</span>
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Contract</div>
          <div className="text-xs font-mono text-gray-400">
            {address ? formatAddress(address, 4) : '-'}
          </div>
        </div>
      </div>

      {/* Actions (expandable) */}
      {showActions && (
        <div className="flex items-center gap-2 pt-2 border-t border-dark-border/50">
          {vettingProcess?.id && (
            <Link
              href={`/tokens/${vettingProcess.id}`}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Analysis
            </Link>
          )}
          <button
            onClick={() => onRemove(item.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function DesktopTable({ items, prices, onRemove, isLoading }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="table-header text-left px-6 py-3">Token</th>
            <th className="table-header text-left px-4 py-3">Chain</th>
            <th className="table-header text-right px-4 py-3">Price</th>
            <th className="table-header text-right px-4 py-3">24h</th>
            <th className="table-header text-right px-4 py-3">MCap</th>
            <th className="table-header text-center px-4 py-3">Risk</th>
            <th className="table-header text-right px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const priceData = prices?.[item.id];
            const symbol = item.token?.symbol || item.symbol || 'Unknown';
            const name = item.token?.name || item.name;
            const chain = item.token?.chain || item.chain;
            const address = item.token?.contractAddress || item.contractAddress;
            const vettingProcess = item.token?.vettingProcess;

            return (
              <tr key={item.id} className="table-row">
                <td className="table-cell px-6">
                  <div className="font-medium text-gray-100">{symbol}</div>
                  {name && <div className="text-xs text-gray-500">{name}</div>}
                  {address && (
                    <div className="text-xs text-gray-600 font-mono">
                      {formatAddress(address, 6)}
                    </div>
                  )}
                </td>
                <td className="table-cell px-4">
                  {chain && <ChainBadge chain={chain} />}
                </td>
                <td className="table-cell px-4 text-right font-mono">
                  {isLoading ? (
                    <span className="text-gray-500 animate-pulse">...</span>
                  ) : (
                    formatPrice(priceData?.priceUsd)
                  )}
                </td>
                <td className="table-cell px-4 text-right">
                  {isLoading ? (
                    <span className="text-gray-500 animate-pulse">...</span>
                  ) : (
                    <PriceChange change={priceData?.priceChange24h} />
                  )}
                </td>
                <td className="table-cell px-4 text-right text-gray-400">
                  {isLoading ? (
                    <span className="text-gray-500 animate-pulse">...</span>
                  ) : (
                    formatMarketCap(priceData?.marketCap)
                  )}
                </td>
                <td className="table-cell px-4 text-center">
                  {vettingProcess?.riskLevel ? (
                    <RiskBadge riskLevel={vettingProcess.riskLevel} />
                  ) : vettingProcess?.overallScore != null ? (
                    <span className="text-sm font-medium">
                      {Math.round(vettingProcess.overallScore)}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </td>
                <td className="table-cell px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {vettingProcess?.id && (
                      <Link
                        href={`/tokens/${vettingProcess.id}`}
                        className="p-1.5 text-gray-400 hover:text-brand-400 hover:bg-brand-400/10 rounded transition-colors"
                        title="View Analysis"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => onRemove(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function WatchlistTable({ items, prices, onRemove, isLoading }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-500/10 flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-brand-400" />
        </div>
        <p className="font-medium">Your watchlist is empty</p>
        <p className="text-sm mt-1 text-gray-500">Add tokens to track their prices</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Compact 2-column grid */}
      <div className="sm:hidden grid grid-cols-2 gap-2 p-3">
        {items.map((item) => (
          <CompactCard
            key={item.id}
            item={item}
            priceData={prices?.[item.id]}
            onRemove={onRemove}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Tablet: Full card layout */}
      <div className="hidden sm:block md:hidden space-y-3 p-4">
        {items.map((item) => (
          <MobileCard
            key={item.id}
            item={item}
            priceData={prices?.[item.id]}
            onRemove={onRemove}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block">
        <DesktopTable
          items={items}
          prices={prices}
          onRemove={onRemove}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}
