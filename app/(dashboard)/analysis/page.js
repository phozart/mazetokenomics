'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge, RiskBadge, ChainBadge, PriorityBadge } from '@/components/ui/Badge';
import { formatAddress, formatRelativeTime } from '@/lib/utils';
import { CHAINS } from '@/lib/constants';
import {
  Shield,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  ListFilter,
  Coins,
  CheckCircle,
  AlertTriangle,
  Clock,
  ListTodo,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'tokens', label: 'All Tokens', icon: Coins },
  { id: 'queue', label: 'Analysis Queue', icon: ListTodo },
];

const chainOptions = [
  { value: '', label: 'All Chains' },
  ...Object.entries(CHAINS).map(([key, chain]) => ({
    value: key,
    label: chain.name,
  })),
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'AUTO_RUNNING', label: 'Running Checks' },
  { value: 'AUTO_COMPLETE', label: 'Awaiting Review' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'REVIEW_COMPLETE', label: 'Review Complete' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FLAGGED', label: 'Flagged' },
];

function StatCard({ label, value, icon: Icon, colorClass, bgClass, onClick }) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Card className={onClick ? 'cursor-pointer hover:border-brand-400/50 transition-colors' : ''}>
      <Component onClick={onClick} className="w-full text-left">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{label}</p>
              <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
            </div>
            <div className={`p-3 ${bgClass} rounded-lg`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Component>
    </Card>
  );
}

function TokenRow({ process }) {
  return (
    <Link
      href={`/tokens/${process.id}`}
      className="flex items-center justify-between p-4 hover:bg-dark-hover transition-colors border-b border-dark-border/50 last:border-0"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-dark-bg rounded-lg flex items-center justify-center">
          <span className="text-sm font-bold text-gray-400">
            {process.token.symbol?.slice(0, 2) || '??'}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-100">{process.token.symbol || 'Unknown'}</span>
            <ChainBadge chain={process.token.chain} />
          </div>
          <span className="text-sm text-gray-500">{process.token.name || 'Unknown Token'}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-sm text-gray-400">Score</div>
          <div className={cn(
            'text-lg font-bold',
            process.overallScore >= 70 ? 'text-green-400' :
            process.overallScore >= 40 ? 'text-yellow-400' :
            process.overallScore ? 'text-red-400' : 'text-gray-500'
          )}>
            {process.overallScore ? Math.round(process.overallScore) : '-'}
          </div>
        </div>
        <StatusBadge status={process.status} />
        {process.riskLevel && <RiskBadge riskLevel={process.riskLevel} />}
      </div>
    </Link>
  );
}

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, flagged: 0 });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [chainFilter, setChainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Handle URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');

    if (tab && tabs.find(t => t.id === tab)) {
      setActiveTab(tab);
    }

    if (action === 'new') {
      router.push('/tokens/new');
    }
  }, [searchParams, router]);

  // Fetch data
  const fetchTokens = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (chainFilter) params.set('chain', chainFilter);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/tokens?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens || []);

        // Calculate stats
        const allTokens = data.tokens || [];
        const pending = allTokens.filter(t =>
          ['PENDING', 'AUTO_RUNNING', 'AUTO_COMPLETE', 'IN_REVIEW'].includes(t.status)
        ).length;
        const completed = allTokens.filter(t =>
          ['REVIEW_COMPLETE', 'APPROVED'].includes(t.status)
        ).length;
        const flagged = allTokens.filter(t => t.status === 'FLAGGED').length;

        setStats({
          total: data.total || allTokens.length,
          pending,
          completed,
          flagged,
        });
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [chainFilter, statusFilter]);

  // Filter tokens for display
  const filteredTokens = tokens.filter((process) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      process.token.symbol?.toLowerCase().includes(searchLower) ||
      process.token.name?.toLowerCase().includes(searchLower) ||
      process.token.contractAddress.toLowerCase().includes(searchLower)
    );
  });

  const pendingTokens = tokens.filter(t =>
    ['PENDING', 'AUTO_RUNNING', 'AUTO_COMPLETE', 'IN_REVIEW'].includes(t.status)
  );

  const recentTokens = [...tokens]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="min-h-screen">
      <Header title="Token Analysis" description="Analyze and track token security" />

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="p-4 bg-brand-400/5 border border-brand-400/20 rounded-xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-gray-300">
                  <span className="font-medium text-brand-400">Token Analysis</span> helps you evaluate
                  token safety before trading. Automated checks include liquidity analysis, holder distribution,
                  contract risks, and market metrics.
                </p>
                <p className="text-gray-500 mt-1">
                  Submit any token for analysis. Higher scores indicate lower risk, but always do your own research.
                  Analysis results are for informational purposes only.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Tokens"
                value={stats.total}
                icon={Coins}
                colorClass="text-brand-400"
                bgClass="bg-brand-400/10 text-brand-400"
                onClick={() => setActiveTab('tokens')}
              />
              <StatCard
                label="Pending Analysis"
                value={stats.pending}
                icon={Clock}
                colorClass="text-yellow-400"
                bgClass="bg-yellow-400/10 text-yellow-400"
                onClick={() => {
                  setStatusFilter('PENDING');
                  setActiveTab('queue');
                }}
              />
              <StatCard
                label="Completed"
                value={stats.completed}
                icon={CheckCircle}
                colorClass="text-green-400"
                bgClass="bg-green-400/10 text-green-400"
                onClick={() => {
                  setStatusFilter('APPROVED');
                  setActiveTab('tokens');
                }}
              />
              <StatCard
                label="Flagged"
                value={stats.flagged}
                icon={AlertTriangle}
                colorClass="text-red-400"
                bgClass="bg-red-400/10 text-red-400"
                onClick={() => {
                  setStatusFilter('FLAGGED');
                  setActiveTab('tokens');
                }}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Tokens */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-brand-400" />
                    Recent Tokens
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('tokens')}
                    className="text-brand-400"
                  >
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                    </div>
                  ) : recentTokens.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No tokens analyzed yet
                    </div>
                  ) : (
                    <div>
                      {recentTokens.map((process) => (
                        <TokenRow key={process.id} process={process} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Queue */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-yellow-400" />
                    Pending Analysis
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('queue')}
                    className="text-brand-400"
                  >
                    View Queue <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                    </div>
                  ) : pendingTokens.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No tokens pending analysis
                    </div>
                  ) : (
                    <div>
                      {pendingTokens.slice(0, 5).map((process) => (
                        <TokenRow key={process.id} process={process} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Action */}
            <Card className="bg-gradient-to-r from-brand-500/10 to-accent-500/10 border-brand-500/20">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Analyze a New Token</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Submit a token contract address for comprehensive security analysis
                  </p>
                </div>
                <Link href="/tokens/new">
                  <Button variant="primary" icon={Plus}>
                    Analyze Token
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Tokens Tab */}
        {activeTab === 'tokens' && (
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="Search by name, symbol, or address..."
                      icon={Search}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select
                    options={chainOptions}
                    value={chainFilter}
                    onChange={(e) => setChainFilter(e.target.value)}
                    placeholder="Filter by chain"
                    className="w-40"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    onClick={fetchTokens}
                    isLoading={loading}
                  >
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Token List */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                  </div>
                ) : filteredTokens.length === 0 ? (
                  <div className="text-center py-12">
                    <Coins className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No tokens found</p>
                  </div>
                ) : (
                  <div>
                    {filteredTokens.map((process) => (
                      <TokenRow key={process.id} process={process} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <ListFilter className="w-5 h-5 text-gray-400" />
                  <Select
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    placeholder="Filter by status"
                    className="w-48"
                  />
                  <Select
                    options={chainOptions}
                    value={chainFilter}
                    onChange={(e) => setChainFilter(e.target.value)}
                    placeholder="Filter by chain"
                    className="w-40"
                  />
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    onClick={fetchTokens}
                    isLoading={loading}
                  >
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Queue List */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                  </div>
                ) : filteredTokens.length === 0 ? (
                  <div className="text-center py-12">
                    <ListTodo className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No tokens in queue</p>
                    <Link href="/tokens/new">
                      <Button variant="primary" icon={Plus} className="mt-4">
                        Analyze a Token
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div>
                    {filteredTokens.map((process) => (
                      <TokenRow key={process.id} process={process} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
