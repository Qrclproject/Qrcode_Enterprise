import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CampaignList from '../components/campaign/CampaignList';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { useToast } from '../components/layout/Toast';
import {
  getCampaignHistory,
  deleteCampaign,
  retryFailedMessages,
  launchCampaign,
  deleteAllCampaigns, // 👈 import
} from '../services/campaignService';

// ─── helpers ──────────────────────────────────────────────────────
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
      fetchCampaigns();
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
      fetchCampaigns();
    } catch (err) {
      showToast('error', 'Delete all failed', err.response?.data?.message || err.message);
    }
    setDeleteAllModalOpen(false);
  };

  // ─── Retry functions ──────────────────────────────────────────
  const retrySingle = async (campaignId, index) => {
    try {
      await retryFailedMessages(campaignId);
      showToast('success', 'Retry started', 'Resending all failed messages...');
      fetchCampaigns();
    } catch (err) {
      showToast('error', 'Retry failed', err.message);
    }
  };

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
      await launchCampaign(selectedCampaign._id);
      showToast('success', 'Resend Initiated', 'Campaign restarted with new settings.');
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

  // ─── Stats ────────────────────────────────────────────────────
  const statTotal = totalCount;
  const statDelivered = campaigns.filter(c => c.status === 'completed').length;
  const statFailed = campaigns.filter(c => c.status === 'failed').length;
  const statScheduled = campaigns.filter(c => c.status === 'scheduled').length;

  // ─── Prepare page data ─────────────────────────────────────
  const pageData = campaigns; // already paginated

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
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* header & filters */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
              <i className="fas fa-history text-orange-500"></i> Sent History
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">View, edit batch settings, retry failures, and resend campaigns with full control.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-56 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
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
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                <i className="fas fa-trash-alt mr-1"></i> Delete All
              </button>
            )}
          </div>
        </div>

        {/* main table */}
        <CampaignList
          campaigns={pageData}
          onEdit={openEditModal}
          onDelete={(id) => {
            const campaign = campaigns.find(c => c._id === id);
            setSelectedCampaign(campaign);
            setDeleteModalOpen(true);
          }}
        />

        {/* pagination */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t rounded-b-xl text-xs text-gray-500">
          <span>
            Page {page} of {totalPages} (total {totalCount} campaigns)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border border-gray-200 rounded bg-white hover:bg-gray-100 disabled:opacity-40 transition"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="font-medium">{page}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-gray-200 rounded bg-white hover:bg-gray-100 disabled:opacity-40 transition"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        {/* stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard label="Total Campaigns" value={statTotal} />
          <StatsCard label="Delivered" value={statDelivered} color="green" />
          <StatsCard label="Failed" value={statFailed} color="red" />
          <StatsCard label="Scheduled" value={statScheduled} color="orange" />
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
                      <tr><th className="py-1">Phone</th><th className="py-1">Reason</th><th className="py-1 text-right">Action</th></tr>
                    </thead>
                    <tbody>
                      {selectedCampaign.recipients?.filter(r => r.status === 'failed').map((r, idx) => (
                        <tr key={idx} className="border-b border-red-100">
                          <td className="py-1">{r.phone}</td>
                          <td className="py-1 text-red-500">{r.failureReason || 'Unknown'}</td>
                          <td className="py-1 text-right">
                            <button onClick={() => retrySingle(selectedCampaign._id, idx)} className="text-red-600 hover:underline text-xs">Retry</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={retryAllFailed} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition">Retry All Failed</button>
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

// ─── helper sub‑components ─────────────────────────────────────
function StatsCard({ label, value, color = 'gray' }) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    gray: 'bg-white border-gray-200 text-gray-800',
  };
  return <div className={`rounded-xl border p-4 text-center ${colorClasses[color] || colorClasses.gray}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>;
}

function StatBox({ label, value, color = 'gray' }) {
  const colorMap = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-gray-50 text-gray-800',
  };
  return <div className={`rounded-lg p-3 text-center ${colorMap[color] || colorMap.gray}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-xl font-bold">{value}</p>
  </div>;
}

function generateSampleMessage(campaign) {
  if (campaign.templateKey === 'tpl1') {
    return `<p>Hello <strong>John Doe</strong> <i class="fas fa-hand-sparkles text-orange-500"></i><br><br>Here is your entry pass for "<strong>${campaign.name?.replace(' Passes', '') || campaign.name}</strong>".<br><br>Please present your QR code at the gate.<br><br>See you there!</p>`;
  }
  return `<p>Hi <strong>John Doe</strong>, your pass for ${campaign.name} is attached.</p>`;
}