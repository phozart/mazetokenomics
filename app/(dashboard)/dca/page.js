'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clock, Plus, Loader2, Filter, Play, Pause, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { DcaScheduleCard, CreateDcaModal } from '@/components/dca';
import { cn } from '@/lib/utils';

const statusFilters = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active', icon: Play },
  { id: 'paused', label: 'Paused', icon: Pause },
  { id: 'completed', label: 'Completed', icon: Check },
];

export default function DcaPage() {
  const searchParams = useSearchParams();
  const preselectedPackId = searchParams.get('packId');
  const actionParam = searchParams.get('action');

  const [schedules, setSchedules] = useState([]);
  const [packs, setPacks] = useState([]);
  const [watchlistTokens, setWatchlistTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [showCreateModal, setShowCreateModal] = useState(!!preselectedPackId || actionParam === 'create');

  // Handle ?action=create from Quick Actions
  useEffect(() => {
    if (actionParam === 'create' && !preselectedPackId) {
      setShowCreateModal(true);
      window.history.replaceState({}, '', '/dca');
    }
  }, [actionParam, preselectedPackId]);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      // Fetch schedules
      let url = '/api/dca';
      if (filter && filter !== 'all') {
        url += `?status=${filter}`;
      }
      const schedulesRes = await fetch(url);
      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setSchedules(data.schedules || []);
      }

      // Fetch packs
      const packsRes = await fetch('/api/packs');
      if (packsRes.ok) {
        const data = await packsRes.json();
        setPacks(data.packs || []);
      }

      // Fetch watchlist tokens
      const watchlistRes = await fetch('/api/watchlist');
      if (watchlistRes.ok) {
        const data = await watchlistRes.json();
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
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (scheduleId) => {
    try {
      const response = await fetch(`/api/dca/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
      if (response.ok) {
        setSchedules(
          schedules.map((s) =>
            s.id === scheduleId ? { ...s, status: 'paused' } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to pause schedule:', error);
    }
  };

  const handleResume = async (scheduleId) => {
    try {
      const response = await fetch(`/api/dca/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (response.ok) {
        const data = await response.json();
        setSchedules(
          schedules.map((s) =>
            s.id === scheduleId ? data.schedule : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to resume schedule:', error);
    }
  };

  const handleCancel = async (scheduleId) => {
    if (!confirm('Are you sure you want to cancel this DCA schedule?')) return;

    try {
      const response = await fetch(`/api/dca/${scheduleId}`, { method: 'DELETE' });
      if (response.ok) {
        setSchedules(schedules.filter((s) => s.id !== scheduleId));
      }
    } catch (error) {
      console.error('Failed to cancel schedule:', error);
    }
  };

  // Group schedules
  const activeSchedules = schedules.filter((s) => s.status === 'active');
  const pausedSchedules = schedules.filter((s) => s.status === 'paused');
  const completedSchedules = schedules.filter(
    (s) => s.status === 'completed' || s.status === 'cancelled'
  );

  return (
    <div className="min-h-screen bg-dark-bg">
      <Header
        title="DCA Schedules"
        description="Dollar cost averaging automation"
      >
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={() => setShowCreateModal(true)}
        >
          Create Schedule
        </Button>
      </Header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          {statusFilters.map((f) => (
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
        ) : schedules.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No DCA Schedules</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Set up automated recurring purchases to dollar cost average into tokens or packs.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-lg text-white font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First DCA
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Schedules */}
            {activeSchedules.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Active ({activeSchedules.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSchedules.map((schedule) => (
                    <DcaScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      onPause={handlePause}
                      onResume={handleResume}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paused Schedules */}
            {pausedSchedules.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Pause className="w-4 h-4 text-yellow-400" />
                  Paused ({pausedSchedules.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pausedSchedules.map((schedule) => (
                    <DcaScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      onPause={handlePause}
                      onResume={handleResume}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed/Cancelled */}
            {completedSchedules.length > 0 && filter !== 'active' && filter !== 'paused' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">History</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedSchedules.map((schedule) => (
                    <DcaScheduleCard key={schedule.id} schedule={schedule} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateDcaModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          fetchData();
        }}
        packs={packs}
        watchlistTokens={watchlistTokens}
        preselectedPackId={preselectedPackId}
      />
    </div>
  );
}
