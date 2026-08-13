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
} from '../services/campaignService';

// ─── Helper functions ─────────────────────────────────────────────
const formatWaitDisplay = (value, unit) => {
  const abbr = { seconds: 'sec', minutes: 'min', hours: 'hr', days: 'day(s)' };
  return `${value} ${abbr[unit] || unit}`;
};

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

const getWaitSeconds = (value, unit) => {
  const v = parseInt(value) || 1;
  switch (unit) {
    case 'seconds': return v;
    case 'minutes': return v * 60;
    case 'hours': return v * 3600;
    case 'days': return v * 86400;
    default: return v * 60;
  }
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
  const itemsPerPage = 5;

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [editBatchSize, setEditBatchSize] = useState(10);
  const [editWaitValue, setEditWaitValue] = useState(5);
  const [editWaitUnit, setEditWaitUnit] = useState('minutes');

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

  // ─── Retry functions ──────────────────────────────────────────
  const retryAllFailed = async () => {
    if (!selectedCampaign) return;
    try {
      await retryFailedMessages(selectedCampaign._id);
      showToast('success', 'Retry started', 'Retrying all failed messages...');
      fetchCampaigns();
    } catch (err) {
      showToast('error', 'Retry failed', err.message);
    }
  };

  // ─── Resend with new settings ─────────────────────────────────
  const applyAndResend = async () => {
    if (!selectedCampaign) return;
    try {
      // Note: Current backend launch endpoint does not update batch settings.
      // To fully support editing batch settings, a backend update endpoint would be needed.
      await launchCampaign(selectedCampaign._id);
      showToast('success', 'Resend Initiated', 'Campaign restarted.');
      fetchCampaigns();
    } catch (err) {
      showToast('error', 'Resend failed', err.message);
    }
    closeEditModal();
  };

  // ─── Edit modal ───────────────────────────────────────────────
  const openEditModal = (campaignId) => {
    const campaign = campaigns.find(c => c._id === campaignId);
    if (!campaign) return;
    setSelectedCampaign(campaign);
    setEditBatchSize(campaign.batchSize || 10);
    setEditWaitValue(campaign.waitValue || 5);
    setEditWaitUnit(campaign.waitUnit || 'minutes');
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedCampaign(null);
  };

  const openInCampaignBuilder = () => {
    if (!selectedCampaign) return;
    navigate('/', { state: { campaignToLoad: selectedCampaign } });
    closeEditModal();
  };

  // ─── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────
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
              View, edit batch settings, retry failures, and resend campaigns with full control.
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
                              onClick={() => openEditModal(c._id)}
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

      {/* ========== Edit / Resend Modal ========== */}
      {selectedCampaign && (
        <Modal isOpen={editModalOpen} onClose={closeEditModal} title="Edit Campaign" size="max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatBox label="Total Recipients" value={selectedCampaign.recipients?.length || 0} />
            <StatBox label="Delivered" value={selectedCampaign.delivered || 0} color="green" />
            <StatBox label="Failed" value={selectedCampaign.failed || 0} color="red" />
            <StatBox label="Variants Used" value={selectedCampaign.activeVariants?.length || 1} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Batch Settings */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <i className="fas fa-bolt text-orange-500"></i> Batch Scheduling
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-500 w-32">Messages Per Batch:</label>
                  <input
                    type="number"
                    value={editBatchSize}
                    onChange={(e) => setEditBatchSize(Number(e.target.value))}
                    min="1" max="500"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-500 w-32">Wait Between:</label>
                  <input
                    type="number"
                    value={editWaitValue}
                    onChange={(e) => setEditWaitValue(Number(e.target.value))}
                    min="1" max="999"
                    className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                  />
                  <select
                    value={editWaitUnit}
                    onChange={(e) => setEditWaitUnit(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
                <div className="bg-white rounded-lg p-2.5 text-xs space-y-1">
                  <div className="flex justify-between"><span>Batches:</span> <strong>{Math.ceil((selectedCampaign.recipients?.length || 0) / Math.max(1, editBatchSize))}</strong></div>
                  <div className="flex justify-between"><span>Wait Per Batch:</span> <strong>{formatWaitDisplay(editWaitValue, editWaitUnit)}</strong></div>
                  <div className="flex justify-between text-emerald-700"><span>Total Est. Time:</span> <strong>{formatDuration((Math.ceil((selectedCampaign.recipients?.length || 0) / Math.max(1, editBatchSize)) - 1) * getWaitSeconds(editWaitValue, editWaitUnit))}</strong></div>
                </div>
                <div className="bg-white rounded-lg border p-2 max-h-40 overflow-y-auto">
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Batch Preview</h4>
                  <div className="text-[9px] space-y-0.5">
                    {Array.from({ length: Math.min(Math.ceil((selectedCampaign.recipients?.length || 0) / Math.max(1, editBatchSize)), 10) }, (_, i) => {
                      const s = i * editBatchSize + 1;
                      const e = Math.min((i + 1) * editBatchSize, selectedCampaign.recipients?.length || 0);
                      const label = i === 0 ? 'Starts immediately' : `After ${formatDuration(i * getWaitSeconds(editWaitValue, editWaitUnit))}`;
                      return (
                        <div key={i} className="flex justify-between py-0.5 border-b border-gray-100">
                          <span className="font-medium">Batch {i + 1}</span>
                          <span>{s}–{e}</span>
                          <span className="text-gray-400">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Failed Recipients */}
            {selectedCampaign.failed > 0 && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <i className="fas fa-times-circle"></i> Failed Recipients
                </h3>
                <div className="max-h-48 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="text-red-500 border-b border-red-200">
                      <tr><th className="py-1">Phone</th><th className="py-1">Reason</th></tr>
                    </thead>
                    <tbody>
                      {selectedCampaign.recipients?.filter(r => r.status === 'failed').map((r, idx) => (
                        <tr key={idx} className="border-b border-red-100">
                          <td className="py-1">{r.phone}</td>
                          <td className="py-1 text-red-500">{r.failureReason || 'Unknown'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={retryAllFailed} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 transition">
                    Retry All Failed
                  </button>
                  <span className="text-xs text-red-500 self-center">{selectedCampaign.failed} remaining</span>
                </div>
              </div>
            )}
          </div>

          {/* Variants Used */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <i className="fas fa-comment-dots text-orange-500"></i> Message Variants Used
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedCampaign.variants?.map((v, idx) => {
                const isActive = selectedCampaign.activeVariants?.includes(idx);
                return (
                  <span key={idx} className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${isActive ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-gray-100 text-gray-400 border border-gray-200 line-through'}`}>
                    {v}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Sample Message */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <i className="fas fa-eye text-orange-500"></i> Sample Message
            </h3>
            <div className="bg-white p-3 rounded-lg border text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: generateSampleMessage(selectedCampaign) }} />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-3 border-t">
            <button onClick={openInCampaignBuilder} className="text-orange-600 border border-orange-200 px-4 py-2 rounded-lg text-xs font-medium hover:bg-orange-50 transition flex items-center gap-2">
              <i className="fas fa-external-link-alt"></i> Open in Campaign Builder
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeEditModal}>Cancel</Button>
              <Button variant="primary" icon="paper-plane" onClick={applyAndResend}>Resend with New Settings</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation (single) */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Campaign?">
        <p className="text-sm text-gray-500 mt-2">This will permanently delete the campaign and all associated QR images from Cloudinary. This action cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>

      {/* Delete ALL Confirmation */}
      <Modal isOpen={deleteAllModalOpen} onClose={() => setDeleteAllModalOpen(false)} title="Delete ALL Campaigns?">
        <p className="text-sm text-gray-500 mt-2">
          This will permanently delete <strong>all campaigns</strong> and all associated QR images from Cloudinary.
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

// ─── Helper sub‑components ─────────────────────────────────────
function StatBox({ label, value, color = 'gray' }) {
  const colorMap = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-gray-50 text-gray-800',
  };
  return (
    <div className={`rounded-lg p-3 text-center ${colorMap[color] || colorMap.gray}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function generateSampleMessage(campaign) {
  if (campaign.templateKey === 'tpl1') {
    return `<p>Hello <strong>John Doe</strong> <i class="fas fa-hand-sparkles text-orange-500"></i><br><br>Here is your entry pass for "<strong>${campaign.name?.replace(' Passes', '') || campaign.name}</strong>".<br><br>Please present your QR code at the gate.<br><br>See you there!</p>`;
  }
  return `<p>Hi <strong>John Doe</strong>, your pass for ${campaign.name} is attached.</p>`;
}