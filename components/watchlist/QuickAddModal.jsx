'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CHAINS } from '@/lib/constants';
import { isValidAddress, cn } from '@/lib/utils';
import { Search, Plus, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const chainOptions = Object.entries(CHAINS).map(([key, chain]) => ({
  value: key,
  label: chain.name,
}));

export function QuickAddModal({ isOpen, onClose, onAdded }) {
  const [chain, setChain] = useState('SOLANA');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setSelectedToken(null);
      return;
    }

    // If it looks like an address, don't search - just validate
    if (isValidAddress(searchQuery, chain)) {
      setSelectedToken({ address: searchQuery });
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (chain !== 'SOLANA') {
        // For non-Solana chains, only accept addresses
        return;
      }

      setSearching(true);
      try {
        // Search DexScreener for token by name/symbol
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(searchQuery)}`
        );

        if (response.ok) {
          const data = await response.json();
          // Filter for Solana tokens only
          const solanaTokens = (data.pairs || [])
            .filter(p => p.chainId === 'solana')
            .map(p => ({
              address: p.baseToken.address,
              symbol: p.baseToken.symbol,
              name: p.baseToken.name,
              priceUsd: p.priceUsd,
              logoURI: p.info?.imageUrl,
              liquidity: p.liquidity?.usd,
            }))
            // Remove duplicates by address
            .filter((t, i, arr) => arr.findIndex(a => a.address === t.address) === i)
            .slice(0, 8);

          setSearchResults(solanaTokens);
          setSelectedToken(null);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, chain]);

  const handleSelectToken = (token) => {
    setSelectedToken(token);
    setSearchResults([]);
    setSearchQuery(token.symbol || token.address);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const addressToAdd = selectedToken?.address || searchQuery;

    if (!addressToAdd || !isValidAddress(addressToAdd, chain)) {
      toast.error('Please enter or select a valid token');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: addressToAdd,
          chain,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add');
      }

      const data = await response.json();
      const tokenName = selectedToken?.symbol || data.watchlistItem?.name || data.watchlistItem?.symbol || 'Token';
      toast.success(`${tokenName} added to watchlist`);
      setSearchQuery('');
      setSelectedToken(null);
      onAdded?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedToken(null);
    setSearchResults([]);
    onClose();
  };

  const isValidInput = selectedToken?.address || isValidAddress(searchQuery, chain);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Token to Watchlist"
      description="Search by name, ticker, or paste a contract address"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Chain"
          options={chainOptions}
          value={chain}
          onChange={(e) => {
            setChain(e.target.value);
            setSearchQuery('');
            setSelectedToken(null);
            setSearchResults([]);
          }}
        />

        <div className="relative">
          <Input
            label={chain === 'SOLANA' ? 'Search or Paste Address' : 'Contract Address'}
            placeholder={
              chain === 'SOLANA'
                ? 'Search by name, symbol, or paste address...'
                : '0x...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={searching ? Loader2 : Search}
            iconClassName={searching ? 'animate-spin' : ''}
          />

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-dark-card border border-dark-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
              {searchResults.map((token) => (
                <button
                  key={token.address}
                  type="button"
                  onClick={() => handleSelectToken(token)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-hover transition-colors text-left"
                >
                  {token.logoURI ? (
                    <img
                      src={token.logoURI}
                      alt={token.symbol}
                      className="w-8 h-8 rounded-full bg-dark-bg"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-xs font-bold text-gray-500">
                      {token.symbol?.slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-100">{token.symbol}</span>
                      {token.liquidity && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                          ${(token.liquidity / 1000).toFixed(0)}K liq
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{token.name}</p>
                  </div>
                  {token.priceUsd && (
                    <span className="text-xs text-gray-400">
                      ${parseFloat(token.priceUsd) < 0.01
                        ? parseFloat(token.priceUsd).toExponential(2)
                        : parseFloat(token.priceUsd).toFixed(4)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Token Preview */}
        {selectedToken && selectedToken.symbol && (
          <div className="flex items-center gap-3 p-3 bg-brand-400/10 border border-brand-400/20 rounded-lg">
            {selectedToken.logoURI && (
              <img
                src={selectedToken.logoURI}
                alt={selectedToken.symbol}
                className="w-8 h-8 rounded-full"
              />
            )}
            <div className="flex-1">
              <div className="font-medium text-brand-400">{selectedToken.symbol}</div>
              <div className="text-xs text-gray-400">{selectedToken.name}</div>
            </div>
            <a
              href={`https://solscan.io/token/${selectedToken.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-brand-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 bg-dark-bg/50 rounded-lg p-3">
          <Sparkles className="w-4 h-4 text-brand-400 flex-shrink-0" />
          <span>
            {chain === 'SOLANA'
              ? 'Search by ticker (e.g., "JUP") or token name, or paste the contract address directly'
              : 'Paste the contract address to add token'}
          </span>
        </div>
      </form>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!isValidInput}
          icon={Plus}
        >
          {isLoading ? 'Adding...' : 'Add to Watchlist'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
