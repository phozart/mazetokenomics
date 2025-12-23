'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  Star,
  ListTodo,
  Coins,
  Shield,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lock,
  Vault,
  BarChart3,
  Search,
  Eye,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Droplets,
  Clock,
  Network,
} from 'lucide-react';

const helpSections = [
  {
    id: 'watchlist',
    title: 'Watchlist',
    icon: Star,
    description: 'Track your favorite tokens with live prices',
    items: [
      {
        title: 'Adding Tokens',
        content: 'Click "Add Token" to add any Solana token by entering its contract address. The system will automatically fetch the token name, symbol, and current price from DexScreener.',
      },
      {
        title: 'Viewing Token Details',
        content: 'Click on any token in your watchlist to open the Token Detail Modal. This shows live price data, 24h price charts, market cap, liquidity, and a link to the full token analysis.',
      },
      {
        title: 'Price Charts',
        content: 'The modal displays price history as 24-hour (hourly data) or 30-day (daily data) charts. Click "Collect" to capture a new price snapshot. Price data is collected automatically over time.',
      },
      {
        title: 'Refreshing Prices',
        content: 'Click the Refresh button to update all prices in your watchlist. Prices are fetched in real-time from DexScreener.',
      },
      {
        title: 'Removing Tokens',
        content: 'Click the trash icon or use the menu on a token card to remove it from your watchlist.',
      },
    ],
  },
  {
    id: 'token-analysis',
    title: 'Token Analysis',
    icon: Shield,
    description: 'Comprehensive security and risk analysis for tokens',
    items: [
      {
        title: 'Submitting a Token',
        content: 'Go to "Submit Token" and enter a contract address. The system will analyze the token using multiple data sources including DexScreener (prices/liquidity) and RugCheck (security checks for Solana tokens).',
      },
      {
        title: 'Understanding Risk Levels',
        content: 'Tokens are rated as LOW, MEDIUM, HIGH, or CRITICAL risk based on security checks. Green flags indicate positive security features, while red flags indicate potential risks.',
      },
      {
        title: 'Security Checks',
        content: `The analysis includes:
- Mint Authority: Can new tokens be created?
- Freeze Authority: Can tokens be frozen?
- LP Locked: What percentage of liquidity is locked?
- Top Holder Concentration: How concentrated is token ownership?
- Mutable Metadata: Can token info be changed?
- RugCheck Score: Overall security score from RugCheck`,
      },
      {
        title: 'Overall Score',
        content: 'The overall score (0-100) is calculated from all security checks. Higher scores indicate better security. Scores above 70 are generally considered safer.',
      },
    ],
  },
  {
    id: 'holder-analysis',
    title: 'Holder Analysis',
    icon: Users,
    description: 'Deep analysis of token holders and wallet patterns',
    items: [
      {
        title: 'Running Holder Analysis',
        content: 'From a token\'s analysis page, click "Holder Analysis" to run a deep analysis of the top token holders. This analyzes wallet ages, connections, and trading patterns.',
      },
      {
        title: 'Wallet Types',
        content: `Top holders are classified by type:
- Vault (green): Token lock vaults like Streamflow - tokens are locked
- AMM/LP Pool (blue): Liquidity pool contracts
- Creator (purple): The token creator wallet
- Exchange (orange): Known exchange wallets
- Unknown: Regular wallets`,
      },
      {
        title: 'Lock Status',
        content: 'Wallets holding locked tokens display a lock icon with the unlock date if known. Locked tokens are a positive sign as they cannot be sold immediately. Vaults with high holdings are not concerning if tokens are locked.',
      },
      {
        title: 'Risk Metrics',
        content: `Key metrics include:
- Gini Coefficient: Measures wealth inequality (0-1, lower is more distributed)
- Nakamoto Coefficient: Wallets needed for 51% control (higher is better)
- Sybil Score: Probability of fake/coordinated holders
- Insider Score: Likelihood of insider accumulation
- Exit Risk: Risk of large holder liquidation impact`,
      },
      {
        title: 'Cluster Detection',
        content: 'The system detects wallets with shared funding sources, indicating potential coordination. Clustered wallets are grouped and displayed together.',
      },
      {
        title: 'Fresh Wallet Detection',
        content: 'Wallets created within 7 days are flagged as "fresh". A high percentage of fresh wallets among top holders may indicate suspicious activity.',
      },
    ],
  },
  {
    id: 'queue',
    title: 'Analysis Queue',
    icon: ListTodo,
    description: 'Track and manage token analysis requests',
    items: [
      {
        title: 'Queue Status',
        content: 'The queue shows all submitted tokens with their analysis status: Pending, In Progress, Completed, or Failed.',
      },
      {
        title: 'Filtering',
        content: 'Use the status filters to view only pending, in-progress, or completed analyses.',
      },
      {
        title: 'Priority',
        content: 'Tokens are processed in order of submission. Analysis typically completes within seconds for tokens with available data.',
      },
    ],
  },
  {
    id: 'all-tokens',
    title: 'All Tokens',
    icon: Coins,
    description: 'Browse and search all analyzed tokens',
    items: [
      {
        title: 'Browsing Tokens',
        content: 'View all tokens that have been analyzed. Click on any token to see its full analysis report.',
      },
      {
        title: 'Search',
        content: 'Use the search bar to find tokens by name, symbol, or contract address.',
      },
      {
        title: 'Filtering',
        content: 'Filter tokens by chain (Solana, Ethereum, etc.), risk level, or analysis status.',
      },
      {
        title: 'Sorting',
        content: 'Sort by date analyzed, risk score, or alphabetically by name.',
      },
    ],
  },
  {
    id: 'understanding-risks',
    title: 'Understanding Risks',
    icon: AlertTriangle,
    description: 'Guide to interpreting security checks and risk flags',
    items: [
      {
        title: 'Red Flags',
        content: `Common red flags include:
- Active mint authority (new tokens can be created)
- Active freeze authority (tokens can be frozen)
- Low LP locked percentage (<80%)
- High top holder concentration (>50%)
- Mutable metadata
- Low RugCheck score (<50%)`,
      },
      {
        title: 'Green Flags',
        content: `Positive security indicators:
- Revoked mint authority
- Revoked freeze authority
- High LP locked percentage (>95%)
- Healthy token distribution
- Immutable metadata
- High RugCheck score (>70%)`,
      },
      {
        title: 'Risk Level Guidelines',
        content: `
- LOW: Generally safe, good security practices
- MEDIUM: Some concerns, proceed with caution
- HIGH: Multiple red flags, higher risk
- CRITICAL: Major security issues, high risk of loss`,
      },
      {
        title: 'Liquidity',
        content: 'Higher liquidity means easier trading with less slippage. Low liquidity tokens may be difficult to sell. We only count liquidity from pairs where the token is the base token.',
      },
    ],
  },
  {
    id: 'data-sources',
    title: 'Data Sources',
    icon: Network,
    description: 'Where our data comes from',
    items: [
      {
        title: 'DexScreener',
        content: 'Real-time price data, liquidity information, trading pairs, and market statistics. Used for all supported chains.',
      },
      {
        title: 'RugCheck',
        content: 'Solana-specific security analysis including mint/freeze authority status, top holder data, known account labels (vaults, AMMs), and overall risk scoring.',
      },
      {
        title: 'Blockchain RPCs',
        content: 'Direct blockchain queries for wallet ages, transaction history, and holder analysis. Uses Helius for Solana and Etherscan for EVM chains.',
      },
      {
        title: 'Data Freshness',
        content: 'Price data is fetched in real-time. Security analysis data is cached and refreshed periodically. Price history is built over time through automatic collection.',
      },
    ],
  },
];

function HelpSection({ section, isExpanded, onToggle }) {
  const Icon = section.icon;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left"
      >
        <CardHeader className="hover:bg-dark-hover/50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-400/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">{section.description}</p>
              </div>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
      </button>

      {isExpanded && (
        <CardContent className="pt-0 pb-4 border-t border-dark-border/50">
          <div className="space-y-4 mt-4">
            {section.items.map((item, index) => (
              <div key={index} className="pl-4 border-l-2 border-dark-border hover:border-brand-400/50 transition-colors">
                <h4 className="font-medium text-gray-100 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-400 whitespace-pre-line">{item.content}</p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function QuickTip({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-dark-bg/50 rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-brand-400/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-brand-400" />
      </div>
      <div>
        <h4 className="font-medium text-gray-100 text-sm">{title}</h4>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const [expandedSections, setExpandedSections] = useState(['watchlist']);

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const expandAll = () => {
    setExpandedSections(helpSections.map((s) => s.id));
  };

  const collapseAll = () => {
    setExpandedSections([]);
  };

  return (
    <div>
      <Header
        title="Help & Documentation"
        description="Learn how to use Maze Token Analytics"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors"
          >
            Collapse All
          </button>
        </div>
      </Header>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Quick Tips */}
        <div>
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Quick Tips</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickTip
              icon={Star}
              title="Track Tokens"
              description="Add tokens to your watchlist to monitor prices in real-time"
            />
            <QuickTip
              icon={Shield}
              title="Check Security"
              description="Submit any token for a comprehensive security analysis"
            />
            <QuickTip
              icon={Lock}
              title="Vault Detection"
              description="Locked tokens in vaults are highlighted - they can't be sold"
            />
            <QuickTip
              icon={Users}
              title="Holder Analysis"
              description="Deep dive into holder patterns to detect suspicious activity"
            />
          </div>
        </div>

        {/* Main Help Sections */}
        <div>
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Feature Guide</h2>
          <div className="space-y-3">
            {helpSections.map((section) => (
              <HelpSection
                key={section.id}
                section={section}
                isExpanded={expandedSections.includes(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between py-2 border-b border-dark-border/50">
                <span className="text-sm text-gray-400">Refresh prices</span>
                <kbd className="px-2 py-1 bg-dark-bg rounded text-xs text-gray-300">R</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-border/50">
                <span className="text-sm text-gray-400">Add token</span>
                <kbd className="px-2 py-1 bg-dark-bg rounded text-xs text-gray-300">N</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-border/50">
                <span className="text-sm text-gray-400">Search</span>
                <kbd className="px-2 py-1 bg-dark-bg rounded text-xs text-gray-300">/</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-border/50">
                <span className="text-sm text-gray-400">Close modal</span>
                <kbd className="px-2 py-1 bg-dark-bg rounded text-xs text-gray-300">Esc</kbd>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Glossary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Glossary</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="font-medium text-gray-100">Mint Authority</dt>
                <dd className="text-sm text-gray-400 mt-0.5">The ability to create new tokens. Should be revoked for secure tokens.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-100">Freeze Authority</dt>
                <dd className="text-sm text-gray-400 mt-0.5">The ability to freeze token transfers. Should be revoked.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-100">LP (Liquidity Pool)</dt>
                <dd className="text-sm text-gray-400 mt-0.5">Token pairs deposited in DEXs enabling trading.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-100">LP Locked</dt>
                <dd className="text-sm text-gray-400 mt-0.5">Percentage of liquidity that cannot be removed by the team.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-100">Gini Coefficient</dt>
                <dd className="text-sm text-gray-400 mt-0.5">Measures token distribution inequality (0-1). Lower is more distributed.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-100">Nakamoto Coefficient</dt>
                <dd className="text-sm text-gray-400 mt-0.5">Minimum wallets needed to control 51% of supply. Higher is better.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-100">Sybil Attack</dt>
                <dd className="text-sm text-gray-400 mt-0.5">Creating many fake wallets to appear decentralized.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-100">Wash Trading</dt>
                <dd className="text-sm text-gray-400 mt-0.5">Trading between related wallets to fake volume.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-100">Smart Money</dt>
                <dd className="text-sm text-gray-400 mt-0.5">Experienced wallets with good trading history.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-100">Diamond Hands</dt>
                <dd className="text-sm text-gray-400 mt-0.5">Holders who keep tokens for long periods (30+ days).</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>Need more help? Contact support or check our documentation.</p>
        </div>
      </div>
    </div>
  );
}
