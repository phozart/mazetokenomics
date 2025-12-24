'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Loader2,
  LayoutGrid,
  List,
  ShoppingCart,
  Clock,
  TrendingUp,
  Edit2,
  Trash2,
  MoreHorizontal,
  Coins,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PackCard, BuyPackModal } from '@/components/packs';
import { CreateDcaModal } from '@/components/dca';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const riskColors = {
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function PackListItem({ pack, onBuy, onDca, onDelete }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4 hover:border-dark-border/80 transition-colors">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="p-2.5 bg-brand-400/10 rounded-lg shrink-0">
          <Package className="w-5 h-5 text-brand-400" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white truncate">{pack.name}</h3>
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border capitalize shrink-0',
                riskColors[pack.riskLevel] || riskColors.medium
              )}
            >
              {pack.riskLevel}
            </span>
          </div>
          {pack.description && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{pack.description}</p>
          )}
        </div>

        {/* Tokens Preview */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {pack.tokens.slice(0, 5).map((token, i) => (
            <div
              key={token.id}
              className="w-7 h-7 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center -ml-2 first:ml-0"
              style={{ zIndex: 5 - i }}
              title={`${token.symbol} (${token.weight}%)`}
            >
              {token.logoURI ? (
                <img src={token.logoURI} alt={token.symbol} className="w-full h-full rounded-full" />
              ) : (
                <span className="text-[10px] text-gray-400">{token.symbol?.slice(0, 2)}</span>
              )}
            </div>
          ))}
          {pack.tokens.length > 5 && (
            <span className="text-xs text-gray-500 ml-1">+{pack.tokens.length - 5}</span>
          )}
        </div>

        {/* Stats */}
        <div className="hidden lg:flex items-center gap-4 text-sm text-gray-400 shrink-0">
          <span>{pack.tokens.length} tokens</span>
          {pack._count?.dcaSchedules > 0 && (
            <span className="text-brand-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {pack._count.dcaSchedules} DCA
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/packs/${pack.id}`}
            className="p-2 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-lg text-gray-400 hover:text-white transition-colors"
            title="View Pack"
          >
            <TrendingUp className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onBuy?.(pack)}
            className="p-2 bg-brand-500 hover:bg-brand-600 rounded-lg text-white transition-colors"
            title="Buy Pack"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDca?.(pack)}
            className="p-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 transition-colors"
            title="Setup DCA"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* More Actions */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 mt-1 w-40 bg-dark-card border border-dark-border rounded-lg shadow-xl z-50 overflow-hidden">
                  <Link
                    href={`/packs/${pack.id}?edit=true`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-dark-hover transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Pack
                  </Link>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      onDelete?.(pack);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Pack
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PacksPage() {
  const router = useRouter();
  const [packs, setPacks] = useState([]);
  const [watchlistTokens, setWatchlistTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState(null);
  const [dcaPack, setDcaPack] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'

  useEffect(() => {
    fetchPacks();
    fetchWatchlist();
  }, []);

  const fetchPacks = async () => {
    try {
      const response = await fetch('/api/packs');
      if (response.ok) {
        const data = await response.json();
        setPacks(data.packs || []);
      }
    } catch (error) {
      console.error('Failed to fetch packs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        const tokens = data.watchlist
          ?.filter(item => item.chain?.toUpperCase() === 'SOLANA' && item.contractAddress)
          .map(item => ({
            address: item.contractAddress,
            symbol: item.symbol || item.token?.symbol || 'UNKNOWN',
            name: item.name || item.token?.name || 'Unknown Token',
            decimals: item.token?.decimals || 9,
            logoURI: item.token?.logoURI || null,
          })) || [];
        setWatchlistTokens(tokens);
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    }
  };

  const handleDeletePack = async (pack) => {
    if (!confirm(`Are you sure you want to delete "${pack.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/packs/${pack.id}`, { method: 'DELETE' });
      if (response.ok) {
        setPacks(packs.filter(p => p.id !== pack.id));
        toast.success('Pack deleted');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete pack');
      }
    } catch (error) {
      toast.error('Failed to delete pack');
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <Header
        title="Token Packs"
        description="Create and manage diversified token portfolios"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-brand-400/5 border border-brand-400/20 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-gray-300">
              <span className="font-medium text-brand-400">Token Packs</span> let you create diversified
              portfolios from your watchlist tokens. Set allocation percentages and buy or DCA into
              the entire pack with one click.
            </p>
            <p className="text-gray-500 mt-1">
              All trades are executed through Jupiter aggregator for best rates.
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{packs.length} pack{packs.length !== 1 ? 's' : ''}</span>

            {/* View Toggle */}
            <div className="flex items-center bg-dark-card border border-dark-border rounded-lg p-0.5 ml-4">
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'card'
                    ? 'bg-brand-400/20 text-brand-400'
                    : 'text-gray-400 hover:text-gray-200'
                )}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'list'
                    ? 'bg-brand-400/20 text-brand-400'
                    : 'text-gray-400 hover:text-gray-200'
                )}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Button variant="primary" icon={Plus} onClick={() => router.push('/packs/create')}>
            Create Pack
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          </div>
        ) : packs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Packs Yet</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create your first token pack by selecting tokens from your watchlist and setting
              allocation percentages.
            </p>
            <Button variant="primary" icon={Plus} onClick={() => router.push('/packs/create')}>
              Create Your First Pack
            </Button>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packs.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onBuy={() => setSelectedPack(pack)}
                onDca={() => setDcaPack(pack)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {packs.map((pack) => (
              <PackListItem
                key={pack.id}
                pack={pack}
                onBuy={() => setSelectedPack(pack)}
                onDca={() => setDcaPack(pack)}
                onDelete={handleDeletePack}
              />
            ))}
          </div>
        )}

        {/* Risk Warning */}
        {packs.length > 0 && (
          <div className="mt-8 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-500/80">
              <p className="font-medium text-yellow-500 mb-1">Risk Warning</p>
              <p>
                Cryptocurrency investments are subject to high market risk. Token packs do not
                guarantee returns. Only invest what you can afford to lose. This is not financial advice.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Buy Modal */}
      <BuyPackModal
        isOpen={!!selectedPack}
        onClose={() => setSelectedPack(null)}
        pack={selectedPack}
      />

      {/* DCA Modal */}
      <CreateDcaModal
        isOpen={!!dcaPack}
        onClose={() => {
          setDcaPack(null);
          fetchPacks(); // Refresh to show new DCA count
        }}
        packs={packs}
        watchlistTokens={watchlistTokens}
        preselectedPackId={dcaPack?.id}
      />
    </div>
  );
}
