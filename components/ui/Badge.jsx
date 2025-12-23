'use client';

import { cn } from '@/lib/utils';

const variants = {
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  neutral: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  brand: 'bg-brand-400/10 text-brand-400 border-brand-400/20',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className,
  icon: Icon,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

// Convenience components for common badge types
export function StatusBadge({ status }) {
  const statusConfig = {
    PENDING: { variant: 'neutral', label: 'Pending' },
    AUTO_RUNNING: { variant: 'info', label: 'Running Checks' },
    AUTO_COMPLETE: { variant: 'info', label: 'Awaiting Review' },
    IN_REVIEW: { variant: 'warning', label: 'In Review' },
    REVIEW_COMPLETE: { variant: 'warning', label: 'Review Complete' },
    APPROVED: { variant: 'success', label: 'Approved' },
    REJECTED: { variant: 'danger', label: 'Rejected' },
    FLAGGED: { variant: 'danger', label: 'Flagged' },
  };

  const config = statusConfig[status] || { variant: 'neutral', label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function RiskBadge({ riskLevel }) {
  const riskConfig = {
    LOW: { variant: 'success', label: 'Low Risk' },
    MEDIUM: { variant: 'warning', label: 'Medium Risk' },
    HIGH: { variant: 'danger', label: 'High Risk' },
    EXTREME: { variant: 'danger', label: 'Extreme Risk' },
  };

  const config = riskConfig[riskLevel] || { variant: 'neutral', label: riskLevel };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PriorityBadge({ priority }) {
  const priorityConfig = {
    LOW: { variant: 'neutral', label: 'Low' },
    NORMAL: { variant: 'info', label: 'Normal' },
    HIGH: { variant: 'warning', label: 'High' },
    URGENT: { variant: 'danger', label: 'Urgent' },
  };

  const config = priorityConfig[priority] || { variant: 'neutral', label: priority };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ChainBadge({ chain }) {
  const chainConfig = {
    ETHEREUM: { color: '#627EEA', label: 'ETH' },
    BSC: { color: '#F3BA2F', label: 'BSC' },
    POLYGON: { color: '#8247E5', label: 'MATIC' },
    ARBITRUM: { color: '#28A0F0', label: 'ARB' },
    BASE: { color: '#0052FF', label: 'BASE' },
    OPTIMISM: { color: '#FF0420', label: 'OP' },
    AVALANCHE: { color: '#E84142', label: 'AVAX' },
    SOLANA: { color: '#9945FF', label: 'SOL' },
  };

  const config = chainConfig[chain] || { color: '#6b7280', label: chain };

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      {config.label}
    </span>
  );
}
