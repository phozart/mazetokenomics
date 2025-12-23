'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Users,
  ArrowDown,
  RefreshCw,
  Wallet,
  GitBranch,
} from 'lucide-react';

/**
 * Truncate address for display
 */
function truncateAddress(address, length = 8) {
  if (!address) return 'Unknown';
  return `${address.slice(0, length)}...${address.slice(-4)}`;
}

/**
 * Copy button with feedback
 */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 hover:bg-dark-hover rounded text-gray-400 hover:text-gray-200"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

/**
 * Funding chain node component
 */
function FundingChainNode({ node, depth = 0, isLast = true }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (!node) return null;

  const hasChildren = node.children && node.children.length > 0;
  const typeColors = {
    exchange: 'text-blue-400 bg-blue-400/10',
    dex: 'text-purple-400 bg-purple-400/10',
    mixer: 'text-red-400 bg-red-400/10',
    holder: 'text-brand-400 bg-brand-400/10',
    unknown: 'text-gray-400 bg-gray-400/10',
  };

  const typeColor = typeColors[node.addressInfo?.type] || typeColors.unknown;

  return (
    <div className="relative">
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute left-4 -top-4 h-4 w-px bg-dark-border" />
      )}

      {/* Node */}
      <div
        className={cn(
          'relative bg-dark-hover rounded-lg p-3 border border-dark-border',
          hasChildren && 'cursor-pointer hover:border-brand-400/30'
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Address */}
            <div className="flex items-center gap-2">
              <code className="text-sm text-gray-200 font-mono">
                {truncateAddress(node.address, 10)}
              </code>
              <CopyButton text={node.address} />
              {node.addressInfo?.name && (
                <span className={cn('text-xs px-2 py-0.5 rounded', typeColor)}>
                  {node.addressInfo.name}
                </span>
              )}
            </div>

            {/* Flags */}
            {node.flags && node.flags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {node.flags.map((flag, i) => (
                  <Badge
                    key={i}
                    variant={flag.severity === 'critical' ? 'danger' : 'warning'}
                    size="sm"
                  >
                    {flag.description}
                  </Badge>
                ))}
              </div>
            )}

            {/* Funding info */}
            {node.fundingTimestamp && (
              <p className="text-xs text-gray-500 mt-2">
                Funded: {new Date(node.fundingTimestamp).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Expand indicator */}
          {hasChildren && (
            <div className="ml-2">
              <ArrowDown
                className={cn(
                  'w-4 h-4 text-gray-500 transition-transform',
                  expanded && 'rotate-180'
                )}
              />
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-8 mt-2 space-y-2">
          {node.children.map((child, i) => (
            <FundingChainNode
              key={child.address || i}
              node={child}
              depth={depth + 1}
              isLast={i === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Info row component
 */
function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-400 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </span>
      <span className="text-sm text-gray-200">{value ?? 'N/A'}</span>
    </div>
  );
}

/**
 * Main Wallet Detail Modal Component
 */
export function WalletDetailModal({
  wallet,
  clusterMembers = [],
  explorerUrl,
  token,
  isOpen,
  onClose,
  onRefresh,
}) {
  const [loading, setLoading] = useState(false);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !wallet) return null;

  const handleRefresh = async () => {
    setLoading(true);
    await onRefresh?.();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dark-card border border-dark-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Wallet Details</h2>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm text-gray-400 font-mono">
                {truncateAddress(wallet.walletAddress, 12)}
              </code>
              <CopyButton text={wallet.walletAddress} />
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-brand-400"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 hover:bg-dark-hover rounded-lg text-gray-400 hover:text-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-dark-hover rounded-lg text-gray-400 hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Flags */}
          {wallet.riskFlags && wallet.riskFlags.length > 0 && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <h3 className="text-sm font-medium text-red-400 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Risk Flags ({wallet.riskFlags.length})
              </h3>
              <div className="space-y-2">
                {wallet.riskFlags.map((flag, i) => (
                  <div key={i} className="text-sm text-gray-300">
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded text-xs mr-2',
                        flag.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      )}
                    >
                      {flag.severity}
                    </span>
                    {flag.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-1 divide-y divide-dark-border">
              <h3 className="text-sm font-medium text-gray-300 pb-2">Holdings</h3>
              <InfoRow label="Percentage" value={`${wallet.percentage?.toFixed(2) || '?'}%`} />
              <InfoRow label="Rank" value={`#${wallet.rank || '?'}`} />
              <InfoRow label="Type" value={wallet.walletType || 'Unknown'} icon={Wallet} />
            </div>
            <div className="space-y-1 divide-y divide-dark-border">
              <h3 className="text-sm font-medium text-gray-300 pb-2">Age & Activity</h3>
              <InfoRow label="Wallet Age" value={`${wallet.ageInDays || '?'} days`} icon={Clock} />
              <InfoRow
                label="First Transaction"
                value={wallet.firstTxDate ? new Date(wallet.firstTxDate).toLocaleDateString() : 'Unknown'}
              />
              <InfoRow label="Transactions" value={wallet.transactionCount || 'Unknown'} />
            </div>
          </div>

          {/* Funding Chain */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
              <GitBranch className="w-4 h-4" />
              Funding Chain
              {wallet.fundingDepth && (
                <span className="text-xs text-gray-500">
                  ({wallet.fundingDepth} levels traced)
                </span>
              )}
            </h3>
            {wallet.fundingChain ? (
              <div className="space-y-2">
                <FundingChainNode node={wallet.fundingChain} />
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No funding chain data available. Click refresh to trace.
              </p>
            )}
          </div>

          {/* Cluster Members */}
          {wallet.clusterId && clusterMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" />
                Cluster Members
                <span className="text-xs text-gray-500">
                  (Cluster: {wallet.clusterId})
                </span>
              </h3>
              <div className="space-y-2">
                {clusterMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 bg-dark-hover rounded-lg"
                  >
                    <code className="text-sm text-gray-300 font-mono">
                      {truncateAddress(member.walletAddress)}
                    </code>
                    <span className="text-sm text-gray-400">
                      {member.percentage?.toFixed(2) || '?'}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WalletDetailModal;
