import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../components/common/Modal';
import { useToast } from '../components/layout/Toast';
import api from '../services/api';
import * as XLSX from 'xlsx';   // for Excel export

export default function ScanHistoryPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedScan, setSelectedScan] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch scan history from backend
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: debouncedSearch,
        page,
        limit: 20,
      };
      const res = await api.get(`/campaigns/${campaignId}/scan-history`, { params });

      if (res.success) {
        setHistory(res.data.history || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      } else {
        throw new Error(res.message || 'Failed to load history');
      }
    } catch (err) {
      showToast('error', 'Failed to load history', err.message);
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, debouncedSearch, showToast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearch = (e) => {
    e.preventDefault();
    setDebouncedSearch(search);
    setPage(1);
  };

  const clearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const openDetails = (scan) => {
    setSelectedScan(scan);
    setModalOpen(true);
  };

  const statusBadge = (status) =>
    status === 'success'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';

  // Helper to get attendee display name without phone
  const getAttendeeDisplay = (scan) => {
    if (scan.qrDataFields && scan.qrDataFields.length > 0) {
      const nameField = scan.qrDataFields.find(f => f.label.toLowerCase().includes('name')) || scan.qrDataFields[0];
      return nameField.value || 'Attendee';
    }
    return 'Attendee';
  };

  // Apply status filter client-side
  const filteredHistory = statusFilter === 'all'
    ? history
    : history.filter(scan => scan.status === statusFilter);

  // ─── Export helpers ─────────────────────────────────────────────
  const getExportData = () => {
    return filteredHistory.map(scan => {
      const row = {
        Attendee: getAttendeeDisplay(scan),
        Status: scan.status,
        Time: new Date(scan.timestamp).toLocaleString(),
      };
      if (scan.qrDataFields && scan.qrDataFields.length > 0) {
        scan.qrDataFields.forEach(field => {
          row[field.label] = field.value || '';
        });
      }
      return row;
    });
  };

  const getHeaders = () => {
    const data = getExportData();
    return Array.from(new Set(data.flatMap(obj => Object.keys(obj))));
  };

  const escapeCsv = (value) => {
    if (value == null) return '';
    const str = String(value);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const exportCSV = () => {
    const data = getExportData();
    if (data.length === 0) {
      showToast('warning', 'No data', 'Nothing to export.');
      return;
    }
    const headers = getHeaders();
    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...data.map(row => headers.map(h => escapeCsv(row[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scan_history_${campaignId}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('success', 'CSV exported', 'Download started.');
  };

  const exportExcel = () => {
    const data = getExportData();
    if (data.length === 0) {
      showToast('warning', 'No data', 'Nothing to export.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ScanHistory');
    XLSX.writeFile(workbook, `scan_history_${campaignId}.xlsx`);
    showToast('success', 'Excel exported', 'Download started.');
  };

  // ─── PDF Export via print dialog ─────────────────────────────
  const exportPDF = () => {
    const data = getExportData();
    if (data.length === 0) {
      showToast('warning', 'No data', 'Nothing to export.');
      return;
    }

    const headers = getHeaders();
    let html = `
      <html>
        <head>
          <title>Scan History</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { font-size: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Scan History - ${campaignId}</h1>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showToast('error', 'Popup blocked', 'Allow popups to export PDF.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // ─── DOC Export (Word-compatible HTML) ───────────────────────
  const exportDOC = () => {
    const data = getExportData();
    if (data.length === 0) {
      showToast('warning', 'No data', 'Nothing to export.');
      return;
    }

    const headers = getHeaders();
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Scan History</title>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 8px; }
        </style>
      </head>
      <body>
        <h1>Scan History - ${campaignId}</h1>
        <table>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scan_history_${campaignId}.doc`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('success', 'DOC exported', 'Download started.');
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportCSV}
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium transition"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button
              onClick={exportExcel}
              className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium transition"
            >
              <i className="fas fa-file-excel mr-1"></i> Excel
            </button>
            <button
              onClick={exportPDF}
              className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium transition"
            >
              <i className="fas fa-file-pdf mr-1"></i> PDF
            </button>
            <button
              onClick={exportDOC}
              className="text-sm bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg font-medium transition"
            >
              <i className="fas fa-file-word mr-1"></i> DOC
            </button>
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by attendee name or any QR field..."
                className="w-full pl-8 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>
          </form>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          <span className="text-xs text-gray-500">
            {totalCount} result(s)
          </span>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            {search || statusFilter !== 'all' ? 'No matching scans found.' : 'No scans yet.'}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Attendee</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((scan, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {getAttendeeDisplay(scan)}
                      </td>
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
              <p className="text-gray-500">No additional attendee details available.</p>
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