'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Twitter,
  MessageCircle,
  Send,
  FileText,
  Lock,
  Coins,
  Snowflake,
  Edit3,
  X,
  Check,
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
      return <Twitter className="w-4 h-4" />;
    case 'telegram':
      return <Send className="w-4 h-4" />;
    case 'discord':
      return <MessageCircle className="w-4 h-4" />;
    default:
      return <Globe className="w-4 h-4" />;
  }
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
  const [period, setPeriod] = useState('24h');
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [securityChecks, setSecurityChecks] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const chainConfig = CHAINS[chain];

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
        const response = await fetch(`/api/tokens/info?address=${encodeURIComponent(contractAddress)}&chain=${chain}`);
        if (response.ok) {
          const data = await response.json();
          setTokenInfo(data.info || null);
          setSecurityChecks(data.securityChecks || null);
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
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-100">
                {symbol || 'Unknown'}
              </h2>
              <ChainBadge chain={chain} />
            </div>
            {name && (
              <p className="text-sm text-gray-400 mt-1">{name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {vettingProcessId ? (
              <Link href={`/tokens/${vettingProcessId}`}>
                <Button variant="primary" size="sm" icon={Shield}>
                  View Analysis
                </Button>
              </Link>
            ) : (
              <Link href={`/tokens/new?address=${contractAddress}&chain=${chain}`}>
                <Button variant="secondary" size="sm" icon={BarChart3}>
                  Analyze Token
                </Button>
              </Link>
            )}
          </div>
        </div>

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
                {social.type?.charAt(0).toUpperCase() + social.type?.slice(1) || 'Social'}
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

        {/* Risk Summary (if analyzed) */}
        {(vettingProcessId || overallScore !== undefined) && (
          <div className="bg-dark-bg/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Risk Summary</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Score:</span>
                <span className="text-xl font-bold text-gray-100">
                  {overallScore !== null && overallScore !== undefined
                    ? Math.round(overallScore)
                    : '-'}
                </span>
              </div>
              {riskLevel && <RiskBadge riskLevel={riskLevel} />}
              <div className="flex-1" />
              <div className="flex items-center gap-3 text-sm">
                {redFlagCount > 0 && (
                  <div className="flex items-center gap-1 text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{redFlagCount} flags</span>
                  </div>
                )}
                {greenFlagCount > 0 && (
                  <div className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>{greenFlagCount} flags</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
