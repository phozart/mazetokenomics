'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-brand-400 text-gray-900 hover:bg-brand-300 focus:ring-brand-400/50',
  secondary: 'bg-dark-card border border-dark-border text-gray-200 hover:bg-dark-hover focus:ring-gray-500/50',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 focus:ring-red-500/50',
  ghost: 'text-gray-400 hover:text-gray-200 hover:bg-dark-hover focus:ring-gray-500/50',
  success: 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 focus:ring-green-500/50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading = false,
  disabled = false,
  icon: Icon,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
}
