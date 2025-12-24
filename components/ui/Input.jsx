'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef(function Input(
  { className, type = 'text', label, error, icon: Icon, iconClassName, ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={iconClassName || "w-5 h-5 text-gray-500"} />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg',
            'text-gray-100 placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            Icon && 'pl-10',
            error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { className, label, error, rows = 4, ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg',
          'text-gray-100 placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400',
          'transition-all duration-200 resize-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
});
