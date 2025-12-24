'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WaveBackground } from '@/components/ui/WaveBackground';
import {
  Shield,
  TrendingUp,
  Zap,
  Eye,
  Package,
  ArrowRight,
  CheckCircle2,
  Star,
  Sparkles,
  Lock,
  Wallet,
  BarChart2,
  Activity,
  Loader2
} from 'lucide-react';

// Token addresses for live data
const SHOWCASE_TOKENS = [
  { address: 'BTr5SwWSKPBrdUzboi2SVr1QvSjmh1caCYUkxsxLpump', symbol: 'WOLF', name: 'WOLF', risk: 'Medium', riskColor: 'yellow' },
  { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', risk: 'Safe', riskColor: 'green' },
  { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', name: 'Jupiter', risk: 'Safe', riskColor: 'green' },
  { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', name: 'Bonk', risk: 'Medium', riskColor: 'yellow' },
];

const features = [
  {
    icon: Shield,
    title: 'Risk Detection',
    description: 'Analyzes contracts, liquidity, and holder patterns to help you spot red flags.',
    gradient: 'from-red-500 via-orange-500 to-yellow-500',
  },
  {
    icon: Eye,
    title: 'Live Tracking',
    description: 'Real-time prices, alerts, and portfolio tracking across all your tokens.',
    gradient: 'from-cyan-500 via-blue-500 to-purple-500',
  },
  {
    icon: Zap,
    title: 'Instant Swaps',
    description: 'Trade directly through Jupiter with the best rates, zero hassle.',
    gradient: 'from-purple-500 via-pink-500 to-red-500',
  },
  {
    icon: Package,
    title: 'Token Packs',
    description: 'One-click diversification. Buy multiple tokens from your watchlist instantly.',
    gradient: 'from-green-500 via-emerald-500 to-cyan-500',
  },
];

const floatingTokens = [
  { symbol: 'SOL', x: '10%', y: '20%', delay: '0s', size: 'lg' },
  { symbol: 'JUP', x: '85%', y: '15%', delay: '1s', size: 'md' },
  { symbol: 'RAY', x: '75%', y: '70%', delay: '2s', size: 'sm' },
  { symbol: 'BONK', x: '15%', y: '75%', delay: '0.5s', size: 'md' },
  { symbol: 'WIF', x: '90%', y: '45%', delay: '1.5s', size: 'sm' },
];

function FloatingToken({ symbol, x, y, delay, size }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-base' };
  return (
    <div
      className={`absolute ${sizes[size]} rounded-full bg-gradient-to-br from-brand-500/20 to-accent-500/20 border border-brand-500/30 flex items-center justify-center backdrop-blur-sm animate-float`}
      style={{ left: x, top: y, animationDelay: delay }}
    >
      <span className="font-bold text-brand-300">{symbol}</span>
    </div>
  );
}

function GlowOrb({ className }) {
  return (
    <div className={`absolute rounded-full blur-3xl animate-pulse-slow ${className}`} />
  );
}

function AmazingModal({ isOpen, onClose }) {
  const router = require('next/navigation').useRouter();
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAnimationStep(0);
      const timers = [
        setTimeout(() => setAnimationStep(1), 100),   // Modal appears
        setTimeout(() => setAnimationStep(2), 400),   // "Are you" appears
        setTimeout(() => setAnimationStep(3), 800),   // "A-" appears
        setTimeout(() => setAnimationStep(4), 1000),  // "MAZE" appears with bounce
        setTimeout(() => setAnimationStep(5), 1300),  // "-ING?" appears
        setTimeout(() => setAnimationStep(6), 1700),  // Subtitle appears
        setTimeout(() => setAnimationStep(7), 2100),  // Buttons appear
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${animationStep >= 1 ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative max-w-md w-full transition-all duration-500 ${animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
        {/* Glow effect */}
        <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/30 via-purple-500/20 to-accent-500/30 rounded-3xl blur-2xl animate-pulse-slow" />

        <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-brand-500 via-purple-500 to-accent-500 animate-gradient-x" style={{ backgroundSize: '200% 200%' }}>
          <div className="bg-dark-card rounded-2xl p-8 text-center overflow-hidden">
            {/* Maze Icon */}
            <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden transition-all duration-500 ${animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
              <Image src="/icon-transparent.svg" alt="Maze" width={80} height={80} className="w-full h-full" />
            </div>

            {/* Question */}
            <h2 className={`text-2xl sm:text-3xl font-bold text-white mb-2 transition-all duration-500 ${animationStep >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              Are you
            </h2>

            <h1 className="text-4xl sm:text-5xl font-black mb-6 flex items-center justify-center">
              <span className={`text-white transition-all duration-300 ${animationStep >= 3 ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
                A-
              </span>
              <span
                className={`cosmic-text transition-all duration-500 ${animationStep >= 4 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                style={{
                  animation: animationStep >= 4 ? 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'none',
                  display: 'inline-block'
                }}
              >
                MAZE
              </span>
              <span className={`text-white transition-all duration-300 ${animationStep >= 5 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}>
                -ING?
              </span>
            </h1>

            <p className={`text-gray-400 mb-8 transition-all duration-500 ${animationStep >= 6 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              This tool is only for <span className="cosmic-text font-semibold">Mazelicious</span> people
            </p>

            {/* Buttons */}
            <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-500 ${animationStep >= 7 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-dark-bg border border-dark-border rounded-xl text-gray-400 hover:text-white hover:border-gray-600 transition-all"
              >
                Not yet...
              </button>
              <button
                onClick={() => router.push('/login')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-xl font-bold hover:from-brand-400 hover:to-accent-400 transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 animate-pulse-slow"
              >
                Absolutely! 🚀
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [tokenData, setTokenData] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Fetch prices only once on mount
    const fetchTokenPrices = async () => {
      try {
        const addresses = SHOWCASE_TOKENS.map(t => t.address).join(',');
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`);
        const data = await response.json();

        if (data.pairs) {
          // Get best pair (highest liquidity) for each token
          const tokenPrices = SHOWCASE_TOKENS.map(token => {
            const pairs = data.pairs.filter(p =>
              p.baseToken?.address?.toLowerCase() === token.address.toLowerCase() ||
              p.quoteToken?.address?.toLowerCase() === token.address.toLowerCase()
            );

            if (pairs.length > 0) {
              // Sort by liquidity and get best pair
              const bestPair = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
              const isBase = bestPair.baseToken?.address?.toLowerCase() === token.address.toLowerCase();
              const price = isBase ? parseFloat(bestPair.priceUsd || 0) : 1 / parseFloat(bestPair.priceUsd || 1);
              const change = parseFloat(bestPair.priceChange?.h24 || 0);
              const mcap = bestPair.marketCap || bestPair.fdv || 0;

              return {
                ...token,
                price: price,
                change: change,
                mcap: mcap,
                positive: change >= 0,
              };
            }
            return { ...token, price: 0, change: 0, mcap: 0, positive: true };
          });

          setTokenData(tokenPrices);
        }
      } catch (error) {
        console.error('Error fetching token prices:', error);
        // Fallback to showing tokens without prices
        setTokenData(SHOWCASE_TOKENS.map(t => ({ ...t, price: 0, change: 0, mcap: 0, positive: true })));
      } finally {
        setLoadingTokens(false);
      }
    };

    fetchTokenPrices();
  }, []); // Empty dependency array - runs once on mount only

  return (
    <div className="min-h-screen bg-dark-bg relative overflow-hidden">
      <WaveBackground />

      {/* A-MAZE-ING Modal */}
      <AmazingModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {/* Extra Glow Orbs */}
      <GlowOrb className="w-96 h-96 bg-brand-500/20 -top-48 -left-48" />
      <GlowOrb className="w-[500px] h-[500px] bg-accent-500/15 -bottom-64 -right-64" />
      <GlowOrb className="w-64 h-64 bg-purple-500/20 top-1/2 left-1/4" />

      {/* Floating Tokens */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {floatingTokens.map((token) => (
            <FloatingToken key={token.symbol} {...token} />
          ))}
        </div>
      )}

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-accent-500 rounded-xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-brand-500/30">
              <Image src="/icon-transparent.svg" alt="Maze" width={44} height={44} className="w-full h-full" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold cosmic-text">
              Maze
            </span>
            <span className="block text-[10px] text-gray-500 -mt-1 tracking-wider">TOKENOMICS</span>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="group relative px-6 py-2.5 overflow-hidden rounded-lg font-medium"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-accent-500 transition-transform group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-400 to-accent-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative text-white flex items-center gap-2">
            Launch App
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-12 pb-20 lg:px-12 lg:pt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            {/* Glowing Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-500/20 to-accent-500/20 border border-brand-500/30 rounded-full mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-sm font-medium bg-gradient-to-r from-brand-300 to-accent-300 bg-clip-text text-transparent">
                Token Intelligence Tool
              </span>
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            </div>

            {/* Main Headline with Glow */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black mb-6 leading-none tracking-tight">
              <span className="text-white drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]">DYOR</span>
              <br />
              <span className="relative">
                <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-accent-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                  ON AUTOPILOT
                </span>
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Stop getting rugged. Analyze <span className="text-brand-400 font-semibold">any token</span> for
              red flags, track your portfolio in <span className="text-accent-400 font-semibold">real-time</span>, and
              trade with <span className="text-green-400 font-semibold">confidence</span>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button
                onClick={() => setShowModal(true)}
                className="group relative px-10 py-4 overflow-hidden rounded-xl font-bold text-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500 via-purple-500 to-accent-500 animate-gradient-x" />
                <div className="absolute inset-[2px] bg-dark-bg rounded-[10px] group-hover:bg-transparent transition-colors duration-300" />
                <span className="relative bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent group-hover:text-white transition-colors duration-300 flex items-center gap-2">
                  Start Analyzing Tokens
                  <Zap className="w-5 h-5 text-brand-400 group-hover:text-white transition-colors" />
                </span>
              </button>
                          </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-400" />
                <span>Non-custodial</span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-accent-400" />
                <span>Connect any wallet</span>
              </div>
            </div>
          </div>

          {/* Animated Stats Bar */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-brand-500 via-purple-500 to-accent-500">
              <div className="bg-dark-card/90 backdrop-blur-sm rounded-2xl p-6">
                <div className="grid grid-cols-3 divide-x divide-dark-border">
                  {[
                    { value: '500K+', label: 'Solana Tokens', icon: BarChart2 },
                    { value: '65K', label: 'Peak TPS', icon: Activity },
                    { value: '$8B+', label: 'Solana DeFi TVL', icon: TrendingUp },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center px-4">
                      <stat.icon className="w-5 h-5 mx-auto mb-2 text-brand-400" />
                      <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                        {stat.value}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mock Dashboard Preview */}
          <div className="relative max-w-4xl mx-auto">
            {/* Glow behind dashboard */}
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/30 via-purple-500/20 to-accent-500/30 rounded-3xl blur-2xl" />

            <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-brand-500/50 via-purple-500/50 to-accent-500/50">
              <div className="bg-dark-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
                {/* Mock Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-dark-border/50">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Star className="w-5 h-5 text-brand-400" />
                      <div className="absolute inset-0 bg-brand-400 blur-md opacity-50" />
                    </div>
                    <span className="font-semibold text-white">Your Watchlist</span>
                    <span className="px-2 py-0.5 bg-brand-500/20 text-brand-400 rounded text-xs">PRO</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 rounded-full">
                      <Activity className="w-3 h-3 text-green-400 animate-pulse" />
                      <span className="text-green-400 text-xs font-medium">Live Data</span>
                    </div>
                  </div>
                </div>

                {/* Live Token Rows */}
                <div className="space-y-3">
                  {loadingTokens ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                      <span className="ml-2 text-gray-400">Loading live prices...</span>
                    </div>
                  ) : tokenData.map((token) => {
                    const formatPrice = (price) => {
                      if (price === 0) return '-';
                      if (price < 0.00001) return `$${price.toExponential(2)}`;
                      if (price < 0.01) return `$${price.toFixed(6)}`;
                      if (price < 1) return `$${price.toFixed(4)}`;
                      if (price < 100) return `$${price.toFixed(2)}`;
                      return `$${price.toFixed(2)}`;
                    };
                    const formatMcap = (mcap) => {
                      if (!mcap || mcap === 0) return '-';
                      if (mcap >= 1e9) return `$${(mcap / 1e9).toFixed(1)}B`;
                      if (mcap >= 1e6) return `$${(mcap / 1e6).toFixed(1)}M`;
                      if (mcap >= 1e3) return `$${(mcap / 1e3).toFixed(1)}K`;
                      return `$${mcap.toFixed(0)}`;
                    };

                    return (
                      <div
                        key={token.symbol}
                        className="flex items-center justify-between p-4 bg-dark-bg/60 rounded-xl border border-dark-border/30 hover:border-brand-500/30 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500/30 to-accent-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <span className="text-brand-300 font-bold">{token.symbol.slice(0, 2)}</span>
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              {token.symbol}
                              <span className="px-1.5 py-0.5 bg-accent-500/20 text-accent-400 rounded text-[10px]">SOL</span>
                            </div>
                            <div className="text-xs text-gray-500">{token.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-white font-medium">{formatPrice(token.price)}</div>
                          <div className={`text-xs font-medium ${token.positive ? 'text-green-400' : 'text-red-400'}`}>
                            {token.change !== 0 ? `${token.positive ? '+' : ''}${token.change.toFixed(1)}%` : '-'}
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="text-sm text-gray-400">{formatMcap(token.mcap)}</div>
                          <div className="text-xs text-gray-600">MCap</div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          token.riskColor === 'green'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {token.risk}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-24 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-brand-400 font-semibold text-sm tracking-wider uppercase mb-4 block">
              Features
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">
              Your Crypto <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">Command Center</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Everything you need to research, track, and trade tokens safely.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative p-[1px] rounded-2xl bg-gradient-to-r from-dark-border to-dark-border hover:from-brand-500/50 hover:to-accent-500/50 transition-all duration-300"
              >
                <div className="relative p-8 bg-dark-card/80 backdrop-blur-sm rounded-2xl h-full overflow-hidden">
                  {/* Hover glow */}
                  <div className={`absolute -inset-20 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500`} />

                  <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="relative text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="relative text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-24 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-[1px] rounded-3xl bg-gradient-to-r from-brand-500 via-purple-500 to-accent-500">
            <div className="relative p-10 sm:p-16 bg-dark-card/95 backdrop-blur-sm rounded-3xl overflow-hidden">
              {/* Background glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />

              <div className="relative text-center">
                <Sparkles className="w-10 h-10 mx-auto mb-6 text-yellow-400" />
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to Trade <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">Smarter</span>?
                </h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                  Your personal command center for navigating the Solana ecosystem. Start analyzing tokens in seconds.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-xl font-bold text-lg hover:from-brand-400 hover:to-accent-400 transition-all shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105"
                >
                  Launch App
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 lg:px-12 border-t border-dark-border/30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <Image src="/icon-transparent.svg" alt="Maze" width={32} height={32} />
            </div>
            <span className="text-sm text-gray-500">© 2024 Maze Tokenomics. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/legal" className="text-sm text-gray-500 hover:text-brand-400 transition-colors">
              Privacy & Legal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
