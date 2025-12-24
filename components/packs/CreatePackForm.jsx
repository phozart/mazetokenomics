'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Minus,
  AlertCircle,
  Check,
  Loader2,
  Divide,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function CreatePackForm({ watchlistTokens = [], initialPack = null }) {
  const router = useRouter();
  const [name, setName] = useState(initialPack?.name || '');
  const [description, setDescription] = useState(initialPack?.description || '');
  const [riskLevel, setRiskLevel] = useState(initialPack?.riskLevel || 'medium');
  const [selectedTokens, setSelectedTokens] = useState(
    initialPack?.tokens?.map((t) => ({
      ...t,
      selected: true,
    })) || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate total weight
  const totalWeight = selectedTokens.reduce((sum, t) => sum + (t.weight || 0), 0);
  const isValidWeight = Math.abs(totalWeight - 100) < 0.01;

  const toggleToken = (token) => {
    const exists = selectedTokens.find((t) => t.tokenAddress === token.address);
    if (exists) {
      setSelectedTokens(selectedTokens.filter((t) => t.tokenAddress !== token.address));
    } else {
      setSelectedTokens([
        ...selectedTokens,
        {
          tokenAddress: token.address,
          symbol: token.symbol,
          name: token.name,
          logoURI: token.logoURI,
          decimals: token.decimals || 9,
          score: token.score,
          weight: 0,
          selected: true,
        },
      ]);
    }
  };

  const updateWeight = (tokenAddress, weight) => {
    setSelectedTokens(
      selectedTokens.map((t) =>
        t.tokenAddress === tokenAddress
          ? { ...t, weight: Math.max(0, Math.min(100, parseFloat(weight) || 0)) }
          : t
      )
    );
  };

  const distributeEqual = () => {
    if (selectedTokens.length === 0) return;
    const equalWeight = 100 / selectedTokens.length;
    setSelectedTokens(selectedTokens.map((t) => ({ ...t, weight: equalWeight })));
  };

  const distributeByScore = () => {
    if (selectedTokens.length === 0) return;
    // Tokens with scores get weight proportional to score
    const tokensWithScores = selectedTokens.filter((t) => t.score > 0);
    const tokensWithoutScores = selectedTokens.filter((t) => !t.score || t.score === 0);

    if (tokensWithScores.length === 0) {
      // If no scores, distribute equally
      distributeEqual();
      return;
    }

    const totalScore = tokensWithScores.reduce((sum, t) => sum + t.score, 0);
    const baseWeight = tokensWithoutScores.length > 0 ? 10 : 0; // Give 10% each to unscored
    const remainingWeight = 100 - baseWeight * tokensWithoutScores.length;

    setSelectedTokens(
      selectedTokens.map((t) => ({
        ...t,
        weight: t.score
          ? (t.score / totalScore) * remainingWeight
          : baseWeight,
      }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Pack name is required');
      return;
    }

    if (selectedTokens.length === 0) {
      setError('Select at least one token');
      return;
    }

    if (!isValidWeight) {
      setError(`Weights must sum to 100% (current: ${totalWeight.toFixed(2)}%)`);
      return;
    }

    setLoading(true);

    try {
      const url = initialPack ? `/api/packs/${initialPack.id}` : '/api/packs';
      const method = initialPack ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          riskLevel,
          tokens: selectedTokens.map((t) => ({
            tokenAddress: t.tokenAddress,
            symbol: t.symbol,
            name: t.name,
            weight: t.weight,
            logoURI: t.logoURI,
            decimals: t.decimals,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save pack');
      }

      const { pack } = await response.json();
      router.push(`/packs/${pack.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Pack Info */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-brand-400" />
          Pack Details
        </h2>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Pack Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Blue Chip Solana"
            className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-400/50"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your investment strategy..."
            rows={2}
            className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-400/50 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Risk Level</label>
          <div className="flex gap-2">
            {['low', 'medium', 'high'].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setRiskLevel(level)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-colors',
                  riskLevel === level
                    ? level === 'low'
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : level === 'medium'
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                      : 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-600'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Token Selection */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Select Tokens</h2>
          <span
            className={cn(
              'text-sm font-medium',
              isValidWeight ? 'text-green-400' : 'text-red-400'
            )}
          >
            Total: {totalWeight.toFixed(1)}%
            {isValidWeight && <Check className="inline w-4 h-4 ml-1" />}
          </span>
        </div>

        {/* Distribution Buttons */}
        {selectedTokens.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={distributeEqual}
              className="flex items-center gap-2 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-gray-300 hover:border-gray-600 transition-colors"
            >
              <Divide className="w-4 h-4" />
              Equal
            </button>
            <button
              type="button"
              onClick={distributeByScore}
              className="flex items-center gap-2 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-gray-300 hover:border-gray-600 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              By Score
            </button>
          </div>
        )}

        {/* Token List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {watchlistTokens.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No tokens in watchlist. Add Solana tokens to your watchlist first.
            </p>
          ) : (
            watchlistTokens.map((token) => {
              const selected = selectedTokens.find((t) => t.tokenAddress === token.address);
              return (
                <div
                  key={token.address}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                    selected
                      ? 'bg-brand-400/10 border-brand-400/30'
                      : 'bg-dark-bg border-dark-border hover:border-gray-600'
                  )}
                  onClick={() => !selected && toggleToken(token)}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleToken(token);
                    }}
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                      selected
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-gray-600 hover:border-gray-500'
                    )}
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </button>

                  {/* Token Info */}
                  <div className="w-8 h-8 rounded-full bg-dark-card flex items-center justify-center overflow-hidden">
                    {token.logoURI ? (
                      <img src={token.logoURI} alt={token.symbol} className="w-full h-full" />
                    ) : (
                      <span className="text-xs font-bold text-gray-400">
                        {token.symbol?.slice(0, 2)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{token.symbol}</span>
                      {token.score && (
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            token.score >= 70
                              ? 'bg-green-500/20 text-green-400'
                              : token.score >= 40
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          )}
                        >
                          {Math.round(token.score)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{token.name}</p>
                  </div>

                  {/* Weight Input */}
                  {selected && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => updateWeight(token.address, selected.weight - 5)}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={selected.weight.toFixed(1)}
                        onChange={(e) => updateWeight(token.address, e.target.value)}
                        className="w-16 px-2 py-1 bg-dark-card border border-dark-border rounded text-center text-white text-sm focus:outline-none focus:border-brand-400/50"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-gray-400 text-sm">%</span>
                      <button
                        type="button"
                        onClick={() => updateWeight(token.address, selected.weight + 5)}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !isValidWeight || selectedTokens.length === 0}
        className={cn(
          'w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
          loading || !isValidWeight || selectedTokens.length === 0
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-brand-500 hover:bg-brand-600 text-white'
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {initialPack ? 'Updating...' : 'Creating...'}
          </>
        ) : (
          <>
            <Package className="w-5 h-5" />
            {initialPack ? 'Update Pack' : 'Create Pack'}
          </>
        )}
      </button>
    </form>
  );
}
