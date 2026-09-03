import { useState, useEffect } from 'react';
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

  const fetchLogs = async () => {
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
  };

  useEffect(() => {
    fetchLogs();
  }, [campaignId, directionFilter, statusFilter, searchPhone]);

  const statusBadge = (status) => {
    const colors = {
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-500'}`}>{status || 'unknown'}</span>;
  };

  if (loading) return <div className="flex justify-center p-8"><i className="fas fa-spinner fa-pulse"></i></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Message Logs</h1>
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

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Direction</th>
              <th className="px-4 py-3 text-left">Body</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No logs found</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{log.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${log.direction === 'incoming' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {log.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.body || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(log.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}