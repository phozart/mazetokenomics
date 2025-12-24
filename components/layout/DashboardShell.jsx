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
  LogOut,
  Star,
  Menu,
  X,
  Key,
  ArrowLeftRight,
  Package,
  Target,
  Clock,
  HelpCircle,
  Zap,
  ChevronDown,
  Search,
  PieChart,
  Plus,
  Shield,
  Scale,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { WalletProvider } from '@/components/wallet';
import { WaveBackground } from '@/components/ui/WaveBackground';

const navigation = [
  { name: 'Watchlist', href: '/', icon: Star },
  { name: 'Token Analysis', href: '/analysis', icon: Shield },
  { name: 'Trading', href: '/trading', icon: ArrowLeftRight },
  { name: 'Packs', href: '/packs', icon: Package },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

const adminNavigation = [
  { name: 'Users', href: '/users', icon: Users },
];

const quickActions = [
  { name: 'Add to Watchlist', href: '/?action=add', icon: Plus },
  { name: 'Analyze Token', href: '/analysis?action=new', icon: Search },
  { name: 'Quick Trade', href: '/trading', icon: ArrowLeftRight },
  { name: 'Create Pack', href: '/packs/create', icon: Package },
  { name: 'Create Order', href: '/trading?tab=orders&action=create', icon: Target },
  { name: 'Create DCA', href: '/trading?tab=dca&action=create', icon: Clock },
];

function QuickActionsDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-4 relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-lg font-medium hover:from-brand-400 hover:to-accent-400 transition-all duration-300 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
      >
        <Zap className="w-5 h-5" />
        Quick Actions
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-4 right-4 mt-2 bg-dark-card border border-dark-border rounded-lg shadow-xl z-50 overflow-hidden">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-dark-hover hover:text-white transition-colors"
            >
              <action.icon className="w-4 h-4 text-brand-400" />
              {action.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();

  const isAdmin = user?.role === 'ADMIN';
  const isViewer = user?.role === 'VIEWER';

  // Close sidebar and user menu when route changes
  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
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
      {/* Animated Wave Background */}
      <WaveBackground />

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-black/10 border-b border-white/5 flex items-center justify-between px-4">
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-black/10 border-r border-white/5 flex flex-col transform transition-transform duration-300 ease-in-out',
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

        {/* Quick Actions Dropdown - Only for non-viewers */}
        {!isViewer && (
          <QuickActionsDropdown />
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
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-hover transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-400/20 flex items-center justify-center">
              <span className="text-brand-400 font-medium text-sm">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-200 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {getRoleLabel(user?.role)}
              </p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", userMenuOpen && "rotate-180")} />
          </button>
          {/* User Menu - Shows on click */}
          {userMenuOpen && (
            <div className="flex items-center gap-2 mt-2 px-3">
              <Link
                href="/account"
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                Password
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
          {/* Privacy & Legal Link */}
          <div className="mt-3 pt-3 border-t border-dark-border/50 px-3">
            <Link
              href="/legal"
              className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-400 transition-colors"
            >
              <Scale className="w-3 h-3" />
              Privacy & Legal
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <WalletProvider>
          {children}
        </WalletProvider>
      </main>
    </div>
  );
}
