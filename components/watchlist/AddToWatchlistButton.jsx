'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';

export function AddToWatchlistButton({
  tokenId,
  contractAddress,
  chain,
  symbol,
  name,
  isWatched: initialIsWatched = false,
  size = 'md',
  className = '',
}) {
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);

    try {
      if (isWatched) {
        // Need to find and delete - for now just show feedback
        // This would require knowing the watchlist item ID
        toast.error('Use the watchlist page to remove items');
        return;
      }

      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          contractAddress,
          chain,
          symbol,
          name,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setIsWatched(true);
          toast.success('Already in watchlist');
          return;
        }
        throw new Error(data.error || 'Failed to add');
      }

      setIsWatched(true);
      toast.success('Added to watchlist');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        rounded-lg transition-all
        ${isWatched
          ? 'text-yellow-400 bg-yellow-400/10'
          : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
        }
        disabled:opacity-50
        ${className}
      `}
      title={isWatched ? 'In watchlist' : 'Add to watchlist'}
    >
      <Star
        className={`${iconSizes[size]} ${isWatched ? 'fill-current' : ''}`}
      />
    </button>
  );
}
