'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Wallet,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Copy,
  PieChart,
  ArrowLeftRight,
  Shield,
  Plus,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useSolPrice, useSolBalance } from '@/lib/jupiter/hooks';

function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return '-';
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  return num.toFixed(decimals);
}

function formatPrice(price) {
  if (price === null || price === undefined) return '-';
  const num = parseFloat(price);
  if (num < 0.00001) return num.toExponential(2);
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(2);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function TokenHolding({ token, solPrice, onAddToWatchlist, onTrade }) {
  const valueUsd = token.valueUsd || (token.balance * (token.priceUsd || 0));
  const valueSol = solPrice ? valueUsd / solPrice : 0;

  return (
    <div className="flex items-center justify-between py-4 border-b border-dark-border/30 last:border-0">
      <div className="flex items-center gap-3">
        {token.logoURI ? (
          <img
            src={token.logoURI}
            alt={token.symbol}
            className="w-10 h-10 rounded-full bg-dark-bg"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-dark-bg flex items-center justify-center text-gray-500 font-medium">
            {token.symbol?.[0] || '?'}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-100">{token.symbol || 'Unknown'}</span>
            {token.isNative && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">SOL</span>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {formatNumber(token.balance, token.decimals > 6 ? 4 : 2)} tokens
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-gray-100 font-medium">
            ${formatNumber(valueUsd)}
          </div>
          <div className="text-sm text-gray-500">
            {formatNumber(valueSol, 4)} SOL
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!token.isNative && (
            <>
              <button
                onClick={() => onAddToWatchlist(token)}
                className="p-2 text-gray-400 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors"
                title="Add to Watchlist"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => onTrade(token)}
                className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                title="Trade"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </>
          )}
          <a
            href={`https://solscan.io/token/${token.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors"
            title="View on Solscan"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { price: solPrice, loading: solPriceLoading } = useSolPrice();
  const { balance: solBalance, loading: solBalanceLoading, refetch: refetchSolBalance } = useSolBalance();

  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalValueUsd, setTotalValueUsd] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHoldings = useCallback(async () => {
    if (!connected || !publicKey) {
      setHoldings([]);
      setTotalValueUsd(0);
      return;
    }

    setLoading(true);
    try {
      // Fetch token accounts
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new (await import('@solana/web3.js')).PublicKey(
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        ),
      });

      // Get token mints with balances
      const tokens = tokenAccounts.value
        .map(account => ({
          mint: account.account.data.parsed.info.mint,
          balance: parseFloat(account.account.data.parsed.info.tokenAmount.uiAmount) || 0,
          decimals: account.account.data.parsed.info.tokenAmount.decimals,
        }))
        .filter(t => t.balance > 0);

      if (tokens.length === 0) {
        setHoldings([]);
        return;
      }

      // Fetch token metadata and prices
      const mints = tokens.map(t => t.mint).join(',');

      // Fetch prices from our API (uses Jupiter if API key set, otherwise DexScreener)
      let priceData = { data: {} };
      try {
        const priceResponse = await fetch(`/api/prices/tokens?ids=${mints}`);
        if (priceResponse.ok) {
          priceData = await priceResponse.json();
        }
      } catch (e) {
        console.error('Failed to fetch prices:', e);
      }

      // Fetch token metadata - use local API to avoid CORS
      let tokenMap = {};
      try {
        const metaResponse = await fetch(`/api/jupiter/tokens?mints=${mints}`);
        if (metaResponse.ok) {
          const tokensData = await metaResponse.json();
          (tokensData.tokens || []).forEach(t => {
            tokenMap[t.address] = t;
          });
        }
      } catch (e) {
        console.error('Failed to fetch token metadata:', e);
      }

      // Find tokens not in the standard list
      const unknownMints = tokens
        .filter(t => !tokenMap[t.mint])
        .map(t => t.mint);

      // Fetch metadata from DexScreener for unknown tokens
      if (unknownMints.length > 0) {
        try {
          const dexResponse = await fetch(`/api/tokens/metadata?mints=${unknownMints.join(',')}`);
          if (dexResponse.ok) {
            const dexData = await dexResponse.json();
            Object.entries(dexData.tokens || {}).forEach(([mint, data]) => {
              tokenMap[mint] = data;
            });
          }
        } catch (e) {
          console.error('Failed to fetch DexScreener metadata:', e);
        }
      }

      // Combine data
      const enrichedTokens = tokens.map(token => {
        const meta = tokenMap[token.mint] || {};
        const price = priceData.data?.[token.mint]?.price || meta.priceUsd || 0;
        const valueUsd = token.balance * price;

        return {
          ...token,
          symbol: meta.symbol || 'Unknown',
          name: meta.name || 'Unknown Token',
          logoURI: meta.logoURI,
          priceUsd: price,
          valueUsd,
          isNative: false,
        };
      });

      // Add SOL balance
      const solValueUsd = solBalance * (solPrice || 0);
      const allHoldings = [
        {
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          balance: solBalance,
          decimals: 9,
          priceUsd: solPrice || 0,
          valueUsd: solValueUsd,
          isNative: true,
        },
        ...enrichedTokens,
      ];

      // Sort by value
      allHoldings.sort((a, b) => b.valueUsd - a.valueUsd);

      setHoldings(allHoldings);
      setTotalValueUsd(allHoldings.reduce((sum, t) => sum + t.valueUsd, 0));

    } catch (error) {
      console.error('Failed to fetch holdings:', error);
      toast.error('Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, connection, solBalance, solPrice]);

  useEffect(() => {
    if (connected && publicKey && !solBalanceLoading && !solPriceLoading) {
      fetchHoldings();
    }
  }, [connected, publicKey, solBalanceLoading, solPriceLoading, fetchHoldings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchSolBalance();
    await fetchHoldings();
    setRefreshing(false);
    toast.success('Portfolio refreshed');
  };

  const handleAddToWatchlist = async (token) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: token.mint,
          chain: 'SOLANA',
        }),
      });

      if (response.ok) {
        toast.success(`${token.symbol} added to watchlist`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add to watchlist');
      }
    } catch (error) {
      toast.error('Failed to add to watchlist');
    }
  };

  const handleTrade = (token) => {
    window.location.href = `/trading?token=${encodeURIComponent(token.mint)}&symbol=${encodeURIComponent(token.symbol)}&name=${encodeURIComponent(token.name)}`;
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      toast.success('Address copied');
    }
  };

  const totalValueSol = solPrice ? totalValueUsd / solPrice : 0;

  // Not connected state
  if (!connected) {
    return (
      <div>
        <Header title="Portfolio" description="View your wallet holdings and analytics" />
        <div className="p-6">
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-400/10 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-brand-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-100 mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Connect your Solana wallet to view your portfolio holdings, track performance, and manage your tokens.
              </p>
              <p className="text-sm text-gray-500">
                Click the "Connect Wallet" button in the top right corner.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Portfolio" description="View your wallet holdings and analytics">
        <Button
          variant="ghost"
          size="sm"
          icon={RefreshCw}
          onClick={handleRefresh}
          isLoading={refreshing}
        >
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </Header>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Wallet Address</span>
                <button
                  onClick={copyAddress}
                  className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="font-mono text-gray-100 truncate">
                {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
              </div>
              <a
                href={`https://solscan.io/account/${publicKey?.toBase58()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-400 hover:text-brand-300 mt-2 inline-flex items-center gap-1"
              >
                View on Solscan
                <ExternalLink className="w-3 h-3" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <span className="text-sm text-gray-400">Total Value</span>
              <div className="text-2xl font-bold text-gray-100 mt-1">
                ${formatNumber(totalValueUsd)}
              </div>
              <div className="text-sm text-gray-500">
                {formatNumber(totalValueSol, 4)} SOL
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <span className="text-sm text-gray-400">SOL Price</span>
              <div className="text-2xl font-bold text-gray-100 mt-1">
                ${formatPrice(solPrice)}
              </div>
              <div className="text-sm text-gray-500">
                {holdings.length} tokens held
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holdings List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-brand-400" />
              Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
              </div>
            ) : holdings.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No tokens found in this wallet.</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-border/30">
                {holdings.map((token) => (
                  <TokenHolding
                    key={token.mint}
                    token={token}
                    solPrice={solPrice}
                    onAddToWatchlist={handleAddToWatchlist}
                    onTrade={handleTrade}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/trading">
            <Card className="hover:border-cyan-500/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-100">Trade</div>
                  <div className="text-sm text-gray-400">Swap tokens</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/packs">
            <Card className="hover:border-purple-500/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-100">Packs</div>
                  <div className="text-sm text-gray-400">View token packs</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/trading?tab=orders">
            <Card className="hover:border-orange-500/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-100">Orders</div>
                  <div className="text-sm text-gray-400">Manage orders</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
