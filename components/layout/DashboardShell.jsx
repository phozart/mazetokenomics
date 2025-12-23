'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ListTodo,
  Coins,
  Users,
  Plus,
  LogOut,
  Star,
  Menu,
  X,
  Key,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

const navigation = [
  { name: 'Watchlist', href: '/', icon: Star },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analysis Queue', href: '/queue', icon: ListTodo },
  { name: 'All Tokens', href: '/tokens', icon: Coins },
];

const adminNavigation = [
  { name: 'Users', href: '/users', icon: Users },
];

function MobileLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-accent-400 rounded-lg blur-md opacity-50" />
        <div className="relative w-8 h-8 bg-gradient-to-br from-brand-500 to-accent-400 rounded-lg flex items-center justify-center overflow-hidden">
          <Image src="/icon.svg" alt="Maze" width={32} height={32} className="w-full h-full" />
        </div>
      </div>
      <span className="text-lg font-bold cosmic-text">Maze</span>
    </div>
  );
}

function DesktopLogo() {
  return (
    <div className="flex items-center gap-3 group">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-accent-400 rounded-lg blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
        <div className="relative w-9 h-9 bg-gradient-to-br from-brand-500 to-accent-400 rounded-lg flex items-center justify-center overflow-hidden">
          <Image src="/icon.svg" alt="MazeTokenomics" width={36} height={36} className="w-full h-full" />
        </div>
      </div>
      <div>
        <span className="text-xl font-bold cosmic-text">Maze</span>
        <span className="block text-[10px] text-gray-500 -mt-1">Tokenomics</span>
      </div>
    </div>
  );
}

function getRoleLabel(role) {
  switch (role) {
    case 'ADMIN': return 'Administrator';
    case 'USER': return 'User';
    case 'VIEWER': return 'Viewer';
    default: return role || 'User';
  }
}

export function DashboardShell({ user, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isAdmin = user?.role === 'ADMIN';
  const isViewer = user?.role === 'VIEWER';

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-dark-card border-b border-dark-border flex items-center justify-between px-4">
        <MobileLogo />
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-dark-card border-r border-dark-border flex flex-col transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-dark-border/50">
          <Link href="/" className="flex items-center">
            <DesktopLogo />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action - Only for non-viewers */}
        {!isViewer && (
          <div className="p-4">
            <Link
              href="/tokens/new"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-lg font-medium hover:from-brand-400 hover:to-accent-400 transition-all duration-300 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              Submit Token
            </Link>
          </div>
        )}

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

          {/* Admin-only navigation */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Admin
                </p>
              </div>
              {adminNavigation.map((item) => {
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
            </>
          )}
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
                {getRoleLabel(user?.role)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 px-3">
            <Link
              href="/account"
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              Password
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
