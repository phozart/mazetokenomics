'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WatchlistTable, QuickAddModal, MarketOverview } from '@/components/watchlist';
import { TokenDetailModal } from '@/components/token';
import { Plus, RefreshCw, Loader2, Undo2, Star, Info, Globe, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'watchlist', label: 'My Watchlist', icon: Star },
  { id: 'market', label: 'Market Overview', icon: TrendingUp },
];

export default function HomePage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('watchlist');
  const [watchlist, setWatchlist] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedPriceData, setSelectedPriceData] = useState(null);

  // Handle ?action=add from Quick Actions menu
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowAddModal(true);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  const fetchWatchlist = useCallback(async () => {
    try {
      const response = await fetch('/api/watchlist');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setWatchlist(data.watchlist || []);
    } catch (error) {
      toast.error('Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    if (watchlist.length === 0) return;

    setRefreshing(true);
    try {
      const response = await fetch('/api/watchlist/prices');
      if (!response.ok) throw new Error('Failed to fetch prices');
      const data = await response.json();
      setPrices(data.prices || {});
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setRefreshing(false);
    }
  }, [watchlist.length]);

  // Initial load
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Fetch prices after watchlist loads
  useEffect(() => {
    if (watchlist.length > 0) {
      fetchPrices();
    }
  }, [watchlist.length, fetchPrices]);

  // Track pending deletes for undo functionality
  const pendingDeleteRef = useRef(null);

  const handleRemove = async (id) => {
    // Find the item being removed for potential undo
    const removedItem = watchlist.find((item) => item.id === id);
    const removedIndex = watchlist.findIndex((item) => item.id === id);

    if (!removedItem) return;

    // Optimistically remove from UI
    setWatchlist((prev) => prev.filter((item) => item.id !== id));

    // Clear any existing pending delete
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timeout);
    }

    // Create undo handler
    const handleUndo = () => {
      // Cancel the pending delete
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timeout);
        pendingDeleteRef.current = null;
      }
      // Restore the item at its original position
      setWatchlist((prev) => {
        const newList = [...prev];
        newList.splice(removedIndex, 0, removedItem);
        return newList;
      });
      toast.dismiss();
      toast.success('Restored to watchlist');
    };

    // Show toast with undo option
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span>Removed from watchlist</span>
          <button
            onClick={() => {
              handleUndo();
              toast.dismiss(t.id);
            }}
            className="flex items-center gap-1 px-2 py-1 bg-brand-400/20 text-brand-400 rounded text-sm font-medium hover:bg-brand-400/30 transition-colors"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
        </div>
      ),
      {
        duration: 5000,
        position: 'bottom-center',
      }
    );

    // Schedule the actual delete after 5 seconds
    pendingDeleteRef.current = {
      id,
      timeout: setTimeout(async () => {
        try {
          const response = await fetch(`/api/watchlist/${id}`, {
            method: 'DELETE',
          });
          if (!response.ok) {
            throw new Error('Failed to remove');
          }
        } catch (error) {
          // If delete fails, restore the item
          setWatchlist((prev) => {
            const newList = [...prev];
            newList.splice(removedIndex, 0, removedItem);
            return newList;
          });
          toast.error('Failed to remove. Item restored.');
        }
        pendingDeleteRef.current = null;
      }, 5000),
    };
  };

  const handleAdded = () => {
    fetchWatchlist();
  };

  const handleReorder = async (newItems) => {
    const previousItems = [...watchlist];

    // Optimistically update UI
    setWatchlist(newItems);

    try {
      const response = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newItems.map(item => item.id) }),
      });

      if (!response.ok) {
        throw new Error('Failed to save order');
      }
    } catch (error) {
      // Revert on failure
      setWatchlist(previousItems);
      toast.error('Failed to save order');
    }
  };

  const handleTokenClick = (item, priceData) => {
    setSelectedToken(item);
    setSelectedPriceData(priceData);
  };

  const closeTokenModal = () => {
    setSelectedToken(null);
    setSelectedPriceData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] lg:h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Watchlist"
        description="Track your favorite tokens with live prices"
      >
        {activeTab === 'watchlist' && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={fetchPrices}
              isLoading={refreshing}
              className="hidden sm:inline-flex"
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={fetchPrices}
              isLoading={refreshing}
              className="sm:hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setShowAddModal(true)}
            >
              <span className="hidden sm:inline">Add Token</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        )}
      </Header>

      {/* Tab Navigation */}
      <div className="border-b border-dark-border bg-dark-card/30">
        <div className="px-4 sm:px-6">
          <div className="flex gap-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-brand-400/20 text-brand-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-dark-hover'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Market Overview Tab */}
        {activeTab === 'market' && (
          <Card>
            <CardContent className="p-0">
              <MarketOverview />
            </CardContent>
          </Card>
        )}

        {/* Watchlist Tab */}
        {activeTab === 'watchlist' && (
          <>
            {/* Guidance Banner - Show only when watchlist is empty */}
            {watchlist.length === 0 && (
              <div className="p-4 bg-brand-400/5 border border-brand-400/20 rounded-xl flex items-start gap-3">
                <Star className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-gray-300">
                    <span className="font-medium text-brand-400">Your Watchlist</span> tracks tokens you're interested in.
                    Add tokens to monitor prices, analyze safety scores, and quickly access trading features.
                  </p>
                  <p className="text-gray-500 mt-1">
                    Click "Add Token" to search by name, ticker, or paste a contract address.
                    Price data is fetched from DexScreener and updated in real-time.
                  </p>
                </div>
              </div>
            )}

            {/* Quick tip for users with tokens */}
            {watchlist.length > 0 && watchlist.length < 3 && (
              <div className="p-3 bg-dark-card border border-dark-border rounded-xl flex items-center gap-3 text-sm">
                <Info className="w-4 h-4 text-gray-500 shrink-0" />
                <p className="text-gray-400">
                  <span className="text-gray-300">Tip:</span> Click on any token row to view detailed analysis, safety scores, and trading options.
                </p>
              </div>
            )}

            <Card>
              <CardContent className="p-0">
                <WatchlistTable
                  items={watchlist}
                  prices={prices}
                  onRemove={handleRemove}
                  onTokenClick={handleTokenClick}
                  onReorder={handleReorder}
                  isLoading={refreshing && Object.keys(prices).length === 0}
                />
              </CardContent>
            </Card>

            {lastUpdated && watchlist.length > 0 && (
              <div className="text-xs sm:text-sm text-gray-500 text-center">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </>
        )}
      </div>

      <QuickAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={handleAdded}
      />

      {selectedToken && (
        <TokenDetailModal
          isOpen={!!selectedToken}
          onClose={closeTokenModal}
          contractAddress={selectedToken.token?.contractAddress || selectedToken.contractAddress}
          chain={selectedToken.token?.chain || selectedToken.chain}
          symbol={selectedToken.token?.symbol || selectedToken.symbol}
          name={selectedToken.token?.name || selectedToken.name}
          vettingProcessId={selectedToken.token?.vettingProcess?.id}
          currentPrice={selectedPriceData?.priceUsd}
          priceChange24h={selectedPriceData?.priceChange24h}
          marketCap={selectedPriceData?.marketCap}
          volume24h={selectedPriceData?.volume24h}
          liquidity={selectedPriceData?.liquidity}
          overallScore={selectedToken.token?.vettingProcess?.overallScore}
          riskLevel={selectedToken.token?.vettingProcess?.riskLevel}
          redFlagCount={selectedToken.token?.vettingProcess?._count?.redFlags}
          greenFlagCount={selectedToken.token?.vettingProcess?._count?.greenFlags}
        />
      )}
    </div>
  );
}
