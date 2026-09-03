import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../components/layout/Toast';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import MessageThread from '../components/campaign/MessageThread';
import {
  getCampaignById,
  retryFailedMessages,
  resetRecipientCheckIn,
  getCampaignMessages,
} from '../services/campaignService';
import { getTemplateById } from '../services/templateService';
import { normalizePhone } from '../utils/formatters';

// ─── Small stat card (memoized) ─────────────────────────────────
const StatBadge = memo(({ label, value, color = 'gray', icon, subtitle }) => {
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
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
});

// ─── Recipient Details Modal (memoized) ─────────────────────────
const RecipientDetailModal = memo(({ recipient, onClose }) => {
  if (!recipient) return null;

  const fields = Object.entries(recipient).filter(
    ([key]) => !['_id', 'qrUrl'].includes(key)
  );

  return (
    <Modal isOpen={!!recipient} onClose={onClose} title="Recipient Details" size="max-w-md">
      <div className="space-y-4">
        {recipient.qrUrl && (
          <div className="flex justify-center">
            <img
              src={recipient.qrUrl}
              alt="QR Code"
              className="w-32 h-32 object-contain border rounded-lg"
            />
          </div>
        )}

        <div className="space-y-2">
          {fields.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4 py-1 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 capitalize">{key}</span>
              <span className="text-xs text-gray-800 text-right break-all">
                {String(value ?? '—')}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default function CampaignDetailPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [campaign, setCampaign] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [retrying, setRetrying] = useState(false);
  const [resettingId, setResettingId] = useState(null);

  // ─── Manual send state ───────────────────────────────────────
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [detailRecipient, setDetailRecipient] = useState(null);

  // ─── State for message thread modal ─────────────────────────
  const [messageRecipient, setMessageRecipient] = useState(null);

  // ─── Unread indicators ─────────────────────────────────────
  const baselineMessageIdsRef = useRef(new Set());
  const openedThreadPhonesRef = useRef(new Set());
  const [newMessagePhones, setNewMessagePhones] = useState(new Set());

  const isModalOpen = !!messageRecipient || !!detailRecipient;

  // Fetch campaign details
  const fetchCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCampaignById(campaignId);
      const campaignData = res.data || res;
      setCampaign(campaignData);

      if (campaignData.templateId) {
        const tplRes = await getTemplateById(campaignData.templateId);
        setTemplate(tplRes.data?.data || tplRes.data || tplRes);
      }
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

  // Poll for new incoming messages (detect unread)
  const fetchNewMessages = useCallback(async () => {
    if (document.visibilityState === 'hidden' || isModalOpen) return;
    try {
      const data = await getCampaignMessages(campaignId);
      const messages = data.data || data;
      const currentIds = new Set(messages.map(m => m._id || m.whatsappMessageId));

      if (baselineMessageIdsRef.current.size === 0) {
        baselineMessageIdsRef.current = currentIds;
        return;
      }

      const newIncomingPhones = new Set();
      for (const msg of messages) {
        const msgId = msg._id || msg.whatsappMessageId;
        if (!baselineMessageIdsRef.current.has(msgId) && msg.direction === 'incoming') {
          const phone = msg.phone;
          if (!openedThreadPhonesRef.current.has(phone)) {
            newIncomingPhones.add(phone);
          }
        }
      }

      if (newIncomingPhones.size > 0) {
        setNewMessagePhones(prev => new Set([...prev, ...newIncomingPhones]));
      }

      baselineMessageIdsRef.current = currentIds;
    } catch (err) {
      console.error('Failed to fetch new messages:', err);
    }
  }, [campaignId, isModalOpen]);

  useEffect(() => {
    if (!campaignId) return;
    fetchNewMessages();
    const interval = setInterval(fetchNewMessages, 60000); // 60 seconds
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchNewMessages();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [campaignId, fetchNewMessages]);

  const handleOpenMessages = (recipient) => {
    const phone = normalizePhone(recipient.phone);
    setMessageRecipient(recipient);
    setNewMessagePhones(prev => {
      const next = new Set(prev);
      next.delete(phone);
      return next;
    });
    openedThreadPhonesRef.current.add(phone);
  };

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
      await fetchCampaign();
    } catch (err) {
      showToast('error', 'Retry failed', err.message);
    } finally {
      setRetrying(false);
    }
  };

  const handleResetCheckIn = async (recipient) => {
    const identifier = recipient._id || recipient.phone;
    if (!identifier) {
      showToast('error', 'Invalid recipient', 'Cannot identify recipient.');
      return;
    }
    if (!window.confirm('Reactivate this QR code? The attendee will be able to scan again.')) return;
    setResettingId(identifier);
    try {
      await resetRecipientCheckIn(campaignId, identifier);
      showToast('success', 'QR Reactivated', 'This recipient can now check in again.');
      await fetchCampaign();
    } catch (err) {
      showToast('error', 'Reset failed', err.message);
    } finally {
      setResettingId(null);
    }
  };

  const openWhatsAppForRecipient = (phone, recipientData = null) => {
    const normalizedPhone = normalizePhone(phone).replace(/^\+/, '');

    let messageBody = '';
    if (template && template.variants && template.variants.length > 0) {
      const activeIndex = (campaign.activeVariants && campaign.activeVariants[0]) || 0;
      const variant = template.variants[activeIndex] || template.variants[0];
      messageBody = variant.body || '';
    }

    if (recipientData) {
      const mapping = campaign.mapping || {};
      messageBody = messageBody.replace(/\{\{(\d+)\}\}/g, (match, num) => {
        const columnName = mapping[num] || mapping[String(num)];
        if (columnName && recipientData[columnName] !== undefined) {
          return recipientData[columnName] || '';
        }
        return match;
      });
    }

    let finalMessage = '';
    const imageUrl = recipientData?.qrUrl || campaign.headerImageUrl || '';
    if (imageUrl && campaign.includeHeaderImage) {
      finalMessage = `${imageUrl}\n\n${messageBody}`;
    } else {
      finalMessage = messageBody;
    }

    const encodedMessage = encodeURIComponent(finalMessage);
    const waLink = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
    window.open(waLink, '_blank');
  };

  const handleOpenWhatsAppManual = () => {
    if (!selectedRecipientId) {
      showToast('warning', 'No recipient selected', 'Please choose a recipient from the dropdown.');
      return;
    }
    const recipient = campaign.recipients?.find(
      r => (r._id || r.phone) === selectedRecipientId
    );
    if (recipient) {
      openWhatsAppForRecipient(recipient.phone, recipient);
    }
  };

  const exportCSV = () => {
    if (!campaign?.recipients?.length) {
      showToast('warning', 'No data', 'No recipients to export.');
      return;
    }
    const headers = ['Attendee Name', 'Phone', 'Status', 'Checked In', 'QR URL'];
    const rows = campaign.recipients.map(r => [
      r.name || '',
      r.phone || '',
      r.status || '',
      r.checkedIn ? 'Yes' : 'No',
      r.qrUrl || ''
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${campaign.name || 'campaign'}_recipients.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-orange-50/30">
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

  const recipients = campaign.recipients || [];
  const total = recipients.length;
  const sent = recipients.filter(r => r.status === 'sent').length;
  const failed = recipients.filter(r => r.status === 'failed').length;
  const pending = recipients.filter(r => r.status === 'pending').length;
  const checkedIn = recipients.filter(r => r.checkedIn).length;
  const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 0;

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

  const selectedManualRecipient = recipients.find(r => (r._id || r.phone) === selectedRecipientId);

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3">
              <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                <i className="fas fa-envelope-open-text"></i>
              </span>
              {campaign.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} recipients · Created {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon="user-plus"
              onClick={() => navigate(`/campaigns/${campaignId}/add-recipients`)}
            >
              Add Recipients
            </Button>
            <Button variant="outline" onClick={exportCSV} icon="download">
              Export CSV
            </Button>
            <Button
              variant="outline"
              icon="list"
              onClick={() => navigate(`/campaigns/${campaignId}/logs`)}
            >
              View Logs
            </Button>
            <Button variant="primary" onClick={() => navigate(`/check-in/${campaignId}`)} icon="qrcode">
              Check-In
            </Button>
            <button
              onClick={fetchCampaign}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              title="Refresh"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Manual Send Section with Dropdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Send Manual Message via WhatsApp</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
              className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none bg-white"
            >
              <option value="">-- Select Recipient --</option>
              {recipients.map(r => (
                <option key={r._id || r.phone} value={r._id || r.phone}>
                  {r.name || 'Unknown'} ({normalizePhone(r.phone)})
                </option>
              ))}
            </select>
            <Button variant="primary" onClick={handleOpenWhatsAppManual}>
              <i className="fas fa-external-link-alt mr-1"></i> Send via WhatsApp
            </Button>
          </div>

          {selectedManualRecipient && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-2">Selected Recipient Details:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-gray-500">Attendee Name:</span>
                <span className="font-medium">{selectedManualRecipient.name || '—'}</span>
                <span className="text-gray-500">Phone:</span>
                <span className="font-medium">{normalizePhone(selectedManualRecipient.phone)}</span>
                <span className="text-gray-500">Status:</span>
                <span>{statusBadge(selectedManualRecipient.status)}</span>
                <span className="text-gray-500">Check‑In:</span>
                <span>{checkInBadge(selectedManualRecipient.checkedIn)}</span>
                {selectedManualRecipient.qrUrl && (
                  <>
                    <span className="text-gray-500">QR Code:</span>
                    <span>
                      <img src={selectedManualRecipient.qrUrl} alt="QR" className="w-12 h-12 object-contain border rounded" />
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatBadge label="Total" value={total} color="gray" icon="fa-users" />
          <StatBadge label="Sent" value={sent} color="green" icon="fa-check-circle" />
          <StatBadge label="Failed" value={failed} color="red" icon="fa-exclamation-circle" />
          <StatBadge label="Pending" value={pending} color="orange" icon="fa-clock" />
          <StatBadge label="Checked In" value={checkedIn} color="blue" icon="fa-qrcode" subtitle={`${total > 0 ? Math.round((checkedIn / total) * 100) : 0}%`} />
        </div>

        {/* Delivery Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Delivery Progress</span>
            <span className="text-sm font-bold text-gray-800">{deliveryRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                deliveryRate >= 80 ? 'bg-green-500' : deliveryRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${deliveryRate}%` }}
            ></div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:border-orange-500 outline-none bg-white"
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
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-white"
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
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecipients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-gray-400 text-sm">
                    No recipients found.
                  </td>
                </tr>
              ) : (
                filteredRecipients.map((r, idx) => {
                  const phoneNormalized = normalizePhone(r.phone);
                  const hasNew = newMessagePhones.has(phoneNormalized);
                  return (
                    <tr key={r._id || idx} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{r.name || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailRecipient(r)}
                          className="font-mono text-xs text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline"
                          title="View details"
                        >
                          {phoneNormalized}
                        </button>
                      </td>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openWhatsAppForRecipient(r.phone, r)}
                            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 transition"
                            title="Send message via WhatsApp"
                          >
                            <i className="fab fa-whatsapp mr-1"></i> Send
                          </button>
                          <button
                            onClick={() => handleOpenMessages(r)}
                            className="relative text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200 transition"
                            title="View customer responses"
                          >
                            <i className="fas fa-comments mr-1"></i> Messages
                            {hasNew && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                          </button>
                          {r.checkedIn && (
                            <button
                              onClick={() => handleResetCheckIn(r)}
                              disabled={resettingId === (r._id || r.phone)}
                              className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-200 transition disabled:opacity-50"
                            >
                              {resettingId === (r._id || r.phone) ? (
                                <><i className="fas fa-spinner fa-spin mr-1"></i>Resetting...</>
                              ) : (
                                <><i className="fas fa-undo-alt mr-1"></i>Reset</>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                      {r.name || 'Unknown'} <span className="text-gray-400">({normalizePhone(r.phone)})</span>
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Reason: {r.failureReason || 'Unknown error'}
                    </p>
                  </div>
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

        {/* Recipient Detail Modal */}
        <RecipientDetailModal
          recipient={detailRecipient}
          onClose={() => setDetailRecipient(null)}
        />

        {/* Message Thread Modal */}
        <Modal
          isOpen={!!messageRecipient}
          onClose={() => setMessageRecipient(null)}
          title={`Conversation with ${messageRecipient?.name || 'Unknown'} (${messageRecipient ? normalizePhone(messageRecipient.phone) : ''})`}
          size="max-w-2xl"
        >
          {messageRecipient && (
            <MessageThread
              campaignId={campaignId}
              phone={normalizePhone(messageRecipient.phone)}
              showHeader={false}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}