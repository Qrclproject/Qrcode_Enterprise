import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../components/common/Modal';
import { useToast } from '../components/layout/Toast';
import api from '../services/api';

export default function ScanHistoryPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedScan, setSelectedScan] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch scan history from backend
  const fetchHistory = async (resetPage = false) => {
    setLoading(true);
    try {
      const params = { search, page: resetPage ? 1 : page, limit: 20 };
      const res = await api.get(`/campaigns/${campaignId}/scan-history`, { params });

      if (res.success) {
        setHistory(res.data.history || []);
        setTotalPages(res.data.totalPages || 1);
      } else {
        throw new Error(res.message || 'Failed to load history');
      }
    } catch (err) {
      showToast('error', 'Failed to load history', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [campaignId, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory(true);
  };

  const openDetails = (scan) => {
    setSelectedScan(scan);
    setModalOpen(true);
  };

  const statusBadge = (status) =>
    status === 'success'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            <i className="fas fa-history text-orange-500"></i> Scan History
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          />
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Search
          </button>
        </form>

        {history.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No scans yet.</div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((scan, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{scan.name || '—'}</td>
                      <td className="px-4 py-3">{scan.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(scan.status)}`}>
                          {scan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(scan.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetails(scan)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Scan Detail Modal */}
      {selectedScan && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Scan Details">
          <div className="space-y-2 text-sm">
            <p>
              <strong>Status:</strong>{' '}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(selectedScan.status)}`}>
                {selectedScan.status}
              </span>
            </p>
            <p><strong>Time:</strong> {new Date(selectedScan.timestamp).toLocaleString()}</p>
            {selectedScan.message && <p><strong>Message:</strong> {selectedScan.message}</p>}

            {/* Display QR Data Content fields if available */}
            {selectedScan.qrDataFields && selectedScan.qrDataFields.length > 0 ? (
              <div className="border-t pt-2 mt-2">
                <p className="font-semibold text-gray-700 mb-1">Attendee Details</p>
                {selectedScan.qrDataFields.map((field, idx) => (
                  <p key={idx}>
                    <strong>{field.label}:</strong> {field.value || '—'}
                  </p>
                ))}
              </div>
            ) : (
              // Fallback to name/phone if no custom fields
              <>
                <p><strong>Name:</strong> {selectedScan.name || '—'}</p>
                <p><strong>Phone:</strong> {selectedScan.phone}</p>
              </>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded text-sm">
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}