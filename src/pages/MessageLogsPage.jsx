import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getCampaignMessages } from '../services/campaignService';
import { useToast } from '../components/layout/Toast';

export default function MessageLogsPage() {
  const { campaignId } = useParams();
  const showToast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchPhone, setSearchPhone] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

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
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 10000); // refresh every 10 seconds
    }
    return () => clearInterval(interval);
  }, [fetchLogs, autoRefresh]);

  const statusBadge = (status) => {
    const colors = {
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-500'}`}>{status || 'unknown'}</span>;
  };

  const formatTime = (dateStr) => new Date(dateStr).toLocaleString();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Message Logs</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50"
            title="Refresh now"
          >
            <i className="fas fa-sync-alt mr-1"></i> Refresh
          </button>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto‑refresh
          </label>
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
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Direction</th>
                <th className="px-4 py-3 text-left">Body</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Sent At</th>
                <th className="px-4 py-3 text-left">Updated At</th>
                <th className="px-4 py-3 text-left">Failure Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-6 text-center text-gray-400">No logs found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{log.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        log.direction === 'incoming' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {log.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.body || '—'}</td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}