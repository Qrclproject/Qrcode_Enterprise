import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCampaignById, getCampaignMessages } from '../services/campaignService';
import { useToast } from '../components/layout/Toast';
import Modal from '../components/common/Modal';
import MessageThread from '../components/campaign/MessageThread';

// Helper to safely extract name (same as your other page)
const getRecipientName = (r) => {
  if (!r) return 'Unknown';
  return r.name || r['Attendee Name'] || r['Name'] || r['attendeeName'] || r.phone || '—';
};

// Helper to safely extract phone
const getRecipientPhone = (r) => {
  if (!r) return '';
  return r.phone || r['Phone Number'] || r['phoneNumber'] || '';
};

export default function MessageLogsPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchPhone, setSearchPhone] = useState('');

  // 👇 NEW: State to hold the phone-to-name mapping
  const [recipientMap, setRecipientMap] = useState({});

  // Reply modal state
  const [replyPhone, setReplyPhone] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);

  // 👇 NEW: Fetch campaign data to build the phone ➔ name map
  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        const res = await getCampaignById(campaignId);
        const campaignData = res.data || res;
        const map = {};
        (campaignData.recipients || []).forEach(r => {
          const phone = getRecipientPhone(r);
          if (phone) {
            map[phone] = getRecipientName(r);
          }
        });
        setRecipientMap(map);
      } catch (err) {
        console.error("Failed to load campaign for names:", err);
        // Don't show a toast here, just silently fallback to phone numbers
      }
    };
    if (campaignId) fetchCampaignData();
  }, [campaignId]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (directionFilter !== 'all') filters.direction = directionFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (searchPhone.trim()) filters.phone = searchPhone.trim();

      const res = await getCampaignMessages(campaignId, filters);
      setLogs(res.data || res);
    } catch (err) {
      showToast('error', 'Failed to load logs', err.message);
    } finally {
      setLoading(false);
    }
  }, [campaignId, directionFilter, statusFilter, searchPhone, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const statusBadge = (status) => {
    const colors = {
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-500'}`}>{status || 'unknown'}</span>;
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
          placeholder="Filter by phone"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-48"
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
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex justify-center p-8">
          <i className="fas fa-spinner fa-pulse text-2xl text-gray-400"></i>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {/* 👇 UPDATED HEADER */}
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
              {logs.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-6 text-center text-gray-400">No logs found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    {/* 👇 UPDATED CELL: Show name + phone */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {recipientMap[log.phone] || 'Unknown Recipient'}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{log.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        log.direction === 'incoming' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {log.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.body || '—'}</td>
                    <td className="px-4 py-3">
                      {log.mediaUrl ? (
                        <img src={log.mediaUrl} alt="media" className="w-10 h-10 object-cover rounded" />
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">{statusBadge(log.status)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {log.updatedAt ? formatTime(log.updatedAt) : '—'}
                      {log.status === 'failed' && log.createdAt !== log.updatedAt && (
                        <span className="ml-1 text-red-500" title="Originally accepted, later failed">
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
