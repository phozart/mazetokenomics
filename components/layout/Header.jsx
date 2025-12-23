'use client';

import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export function Header({ title, description, children }) {
  return (
    <header className="sticky top-14 lg:top-0 z-30 bg-dark-card border-b border-dark-border px-4 sm:px-6 py-3 sm:py-0 sm:h-16 sm:flex sm:items-center sm:justify-between">
      <div className="mb-2 sm:mb-0">
        {title && <h1 className="text-lg sm:text-xl font-semibold text-gray-100">{title}</h1>}
        {description && <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">{description}</p>}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search - hidden on mobile */}
        <div className="relative w-48 lg:w-64 hidden sm:block">
          <Input
            type="search"
            placeholder="Search tokens..."
            icon={Search}
            className="py-2"
          />
        </div>

        {/* Notifications - smaller on mobile */}
        <button className="relative p-2 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors hidden sm:block">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Additional actions */}
        {children}
      </div>
    </header>
  );
}
