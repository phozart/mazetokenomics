import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge, ChainBadge, PriorityBadge } from '@/components/ui/Badge';
import { formatAddress, formatRelativeTime } from '@/lib/utils';
import {
  Plus,
  ListTodo,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  Coins,
} from 'lucide-react';

async function getStats() {
  const [
    totalTokens,
    pendingReview,
    completedToday,
    flaggedTokens,
  ] = await Promise.all([
    prisma.vettingProcess.count(),
    prisma.vettingProcess.count({
      where: {
        status: { in: ['PENDING', 'AUTO_RUNNING', 'AUTO_COMPLETE', 'IN_REVIEW'] },
      },
    }),
    prisma.vettingProcess.count({
      where: {
        completedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.vettingProcess.count({
      where: { status: 'FLAGGED' },
    }),
  ]);

  return { totalTokens, pendingReview, completedToday, flaggedTokens };
}

async function getRecentActivity() {
  return prisma.activity.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true } },
      vettingProcess: {
        include: {
          token: { select: { symbol: true, name: true } },
        },
      },
    },
  });
}

async function getPendingQueue() {
  return prisma.vettingProcess.findMany({
    where: {
      status: { in: ['PENDING', 'AUTO_COMPLETE', 'IN_REVIEW'] },
    },
    take: 5,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: {
      token: true,
    },
  });
}

function StatCard({ label, value, icon: Icon, colorClass, bgClass }) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-gray-400">{label}</p>
            <p className={`text-xl sm:text-2xl font-bold ${colorClass}`}>{value}</p>
          </div>
          <div className={`p-2 sm:p-3 ${bgClass} rounded-lg`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueItemCard({ process }) {
  return (
    <Link
      href={`/tokens/${process.id}`}
      className="block p-4 border-b border-dark-border last:border-0 hover:bg-dark-hover transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-100">
            {process.token.symbol || 'Unknown'}
          </div>
          <div className="text-xs text-gray-500 font-mono">
            {formatAddress(process.token.contractAddress, 6)}
          </div>
        </div>
        <ChainBadge chain={process.token.chain} />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <StatusBadge status={process.status} />
        <PriorityBadge priority={process.priority} />
        {process.overallScore !== null && (
          <span className="text-xs font-medium text-gray-400">
            Score: {Math.round(process.overallScore)}
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const [stats, recentActivity, pendingQueue] = await Promise.all([
    getStats(),
    getRecentActivity(),
    getPendingQueue(),
  ]);

  return (
    <div>
      <Header
        title={`Welcome, ${session?.user?.name?.split(' ')[0] || 'User'}`}
        description="Token analysis dashboard overview"
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Tokens"
            value={stats.totalTokens}
            icon={Coins}
            colorClass="text-gray-100"
            bgClass="bg-brand-400/10 text-brand-400"
          />
          <StatCard
            label="Pending"
            value={stats.pendingReview}
            icon={Clock}
            colorClass="text-yellow-400"
            bgClass="bg-yellow-400/10 text-yellow-400"
          />
          <StatCard
            label="Today"
            value={stats.completedToday}
            icon={CheckCircle}
            colorClass="text-green-400"
            bgClass="bg-green-400/10 text-green-400"
          />
          <StatCard
            label="Flagged"
            value={stats.flaggedTokens}
            icon={AlertTriangle}
            colorClass="text-red-400"
            bgClass="bg-red-400/10 text-red-400"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Pending Queue */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ListTodo className="w-4 h-4 sm:w-5 sm:h-5" />
                  Analysis Queue
                </CardTitle>
                <Link
                  href="/queue"
                  className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors"
                >
                  View All
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {pendingQueue.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center">
                    <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm sm:text-base">All caught up! No tokens pending.</p>
                    <Link
                      href="/tokens/new"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-dark-card border border-dark-border text-gray-200 rounded-lg hover:bg-dark-hover transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Submit Token
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Mobile: Card layout */}
                    <div className="sm:hidden">
                      {pendingQueue.map((process) => (
                        <QueueItemCard key={process.id} process={process} />
                      ))}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-dark-border">
                            <th className="table-header text-left px-6 py-3">Token</th>
                            <th className="table-header text-left px-4 py-3">Chain</th>
                            <th className="table-header text-left px-4 py-3">Status</th>
                            <th className="table-header text-left px-4 py-3">Priority</th>
                            <th className="table-header text-center px-4 py-3">Score</th>
                            <th className="table-header text-right px-6 py-3">Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingQueue.map((process) => (
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
                                {process.overallScore !== null ? (
                                  <span className="font-medium">{Math.round(process.overallScore)}</span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="table-cell px-6 text-right text-gray-400">
                                {formatRelativeTime(process.submittedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentActivity.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    No recent activity
                  </div>
                ) : (
                  <div className="divide-y divide-dark-border">
                    {recentActivity.slice(0, 6).map((activity) => (
                      <div key={activity.id} className="px-4 sm:px-6 py-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm text-gray-200 truncate">
                              {activity.action.replace(/_/g, ' ').toLowerCase()}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {activity.vettingProcess?.token?.symbol || 'System'}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {formatRelativeTime(activity.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  href="/tokens/new"
                  className="flex items-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-400 text-white rounded-lg hover:from-brand-400 hover:to-brand-300 transition-all text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Submit New Token
                </Link>
                <Link
                  href="/queue"
                  className="flex items-center gap-2 w-full px-4 py-2 bg-dark-card border border-dark-border text-gray-200 rounded-lg hover:bg-dark-hover transition-colors text-sm"
                >
                  <ListTodo className="w-4 h-4" />
                  View Queue
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
