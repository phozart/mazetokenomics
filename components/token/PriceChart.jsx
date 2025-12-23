'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';

function formatPrice(price) {
  if (price === null || price === undefined) return '-';
  if (price < 0.00001) {
    return price.toExponential(2);
  }
  if (price < 1) {
    return price.toFixed(6);
  }
  if (price < 1000) {
    return price.toFixed(2);
  }
  return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatAxisTime(timestamp, period) {
  const date = new Date(timestamp);
  if (period === '24h') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label, period }) {
  if (!active || !payload || !payload.length) return null;

  const date = new Date(label);
  const formattedDate = period === '24h'
    ? date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : date.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-gray-400 mb-1">{formattedDate}</p>
      <p className="text-sm font-medium text-gray-100">
        ${formatPrice(payload[0].value)}
      </p>
    </div>
  );
}

export function PriceChart({ data, period = '24h', loading = false, height = 200 }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d) => ({
      timestamp: d.timestamp,
      price: d.price,
    }));
  }, [data]);

  // Calculate price trend (up or down)
  const isPositive = useMemo(() => {
    if (chartData.length < 2) return true;
    return chartData[chartData.length - 1].price >= chartData[0].price;
  }, [chartData]);

  // Calculate Y-axis domain with padding
  const [minPrice, maxPrice] = useMemo(() => {
    if (chartData.length === 0) return [0, 1];
    const prices = chartData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || max * 0.1;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-dark-bg/50 rounded-lg"
        style={{ height }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-dark-bg/50 rounded-lg text-gray-500"
        style={{ height }}
      >
        <p className="text-sm">No price data available</p>
        <p className="text-xs mt-1">Data will appear after collection runs</p>
      </div>
    );
  }

  const gradientId = `priceGradient-${isPositive ? 'up' : 'down'}`;
  const strokeColor = isPositive ? '#22c55e' : '#ef4444';
  const fillColor = isPositive ? '#22c55e' : '#ef4444';

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(t) => formatAxisTime(t, period)}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={{ stroke: '#374151' }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tickFormatter={(v) => `$${formatPrice(v)}`}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={{ stroke: '#374151' }}
            width={65}
          />
          <Tooltip content={<CustomTooltip period={period} />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
