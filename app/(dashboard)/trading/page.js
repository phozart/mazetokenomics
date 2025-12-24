'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  ArrowLeftRight,
  Target,
  Clock,
  Plus,
  Loader2,
  Filter,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Play,
  Pause,
  Check,
  RefreshCw,
  Wallet,
  Shield,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { SwapCard, RecentSwaps, useRecentSwaps } from '@/components/trade';
import { OrderCard, CreateOrderModal } from '@/components/orders';
import { DcaScheduleCard, CreateDcaModal } from '@/components/dca';
import { useSolBalance } from '@/lib/jupiter/hooks';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'swap', label: 'Swap', icon: ArrowLeftRight },
  { id: 'orders', label: 'Orders', icon: Target },
  { id: 'dca', label: 'DCA', icon: Clock },
];

const orderFilters = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'limit_buy', label: 'Buy', icon: TrendingDown },
  { id: 'limit_sell', label: 'Sell', icon: TrendingUp },
  { id: 'stop_loss', label: 'Stop Loss', icon: ShieldAlert },
];

const dcaFilters = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active', icon: Play },
  { id: 'paused', label: 'Paused', icon: Pause },
];

export default function TradingPage() {
  const searchParams = useSearchParams();
  const { connected, publicKey } = useWallet();
  const { balance: solBalance } = useSolBalance();
  const { swaps } = useRecentSwaps();

  // Tab state
  const [activeTab, setActiveTab] = useState('swap');
  const [orderFilter, setOrderFilter] = useState('active');
  const [dcaFilter, setDcaFilter] = useState('active');

  // Modal states
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [showCreateDcaModal, setShowCreateDcaModal] = useState(false);

  // Data states
  const [orders, setOrders] = useState([]);
  const [dcaSchedules, setDcaSchedules] = useState([]);
  const [watchlistTokens, setWatchlistTokens] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingDca, setLoadingDca] = useState(false);

  // Swap preselected token
  const [preselectedToken, setPreselectedToken] = useState(null);

  // Handle URL params for tab and action
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');

    if (tab && tabs.find(t => t.id === tab)) {
      setActiveTab(tab);
    }

    if (action === 'create') {
      if (tab === 'orders') {
        setShowCreateOrderModal(true);
      } else if (tab === 'dca') {
        setShowCreateDcaModal(true);
      }
      // Clean up URL
      window.history.replaceState({}, '', '/trading');
    }

    // Handle token param for swap
    const address = searchParams.get('token');
    const symbol = searchParams.get('symbol');
    const name = searchParams.get('name');
    const decimals = parseInt(searchParams.get('decimals') || '9');

    if (address) {
      setPreselectedToken({
        address,
        symbol: symbol || 'TOKEN',
        name: name || 'Unknown Token',
        decimals,
      });
    }
  }, [searchParams]);

  // Fetch watchlist tokens
  useEffect(() => {
    async function fetchWatchlist() {
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
              score: item.token?.vettingProcess?.overallScore,
              logoURI: item.token?.logoURI || null,
            })) || [];
          setWatchlistTokens(tokens);
        }
      } catch (error) {
        console.error('Failed to fetch watchlist:', error);
      }
    }
    fetchWatchlist();
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      let url = '/api/orders';
      if (orderFilter === 'active') {
        url += '?status=active';
      } else if (['limit_buy', 'limit_sell', 'stop_loss', 'take_profit'].includes(orderFilter)) {
        url += `?type=${orderFilter}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, [orderFilter]);

  // Fetch DCA schedules
  const fetchDcaSchedules = useCallback(async () => {
    setLoadingDca(true);
    try {
      let url = '/api/dca';
      if (dcaFilter && dcaFilter !== 'all') {
        url += `?status=${dcaFilter}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDcaSchedules(data.schedules || []);
      }

      // Also fetch packs for DCA modal
      const packsRes = await fetch('/api/packs');
      if (packsRes.ok) {
        const data = await packsRes.json();
        setPacks(data.packs || []);
      }
    } catch (error) {
      console.error('Failed to fetch DCA schedules:', error);
    } finally {
      setLoadingDca(false);
    }
  }, [dcaFilter]);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'dca') {
      fetchDcaSchedules();
    }
  }, [activeTab, fetchOrders, fetchDcaSchedules]);

  // Order handlers
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

  // DCA handlers
  const handlePauseDca = async (scheduleId) => {
    try {
      const response = await fetch(`/api/dca/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
      if (response.ok) {
        setDcaSchedules(dcaSchedules.map((s) =>
          s.id === scheduleId ? { ...s, status: 'paused' } : s
        ));
      }
    } catch (error) {
      console.error('Failed to pause DCA:', error);
    }
  };

  const handleResumeDca = async (scheduleId) => {
    try {
      const response = await fetch(`/api/dca/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (response.ok) {
        const data = await response.json();
        setDcaSchedules(dcaSchedules.map((s) =>
          s.id === scheduleId ? data.schedule : s
        ));
      }
    } catch (error) {
      console.error('Failed to resume DCA:', error);
    }
  };

  const handleCancelDca = async (scheduleId) => {
    if (!confirm('Are you sure you want to cancel this DCA schedule?')) return;
    try {
      const response = await fetch(`/api/dca/${scheduleId}`, { method: 'DELETE' });
      if (response.ok) {
        setDcaSchedules(dcaSchedules.filter((s) => s.id !== scheduleId));
      }
    } catch (error) {
      console.error('Failed to cancel DCA:', error);
    }
  };

  const activeOrders = orders.filter((o) => o.status === 'active');
  const historyOrders = orders.filter((o) => o.status !== 'active');
  const activeDca = dcaSchedules.filter((s) => s.status === 'active');
  const pausedDca = dcaSchedules.filter((s) => s.status === 'paused');

  return (
    <div className="min-h-screen bg-dark-bg">
      <Header title="Trading" description="Swap, orders, and DCA" />

      {/* Tab Navigation */}
      <div className="border-b border-dark-border bg-dark-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Swap Tab */}
        {activeTab === 'swap' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <SwapCard
                watchlistTokens={watchlistTokens}
                preselectedToken={preselectedToken}
              />
              {swaps.length > 0 && <RecentSwaps swaps={swaps} />}

              {/* Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-brand-400" />
                    How It Works
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-brand-400 font-mono">1.</span>
                      Connect your wallet
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-400 font-mono">2.</span>
                      Select tokens and enter amount
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-400 font-mono">3.</span>
                      Review rate and confirm swap
                    </li>
                  </ul>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    Security
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      Non-custodial trading
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      Jupiter aggregator
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      Slippage protection
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {connected && (
                <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-200 mb-4">Wallet</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">SOL Balance</span>
                      <span className="text-sm text-gray-200 font-mono">
                        {solBalance.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Address</span>
                      <span className="text-sm text-gray-200 font-mono">
                        {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {watchlistTokens.length > 0 && (
                <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-200 mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Watchlist Tokens
                  </h3>
                  <div className="space-y-2">
                    {watchlistTokens.slice(0, 5).map((token) => (
                      <button
                        key={token.address}
                        onClick={() => setPreselectedToken(token)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-dark-hover transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-dark-bg rounded-full flex items-center justify-center text-xs font-bold text-gray-400">
                            {token.symbol?.slice(0, 2)}
                          </div>
                          <span className="text-sm font-medium text-gray-200">{token.symbol}</span>
                        </div>
                        {token.score && (
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded font-medium',
                            token.score >= 70 ? 'bg-green-500/20 text-green-400' :
                            token.score >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          )}>
                            {Math.round(token.score)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-brand-400/5 border border-brand-400/20 rounded-xl flex items-start gap-3">
              <Target className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-gray-300">
                  <span className="font-medium text-brand-400">Limit Orders</span> let you set target prices for automatic execution.
                  Create stop losses to limit downside or take profits to lock in gains.
                </p>
                <p className="text-gray-500 mt-1">
                  Orders are monitored and executed through Jupiter when price targets are reached. Your wallet must have sufficient balance at execution time.
                </p>
              </div>
            </div>

            {/* Section Header with Action */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                {orderFilters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setOrderFilter(f.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors',
                      orderFilter === f.id
                        ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30'
                        : 'bg-dark-card border border-dark-border text-gray-400 hover:border-gray-600'
                    )}
                  >
                    {f.icon && <f.icon className="w-3.5 h-3.5" />}
                    {f.label}
                  </button>
                ))}
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setShowCreateOrderModal(true)}
              >
                Create Order
              </Button>
            </div>

            {loadingOrders ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-gray-500" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">No Orders</h2>
                <p className="text-gray-400 mb-6">Create limit orders, stop losses, or take profits.</p>
                <Button variant="primary" icon={Plus} onClick={() => setShowCreateOrderModal(true)}>
                  Create Order
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {activeOrders.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Active ({activeOrders.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeOrders.map((order) => (
                        <OrderCard key={order.id} order={order} onCancel={handleCancelOrder} />
                      ))}
                    </div>
                  </div>
                )}
                {historyOrders.length > 0 && orderFilter !== 'active' && (
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4">History</h2>
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
        )}

        {/* DCA Tab */}
        {activeTab === 'dca' && (
          <div>
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-purple-400/5 border border-purple-400/20 rounded-xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-gray-300">
                  <span className="font-medium text-purple-400">Dollar Cost Averaging (DCA)</span> automates recurring purchases
                  to spread investment over time and reduce timing risk.
                </p>
                <p className="text-gray-500 mt-1">
                  Set a budget, frequency, and target tokens or packs. Ensure sufficient SOL balance for scheduled purchases.
                  DCA does not guarantee profits and markets can still decline.
                </p>
              </div>
            </div>

            {/* Section Header with Action */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                {dcaFilters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDcaFilter(f.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors',
                      dcaFilter === f.id
                        ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30'
                        : 'bg-dark-card border border-dark-border text-gray-400 hover:border-gray-600'
                    )}
                  >
                    {f.icon && <f.icon className="w-3.5 h-3.5" />}
                    {f.label}
                  </button>
                ))}
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setShowCreateDcaModal(true)}
              >
                Create DCA
              </Button>
            </div>

            {loadingDca ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              </div>
            ) : dcaSchedules.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-500" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">No DCA Schedules</h2>
                <p className="text-gray-400 mb-6">Set up automated recurring purchases.</p>
                <Button variant="primary" icon={Plus} onClick={() => setShowCreateDcaModal(true)}>
                  Create DCA Schedule
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {activeDca.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Active ({activeDca.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeDca.map((schedule) => (
                        <DcaScheduleCard
                          key={schedule.id}
                          schedule={schedule}
                          onPause={handlePauseDca}
                          onResume={handleResumeDca}
                          onCancel={handleCancelDca}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {pausedDca.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Pause className="w-4 h-4 text-yellow-400" />
                      Paused ({pausedDca.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pausedDca.map((schedule) => (
                        <DcaScheduleCard
                          key={schedule.id}
                          schedule={schedule}
                          onPause={handlePauseDca}
                          onResume={handleResumeDca}
                          onCancel={handleCancelDca}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Risk Warning */}
        <div className="mt-8 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-500/80">
            <p className="font-medium text-yellow-500 mb-1">Trading Risk Warning</p>
            <p>
              Cryptocurrency trading involves substantial risk of loss. Prices can be highly volatile.
              Orders may not execute at expected prices due to slippage or market conditions.
              Only trade with funds you can afford to lose. This is not financial advice.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => {
          setShowCreateOrderModal(false);
          fetchOrders();
        }}
        watchlistTokens={watchlistTokens}
      />

      <CreateDcaModal
        isOpen={showCreateDcaModal}
        onClose={() => {
          setShowCreateDcaModal(false);
          fetchDcaSchedules();
        }}
        packs={packs}
        watchlistTokens={watchlistTokens}
      />
    </div>
  );
}
