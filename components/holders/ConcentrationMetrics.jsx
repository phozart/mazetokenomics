'use client';

import { cn } from '@/lib/utils';
import { PieChart, Users, Target, Layers } from 'lucide-react';

/**
 * Metric card with icon and value
 */
function MetricCard({ icon: Icon, label, value, subtitle, color = 'brand' }) {
  const colorMap = {
    brand: 'text-brand-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };

  return (
    <div className="bg-dark-hover rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          <p className={cn('text-2xl font-bold', colorMap[color])}>
            {value ?? 'N/A'}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-2 bg-dark-card rounded-lg">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
}

/**
 * Distribution bar visualization
 */
function DistributionBar({ label, value, max = 100 }) {
  const percentage = value !== null ? (value / max) * 100 : 0;

  // Color based on concentration
  const getColor = () => {
    if (value === null) return '#6b7280';
    if (value > 70) return '#ef4444'; // Very concentrated
    if (value > 50) return '#f97316';
    if (value > 30) return '#f59e0b';
    return '#22c55e'; // Healthy
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-200">{value !== null ? `${value.toFixed(1)}%` : 'N/A'}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>
    </div>
  );
}

/**
 * Gini coefficient visualization
 */
function GiniDisplay({ value }) {
  // Gini: 0 = perfect equality, 1 = one holder owns all
  const percentage = value !== null ? value * 100 : 0;

  const getLabel = () => {
    if (value === null) return 'Unknown';
    if (value < 0.4) return 'Healthy';
    if (value < 0.6) return 'Moderate';
    if (value < 0.8) return 'Concentrated';
    return 'Highly Concentrated';
  };

  const getColor = () => {
    if (value === null) return '#6b7280';
    if (value < 0.4) return '#22c55e';
    if (value < 0.6) return '#f59e0b';
    if (value < 0.8) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="bg-dark-hover rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400">Gini Coefficient</p>
          <p className="text-xl font-bold text-gray-100">
            {value !== null ? value.toFixed(3) : 'N/A'}
          </p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            backgroundColor: `${getColor()}20`,
            color: getColor(),
          }}
        >
          {getLabel()}
        </span>
      </div>
      {/* Visual scale */}
      <div className="relative h-3 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full">
        {value !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-gray-800 shadow-lg transition-all duration-500"
            style={{ left: `${Math.min(percentage, 97)}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Equal</span>
        <span>Concentrated</span>
      </div>
    </div>
  );
}

/**
 * Main Concentration Metrics Component
 */
export function ConcentrationMetrics({ analysis, className }) {
  if (!analysis) {
    return (
      <div className={cn('bg-dark-card border border-dark-border rounded-xl p-6', className)}>
        <p className="text-gray-400 text-center">No analysis data available</p>
      </div>
    );
  }

  // Determine Nakamoto color
  const nakamotoColor = () => {
    const value = analysis.nakamotoCoefficient;
    if (value === null) return 'brand';
    if (value >= 10) return 'green';
    if (value >= 5) return 'yellow';
    return 'red';
  };

  // Determine effective holders color
  const effectiveColor = () => {
    const value = analysis.effectiveHolders;
    if (value === null) return 'brand';
    if (value >= 50) return 'green';
    if (value >= 20) return 'yellow';
    return 'red';
  };

  return (
    <div className={cn('bg-dark-card border border-dark-border rounded-xl', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-border">
        <h3 className="text-lg font-semibold text-gray-100">Concentration Metrics</h3>
        <p className="text-sm text-gray-400 mt-1">Token holder distribution analysis</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            icon={Target}
            label="Nakamoto Coefficient"
            value={analysis.nakamotoCoefficient}
            subtitle="Wallets for 51% control"
            color={nakamotoColor()}
          />
          <MetricCard
            icon={Users}
            label="Effective Holders"
            value={analysis.effectiveHolders}
            subtitle="Adjusted for clusters"
            color={effectiveColor()}
          />
        </div>

        {/* Gini coefficient */}
        <GiniDisplay value={analysis.giniCoefficient} />

        {/* Distribution breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Holder Distribution
          </h4>
          <DistributionBar label="Top 10 Holders" value={analysis.top10Percent} />
          <DistributionBar label="Top 50 Holders" value={analysis.top50Percent} />
          <DistributionBar label="Top 100 Holders" value={analysis.top100Percent} />
        </div>

        {/* Cluster info */}
        {analysis.clusterCount > 0 && (
          <div className="bg-dark-hover rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Detected Clusters</p>
                <p className="text-xs text-gray-500 mt-1">
                  Groups of connected wallets
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-brand-400">
                  {analysis.clusterCount}
                </p>
                {analysis.suspiciousClusterCount > 0 && (
                  <p className="text-xs text-red-400">
                    {analysis.suspiciousClusterCount} suspicious
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConcentrationMetrics;
