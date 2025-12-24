'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';

function formatPrice(price) {
  if (!price) return '-';
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 1000) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatMarketCap(mc) {
  if (!mc) return '-';
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`;
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(2)}M`;
  return `$${mc.toLocaleString()}`;
}

function formatVolume(vol) {
  if (!vol) return '-';
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
  return `$${vol.toFixed(2)}`;
}

function CoinRow({ coin }) {
  const isPositive = coin.priceChange24h >= 0;

  return (
    <div className="flex items-center justify-between py-4 border-b border-dark-border/30 last:border-0 hover:bg-dark-hover/30 px-4 transition-colors">
      <div className="flex items-center gap-3">
        {coin.logoUrl ? (
          <img
            src={coin.logoUrl}
            alt={coin.symbol}
            className="w-10 h-10 rounded-full"
            onError={(e) => e.target.style.display = 'none'}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-dark-bg flex items-center justify-center text-gray-500 font-bold">
            {coin.symbol?.slice(0, 2)}
          </div>
        )}
        <div>
          <div className="font-medium text-gray-100">{coin.symbol}</div>
          <div className="text-xs text-gray-500">{coin.name}</div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="font-mono font-medium text-gray-100">
            {formatPrice(coin.priceUsd)}
          </div>
          <div className={`text-sm flex items-center justify-end gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {coin.priceChange24h?.toFixed(2)}%
          </div>
        </div>

        <div className="hidden sm:block text-right min-w-[100px]">
          <div className="text-xs text-gray-500">Market Cap</div>
          <div className="text-sm text-gray-300">{formatMarketCap(coin.marketCap)}</div>
        </div>

        <div className="hidden md:block text-right min-w-[80px]">
          <div className="text-xs text-gray-500">24h Vol</div>
          <div className="text-sm text-gray-300">{formatVolume(coin.volume24h)}</div>
        </div>

        <a
          href={`https://www.coingecko.com/en/coins/${coin.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-400 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors"
          title="View on CoinGecko"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

export function MarketOverview() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPrices = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/prices/major');
      if (response.ok) {
        const data = await response.json();
        setCoins(data.coins || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch major prices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => fetchPrices(true), 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
        <div className="text-sm text-gray-400">
          Top cryptocurrencies by market cap
        </div>
        <button
          onClick={() => fetchPrices(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-dark-hover rounded transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Coin List */}
      <div className="divide-y divide-dark-border/30">
        {coins.map((coin) => (
          <CoinRow key={coin.id} coin={coin} />
        ))}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <div className="px-4 py-3 text-center border-t border-dark-border/30">
          <span className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()} · Data from CoinGecko
          </span>
        </div>
      )}
    </div>
  );
}
