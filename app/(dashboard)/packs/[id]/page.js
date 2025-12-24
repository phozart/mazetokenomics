'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Loader2,
  ShoppingCart,
  Edit2,
  Trash2,
  ExternalLink,
  Clock,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { BuyPackModal, CreatePackForm } from '@/components/packs';
import { cn } from '@/lib/utils';

export default function PackDetailPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  const isEditMode = searchParams.get('edit') === 'true';

  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [watchlistTokens, setWatchlistTokens] = useState([]);

  useEffect(() => {
    fetchPack();
    if (isEditMode) {
      fetchWatchlistTokens();
    }
  }, [id, isEditMode]);

  const fetchPack = async () => {
    try {
      const response = await fetch(`/api/packs/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPack(data.pack);
      } else if (response.status === 404) {
        router.push('/packs');
      }
    } catch (error) {
      console.error('Failed to fetch pack:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlistTokens = async () => {
    try {
      const response = await fetch('/api/watchlist');
      if (response.ok) {
        const data = await response.json();
        const solanaTokens = (data.watchlist || [])
          .filter(
            (item) =>
              item.chain?.toUpperCase() === 'SOLANA' &&
              (item.contractAddress || item.token?.contractAddress)
          )
          .map((item) => ({
            address: item.contractAddress || item.token?.contractAddress,
            symbol: item.symbol || item.token?.symbol || 'UNKNOWN',
            name: item.name || item.token?.name || 'Unknown Token',
            decimals: item.token?.decimals || 9,
            score: item.token?.vettingProcess?.overallScore,
            logoURI: item.token?.logoUrl || null,
          }));
        setWatchlistTokens(solanaTokens);
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this pack?')) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/packs/${id}`, { method: 'DELETE' });
      if (response.ok) {
        router.push('/packs');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete pack');
      }
    } catch (error) {
      console.error('Failed to delete pack:', error);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (!pack) {
    return null;
  }

  const riskColors = {
    low: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-red-500/20 text-red-400',
  };

  // Transform pack tokens for edit form
  const packForEdit = {
    ...pack,
    tokens: pack.tokens.map((t) => ({
      ...t,
      address: t.tokenAddress,
    })),
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/packs"
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-400/10 rounded-lg">
                  <Package className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">{pack.name}</h1>
                  <p className="text-xs text-gray-500">{pack.tokens.length} tokens</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditMode && (
                <>
                  <button
                    onClick={() => setShowBuyModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg text-sm text-white font-medium transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Buy Pack
                  </button>
                  <Link
                    href={`/packs/${id}?edit=true`}
                    className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-hover rounded-lg transition-colors"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isEditMode ? (
          <CreatePackForm watchlistTokens={watchlistTokens} initialPack={packForEdit} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pack Info */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{pack.name}</h2>
                    {pack.description && (
                      <p className="text-gray-400 mt-1">{pack.description}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm px-3 py-1 rounded-full capitalize',
                      riskColors[pack.riskLevel] || riskColors.medium
                    )}
                  >
                    {pack.riskLevel} risk
                  </span>
                </div>

                {/* Tokens */}
                <div className="space-y-2">
                  <h3 className="text-sm text-gray-400 mb-3">Allocation</h3>
                  {pack.tokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between p-3 bg-dark-bg rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-dark-card flex items-center justify-center overflow-hidden">
                          {token.logoURI ? (
                            <img
                              src={token.logoURI}
                              alt={token.symbol}
                              className="w-full h-full"
                            />
                          ) : (
                            <span className="text-xs font-bold text-gray-400">
                              {token.symbol?.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{token.symbol}</p>
                          <p className="text-xs text-gray-500">{token.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-2 bg-dark-card rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-400 rounded-full"
                            style={{ width: `${token.weight}%` }}
                          />
                        </div>
                        <span className="text-white font-medium w-12 text-right">
                          {token.weight.toFixed(1)}%
                        </span>
                        <a
                          href={`https://solscan.io/token/${token.tokenAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-brand-400"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Purchases */}
              {pack.purchases && pack.purchases.length > 0 && (
                <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    Recent Purchases
                  </h3>
                  <div className="space-y-3">
                    {pack.purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="flex items-center justify-between p-3 bg-dark-bg rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {purchase.status === 'completed' ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : purchase.status === 'partial' ? (
                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                          ) : purchase.status === 'failed' ? (
                            <X className="w-5 h-5 text-red-400" />
                          ) : (
                            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                          )}
                          <div>
                            <p className="text-white">{purchase.totalAmountSol} SOL</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(purchase.createdAt)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'text-xs px-2 py-1 rounded capitalize',
                            purchase.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : purchase.status === 'partial'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : purchase.status === 'failed'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-brand-400/20 text-brand-400'
                          )}
                        >
                          {purchase.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Pack Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Tokens</span>
                    <span className="text-white font-medium">{pack.tokens.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Purchases</span>
                    <span className="text-white font-medium">
                      {pack.purchases?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Active DCA</span>
                    <span className="text-white font-medium">
                      {pack.dcaSchedules?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Created</span>
                    <span className="text-white font-medium">
                      {new Date(pack.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowBuyModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-lg text-white font-medium transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Buy Pack
                  </button>
                  <Link
                    href={`/dca?packId=${pack.id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-bg border border-dark-border hover:border-gray-600 rounded-lg text-gray-300 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    Set Up DCA
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Buy Modal */}
      <BuyPackModal isOpen={showBuyModal} onClose={() => setShowBuyModal(false)} pack={pack} />
    </div>
  );
}
