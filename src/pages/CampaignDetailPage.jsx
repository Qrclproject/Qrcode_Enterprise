import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../components/layout/Toast';
import Button from '../components/common/Button';
import {
  getCampaignById,
  retryFailedMessages,
} from '../services/campaignService';

// ─── Small stat card for summary ─────────────────────────────────
function StatBadge({ label, value, color = 'gray', icon }) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorClasses[color] || colorClasses.gray}`}>
      {icon && <i className={`fas ${icon} text-lg`}></i>}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [retrying, setRetrying] = useState(false);

  // Fetch campaign data
  const fetchCampaign = useCallback(async () => {
    try {
      const res = await getCampaignById(campaignId);
      setCampaign(res.data || res);
    } catch (err) {
      showToast('error', 'Failed to load campaign', err.message);
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [campaignId, navigate, showToast]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Retry all failed recipients
  const handleRetryAll = async () => {
    const failedCount = campaign?.recipients?.filter(r => r.status === 'failed').length || 0;
    if (failedCount === 0) {
      showToast('info', 'Nothing to retry', 'No failed recipients to retry.');
      return;
    }
    if (!window.confirm(`Retry sending to ${failedCount} failed recipient(s)?`)) return;
    setRetrying(true);
    try {
      await retryFailedMessages(campaignId);
      showToast('success', 'Retry started', 'Resending to failed recipients...');
      await fetchCampaign(); // refresh data
    } catch (err) {
      showToast('error', 'Retry failed', err.message);
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Campaign not found.
      </div>
    );
  }

  // Derived stats
  const recipients = campaign.recipients || [];
  const total = recipients.length;
  const sent = recipients.filter(r => r.status === 'sent').length;
  const failed = recipients.filter(r => r.status === 'failed').length;
  const pending = recipients.filter(r => r.status === 'pending').length;
  const checkedIn = recipients.filter(r => r.checkedIn).length;

  // Filter recipients
  let filteredRecipients = recipients;
  if (statusFilter !== 'all') {
    filteredRecipients = filteredRecipients.filter(r => r.status === statusFilter);
  }
  if (search) {
    const s = search.toLowerCase();
    filteredRecipients = filteredRecipients.filter(r =>
      (r.name && r.name.toLowerCase().includes(s)) ||
      (r.phone && r.phone.toLowerCase().includes(s))
    );
  }

  // Failed list
  const failedRecipients = recipients.filter(r => r.status === 'failed');

  const statusBadge = (status) => {
    const colors = {
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>;
  };

  const checkInBadge = (checkedIn) => {
    return checkedIn
      ? <span className="text-xs text-green-600"><i className="fas fa-check-circle"></i> Checked In</span>
      : <span className="text-xs text-gray-400"><i className="fas fa-circle"></i> Not checked</span>;
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
              <i className="fas fa-envelope-open-text text-orange-500"></i> {campaign.name}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {total} recipients · {campaign.status} · Created {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatBadge label="Total" value={total} color="gray" icon="fa-users" />
          <StatBadge label="Sent" value={sent} color="green" icon="fa-check-circle" />
          <StatBadge label="Failed" value={failed} color="red" icon="fa-exclamation-circle" />
          <StatBadge label="Pending" value={pending} color="orange" icon="fa-clock" />
          <StatBadge label="Checked In" value={checkedIn} color="blue" icon="fa-qrcode" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:border-orange-500 outline-none"
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>
          <div className="text-xs text-gray-500">
            Showing {filteredRecipients.length} of {total}
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">QR Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Check‑In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecipients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-400 text-sm">
                    No recipients found.
                  </td>
                </tr>
              ) : (
                filteredRecipients.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{r.name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.phone}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      {r.qrUrl ? (
                        <a
                          href={r.qrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block w-10 h-10 border rounded overflow-hidden"
                        >
                          <img src={r.qrUrl} alt="QR" className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{checkInBadge(r.checkedIn)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Failed Recipients Section */}
        {failedRecipients.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
                <i className="fas fa-times-circle"></i>
                Failed Recipients ({failedRecipients.length})
              </h3>
              <Button
                variant="danger"
                onClick={handleRetryAll}
                disabled={retrying}
              >
                {retrying ? 'Retrying...' : 'Retry All Failed'}
              </Button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {failedRecipients.map((r, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg border border-red-100 p-3 text-sm flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700">
                      {r.name || 'Unknown'} <span className="text-gray-400">({r.phone})</span>
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Reason: {r.failureReason || 'Unknown error'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    <i className="fas fa-phone-slash mr-1"></i>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {failedRecipients.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-sm text-green-700">
            <i className="fas fa-check-circle mr-1"></i> No failed recipients in this campaign.
          </div>
        )}
      </div>
    </div>
  );
}