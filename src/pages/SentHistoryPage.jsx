import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { useToast } from '../components/layout/Toast';
import {
  getCampaignHistory,
  deleteCampaign,
  retryFailedMessages,
  launchCampaign,
  deleteAllCampaigns,
  renameCampaign,
} from '../services/campaignService';

// ─── Helper functions ─────────────────────────────────────────────
const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.round((seconds % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
};

// ─── Improved Stat Card with icon ────────────────────────────────
function StatsCard({ label, value, icon, color = 'gray' }) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-white text-gray-800 border-gray-200',
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorClasses[color] || colorClasses.gray}`}>
      <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
        <i className={`fas ${icon} text-lg`}></i>
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

// ─── Status badge component ──────────────────────────────────────
function StatusBadge({ status }) {
  const statusMap = {
    completed: 'bg-green-100 text-green-700',
    delivered: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
    sending: 'bg-yellow-100 text-yellow-700',
    draft: 'bg-gray-100 text-gray-600',
  };
  const label = status === 'completed' ? 'Delivered' : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusMap[status] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

export default function SentHistoryPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 30;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Rename modal state
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameCampaignId, setRenameCampaignId] = useState(null);
  const [newCampaignName, setNewCampaignName] = useState('');

  const showToast = useToast();

  const handleView = (campaignId) => {
    navigate(`/campaigns/${campaignId}`);
  };

  // ─── Fetch campaigns ──────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: itemsPerPage };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search;

      const res = await getCampaignHistory(params);
      const data = res.data || res;
      setCampaigns(data.campaigns || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      showToast('error', 'Failed to load history', err.response?.data?.message || err.message);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, showToast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // ─── Delete single campaign ──────────────────────────────────
  const confirmDelete = async () => {
    if (!selectedCampaign) return;
    try {
      await deleteCampaign(selectedCampaign._id);
      showToast('success', 'Deleted', `"${selectedCampaign.name}" removed.`);
      await fetchCampaigns();
    } catch (err) {
      showToast('error', 'Delete failed', err.response?.data?.message || err.message);
    }
    setDeleteModalOpen(false);
    setSelectedCampaign(null);
  };

  // ─── Delete ALL campaigns ────────────────────────────────────
  const confirmDeleteAll = async () => {
    try {
      await deleteAllCampaigns();
      showToast('success', 'All Deleted', 'All campaigns and QR images have been removed.');
      setPage(1);
      setTimeout(() => {
        fetchCampaigns();
      }, 100);
    } catch (err) {
      showToast('error', 'Delete all failed', err.response?.data?.message || err.message);
    }
    setDeleteAllModalOpen(false);
  };

  // ─── Retry failed messages ─────────────────────────────────────
  const retryAllFailed = async (campaign) => {
    try {
      await retryFailedMessages(campaign._id);
      showToast('success', 'Retry started', 'Retrying all failed messages...');
      fetchCampaigns();
    } catch (err) {
      showToast('error', 'Retry failed', err.message);
    }
  };

  // ─── Open campaign in builder for editing ──────────────────────
  const openInCampaignBuilder = (campaign) => {
    navigate('/', { state: { campaignToLoad: campaign } });
  };

  // ─── Rename functions ─────────────────────────────────────────
  const openRenameModal = (campaign) => {
    setRenameCampaignId(campaign._id);
    setNewCampaignName(campaign.name);
    setRenameModalOpen(true);
  };

  const confirmRename = async () => {
    if (!newCampaignName.trim()) {
      showToast('warning', 'Name required', 'Please enter a campaign name.');
      return;
    }
    try {
      await renameCampaign(renameCampaignId, newCampaignName);
      showToast('success', 'Renamed', 'Campaign name updated.');
      fetchCampaigns();
    } catch (err) {
      showToast('error', 'Rename failed', err.response?.data?.message || err.message);
    }
    setRenameModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Filters */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3">
              <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                <i className="fas fa-history"></i>
              </span>
              Sent History
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View, edit, retry failures, and resend campaigns with full control.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2 text-xs w-56 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
            >
              <option value="all">All Status</option>
              <option value="completed">Delivered</option>
              <option value="scheduled">Scheduled</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {totalCount > 0 && (
              <button
                onClick={() => setDeleteAllModalOpen(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <i className="fas fa-trash-alt mr-1"></i> Delete All
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Campaigns" value={totalCount} icon="fa-inbox" color="blue" />
          <StatsCard label="Delivered" value={campaigns.filter(c => c.status === 'completed').length} icon="fa-check-circle" color="green" />
          <StatsCard label="Failed" value={campaigns.filter(c => c.status === 'failed').length} icon="fa-exclamation-circle" color="red" />
          <StatsCard label="Scheduled" value={campaigns.filter(c => c.status === 'scheduled').length} icon="fa-clock" color="orange" />
        </div>

        {/* Campaign Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                <tr>
                  <th className="px-5 py-3">Campaign</th>
                  <th className="px-5 py-3">Template</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Recipients</th>
                  <th className="px-5 py-3">Delivered</th>
                  <th className="px-5 py-3">Failed</th>
                  <th className="px-5 py-3">Success Rate</th>
                  <th className="px-5 py-3">Batch Info</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-5 py-8 text-center text-gray-400">
                      No campaigns found.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => {
                    const recipCount = Array.isArray(c.recipients) ? c.recipients.length : c.recipients || 0;
                    const delivered = c.delivered || 0;
                    const failed = c.failed || 0;
                    const successRate = recipCount > 0 ? Math.round((delivered / recipCount) * 100) : 0;
                    const batchInfo = `${c.batchSize || '?'} msgs · ${c.waitValue || '?'} ${c.waitUnit || 'min'}`;

                    return (
                      <tr key={c._id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4 font-medium">{c.name}</td>
                        <td className="px-5 py-4 text-gray-600">{c.templateName || c.template || '—'}</td>
                        <td className="px-5 py-4 text-gray-500 text-xs">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">{recipCount}</td>
                        <td className="px-5 py-4 text-green-600 font-medium">{delivered}</td>
                        <td className="px-5 py-4 text-red-600 font-medium">{failed}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${successRate >= 80 ? 'bg-green-500' : successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${successRate}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">{successRate}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">{batchInfo}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openRenameModal(c)}
                              className="text-gray-400 hover:text-orange-600"
                              title="Rename campaign"
                            >
                              <i className="fas fa-pen"></i>
                            </button>
                            <button
                              onClick={() => openInCampaignBuilder(c)}
                              className="text-gray-400 hover:text-indigo-600"
                              title="Edit & Resend"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleView(c._id)}
                              className="text-gray-400 hover:text-blue-600"
                              title="View details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCampaign(c);
                                setDeleteModalOpen(true);
                              }}
                              className="text-gray-400 hover:text-red-500"
                              title="Delete"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border rounded-b-xl text-xs text-gray-500">
          <span>
            Page {page} of {totalPages} (total {totalCount} campaigns)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40 transition"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="font-medium">{page}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40 transition"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* ========== Rename Modal ========== */}
      <Modal isOpen={renameModalOpen} onClose={() => setRenameModalOpen(false)} title="Rename Campaign">
        <div className="space-y-3">
          <input
            type="text"
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            placeholder="Enter new campaign name"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenameModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmRename}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation (single) */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Campaign?">
        <p className="text-sm text-gray-500 mt-2">This will permanently delete the campaign and all associated QR images from MinIO. This action cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>

      {/* Delete ALL Confirmation */}
      <Modal isOpen={deleteAllModalOpen} onClose={() => setDeleteAllModalOpen(false)} title="Delete ALL Campaigns?">
        <p className="text-sm text-gray-500 mt-2">
          This will permanently delete <strong>all campaigns</strong> and all associated QR images from MinIO.
          This action is <span className="text-red-600 font-bold">irreversible</span> and cannot be undone.
        </p>
        <p className="text-xs text-gray-400 mt-2">{totalCount} campaign(s) will be deleted.</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setDeleteAllModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteAll}>Delete All</Button>
        </div>
      </Modal>
    </div>
  );
}