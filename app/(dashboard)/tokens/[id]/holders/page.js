'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, ChainBadge } from '@/components/ui/Badge';
import {
  RiskScorePanel,
  ConcentrationMetrics,
  WalletList,
  WalletDetailModal,
  NetworkGraph,
} from '@/components/holders';
import { CHAINS } from '@/lib/constants';
import { formatAddress } from '@/lib/utils';
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Play,
  Network,
  Users,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HolderAnalysisPage({ params }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [analysis, setAnalysis] = useState(null);
  const [token, setToken] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [walletFilter, setWalletFilter] = useState('all');

  // Wallet detail modal
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletDetail, setWalletDetail] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Fetch holder analysis data
  const fetchAnalysis = async () => {
    try {
      const response = await fetch(`/api/tokens/${id}/holder-analysis`);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to fetch');
      }

      setAnalysis(data.analysis);
      setToken(data.token);

      if (data.analysis?.walletTraces) {
        setWallets(data.analysis.walletTraces);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
      toast.error(error.message || 'Failed to load holder analysis');
    } finally {
      setLoading(false);
    }
  };

  // Fetch wallet list with filters
  const fetchWallets = async (filter = 'all', page = 1) => {
    try {
      const response = await fetch(
        `/api/tokens/${id}/holder-analysis/wallets?filter=${filter}&page=${page}&limit=20`
      );
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();

      setWallets(data.wallets);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  // Fetch graph data
  const fetchGraph = async () => {
    setLoadingGraph(true);
    try {
      const response = await fetch(`/api/tokens/${id}/holder-analysis/graph`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();

      setGraphData({
        nodes: data.nodes,
        edges: data.edges,
        options: data.options,
      });
    } catch (error) {
      console.error('Error fetching graph:', error);
    } finally {
      setLoadingGraph(false);
    }
  };

  // Run holder analysis
  const runAnalysis = async () => {
    setRunning(true);
    try {
      const response = await fetch(`/api/tokens/${id}/holder-analysis`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to run analysis');
      }

      toast.success('Holder analysis completed');
      await fetchAnalysis();
      await fetchGraph();
    } catch (error) {
      console.error('Error running analysis:', error);
      toast.error(error.message || 'Failed to run holder analysis');
    } finally {
      setRunning(false);
    }
  };

  // Fetch wallet detail
  const fetchWalletDetail = async (address, refresh = false) => {
    setLoadingWallet(true);
    try {
      const response = await fetch(
        `/api/tokens/${id}/holder-analysis/wallets/${address}?refresh=${refresh}`
      );
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();

      setWalletDetail(data);
    } catch (error) {
      console.error('Error fetching wallet detail:', error);
      toast.error('Failed to load wallet details');
    } finally {
      setLoadingWallet(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  // Load graph when tab changes
  useEffect(() => {
    if (activeTab === 'network' && graphData.nodes.length === 0 && analysis) {
      fetchGraph();
    }
  }, [activeTab, analysis]);

  // Handle wallet filter change
  const handleFilterChange = (filter) => {
    setWalletFilter(filter);
    fetchWallets(filter, 1);
  };

  // Handle wallet selection
  const handleWalletSelect = (wallet) => {
    setSelectedWallet(wallet);
    fetchWalletDetail(wallet.walletAddress);
  };

  // Get explorer URL
  const getExplorerUrl = () => {
    if (!token?.chain) return 'https://etherscan.io/address/';
    const chainConfig = CHAINS[token.chain];
    return chainConfig?.explorer ? `${chainConfig.explorer}/address/` : 'https://etherscan.io/address/';
  };

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'wallets', label: 'Wallets', icon: Users },
    { id: 'network', label: 'Network', icon: Network },
  ];

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/tokens/${id}`}
              className="p-2 hover:bg-dark-hover rounded-lg text-gray-400 hover:text-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-100">
                  Holder Analysis
                </h1>
                {token && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="text-xl text-gray-300">{token.symbol}</span>
                    <ChainBadge chain={token.chain} />
                  </>
                )}
              </div>
              {token && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatAddress(token.contractAddress)}
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={runAnalysis}
            disabled={running}
            variant="primary"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </div>

        {/* Status message if no analysis */}
        {!analysis && (
          <Card className="mb-6">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                No Holder Analysis Available
              </h3>
              <p className="text-gray-500 mb-4">
                Click "Run Analysis" to perform advanced holder analysis including
                funding chain tracing, concentration metrics, and risk scoring.
              </p>
              <Button onClick={runAnalysis} disabled={running}>
                <Play className="w-4 h-4 mr-2" />
                Run Holder Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        {analysis && (
          <>
            <div className="flex items-center gap-1 mb-6 border-b border-dark-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'text-brand-400 border-brand-400'
                      : 'text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiskScorePanel analysis={analysis} />
                <ConcentrationMetrics analysis={analysis} />
              </div>
            )}

            {activeTab === 'wallets' && (
              <WalletList
                wallets={wallets}
                pagination={pagination}
                onSelectWallet={handleWalletSelect}
                onFilterChange={handleFilterChange}
                onPageChange={(page) => fetchWallets(walletFilter, page)}
                currentFilter={walletFilter}
                explorerBaseUrl={getExplorerUrl()}
              />
            )}

            {activeTab === 'network' && (
              <NetworkGraph
                nodes={graphData.nodes}
                edges={graphData.edges}
                options={graphData.options}
                loading={loadingGraph}
                onNodeClick={(node) => {
                  if (node.group === 'holder') {
                    const wallet = wallets.find(
                      (w) => w.walletAddress.toLowerCase() === node.id.toLowerCase()
                    );
                    if (wallet) {
                      handleWalletSelect(wallet);
                    }
                  }
                }}
              />
            )}
          </>
        )}

        {/* Wallet Detail Modal */}
        <WalletDetailModal
          wallet={walletDetail?.wallet}
          clusterMembers={walletDetail?.clusterMembers || []}
          explorerUrl={walletDetail?.explorerUrl}
          token={walletDetail?.token}
          isOpen={!!selectedWallet}
          onClose={() => {
            setSelectedWallet(null);
            setWalletDetail(null);
          }}
          onRefresh={() => fetchWalletDetail(selectedWallet?.walletAddress, true)}
        />
      </main>
    </div>
  );
}
