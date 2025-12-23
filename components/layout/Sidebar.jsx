'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ListTodo,
  Coins,
  Users,
  FileText,
  Settings,
  Sparkles,
  Plus,
  LogOut,
  Star,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Watchlist', href: '/watchlist', icon: Star },
  { name: 'Analysis Queue', href: '/queue', icon: ListTodo },
  { name: 'All Tokens', href: '/tokens', icon: Coins },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ user }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-dark-card border-r border-dark-border flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-dark-border/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-accent-400 rounded-lg blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative w-9 h-9 bg-gradient-to-br from-brand-500 to-accent-400 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold cosmic-text">Maze</span>
            <span className="block text-[10px] text-gray-500 -mt-1">Token Analytics</span>
          </div>
        </Link>
      </div>

      {/* Quick Action */}
      <div className="p-4">
        <Link
          href="/tokens/new"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-400 text-white rounded-lg font-medium hover:from-brand-400 hover:to-brand-300 transition-all duration-300 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Submit Token
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-400/10 text-brand-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-dark-hover'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-dark-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-400/20 flex items-center justify-center">
            <span className="text-brand-400 font-medium text-sm">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.role || 'Reviewer'}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
