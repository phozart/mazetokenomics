'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  Shield,
  AlertTriangle,
  RefreshCw,
  Star,
} from 'lucide-react';
import { SwapCard, RecentSwaps, useRecentSwaps } from '@/components/trade';
import { WalletButton } from '@/components/wallet';
import { useSolBalance } from '@/lib/jupiter/hooks';
import { cn } from '@/lib/utils';

export default function TradePage() {
  const searchParams = useSearchParams();
  const { connected, publicKey } = useWallet();
  const { balance: solBalance } = useSolBalance();
  const { swaps } = useRecentSwaps();

  // Get preselected token from URL params
  const [preselectedToken, setPreselectedToken] = useState(null);

  useEffect(() => {
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

  // Fetch watchlist tokens for token selector
  const [watchlistTokens, setWatchlistTokens] = useState([]);

  useEffect(() => {
    async function fetchWatchlist() {
      try {
        const res = await fetch('/api/watchlist');
        if (res.ok) {
          const data = await res.json();
          console.log('[Trade] Watchlist data:', data.watchlist?.length, 'items');
          // Convert watchlist items to token format
          // Filter for Solana tokens (case-insensitive)
          const tokens = data.watchlist
            ?.filter(item => {
              const isSolana = item.chain?.toUpperCase() === 'SOLANA';
              const hasAddress = !!item.contractAddress;
              if (!isSolana || !hasAddress) {
                console.log('[Trade] Filtered out:', item.symbol, 'chain:', item.chain, 'address:', !!item.contractAddress);
              }
              return isSolana && hasAddress;
            })
            .map(item => ({
              address: item.contractAddress,
              symbol: item.symbol || item.token?.symbol || 'UNKNOWN',
              name: item.name || item.token?.name || 'Unknown Token',
              decimals: item.token?.decimals || 9,
              score: item.token?.vettingProcess?.overallScore,
              logoURI: item.token?.logoURI || null,
            })) || [];
          console.log('[Trade] Solana tokens for trading:', tokens.length, tokens.map(t => t.symbol));
          setWatchlistTokens(tokens);
        }
      } catch (error) {
        console.error('Failed to fetch watchlist:', error);
      }
    }
    fetchWatchlist();
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-400/10 rounded-lg">
                <ArrowLeftRight className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Trade</h1>
                <p className="text-xs text-gray-500">Swap tokens on Solana</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* SOL Balance */}
              {connected && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-dark-bg rounded-lg">
                  <img
                    src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                    alt="SOL"
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium text-gray-200">
                    {solBalance.toFixed(4)} SOL
                  </span>
                </div>
              )}

              {/* Wallet Button */}
              <WalletButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Swap Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Swap Card */}
            <SwapCard
              watchlistTokens={watchlistTokens}
              preselectedToken={preselectedToken}
            />

            {/* Recent Swaps */}
            {swaps.length > 0 && <RecentSwaps swaps={swaps} />}

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* How It Works */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-brand-400" />
                  How It Works
                </h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 font-mono">1.</span>
                    Connect your Phantom wallet
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 font-mono">2.</span>
                    Select tokens and enter amount
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 font-mono">3.</span>
                    Review rate and confirm swap
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 font-mono">4.</span>
                    Sign transaction in your wallet
                  </li>
                </ul>
              </div>

              {/* Safety Info */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  Security
                </h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    Non-custodial - you control your keys
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    Jupiter aggregator for best rates
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    Transaction simulation before signing
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    Slippage protection enabled
                  </li>
                </ul>
              </div>
            </div>

            {/* Risk Disclaimer */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-500 mb-1">Risk Warning</h4>
                <p className="text-xs text-yellow-500/80">
                  Cryptocurrency trading involves significant risk. Always verify token addresses
                  before trading. Check your watchlist scores for vetted tokens. Never trade more
                  than you can afford to lose.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            {connected && (
              <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-200 mb-4">Wallet Overview</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Connected</span>
                    <span className="text-sm text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Address</span>
                    <span className="text-sm text-gray-200 font-mono">
                      {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">SOL Balance</span>
                    <span className="text-sm text-gray-200 font-mono">
                      {solBalance.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Watchlist Tokens */}
            {watchlistTokens.length > 0 && (
              <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-200 mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  From Watchlist
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
                        <div>
                          <p className="text-sm font-medium text-gray-200">{token.symbol}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[100px]">{token.name}</p>
                        </div>
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

            {/* Not Connected State */}
            {!connected && (
              <div className="bg-dark-card border border-dark-border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-200 mb-2">Connect Wallet</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Connect your Phantom wallet to start trading tokens from your watchlist.
                </p>
                <WalletButton />
              </div>
            )}

            {/* Powered By */}
            <div className="text-center py-4">
              <p className="text-xs text-gray-500">
                Powered by{' '}
                <a
                  href="https://jup.ag"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:underline"
                >
                  Jupiter
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
