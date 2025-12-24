'use client';

import { useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Loader2,
  X,
  Package,
  Coins,
  Calendar,
  TrendingUp,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DcaScheduleCard({ schedule, onPause, onResume, onCancel }) {
  const [loading, setLoading] = useState(false);

  const isPack = !!schedule.packId;
  const isJupiterDca = !!schedule.jupiterDcaPubkey;
  const progress =
    schedule.executionsDone > 0
      ? (schedule.executionsDone / (schedule.executionsDone + schedule.executionsLeft)) * 100
      : 0;

  const handleAction = async (action) => {
    setLoading(true);
    try {
      if (action === 'pause') await onPause?.(schedule.id);
      else if (action === 'resume') await onResume?.(schedule.id);
      else if (action === 'cancel') await onCancel?.(schedule.id);
    } finally {
      setLoading(false);
    }
  };

  const formatFrequency = (freq) => {
    switch (freq) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'biweekly':
        return 'Every 2 weeks';
      case 'monthly':
        return 'Monthly';
      default:
        return freq;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={cn(
        'bg-dark-card border rounded-xl p-5 transition-colors',
        schedule.status === 'active'
          ? 'border-dark-border'
          : schedule.status === 'paused'
          ? 'border-yellow-500/30'
          : 'border-dark-border/50 opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2.5 rounded-lg',
              isPack ? 'bg-brand-400/10' : 'bg-purple-500/10'
            )}
          >
            {isPack ? (
              <Package className="w-5 h-5 text-brand-400" />
            ) : (
              <Coins className="w-5 h-5 text-purple-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              {schedule.name}
              {isJupiterDca && (
                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Auto
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-400">
              {isPack
                ? schedule.pack?.name
                : `${schedule.symbol} - ${formatFrequency(schedule.frequency)}`}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'text-xs px-2 py-1 rounded capitalize',
            schedule.status === 'active'
              ? 'bg-green-500/20 text-green-400'
              : schedule.status === 'paused'
              ? 'bg-yellow-500/20 text-yellow-400'
              : schedule.status === 'completed'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gray-500/20 text-gray-400'
          )}
        >
          {schedule.status}
        </span>
      </div>

      {/* Jupiter DCA Badge */}
      {isJupiterDca && (
        <div className="mb-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
          <p className="text-xs text-green-400 mb-1">Jupiter DCA - Auto-executing</p>
          <a
            href={`https://solscan.io/account/${schedule.jupiterDcaPubkey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-brand-400 flex items-center gap-1 font-mono truncate"
          >
            {schedule.jupiterDcaPubkey.slice(0, 20)}...
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-gray-400">Progress</span>
          <span className="text-white">
            {schedule.executionsDone}/{schedule.executionsDone + schedule.executionsLeft} buys
          </span>
        </div>
        <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-dark-bg rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Invested</p>
          <p className="text-white font-medium">
            {schedule.totalInvested.toFixed(2)} SOL
          </p>
          <p className="text-xs text-gray-500">
            of {schedule.totalBudget.toFixed(2)} SOL
          </p>
        </div>
        <div className="bg-dark-bg rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Per {schedule.frequency.replace('ly', '')}</p>
          <p className="text-white font-medium">
            {schedule.amountPerPeriod.toFixed(2)} SOL
          </p>
        </div>
      </div>

      {/* Next Execution */}
      {schedule.status === 'active' && !isJupiterDca && (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Calendar className="w-4 h-4" />
          <span>Next: {formatDate(schedule.nextExecution)}</span>
        </div>
      )}

      {/* Average Price */}
      {schedule.averagePrice && (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <TrendingUp className="w-4 h-4" />
          <span>Avg entry: ${schedule.averagePrice.toFixed(4)}</span>
        </div>
      )}

      {/* Actions - Only for non-Jupiter DCAs */}
      {['active', 'paused'].includes(schedule.status) && !isJupiterDca && (
        <div className="flex items-center gap-2">
          {schedule.status === 'active' ? (
            <button
              onClick={() => handleAction('pause')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm hover:bg-yellow-500/20 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              Pause
            </button>
          ) : (
            <button
              onClick={() => handleAction('resume')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm hover:bg-green-500/20 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Resume
            </button>
          )}
          <button
            onClick={() => handleAction('cancel')}
            disabled={loading}
            className="px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Jupiter DCA View Link */}
      {isJupiterDca && schedule.status === 'active' && (
        <a
          href={`https://jup.ag/dca/${schedule.jupiterDcaPubkey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-dark-bg border border-dark-border rounded-lg text-gray-300 text-sm hover:border-brand-400/50 transition-colors"
        >
          View on Jupiter
          <ExternalLink className="w-4 h-4" />
        </a>
      )}

      {/* Pack Tokens Preview */}
      {isPack && schedule.pack?.tokens && (
        <div className="mt-4 pt-4 border-t border-dark-border">
          <p className="text-xs text-gray-400 mb-2">Distribution</p>
          <div className="flex flex-wrap gap-1.5">
            {schedule.pack.tokens.slice(0, 4).map((token) => (
              <span
                key={token.id}
                className="text-xs px-2 py-0.5 bg-dark-bg rounded text-gray-300"
              >
                {token.symbol} {token.weight}%
              </span>
            ))}
            {schedule.pack.tokens.length > 4 && (
              <span className="text-xs text-gray-500">
                +{schedule.pack.tokens.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
