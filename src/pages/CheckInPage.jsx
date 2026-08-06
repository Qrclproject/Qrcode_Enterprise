import { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../components/layout/Toast';
import api from '../services/api';

export default function CheckInPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendee, setAttendee] = useState(null); // store attendee info

  const handleScan = async (data) => {
    if (data && !result) {
      setScanning(false);
      await processCheckIn(data.text);
    }
  };

  const handleError = (err) => {
    console.error('QR scan error:', err);
  };

  const processCheckIn = async (qrData) => {
    setLoading(true);
    try {
      const res = await api.post(`/campaigns/${campaignId}/check-in`, { qrData });
      const { recipient, campaign } = res.data.data;

      setAttendee(recipient);
      setResult({
        success: true,
        message: `✅ ${recipient.name || recipient.phone} checked in successfully!`,
      });
      showToast('success', 'Checked In', `${recipient.name || recipient.phone} has been admitted.`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setResult({ success: false, message: `❌ ${msg}` });
      setAttendee(null);
      showToast('error', 'Check‑in failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processCheckIn(manualInput.trim());
  };

  const resetScan = () => {
    setResult(null);
    setAttendee(null);
    setManualInput('');
    setScanning(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            <i className="fas fa-qrcode text-orange-500"></i> Event Check‑In
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/campaigns/${campaignId}/scan-history`)}
              className="text-sm text-blue-600 hover:underline"
            >
              📋 Scan History
            </button>
            <button
              onClick={() => navigate('/check-in')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Choose another event
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-600 mb-4">
            Scan the attendee's QR code using your camera, or paste the QR data below.
          </p>

          {scanning && (
            <div className="w-full max-w-sm mx-auto mb-4 bg-gray-100 rounded-lg overflow-hidden">
              <QrReader
                onResult={handleScan}
                onError={handleError}
                constraints={{ facingMode: 'environment' }}
                className="w-full"
              />
            </div>
          )}

          {/* ─── Result message ───────────────────────────────────── */}
          {result && (
            <div
              className={`p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <p className="font-medium">{result.message}</p>

              {/* ─── Show attendee details on success ────────────── */}
              {result.success && attendee && (
                <div className="mt-3 bg-white rounded-lg p-3 border border-green-200 text-sm text-gray-700 space-y-1">
                  <p><strong>Name:</strong> {attendee.name || '—'}</p>
                  <p><strong>Phone:</strong> {attendee.phone}</p>
                  {attendee.event && <p><strong>Event:</strong> {attendee.event}</p>}
                  {attendee.date && <p><strong>Date:</strong> {attendee.date}</p>}
                  <p className="text-xs text-green-600 mt-1">
                    Checked in at {new Date().toLocaleString()}
                  </p>
                </div>
              )}

              <button
                onClick={resetScan}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Scan another
              </button>
            </div>
          )}

          {/* ─── Manual input ────────────────────────────────────── */}
          <form onSubmit={handleManualSubmit} className="mt-4 border-t pt-4">
            <label className="text-xs font-semibold text-gray-500 block mb-1">
              Or enter QR data manually (for external scanners):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste scanned QR string..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check In'}
              </button>
            </div>
          </form>
        </div>

        {/* ─── Instructions ────────────────────────────────────────── */}
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="font-semibold text-gray-600">How it works:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Each QR code is unique and tied to a specific recipient.</li>
            <li>Once scanned, the code becomes invalid for future entries.</li>
            <li>QR codes from one event cannot be used for another event.</li>
            <li>All scan attempts are logged for audit.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}