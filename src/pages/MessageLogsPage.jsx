import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCampaignById, getCampaignMessages } from '../services/campaignService';
import { useToast } from '../components/layout/Toast';
import Modal from '../components/common/Modal';
import MessageThread from '../components/campaign/MessageThread';

// ─── Helpers ──────────────────────────────────────────────────
const normalizePhone = (p) => (p || '').replace(/\D/g, '');

const getRecipientName = (r) => {
  if (!r) return 'Unknown';
  return (
    r.name ||
    r['Attendee Name'] ||
    r['Name'] ||
    r['attendeeName'] ||
    r.phone ||
    '—'
  );
};

const getRecipientPhone = (r) => {
  if (!r) return '';
  return r.phone || r['Phone Number'] || r['phoneNumber'] || '';
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function MessageLogsPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // phone (normalized digits) ➔ recipient name
  const [recipientMap, setRecipientMap] = useState({});

  // ─── Pagination state ────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reply modal state
  const [replyPhone, setReplyPhone] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);

  // ─── Load campaign once to build the phone ➔ name map ──────
  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        const res = await getCampaignById(campaignId);
        const campaignData = res.data || res;
        const map = {};
        (campaignData.recipients || []).forEach((r) => {
          const key = normalizePhone(getRecipientPhone(r));
          if (key) map[key] = getRecipientName(r);
        });
        setRecipientMap(map);
      } catch (err) {
        console.error('Failed to load campaign for names:', err);
      }
    };
    if (campaignId) fetchCampaignData();
  }, [campaignId]);

  // ─── Fetch message logs (server-side direction/status filters) ──
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (directionFilter !== 'all') filters.direction = directionFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;

      const res = await getCampaignMessages(campaignId, filters);
      setLogs(res.data || res);
    } catch (err) {
      showToast('error', 'Failed to load logs', err.message);
    } finally {
      setLoading(false);
    }
  }, [campaignId, directionFilter, statusFilter, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ─── Client-side search across name + phone digits ─────────
  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;

    const qDigits = q.replace(/\D/g, '');

    return logs.filter((log) => {
      const name = (recipientMap[normalizePhone(log.phone)] || '').toLowerCase();
      if (name && name.includes(q)) return true;

      const phoneDigits = normalizePhone(log.phone);
      if (qDigits && phoneDigits.includes(qDigits)) return true;

      return false;
    });
  }, [logs, search, recipientMap]);

  // ─── Reset to page 1 whenever filters/search/pageSize change ──
  useEffect(() => {
    setCurrentPage(1);
  }, [search, directionFilter, statusFilter, pageSize]);

  // ─── Pagination slice ────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  // Guard against current page going out of range after filter narrows
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedLogs = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, safePage, pageSize]);

  const rangeStart = filteredLogs.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filteredLogs.length);

  // ─── Page-number buttons (windowed when many pages) ──────
  const pageNumbers = useMemo(() => {
    const total = totalPages;
    const current = safePage;
    const windowSize = 5;

    if (total <= windowSize + 2) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set([1, total, current]);
    for (let i = 1; i <= 2; i++) {
      if (current - i > 1) pages.add(current - i);
      if (current + i < total) pages.add(current + i);
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const withEllipsis = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        withEllipsis.push('…');
      }
      withEllipsis.push(sorted[i]);
    }
    return withEllipsis;
  }, [safePage, totalPages]);

  // ─── UI helpers ─────────────────────────────────────────────
  const statusBadge = (status) => {
    const colors = {
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          colors[status] || 'bg-gray-100 text-gray-500'
        }`}
      >
        {status || 'unknown'}
      </span>
    );
  };

  const formatTime = (dateStr) => new Date(dateStr).toLocaleString();

  const openReplyModal = (phone) => {
    setReplyPhone(phone);
    setShowReplyModal(true);
  };

  const closeReplyModal = () => {
    setShowReplyModal(false);
    setReplyPhone(null);
  };

  const goToPage = (p) => {
    if (typeof p !== 'number') return;
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center mb-4">
        <button
          onClick={() => navigate(-1)}
          className="mr-3 p-2 rounded-full hover:bg-gray-100"
          title="Go back"
        >
          <i className="fas fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-2xl font-bold">Message Logs</h1>
        <div className="ml-auto flex gap-2">
          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50"
            title="Refresh now"
          >
            <i className="fas fa-sync-alt mr-1"></i> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-56"
        />
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Directions</option>
          <option value="outgoing">Outgoing</option>
          <option value="incoming">Incoming</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm ml-auto"
          title="Rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex justify-center p-8">
          <i className="fas fa-spinner fa-pulse text-2xl text-gray-400"></i>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Recipient</th>
                  <th className="px-4 py-3 text-left">Direction</th>
                  <th className="px-4 py-3 text-left">Body</th>
                  <th className="px-4 py-3 text-left">Media</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Sent At</th>
                  <th className="px-4 py-3 text-left">Updated At</th>
                  <th className="px-4 py-3 text-left">Failure Reasons</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      {logs.length === 0
                        ? 'No logs found'
                        : 'No logs match your search'}
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {recipientMap[normalizePhone(log.phone)] ||
                            'Unknown Recipient'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {log.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            log.direction === 'incoming'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {log.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.body || '—'}</td>
                      <td className="px-4 py-3">
                        {log.mediaUrl ? (
                          <img
                            src={log.mediaUrl}
                            alt="media"
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(log.status)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatTime(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {log.updatedAt ? formatTime(log.updatedAt) : '—'}
                        {log.status === 'failed' &&
                          log.createdAt !== log.updatedAt && (
                            <span
                              className="ml-1 text-red-500"
                              title="Originally accepted, later failed"
                            >
                              <i className="fas fa-exclamation-circle"></i>
                            </span>
                          )}
                      </td>
                      <td className="px-4 py-3 text-xs text-red-600">
                        {log.failureReason || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.direction === 'incoming' && (
                          <button
                            onClick={() => openReplyModal(log.phone)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Reply
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Pagination controls ─────────────────────────── */}
          {filteredLogs.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className="text-xs text-gray-500">
                Showing <span className="font-semibold">{rangeStart}</span>–
                <span className="font-semibold">{rangeEnd}</span> of{' '}
                <span className="font-semibold">{filteredLogs.length}</span>
                {filteredLogs.length !== logs.length && (
                  <span className="text-gray-400"> (filtered from {logs.length})</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(1)}
                  disabled={safePage === 1}
                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="First page"
                >
                  <i className="fas fa-angle-double-left"></i>
                </button>
                <button
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 1}
                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <i className="fas fa-angle-left"></i>
                </button>

                {pageNumbers.map((p, i) =>
                  p === '…' ? (
                    <span key={`e-${i}`} className="px-2 text-xs text-gray-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`px-2.5 py-1 text-xs border rounded transition-colors ${
                        p === safePage
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <i className="fas fa-angle-right"></i>
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Last page"
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reply Modal */}
      <Modal
        isOpen={showReplyModal}
        onClose={closeReplyModal}
        title={`Reply to ${replyPhone || ''}`}
        size="max-w-2xl"
      >
        {replyPhone && (
          <MessageThread
            campaignId={campaignId}
            phone={replyPhone}
            showHeader={false}
          />
        )}
      </Modal>
    </div>
  );
} 
