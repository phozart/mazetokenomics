'use client';

import { cn } from '@/lib/utils';

export function ScoreCircle({ score, size = 'md', label }) {
  const sizes = {
    sm: { width: 60, stroke: 4, fontSize: 'text-lg' },
    md: { width: 80, stroke: 5, fontSize: 'text-2xl' },
    lg: { width: 120, stroke: 6, fontSize: 'text-4xl' },
  };

  const config = sizes[size];
  const radius = (config.width - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((score || 0) / 100) * circumference;

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return '#6b7280';
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#ef4444';
    return '#dc2626';
  };

  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.width }}>
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={config.stroke}
          />
          {/* Progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>

        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn('font-bold', config.fontSize)}
            style={{ color }}
          >
            {score !== null && score !== undefined ? Math.round(score) : '-'}
          </span>
        </div>
      </div>

      {label && (
        <span className="mt-2 text-sm text-gray-400">{label}</span>
      )}
    </div>
  );
}

export function ScoreBar({ score, label, showValue = true }) {
  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'bg-gray-600';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-red-500';
    return 'bg-red-600';
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-gray-400">{label}</span>}
          {showValue && (
            <span className="text-sm font-medium text-gray-200">
              {score !== null && score !== undefined ? `${Math.round(score)}%` : '-'}
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getScoreColor(score))}
          style={{ width: `${score || 0}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreOverview({ automaticScore, manualScore, overallScore, riskLevel }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="text-center">
        <ScoreCircle score={automaticScore} size="md" />
        <p className="mt-2 text-sm text-gray-400">Automatic</p>
        <p className="text-xs text-gray-500">40% weight</p>
      </div>
      <div className="text-center">
        <ScoreCircle score={manualScore} size="md" />
        <p className="mt-2 text-sm text-gray-400">Manual</p>
        <p className="text-xs text-gray-500">60% weight</p>
      </div>
      <div className="text-center">
        <ScoreCircle score={overallScore} size="lg" />
        <p className="mt-2 text-sm font-medium text-gray-200">Overall Score</p>
        {riskLevel && (
          <span
            className={cn(
              'inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium',
              riskLevel === 'LOW' && 'bg-green-500/20 text-green-400',
              riskLevel === 'MEDIUM' && 'bg-yellow-500/20 text-yellow-400',
              riskLevel === 'HIGH' && 'bg-red-500/20 text-red-400',
              riskLevel === 'EXTREME' && 'bg-red-600/20 text-red-500'
            )}
          >
            {riskLevel} RISK
          </span>
        )}
      </div>
    </div>
  );
}
