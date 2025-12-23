'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import {
  ExternalLink,
  AlertTriangle,
  Clock,
  Users,
  ChevronRight,
  Search,
  Filter,
  Lock,
  Unlock,
  Vault,
  Droplets,
  Sparkles,
} from 'lucide-react';

/**
 * Truncate wallet address for display
 */
function truncateAddress(address) {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Copy address to clipboard
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

/**
 * Format unlock date for display
 */
function formatUnlockDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Unlocked';
  if (diffDays === 0) return 'Today';
  if (diffDays <= 30) return `${diffDays}d`;
  if (diffDays <= 365) return `${Math.round(diffDays / 30)}mo`;
  return `${Math.round(diffDays / 365)}yr`;
}

/**
 * Get wallet type display info
 */
function getWalletTypeInfo(wallet) {
  const type = wallet.walletType;
  const label = wallet.label;

  if (type === 'VAULT') {
    return {
      icon: Vault,
      text: label || 'Vault',
      className: 'text-green-400',
      bgClass: 'bg-green-400/10',
    };
  }
  if (type === 'AMM') {
    return {
      icon: Droplets,
      text: label || 'LP Pool',
      className: 'text-blue-400',
      bgClass: 'bg-blue-400/10',
    };
  }
  if (type === 'CREATOR') {
    return {
      icon: Sparkles,
      text: 'Creator',
      className: 'text-purple-400',
      bgClass: 'bg-purple-400/10',
    };
  }
  if (type === 'EXCHANGE') {
    return {
      icon: null,
      text: 'Exchange',
      className: 'text-orange-400',
      bgClass: 'bg-orange-400/10',
    };
  }

  return {
    icon: null,
    text: 'Unknown',
    className: 'text-gray-400',
    bgClass: '',
  };
}

/**
 * Wallet row component
 */
function WalletRow({ wallet, rank, onClick, explorerBaseUrl }) {
  const hasFlags = wallet.riskFlagCount > 0;
  const isFresh = wallet.ageInDays !== null && wallet.ageInDays < 7;
  const isClustered = wallet.clusterId !== null;
  const isLocked = wallet.isLocked;
  const unlockDateStr = formatUnlockDate(wallet.unlockDate);
  const typeInfo = getWalletTypeInfo(wallet);
  const TypeIcon = typeInfo.icon;

  return (
    <tr
      className="border-b border-dark-border hover:bg-dark-hover cursor-pointer transition-colors"
      onClick={() => onClick?.(wallet)}
    >
      {/* Rank */}
      <td className="px-4 py-3 text-sm text-gray-400">
        #{rank}
      </td>

      {/* Address */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="text-sm text-gray-200 font-mono">
            {truncateAddress(wallet.walletAddress)}
          </code>
          <a
            href={`${explorerBaseUrl}${wallet.walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gray-500 hover:text-brand-400"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </td>

      {/* Holdings */}
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium text-gray-200">
          {wallet.percentage?.toFixed(2) || '?'}%
        </span>
      </td>

      {/* Age */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {isFresh && <Clock className="w-3 h-3 text-yellow-400" />}
          <span className={cn('text-sm', isFresh ? 'text-yellow-400' : 'text-gray-400')}>
            {wallet.ageInDays !== null ? `${wallet.ageInDays}d` : '-'}
          </span>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {TypeIcon && <TypeIcon className={cn('w-3.5 h-3.5', typeInfo.className)} />}
          <span className={cn('text-xs', typeInfo.className)}>
            {typeInfo.text}
          </span>
        </div>
      </td>

      {/* Lock Status */}
      <td className="px-4 py-3">
        {isLocked ? (
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-green-400">
              {unlockDateStr ? `Until ${unlockDateStr}` : 'Locked'}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">-</span>
        )}
      </td>

      {/* Flags */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {hasFlags && (
            <Badge
              variant={wallet.hasCriticalFlag ? 'danger' : 'warning'}
              size="sm"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              {wallet.riskFlagCount}
            </Badge>
          )}
          {isClustered && (
            <Badge variant="info" size="sm">
              <Users className="w-3 h-3 mr-1" />
              Cluster
            </Badge>
          )}
        </div>
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-right">
        <ChevronRight className="w-4 h-4 text-gray-500 inline" />
      </td>
    </tr>
  );
}

/**
 * Filter button
 */
function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
        active
          ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30'
          : 'bg-dark-hover text-gray-400 border border-transparent hover:text-gray-200'
      )}
    >
      {children}
    </button>
  );
}

/**
 * Main Wallet List Component
 */
export function WalletList({
  wallets = [],
  pagination,
  onSelectWallet,
  onFilterChange,
  onPageChange,
  currentFilter = 'all',
  explorerBaseUrl = 'https://etherscan.io/address/',
  className,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'suspicious', label: 'Suspicious' },
    { id: 'fresh', label: 'Fresh Wallets' },
    { id: 'clustered', label: 'Clustered' },
    { id: 'locked', label: 'Locked' },
    { id: 'vaults', label: 'Vaults/AMMs' },
  ];

  // Filter wallets by search query
  const filteredWallets = searchQuery
    ? wallets.filter((w) =>
        w.walletAddress.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : wallets;

  return (
    <div className={cn('bg-dark-card border border-dark-border rounded-xl', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Top Holders</h3>
            <p className="text-sm text-gray-400 mt-1">
              {pagination?.totalCount || wallets.length} wallets analyzed
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-dark-hover border border-dark-border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-400/50"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            {filters.map((filter) => (
              <FilterButton
                key={filter.id}
                active={currentFilter === filter.id}
                onClick={() => onFilterChange?.(filter.id)}
              >
                {filter.label}
              </FilterButton>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                Holdings
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lock Status
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Flags
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredWallets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No wallets found
                </td>
              </tr>
            ) : (
              filteredWallets.map((wallet, index) => (
                <WalletRow
                  key={wallet.id || wallet.walletAddress}
                  wallet={wallet}
                  rank={wallet.rank || index + 1}
                  onClick={onSelectWallet}
                  explorerBaseUrl={explorerBaseUrl}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-dark-border flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm bg-dark-hover border border-dark-border rounded-lg text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasMore}
              className="px-3 py-1.5 text-sm bg-dark-hover border border-dark-border rounded-lg text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WalletList;
