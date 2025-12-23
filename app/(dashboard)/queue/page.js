'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { StatusBadge, RiskBadge, ChainBadge, PriorityBadge } from '@/components/ui/Badge';
import { formatAddress, formatRelativeTime } from '@/lib/utils';
import { CHAINS } from '@/lib/constants';
import { ListFilter, RefreshCw, Loader2 } from 'lucide-react';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'AUTO_RUNNING', label: 'Running Checks' },
  { value: 'AUTO_COMPLETE', label: 'Awaiting Review' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'REVIEW_COMPLETE', label: 'Review Complete' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FLAGGED', label: 'Flagged' },
];

const chainOptions = [
  { value: '', label: 'All Chains' },
  ...Object.entries(CHAINS).map(([key, chain]) => ({
    value: key,
    label: chain.name,
  })),
];

export default function QueuePage() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [chainFilter, setChainFilter] = useState('');
  const [total, setTotal] = useState(0);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
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
  }, [statusFilter, chainFilter]);

  return (
    <div>
      <Header
        title="Analysis Queue"
        description="Manage and review tokens in the analysis pipeline"
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <ListFilter className="w-5 h-5 text-gray-400" />
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="Filter by status"
                className="w-48"
              />
              <Select
                options={chainOptions}
                value={chainFilter}
                onChange={(e) => setChainFilter(e.target.value)}
                placeholder="Filter by chain"
                className="w-48"
              />
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                onClick={fetchTokens}
                isLoading={loading}
              >
                Refresh
              </Button>
              <span className="text-sm text-gray-400">
                {total} token{total !== 1 ? 's' : ''}
              </span>
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
            ) : tokens.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No tokens found matching your filters
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="table-header text-left px-6 py-3">Token</th>
                    <th className="table-header text-left px-4 py-3">Chain</th>
                    <th className="table-header text-left px-4 py-3">Status</th>
                    <th className="table-header text-left px-4 py-3">Priority</th>
                    <th className="table-header text-center px-4 py-3">Auto Score</th>
                    <th className="table-header text-center px-4 py-3">Overall</th>
                    <th className="table-header text-left px-4 py-3">Risk</th>
                    <th className="table-header text-right px-6 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((process) => (
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
                            {formatAddress(process.token.contractAddress)}
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
                        <PriorityBadge priority={process.priority} />
                      </td>
                      <td className="table-cell px-4 text-center">
                        {process.automaticScore !== null ? (
                          <span className="font-medium">{Math.round(process.automaticScore)}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="table-cell px-4 text-center">
                        {process.overallScore !== null ? (
                          <span className="font-bold text-lg">{Math.round(process.overallScore)}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="table-cell px-4">
                        {process.riskLevel ? (
                          <RiskBadge riskLevel={process.riskLevel} />
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="table-cell px-6 text-right text-gray-400">
                        {formatRelativeTime(process.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
