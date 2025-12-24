'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Star, Wallet } from 'lucide-react';
import { POPULAR_TOKENS, formatTokenBalance } from '@/lib/jupiter/tokens';
import { cn } from '@/lib/utils';

export function TokenSelectModal({
  isOpen,
  onClose,
  onSelect,
  balances = {},
  watchlistTokens = [],
  excludeToken,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allTokens, setAllTokens] = useState([]);

  // Fetch tokens on mount
  useEffect(() => {
    if (isOpen && allTokens.length === 0) {
      fetchTokens();
    }
  }, [isOpen]);

  // Memoize watchlist tokens to avoid dependency issues
  const watchlistTokensList = watchlistTokens || [];

  // Search tokens (includes watchlist tokens)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();

    // Search from watchlist tokens first, then all tokens
    const watchlistResults = watchlistTokensList.filter(t =>
      t.symbol?.toLowerCase().includes(query) ||
      t.name?.toLowerCase().includes(query) ||
      t.address?.toLowerCase() === query
    );

    const otherResults = allTokens.filter(t =>
      (t.symbol?.toLowerCase().includes(query) ||
       t.name?.toLowerCase().includes(query) ||
       t.address?.toLowerCase() === query) &&
      // Exclude tokens already in watchlist results
      !watchlistResults.some(w => w.address === t.address)
    );

    // Combine: watchlist first, then others
    const results = [...watchlistResults, ...otherResults].slice(0, 20);
    setSearchResults(results);
  }, [searchQuery, allTokens, watchlistTokensList.length]);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/jupiter/tokens');
      if (response.ok) {
        const tokens = await response.json();
        setAllTokens(tokens);
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (token) => {
    onSelect(token);
    setSearchQuery('');
    onClose();
  };

  // Filter out excluded token
  const filterExcluded = (tokens) =>
    tokens.filter(t => t.address !== excludeToken?.address);

  // Get tokens with balance
  const tokensWithBalance = filterExcluded(
    allTokens.filter(t => balances[t.address] > 0)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-white">Select Token</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or paste address"
              className="w-full pl-10 pr-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-400/50"
              autoFocus
            />
          </div>
        </div>

        {/* Token Lists */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchQuery ? (
            // Search Results
            <div className="px-4 pb-4">
              {searchResults.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No tokens found</p>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((token) => (
                    <TokenRow
                      key={token.address}
                      token={token}
                      balance={balances[token.address]}
                      onClick={() => handleSelect(token)}
                      showScore={!!token.score}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Popular Tokens */}
              <div className="px-4 pb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Popular
                </p>
                <div className="space-y-1">
                  {filterExcluded(POPULAR_TOKENS).map((token) => (
                    <TokenRow
                      key={token.address}
                      token={token}
                      balance={balances[token.address]}
                      onClick={() => handleSelect(token)}
                    />
                  ))}
                </div>
              </div>

              {/* Watchlist Tokens */}
              {watchlistTokens.length > 0 && (
                <div className="px-4 py-2 border-t border-dark-border/50">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Star className="w-3 h-3" /> From Watchlist ({filterExcluded(watchlistTokens).length})
                  </p>
                  <div className="space-y-1">
                    {filterExcluded(watchlistTokens).map((token) => (
                      <TokenRow
                        key={token.address}
                        token={token}
                        balance={balances[token.address]}
                        onClick={() => handleSelect(token)}
                        showScore
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tokens with Balance */}
              {tokensWithBalance.length > 0 && (
                <div className="px-4 py-2 border-t border-dark-border/50">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Your Tokens
                  </p>
                  <div className="space-y-1">
                    {tokensWithBalance.slice(0, 10).map((token) => (
                      <TokenRow
                        key={token.address}
                        token={token}
                        balance={balances[token.address]}
                        onClick={() => handleSelect(token)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TokenRow({ token, balance, onClick, showScore }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-dark-hover transition-colors text-left"
    >
      {/* Token Logo */}
      <div className="w-10 h-10 rounded-full bg-dark-bg flex items-center justify-center overflow-hidden">
        {token.logoURI ? (
          <img
            src={token.logoURI}
            alt={token.symbol}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <span
          className={cn(
            'text-sm font-bold text-gray-400',
            token.logoURI && 'hidden'
          )}
        >
          {token.symbol?.slice(0, 2)}
        </span>
      </div>

      {/* Token Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{token.symbol}</span>
          {showScore && token.score && (
            <span className="text-xs px-1.5 py-0.5 bg-brand-400/20 text-brand-400 rounded">
              {token.score}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{token.name}</p>
      </div>

      {/* Balance */}
      {balance !== undefined && balance > 0 && (
        <div className="text-right">
          <p className="text-sm text-gray-300">
            {formatTokenBalance(balance, token.decimals)}
          </p>
        </div>
      )}
    </button>
  );
}
