'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Loader2 } from 'lucide-react';
import { CreatePackForm } from '@/components/packs';

export default function CreatePackPage() {
  const [watchlistTokens, setWatchlistTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWatchlistTokens();
  }, []);

  const fetchWatchlistTokens = async () => {
    try {
      const response = await fetch('/api/watchlist');
      if (response.ok) {
        const data = await response.json();
        // Filter for Solana tokens with addresses
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
      console.error('Failed to fetch watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link
              href="/packs"
              className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-400/10 rounded-lg">
                <Package className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Create Pack</h1>
                <p className="text-xs text-gray-500">Build your diversified portfolio</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          </div>
        ) : (
          <CreatePackForm watchlistTokens={watchlistTokens} />
        )}
      </div>
    </div>
  );
}
