'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge, RiskBadge, ChainBadge, PriorityBadge } from '@/components/ui/Badge';
import { formatAddress, formatRelativeTime, formatDate } from '@/lib/utils';
import { CHAINS } from '@/lib/constants';
import { Plus, Search, Loader2, RefreshCw } from 'lucide-react';

const chainOptions = [
  { value: '', label: 'All Chains' },
  ...Object.entries(CHAINS).map(([key, chain]) => ({
    value: key,
    label: chain.name,
  })),
];

export default function TokensPage() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chainFilter, setChainFilter] = useState('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (chainFilter) params.set('chain', chainFilter);

      const response = await fetch(`/api/tokens?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setTokens(data.tokens);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [chainFilter]);

  const filteredTokens = tokens.filter((process) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      process.token.symbol?.toLowerCase().includes(searchLower) ||
      process.token.name?.toLowerCase().includes(searchLower) ||
      process.token.contractAddress.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <Header
        title="All Tokens"
        description="Browse all tokens submitted for analysis"
      >
        <Link href="/tokens/new">
          <Button icon={Plus}>Submit Token</Button>
        </Link>
      </Header>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, symbol, or address..."
                  icon={Search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                options={chainOptions}
                value={chainFilter}
                onChange={(e) => setChainFilter(e.target.value)}
                placeholder="Filter by chain"
                className="w-48"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                onClick={fetchTokens}
                isLoading={loading}
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Token List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No tokens found</p>
                <Link href="/tokens/new">
                  <Button variant="secondary" icon={Plus}>
                    Submit First Token
                  </Button>
                </Link>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="table-header text-left px-6 py-3">Token</th>
                    <th className="table-header text-left px-4 py-3">Chain</th>
                    <th className="table-header text-left px-4 py-3">Status</th>
                    <th className="table-header text-left px-4 py-3">Risk Level</th>
                    <th className="table-header text-center px-4 py-3">Score</th>
                    <th className="table-header text-right px-6 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((process) => (
                    <tr key={process.id} className="table-row">
                      <td className="table-cell px-6">
                        <Link
                          href={`/tokens/${process.id}`}
                          className="hover:text-brand-400 transition-colors"
                        >
                          <div className="font-medium text-gray-100">
                            {process.token.symbol || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {process.token.name || formatAddress(process.token.contractAddress)}
                          </div>
                        </Link>
                      </td>
                      <td className="table-cell px-4">
                        <ChainBadge chain={process.token.chain} />
                      </td>
                      <td className="table-cell px-4">
                        <StatusBadge status={process.status} />
                      </td>
                      <td className="table-cell px-4">
                        {process.riskLevel ? (
                          <RiskBadge riskLevel={process.riskLevel} />
                        ) : (
                          <span className="text-gray-500 text-sm">Pending</span>
                        )}
                      </td>
                      <td className="table-cell px-4 text-center">
                        {process.overallScore !== null ? (
                          <span
                            className={`font-bold text-lg ${
                              process.overallScore >= 80
                                ? 'text-green-400'
                                : process.overallScore >= 60
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}
                          >
                            {Math.round(process.overallScore)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="table-cell px-6 text-right text-gray-400">
                        {formatDate(process.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Pagination info */}
        <div className="text-sm text-gray-400 text-center">
          Showing {filteredTokens.length} of {total} tokens
        </div>
      </div>
    </div>
  );
}
