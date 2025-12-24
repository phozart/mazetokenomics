'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ChainBadge, RiskBadge } from '@/components/ui/Badge';
import { PriceChart } from './PriceChart';
import { formatAddress, copyToClipboard } from '@/lib/utils';
import { CHAINS } from '@/lib/constants';
import {
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Globe,
  MessageCircle,
  Send,
  FileText,
  Lock,
  Coins,
  Snowflake,
  Edit3,
  X,
  Check,
  ArrowLeftRight,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatPrice(price) {
  if (price === null || price === undefined) return '-';
  const num = parseFloat(price);
  if (num < 0.00001) {
    return '$' + num.toExponential(2);
  }
  if (num < 1) {
    return '$' + num.toFixed(6);
  }
  if (num < 1000) {
    return '$' + num.toFixed(2);
  }
  return '$' + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatLargeNumber(num) {
  if (num === null || num === undefined) return '-';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
  return '$' + num.toFixed(2);
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-dark-bg/50 rounded-lg p-3">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <div className="text-gray-100 font-medium">{value}</div>
    </div>
  );
}

// Social icon component
function SocialIcon({ type }) {
  switch (type) {
    case 'twitter':
      // X (formerly Twitter)
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'telegram':
      return <Send className="w-4 h-4" />;
    case 'discord':
      return <MessageCircle className="w-4 h-4" />;
    default:
      return <Globe className="w-4 h-4" />;
  }
}

// Score Circle component
function ScoreCircle({ overallScore, rugcheckScore, isLoading, chain }) {
  // Priority: overallScore (from vetting) > rugcheckScore (from RugCheck API)
  // Parse values to handle strings or other types
  const parsedOverallScore = parseFloat(overallScore);
  const parsedRugcheckScore = parseFloat(rugcheckScore);

  const hasOverallScore = !isNaN(parsedOverallScore);
  const hasRugcheckScore = !isNaN(parsedRugcheckScore);

  // Calculate display score: use overallScore if available, otherwise rugcheckScore * 100
  let displayScore = null;
  let scoreSource = null;

  if (hasOverallScore) {
    displayScore = parsedOverallScore;
    scoreSource = 'analysis';
  } else if (hasRugcheckScore) {
    displayScore = parsedRugcheckScore * 100;
    scoreSource = 'rugcheck';
  }


  // Show loading state
  if (isLoading && !hasOverallScore) {
    return (
      <div className="flex-shrink-0">
        <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 border-dark-border bg-dark-bg/50 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  // Show score if available
  if (displayScore !== null) {
    const scoreValue = Math.round(displayScore);
    return (
      <div className="flex-shrink-0">
        <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 ${
          scoreValue >= 70
            ? 'border-green-500 bg-green-500/10'
            : scoreValue >= 40
            ? 'border-yellow-500 bg-yellow-500/10'
            : 'border-red-500 bg-red-500/10'
        }`}>
          <span className={`text-xl font-bold ${
            scoreValue >= 70
              ? 'text-green-400'
              : scoreValue >= 40
              ? 'text-yellow-400'
              : 'text-red-400'
          }`}>
            {scoreValue}
          </span>
          <span className="text-[10px] text-gray-500 -mt-0.5">score</span>
        </div>
      </div>
    );
  }

  // For Solana tokens without any score, show N/A
  if (chain?.toUpperCase() === 'SOLANA') {
    return (
      <div className="flex-shrink-0">
        <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 border-dark-border bg-dark-bg/30">
          <span className="text-lg font-bold text-gray-500">N/A</span>
          <span className="text-[10px] text-gray-500 -mt-0.5">score</span>
        </div>
      </div>
    );
  }

  return null;
}

// Security check item
function SecurityCheck({ label, passed, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-gray-300">{value}</span>}
        {passed !== null && passed !== undefined && (
          passed ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <X className="w-4 h-4 text-red-400" />
          )
        )}
      </div>
    </div>
  );
}

export function TokenDetailModal({
  isOpen,
  onClose,
  contractAddress,
  chain,
  symbol,
  name,
  vettingProcessId,
  currentPrice,
  priceChange24h,
  marketCap,
  volume24h,
  liquidity,
  overallScore,
  riskLevel,
  redFlagCount,
  greenFlagCount,
}) {
  const router = useRouter();
  const [period, setPeriod] = useState('24h');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'analysis'
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [securityChecks, setSecurityChecks] = useState(null);
  const [vettingData, setVettingData] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const chainConfig = CHAINS[chain];

  // Handle analyze token - auto-queue and redirect
  const handleAnalyzeToken = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          chain: chain || 'SOLANA',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Close modal and navigate to the analysis page
        onClose();
        router.push(`/tokens/${data.token.vettingProcessId || data.token.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to analyze token');
      }
    } catch (error) {
      toast.error('Failed to analyze token');
    } finally {
      setAnalyzing(false);
    }
  };

  // Use fetched vettingData if prop not provided
  const effectiveVettingId = vettingProcessId || vettingData?.vettingProcessId;
  const effectiveOverallScore = overallScore ?? vettingData?.overallScore;
  const effectiveRiskLevel = riskLevel || vettingData?.riskLevel;
  const effectiveRedFlags = vettingData?.redFlags || [];
  const effectiveGreenFlags = vettingData?.greenFlags || [];

  // Fetch chart data when modal opens or period changes
  useEffect(() => {
    if (!isOpen || !contractAddress || !chain) return;

    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        const response = await fetch(
          `/api/prices/history?address=${encodeURIComponent(contractAddress)}&chain=${chain}&period=${period}`
        );
        if (response.ok) {
          const result = await response.json();
          setChartData(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setChartLoading(false);
      }
    };

    fetchChartData();
  }, [isOpen, contractAddress, chain, period]);

  // Fetch token info (socials, description) and security checks
  useEffect(() => {
    if (!isOpen || !contractAddress) return;

    const fetchTokenInfo = async () => {
      setInfoLoading(true);
      try {
        // Fetch from our token info API which gets DexScreener and RugCheck data
        const url = `/api/tokens/info?address=${encodeURIComponent(contractAddress)}&chain=${chain}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setTokenInfo(data.info || null);
          setSecurityChecks(data.securityChecks || null);
          setVettingData(data.vettingData || null);
        }
      } catch (error) {
        console.error('Failed to fetch token info:', error);
      } finally {
        setInfoLoading(false);
      }
    };

    fetchTokenInfo();
  }, [isOpen, contractAddress, chain]);

  const handleCopyAddress = async () => {
    await copyToClipboard(contractAddress);
    toast.success('Address copied');
  };

  const handleCollectPrices = async () => {
    setCollecting(true);
    try {
      const response = await fetch('/api/prices/collect', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        toast.success(`Collected ${result.collected} price snapshots`);
        // Refresh chart data
        const chartResponse = await fetch(
          `/api/prices/history?address=${encodeURIComponent(contractAddress)}&chain=${chain}&period=${period}`
        );
        if (chartResponse.ok) {
          const chartResult = await chartResponse.json();
          setChartData(chartResult.data || []);
        }
      } else {
        toast.error('Failed to collect prices');
      }
    } catch (error) {
      toast.error('Failed to collect prices');
    } finally {
      setCollecting(false);
    }
  };

  const isPositive = priceChange24h >= 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="space-y-4">
        {/* Maze Branding */}
        <div className="flex items-center gap-2 pb-3 border-b border-dark-border/50">
          <img src="/favicon.svg" alt="Maze" className="w-7 h-7" />
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold cosmic-text">Maze</span>
            <span className="text-[10px] text-gray-500">Token Analytics</span>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Score Circle */}
            <ScoreCircle
              overallScore={effectiveOverallScore}
              rugcheckScore={securityChecks?.rugcheckScore}
              isLoading={infoLoading}
              chain={chain}
            />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-100">
                  {symbol || 'Unknown'}
                </h2>
                <ChainBadge chain={chain} />
                {effectiveRiskLevel && <RiskBadge riskLevel={effectiveRiskLevel} />}
              </div>
              {name && (
                <p className="text-sm text-gray-400 mt-1">{name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Trade button - Solana only */}
            {chain?.toUpperCase() === 'SOLANA' && (
              <Link href={`/trade?token=${encodeURIComponent(contractAddress)}&symbol=${encodeURIComponent(symbol || '')}&name=${encodeURIComponent(name || '')}`}>
                <button className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors" title="Trade">
                  <ArrowLeftRight className="w-5 h-5" />
                </button>
              </Link>
            )}
            {effectiveVettingId ? (
              <Link href={`/tokens/${effectiveVettingId}`}>
                <button className="p-2 text-brand-400 hover:text-brand-300 hover:bg-brand-400/10 rounded-lg transition-colors" title="View Analysis">
                  <Shield className="w-5 h-5" />
                </button>
              </Link>
            ) : (
              <button
                onClick={handleAnalyzeToken}
                disabled={analyzing}
                className="p-2 text-gray-400 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors disabled:opacity-50"
                title="Analyze Token"
              >
                {analyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab Toggle - Only show if we have analysis data */}
        {effectiveVettingId && (
          <div className="flex gap-1 p-1 bg-dark-bg/50 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'overview'
                  ? 'bg-brand-400/20 text-brand-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'analysis'
                  ? 'bg-brand-400/20 text-brand-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Issues & Flags
            </button>
          </div>
        )}

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <>
        {/* Social Links */}
        {tokenInfo && (tokenInfo.socials?.length > 0 || tokenInfo.websites?.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {tokenInfo.websites?.map((site, i) => (
              <a
                key={`web-${i}`}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-bg/50 rounded-lg text-xs text-gray-300 hover:text-brand-400 hover:bg-dark-hover transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                {site.label || 'Website'}
              </a>
            ))}
            {tokenInfo.socials?.map((social, i) => (
              <a
                key={`social-${i}`}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-bg/50 rounded-lg text-xs text-gray-300 hover:text-brand-400 hover:bg-dark-hover transition-colors"
              >
                <SocialIcon type={social.type} />
                {social.type === 'twitter' ? 'X' : (social.type?.charAt(0).toUpperCase() + social.type?.slice(1) || 'Social')}
              </a>
            ))}
          </div>
        )}

        {/* Description */}
        {tokenInfo?.description && (
          <div className="bg-dark-bg/30 rounded-lg p-3">
            <p className="text-sm text-gray-400 line-clamp-3">{tokenInfo.description}</p>
          </div>
        )}

        {/* Price Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-dark-bg/50 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Price</div>
            <div className="text-gray-100 font-bold text-lg">
              {formatPrice(currentPrice)}
            </div>
          </div>
          <div className="bg-dark-bg/50 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">24h Change</div>
            <div className={`font-bold text-lg flex items-center gap-1 ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {priceChange24h !== null && priceChange24h !== undefined
                ? `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`
                : '-'}
            </div>
          </div>
          <StatCard label="Market Cap" value={formatLargeNumber(marketCap)} />
          <StatCard label="Liquidity" value={formatLargeNumber(liquidity)} />
        </div>

        {/* Chart Section */}
        <div className="bg-dark-bg/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPeriod('24h')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  period === '24h'
                    ? 'bg-brand-400/20 text-brand-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-dark-hover'
                }`}
              >
                24H
              </button>
              <button
                onClick={() => setPeriod('30d')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  period === '30d'
                    ? 'bg-brand-400/20 text-brand-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-dark-hover'
                }`}
              >
                30D
              </button>
            </div>
            <button
              onClick={handleCollectPrices}
              disabled={collecting}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded transition-colors disabled:opacity-50"
              title="Collect latest prices"
            >
              {collecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Collect
            </button>
          </div>
          <PriceChart
            data={chartData}
            period={period}
            loading={chartLoading}
            height={180}
          />
          {chartData.length === 0 && !chartLoading && (
            <p className="text-center text-xs text-gray-500 mt-2">
              Click &quot;Collect&quot; to start building price history
            </p>
          )}
        </div>

        {/* Token Details */}
        <div className="bg-dark-bg/30 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Token Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Contract</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-200">
                  {formatAddress(contractAddress, 8)}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {chainConfig?.explorer && (
                  <a
                    href={`${chainConfig.explorer}/address/${contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Chain</span>
              <span className="text-gray-200">{chainConfig?.name || chain}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">24h Volume</span>
              <span className="text-gray-200">{formatLargeNumber(volume24h)}</span>
            </div>
          </div>
        </div>

        {/* Security Checks */}
        {securityChecks && (
          <div className="bg-dark-bg/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Security Checks</h3>
            <div className="space-y-1 divide-y divide-dark-border/30">
              {securityChecks.mintAuthority !== undefined && (
                <SecurityCheck
                  label="Mint Authority"
                  passed={!securityChecks.mintAuthority}
                  value={securityChecks.mintAuthority ? 'Active' : 'Revoked'}
                  icon={Coins}
                />
              )}
              {securityChecks.freezeAuthority !== undefined && (
                <SecurityCheck
                  label="Freeze Authority"
                  passed={!securityChecks.freezeAuthority}
                  value={securityChecks.freezeAuthority ? 'Active' : 'Revoked'}
                  icon={Snowflake}
                />
              )}
              {securityChecks.lpLocked !== undefined && (
                <SecurityCheck
                  label="LP Locked"
                  passed={securityChecks.lpLocked >= 80}
                  value={`${securityChecks.lpLocked?.toFixed(1)}%`}
                  icon={Lock}
                />
              )}
              {securityChecks.mutableMetadata !== undefined && (
                <SecurityCheck
                  label="Metadata"
                  passed={!securityChecks.mutableMetadata}
                  value={securityChecks.mutableMetadata ? 'Mutable' : 'Immutable'}
                  icon={Edit3}
                />
              )}
              {securityChecks.rugcheckScore !== undefined && (
                <SecurityCheck
                  label="RugCheck Score"
                  passed={securityChecks.rugcheckScore >= 0.5}
                  value={`${(securityChecks.rugcheckScore * 100).toFixed(0)}%`}
                  icon={Shield}
                />
              )}
            </div>
          </div>
        )}
          </>
        )}

        {/* Analysis Tab Content - Show flags and issues */}
        {activeTab === 'analysis' && effectiveVettingId && (
          <div className="space-y-4">
            {/* Red Flags */}
            {effectiveRedFlags.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Red Flags ({effectiveRedFlags.length})
                </h3>
                <ul className="space-y-2">
                  {effectiveRedFlags.map((flag) => (
                    <li key={flag.id} className="flex items-start gap-2 text-sm">
                      <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{flag.flag}</span>
                      {flag.severity && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          flag.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                          flag.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {flag.severity}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Green Flags */}
            {effectiveGreenFlags.length > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Green Flags ({effectiveGreenFlags.length})
                </h3>
                <ul className="space-y-2">
                  {effectiveGreenFlags.map((flag) => (
                    <li key={flag.id} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{flag.flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No flags message */}
            {effectiveRedFlags.length === 0 && effectiveGreenFlags.length === 0 && (
              <div className="bg-dark-bg/30 rounded-lg p-6 text-center">
                <Shield className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No flags have been recorded yet.</p>
                <Link href={`/tokens/${effectiveVettingId}`}>
                  <Button variant="ghost" size="sm" className="mt-3">
                    View Full Analysis
                  </Button>
                </Link>
              </div>
            )}

            {/* Link to full analysis */}
            {(effectiveRedFlags.length > 0 || effectiveGreenFlags.length > 0) && (
              <div className="text-center pt-2">
                <Link href={`/tokens/${effectiveVettingId}`}>
                  <Button variant="ghost" size="sm" icon={Shield}>
                    View Full Analysis Details
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
