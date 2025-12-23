'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, Shield, Users, TrendingDown } from 'lucide-react';

/**
 * Circular progress indicator for risk scores
 */
function ScoreGauge({ value, label, size = 'md', colorScale = 'risk' }) {
  const sizeConfig = {
    sm: { width: 60, strokeWidth: 4, fontSize: 'text-sm' },
    md: { width: 80, strokeWidth: 5, fontSize: 'text-lg' },
    lg: { width: 100, strokeWidth: 6, fontSize: 'text-xl' },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = value !== null ? (value / 100) * circumference : 0;

  // Color based on value and scale type
  const getColor = () => {
    if (value === null) return '#6b7280';

    if (colorScale === 'risk') {
      // Higher = worse
      if (value >= 70) return '#ef4444'; // Red
      if (value >= 40) return '#f97316'; // Orange
      if (value >= 20) return '#f59e0b'; // Amber
      return '#22c55e'; // Green
    } else {
      // Higher = better (for smart money ratio, etc.)
      if (value >= 60) return '#22c55e'; // Green
      if (value >= 30) return '#f59e0b'; // Amber
      return '#ef4444'; // Red
    }
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.width }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={config.width} height={config.width}>
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-500"
          />
        </svg>
        {/* Value display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', config.fontSize)} style={{ color }}>
            {value !== null ? `${Math.round(value)}%` : 'N/A'}
          </span>
        </div>
      </div>
      <span className="text-xs text-gray-400 mt-2 text-center">{label}</span>
    </div>
  );
}

/**
 * Risk level indicator bar
 */
function RiskLevelBar({ value, thresholds = [30, 60, 80] }) {
  const getLevel = () => {
    if (value === null) return { label: 'Unknown', color: '#6b7280' };
    if (value < thresholds[0]) return { label: 'Low', color: '#22c55e' };
    if (value < thresholds[1]) return { label: 'Moderate', color: '#f59e0b' };
    if (value < thresholds[2]) return { label: 'High', color: '#f97316' };
    return { label: 'Critical', color: '#ef4444' };
  };

  const level = getLevel();

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Risk Level</span>
        <span style={{ color: level.color }}>{level.label}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: value !== null ? `${Math.min(100, value)}%` : '0%',
            backgroundColor: level.color,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Main Risk Score Panel Component
 */
export function RiskScorePanel({ analysis, className }) {
  if (!analysis) {
    return (
      <div className={cn('bg-dark-card border border-dark-border rounded-xl p-6', className)}>
        <p className="text-gray-400 text-center">No analysis data available</p>
      </div>
    );
  }

  const scores = [
    {
      key: 'sybil',
      label: 'Sybil Score',
      value: analysis.sybilScore,
      icon: Users,
      description: 'Probability of fake/coordinated holders',
      colorScale: 'risk',
    },
    {
      key: 'insider',
      label: 'Insider Score',
      value: analysis.insiderScore,
      icon: AlertTriangle,
      description: 'Likelihood of insider accumulation',
      colorScale: 'risk',
    },
    {
      key: 'exit',
      label: 'Exit Risk',
      value: analysis.exitRiskScore,
      icon: TrendingDown,
      description: 'Risk of large holder liquidation',
      colorScale: 'risk',
    },
    {
      key: 'smart',
      label: 'Smart Money',
      value: analysis.smartMoneyRatio,
      icon: Shield,
      description: 'Established wallet holders',
      colorScale: 'positive',
    },
  ];

  return (
    <div className={cn('bg-dark-card border border-dark-border rounded-xl', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-border">
        <h3 className="text-lg font-semibold text-gray-100">Risk Assessment</h3>
        <p className="text-sm text-gray-400 mt-1">Advanced holder risk analysis</p>
      </div>

      {/* Score gauges */}
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {scores.map((score) => (
            <div key={score.key} className="flex flex-col items-center">
              <ScoreGauge
                value={score.value}
                label={score.label}
                size="md"
                colorScale={score.colorScale}
              />
              <p className="text-xs text-gray-500 mt-2 text-center max-w-[100px]">
                {score.description}
              </p>
            </div>
          ))}
        </div>

        {/* Summary risk bar */}
        <div className="mt-6 pt-4 border-t border-dark-border">
          <RiskLevelBar
            value={analysis.sybilScore}
            thresholds={[30, 50, 70]}
          />
        </div>
      </div>
    </div>
  );
}

export default RiskScorePanel;
