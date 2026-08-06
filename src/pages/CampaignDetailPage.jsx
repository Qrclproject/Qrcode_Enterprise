// src/pages/CampaignDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../components/layout/Toast';
import { getCampaignById } from '../services/campaignService';

export default function CampaignDetailPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await getCampaignById(campaignId);
        setCampaign(res.data || res);
      } catch (err) {
        showToast('error', 'Failed to load campaign', err.message);
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [campaignId, navigate, showToast]);

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

  // Filter recipients
  let recipients = campaign.recipients || [];
  if (statusFilter !== 'all') {
    recipients = recipients.filter(r => r.status === statusFilter);
  }
  if (search) {
    const s = search.toLowerCase();
    recipients = recipients.filter(r =>
      (r.name && r.name.toLowerCase().includes(s)) ||
      (r.phone && r.phone.toLowerCase().includes(s))
    );
  }

  // Helper to display status badge
  const statusBadge = (status) => {
    const colors = {
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>;
  };

  // Check-in status
  const checkInBadge = (checkedIn) => {
    return checkedIn
      ? <span className="text-xs text-green-600"><i className="fas fa-check-circle"></i> Checked In</span>
      : <span className="text-xs text-gray-400"><i className="fas fa-circle"></i> Not checked</span>;
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
              <i className="fas fa-envelope-open-text text-orange-500"></i> {campaign.name}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {campaign.recipients?.length || 0} recipients · {campaign.status} · Created {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
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
            Showing {recipients.length} of {campaign.recipients?.length || 0}
          </div>
        </div>

        {/* Table */}
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
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-400 text-sm">
                    No recipients found.
                  </td>
                </tr>
              ) : (
                recipients.map((r, idx) => (
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

        {/* Optional: Show failure reasons for failed messages */}
        {recipients.some(r => r.status === 'failed') && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <h4 className="text-xs font-semibold text-red-600 mb-1">Failed messages</h4>
            {recipients.filter(r => r.status === 'failed').map((r, idx) => (
              <div key={idx} className="text-xs text-red-500 py-0.5">
                {r.phone}: {r.failureReason || 'Unknown error'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}