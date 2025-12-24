'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'maze_recent_swaps';
const MAX_SWAPS = 5;

export function useRecentSwaps() {
  const [swaps, setSwaps] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSwaps(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent swaps:', e);
    }
  }, []);

  // Add a new swap
  const addSwap = (swap) => {
    const newSwap = {
      ...swap,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };

    setSwaps(prev => {
      const updated = [newSwap, ...prev].slice(0, MAX_SWAPS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent swaps:', e);
      }
      return updated;
    });
  };

  return { swaps, addSwap };
}

export function RecentSwaps({ swaps }) {
  if (!swaps || swaps.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-dark-card border border-dark-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-dark-border">
        <h3 className="text-sm font-medium text-gray-400">Recent Activity</h3>
      </div>
      <div className="divide-y divide-dark-border/50">
        {swaps.map((swap) => (
          <SwapRow key={swap.id} swap={swap} />
        ))}
      </div>
    </div>
  );
}

function SwapRow({ swap }) {
  const timeAgo = getTimeAgo(swap.timestamp);

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        swap.status === 'success' ? 'bg-green-500/20' : 'bg-yellow-500/20'
      )}>
        {swap.status === 'success' ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Clock className="w-4 h-4 text-yellow-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">
          Swapped {swap.inputAmount} {swap.inputSymbol} → {swap.outputAmount} {swap.outputSymbol}
        </p>
        <p className="text-xs text-gray-500">{timeAgo}</p>
      </div>

      {swap.txSignature && (
        <a
          href={`https://solscan.io/tx/${swap.txSignature}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
