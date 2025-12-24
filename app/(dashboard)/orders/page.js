'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Target,
  Plus,
  Loader2,
  Filter,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { OrderCard, CreateOrderModal } from '@/components/orders';
import { cn } from '@/lib/utils';

const orderFilters = [
  { id: 'all', label: 'All Orders' },
  { id: 'active', label: 'Active' },
  { id: 'limit_buy', label: 'Limit Buy', icon: TrendingDown },
  { id: 'limit_sell', label: 'Limit Sell', icon: TrendingUp },
  { id: 'stop_loss', label: 'Stop Loss', icon: ShieldAlert },
  { id: 'take_profit', label: 'Take Profit', icon: Target },
];

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [watchlistTokens, setWatchlistTokens] = useState([]);

  // Handle ?action=create from Quick Actions
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
      window.history.replaceState({}, '', '/orders');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchOrders();
    fetchWatchlistTokens();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      let url = '/api/orders';
      if (filter === 'active') {
        url += '?status=active';
      } else if (['limit_buy', 'limit_sell', 'stop_loss', 'take_profit'].includes(filter)) {
        url += `?type=${filter}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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

  const handleCancelOrder = async (orderId) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (response.ok) {
        setOrders(orders.filter((o) => o.id !== orderId));
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  // Group orders by status
  const activeOrders = orders.filter((o) => o.status === 'active');
  const historyOrders = orders.filter((o) => o.status !== 'active');

  return (
    <div className="min-h-screen">
      <Header
        title="Orders"
        description="Limit orders, stop loss & take profit"
      >
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={() => setShowCreateModal(true)}
        >
          Create Order
        </Button>
      </Header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          {orderFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors',
                filter === f.id
                  ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30'
                  : 'bg-dark-card border border-dark-border text-gray-400 hover:border-gray-600'
              )}
            >
              {f.icon && <f.icon className="w-3.5 h-3.5" />}
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Orders Yet</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create limit orders, stop losses, or take profit orders to automate your trading.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-lg text-white font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Order
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Active Orders ({activeOrders.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={handleCancelOrder}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Order History */}
            {historyOrders.length > 0 && filter !== 'active' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Order History</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {historyOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          fetchOrders();
        }}
        watchlistTokens={watchlistTokens}
      />
    </div>
  );
}
