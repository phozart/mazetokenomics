'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge, RiskBadge, ChainBadge, PriorityBadge } from '@/components/ui/Badge';
import { ScoreOverview, ScoreBar } from '@/components/vetting/ScoreDisplay';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { AUTO_CHECK_CONFIG, MANUAL_CHECK_CONFIG, CHAINS } from '@/lib/constants';
import { formatAddress, formatDateTime, formatRelativeTime, copyToClipboard } from '@/lib/utils';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Loader2,
  Play,
  Flag,
  ThumbsUp,
  Edit3,
  Save,
  Calculator,
  Users,
  Star,
  Trash2,
} from 'lucide-react';
import { AddToWatchlistButton } from '@/components/watchlist';
import toast from 'react-hot-toast';

export default function TokenDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('automatic');
  const [approvalModal, setApprovalModal] = useState(false);
  const [approving, setApproving] = useState(false);

  // Manual check review state
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewingCheck, setReviewingCheck] = useState(null);
  const [reviewForm, setReviewForm] = useState({ passed: null, notes: '', evidenceUrls: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Delete state
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/tokens/${id}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setData(data);
    } catch (error) {
      toast.error('Failed to load token data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRerunChecks = async () => {
    setRerunning(true);
    try {
      const response = await fetch(`/api/tokens/${id}/run-checks`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to run checks');

      toast.success('Automated checks completed');
      await fetchData();
    } catch (error) {
      toast.error('Failed to run checks');
    } finally {
      setRerunning(false);
    }
  };

  const handleRecalculateScores = async () => {
    setRecalculating(true);
    try {
      const response = await fetch(`/api/tokens/${id}/recalculate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to recalculate');

      const result = await response.json();
      toast.success(`Scores recalculated: Auto ${result.scores.automaticScore ?? '-'}, Manual ${result.scores.manualScore ?? '-'}, Overall ${result.scores.overallScore ?? '-'}`);
      await fetchData();
    } catch (error) {
      toast.error('Failed to recalculate scores');
    } finally {
      setRecalculating(false);
    }
  };

  const handleCopyAddress = async () => {
    if (data?.token?.contractAddress) {
      await copyToClipboard(data.token.contractAddress);
      toast.success('Address copied');
    }
  };

  const handleApprove = async (decision) => {
    setApproving(true);
    try {
      const response = await fetch(`/api/tokens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      toast.success(decision === 'approve' ? 'Token approved' : 'Token rejected');
      setApprovalModal(false);
      await fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setApproving(false);
    }
  };

  const openReviewModal = (checkType) => {
    const existingCheck = data.manualChecks.find(c => c.checkType === checkType);
    setReviewingCheck(checkType);
    setReviewForm({
      passed: existingCheck?.passed ?? null,
      notes: existingCheck?.notes || '',
      evidenceUrls: existingCheck?.evidenceUrls?.join('\n') || '',
    });
    setReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (reviewForm.passed === null) {
      toast.error('Please select Pass or Fail');
      return;
    }

    setSubmittingReview(true);
    try {
      const response = await fetch('/api/checks/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vettingProcessId: data.id,
          checkType: reviewingCheck,
          passed: reviewForm.passed,
          notes: reviewForm.notes,
          evidenceUrls: reviewForm.evidenceUrls.split('\n').filter(url => url.trim()),
        }),
      });

      if (!response.ok) throw new Error('Failed to submit');

      const result = await response.json();
      toast.success(`Review saved (${result.progress.completed}/${result.progress.total} complete)`);
      setReviewModal(false);
      await fetchData();
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/tokens/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      toast.success('Token deleted successfully');
      router.push('/tokens');
    } catch (error) {
      toast.error(error.message || 'Failed to delete token');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-400 mb-4">Token not found</p>
        <Link href="/tokens">
          <Button variant="secondary">Back to Tokens</Button>
        </Link>
      </div>
    );
  }

  const chainConfig = CHAINS[data.token.chain];

  return (
    <div>
      <Header title="Token Analysis Details" />

      <div className="p-6 space-y-6">
        {/* Back + Token Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link href="/tokens">
              <Button variant="ghost" size="sm" icon={ArrowLeft}>
                Back
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-100">
                  {data.token.symbol || 'Unknown Token'}
                </h1>
                <AddToWatchlistButton
                  tokenId={data.token.id}
                  contractAddress={data.token.contractAddress}
                  chain={data.token.chain}
                  symbol={data.token.symbol}
                  name={data.token.name}
                  size="md"
                />
                <ChainBadge chain={data.token.chain} />
                <StatusBadge status={data.status} />
                {data.riskLevel && <RiskBadge riskLevel={data.riskLevel} />}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                <span className="font-mono">{formatAddress(data.token.contractAddress, 10)}</span>
                <button onClick={handleCopyAddress} className="hover:text-gray-200">
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={`${chainConfig?.explorer}/address/${data.token.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-200"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              {data.token.name && (
                <p className="text-sm text-gray-500 mt-1">{data.token.name}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href={`/tokens/${id}/holders`}>
              <Button
                variant="ghost"
                size="sm"
                icon={Users}
                title="View detailed holder analysis"
              >
                Holder Analysis
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              icon={Calculator}
              onClick={handleRecalculateScores}
              isLoading={recalculating}
              title="Recalculate scores based on current checks"
            >
              Recalculate
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={handleRerunChecks}
              isLoading={rerunning}
            >
              Re-run Checks
            </Button>
            {data.status === 'REVIEW_COMPLETE' && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle}
                onClick={() => setApprovalModal(true)}
              >
                Final Decision
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => setDeleteModal(true)}
              title="Delete this token"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Score Overview */}
        <Card>
          <CardContent className="py-6">
            <ScoreOverview
              automaticScore={data.automaticScore}
              manualScore={data.manualScore}
              overallScore={data.overallScore}
              riskLevel={data.riskLevel}
            />
          </CardContent>
        </Card>

        {/* Flags */}
        {(data.redFlags?.length > 0 || data.greenFlags?.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {data.redFlags?.length > 0 && (
              <Card className="border-red-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Red Flags ({data.redFlags.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {data.redFlags.map((flag) => (
                      <li key={flag.id} className="flex items-start gap-2 text-sm">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">{flag.flag}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {data.greenFlags?.length > 0 && (
              <Card className="border-green-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-green-400 flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5" />
                    Green Flags ({data.greenFlags.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {data.greenFlags.map((flag) => (
                      <li key={flag.id} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">{flag.flag}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-dark-border">
          {['automatic', 'manual', 'activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-brand-400 text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Checks
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'automatic' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Automatic Security Checks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="table-header text-left px-6 py-3">Check</th>
                    <th className="table-header text-left px-4 py-3">Severity</th>
                    <th className="table-header text-center px-4 py-3">Status</th>
                    <th className="table-header text-left px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.automaticChecks.map((check) => {
                    const config = AUTO_CHECK_CONFIG[check.checkType];
                    return (
                      <tr key={check.id} className="table-row">
                        <td className="table-cell px-6">
                          <div className="font-medium text-gray-200">
                            {config?.name || check.checkType}
                          </div>
                          <div className="text-xs text-gray-500">
                            {config?.description}
                          </div>
                        </td>
                        <td className="table-cell px-4">
                          <Badge
                            variant={
                              check.severity === 'CRITICAL' ? 'danger' :
                              check.severity === 'HIGH' ? 'warning' :
                              check.severity === 'MEDIUM' ? 'info' : 'neutral'
                            }
                            size="sm"
                          >
                            {check.severity}
                          </Badge>
                        </td>
                        <td className="table-cell px-4 text-center">
                          {check.status === 'COMPLETED' ? (
                            check.passed ? (
                              <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                            )
                          ) : check.status === 'RUNNING' ? (
                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
                          ) : check.status === 'FAILED' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-400 mx-auto" />
                          ) : (
                            <Clock className="w-5 h-5 text-gray-400 mx-auto" />
                          )}
                        </td>
                        <td className="table-cell px-4 text-gray-400 text-sm">
                          {check.details || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'manual' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                Manual Review Checks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Show all 10 manual check types */}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="table-header text-left px-6 py-3">Check</th>
                    <th className="table-header text-left px-4 py-3">Severity</th>
                    <th className="table-header text-center px-4 py-3">Status</th>
                    <th className="table-header text-left px-4 py-3">Reviewer</th>
                    <th className="table-header text-left px-4 py-3">Notes</th>
                    <th className="table-header text-right px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(MANUAL_CHECK_CONFIG).map(([checkType, config]) => {
                    const existingCheck = data.manualChecks.find(c => c.checkType === checkType);
                    return (
                      <tr key={checkType} className="table-row">
                        <td className="table-cell px-6">
                          <div className="font-medium text-gray-200">
                            {config.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {config.description}
                          </div>
                        </td>
                        <td className="table-cell px-4">
                          <Badge
                            variant={
                              config.severity === 'CRITICAL' ? 'danger' :
                              config.severity === 'HIGH' ? 'warning' :
                              config.severity === 'MEDIUM' ? 'info' : 'neutral'
                            }
                            size="sm"
                          >
                            {config.severity}
                          </Badge>
                        </td>
                        <td className="table-cell px-4 text-center">
                          {existingCheck?.status === 'COMPLETED' ? (
                            existingCheck.passed ? (
                              <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                            )
                          ) : (
                            <Clock className="w-5 h-5 text-gray-400 mx-auto" />
                          )}
                        </td>
                        <td className="table-cell px-4 text-gray-400 text-sm">
                          {existingCheck?.reviewer?.name || '-'}
                        </td>
                        <td className="table-cell px-4 text-gray-400 text-sm max-w-xs truncate">
                          {existingCheck?.notes || '-'}
                        </td>
                        <td className="table-cell px-6 text-right">
                          <button
                            onClick={() => openReviewModal(checkType)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-brand-400 hover:text-brand-300 hover:bg-brand-400/10 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            {existingCheck?.status === 'COMPLETED' ? 'Edit' : 'Review'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'activity' && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-dark-border">
                {data.activities?.map((activity) => (
                  <div key={activity.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-200">
                          {activity.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.user?.name || 'System'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approval Modal */}
      <Modal
        isOpen={approvalModal}
        onClose={() => setApprovalModal(false)}
        title="Final Decision"
        description="Approve or reject this token based on the analysis results."
      >
        <div className="space-y-4">
          <div className="p-4 bg-dark-bg rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Overall Score</span>
              <span className="text-2xl font-bold text-gray-100">
                {data.overallScore !== null ? Math.round(data.overallScore) : '-'}
              </span>
            </div>
            <ScoreBar score={data.overallScore} showValue={false} />
          </div>

          {data.redFlags?.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                Warning: {data.redFlags.length} red flag(s) detected
              </p>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setApprovalModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => handleApprove('reject')}
            isLoading={approving}
          >
            Reject
          </Button>
          <Button
            variant="success"
            onClick={() => handleApprove('approve')}
            isLoading={approving}
          >
            Approve
          </Button>
        </ModalFooter>
      </Modal>

      {/* Manual Check Review Modal */}
      <Modal
        isOpen={reviewModal}
        onClose={() => setReviewModal(false)}
        title={MANUAL_CHECK_CONFIG[reviewingCheck]?.name || 'Review Check'}
        description={MANUAL_CHECK_CONFIG[reviewingCheck]?.description}
      >
        <div className="space-y-4">
          {/* Guidelines */}
          {MANUAL_CHECK_CONFIG[reviewingCheck]?.guidelines && (
            <div className="p-3 bg-dark-bg rounded-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Review Guidelines</p>
              <ul className="space-y-1">
                {MANUAL_CHECK_CONFIG[reviewingCheck].guidelines.map((guideline, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-brand-400">•</span>
                    {guideline}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pass/Fail Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Result</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReviewForm({ ...reviewForm, passed: true })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  reviewForm.passed === true
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'border-dark-border text-gray-400 hover:border-green-500/50'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                Pass
              </button>
              <button
                type="button"
                onClick={() => setReviewForm({ ...reviewForm, passed: false })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  reviewForm.passed === false
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'border-dark-border text-gray-400 hover:border-red-500/50'
                }`}
              >
                <XCircle className="w-5 h-5" />
                Fail
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Notes</label>
            <Textarea
              value={reviewForm.notes}
              onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
              placeholder="Add your review notes here..."
              rows={3}
            />
          </div>

          {/* Evidence URLs */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Evidence URLs (one per line)</label>
            <Textarea
              value={reviewForm.evidenceUrls}
              onChange={(e) => setReviewForm({ ...reviewForm, evidenceUrls: e.target.value })}
              placeholder="https://example.com/evidence&#10;https://twitter.com/..."
              rows={2}
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setReviewModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitReview}
            isLoading={submittingReview}
            icon={Save}
          >
            Save Review
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Token"
        description="Are you sure you want to delete this token? This action cannot be undone."
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              This will permanently delete <span className="font-medium">{data?.token?.symbol || 'this token'}</span> and all associated analysis data.
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleting}
            icon={Trash2}
          >
            Delete Token
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
