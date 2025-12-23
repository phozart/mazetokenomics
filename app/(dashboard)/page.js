'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WatchlistTable, QuickAddModal } from '@/components/watchlist';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [watchlist, setWatchlist] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    if (watchlist.length === 0) return;

    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [watchlist.length, fetchPrices]);

  const handleRemove = async (id) => {
    try {
      const response = await fetch(`/api/watchlist/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove');

      setWatchlist((prev) => prev.filter((item) => item.id !== id));
      toast.success('Removed from watchlist');
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const handleAdded = () => {
    fetchWatchlist();
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
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            <span className="hidden sm:inline">Add Token</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </Header>

      <div className="p-4 sm:p-6 space-y-4">
        <Card>
          <CardContent className="p-0">
            <WatchlistTable
              items={watchlist}
              prices={prices}
              onRemove={handleRemove}
              isLoading={refreshing && Object.keys(prices).length === 0}
            />
          </CardContent>
        </Card>

        {lastUpdated && watchlist.length > 0 && (
          <div className="text-xs sm:text-sm text-gray-500 text-center">
            Last updated: {lastUpdated.toLocaleTimeString()}
            {' · '}
            <span className="text-gray-600">Auto-refresh every 30s</span>
          </div>
        )}
      </div>

      <QuickAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={handleAdded}
      />
    </div>
  );
}
