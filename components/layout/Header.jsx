'use client';

import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { WalletButton } from '@/components/wallet';

export function Header({ title, description, children }) {
  return (
    <header className="sticky top-14 lg:top-0 z-30 bg-dark-card border-b border-dark-border px-4 sm:px-6 py-3 sm:py-0 sm:h-16 sm:flex sm:items-center sm:justify-between">
      <div className="mb-2 sm:mb-0">
        {title && <h1 className="text-lg sm:text-xl font-semibold text-gray-100">{title}</h1>}
        {description && <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">{description}</p>}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Page-specific actions */}
        {children}

        {/* Divider */}
        {children && <div className="hidden sm:block w-px h-8 bg-dark-border" />}

        {/* Wallet Button - Always visible */}
        <WalletButton />
      </div>
    </header>
  );
}
