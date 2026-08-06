import { useState, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useToast } from '../components/layout/Toast';
import api from '../services/api';

export default function CheckInPage() {
  const { campaignId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const showToast = useToast();
  const [scanning, setScanning] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [result, setResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendee, setAttendee] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const inputRef = useRef(null);
  const autoSubmitTimer = useRef(null);

  // ─── Auto‑process QR from URL parameter ──────────────────────
  useEffect(() => {
    const qrParam = new URLSearchParams(location.search).get('qr');
    if (qrParam) {
      processCheckIn(qrParam);
    }
  }, [location.search]);

  // ─── Auto‑submit for external scanners (keyboard input) ──────
  useEffect(() => {
    if (autoSubmitTimer.current) {
      clearTimeout(autoSubmitTimer.current);
      autoSubmitTimer.current = null;
    }

    // Only auto‑submit if the input is long enough (scanner data is usually > 20 chars)
    if (manualInput.length > 20) {
      // Wait 500ms after the last input change to ensure scanner has finished typing
      autoSubmitTimer.current = setTimeout(() => {
        if (manualInput.trim()) {
          processCheckIn(manualInput.trim());
        }
        autoSubmitTimer.current = null;
      }, 500);
    }
  }, [manualInput]);

  // ─── Clean up timer on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      if (autoSubmitTimer.current) {
        clearTimeout(autoSubmitTimer.current);
      }
    };
  }, []);

  // ─── Focus the manual input when camera is off ──────────────
  useEffect(() => {
    if (!scanning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanning]);

  // ─── Handle QR scan from camera ───────────────────────────────
  const handleScan = (detectedCodes) => {
    if (detectedCodes && detectedCodes.length > 0 && !result) {
      const data = detectedCodes[0].rawValue;
      setScanning(false);
      processCheckIn(data);
    }
  };

  const handleError = (err) => {
    console.error('QR scan error:', err);
    if (err.message && err.message.toLowerCase().includes('camera')) {
      setCameraError('Camera unavailable. Please use manual input below.');
      setScanning(false);
    }
  };

  // ─── Process check‑in ──────────────────────────────────────────
  const processCheckIn = async (qrData) => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await api.post(`/campaigns/${campaignId}/check-in`, { qrData });
      const { recipient } = res.data.data;

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
      setManualInput('');
    }
  };

  // ─── Manual submit handler ──────────────────────────────────────
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processCheckIn(manualInput.trim());
  };

  // ─── Reset for another scan ────────────────────────────────────
  const resetScan = () => {
    setResult(null);
    setAttendee(null);
    setManualInput('');
    setCameraError(null);
    setScanning(true);
    if (autoSubmitTimer.current) {
      clearTimeout(autoSubmitTimer.current);
      autoSubmitTimer.current = null;
    }
  };

  // ─── Switch camera ──────────────────────────────────────────────
  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
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

          {/* ─── Camera Scanner ───────────────────────────────────── */}
          {scanning ? (
            <div className="w-full max-w-sm mx-auto mb-4 bg-gray-100 rounded-lg overflow-hidden relative">
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 z-10">
                  <p className="text-sm text-red-600 text-center px-4">{cameraError}</p>
                </div>
              )}
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  constraints={{ facingMode: facingMode }}
                  styles={{
                    container: {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    video: {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    },
                  }}
                />
                {/* Scanning overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-3/4 h-3/4 border-2 border-orange-500 rounded-lg opacity-70"></div>
                  <div className="absolute w-8 h-1 bg-orange-500 animate-pulse rounded-full" style={{ top: '48%' }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <button
                onClick={resetScan}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600"
              >
                <i className="fas fa-camera mr-1"></i> Scan Another
              </button>
            </div>
          )}

          {/* ─── Camera controls ─────────────────────────────────── */}
          {scanning && !cameraError && (
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={toggleCamera}
                className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-full"
              >
                <i className="fas fa-sync-alt mr-1"></i> Switch Camera
              </button>
              <button
                onClick={() => setScanning(false)}
                className="text-xs bg-red-200 hover:bg-red-300 px-3 py-1 rounded-full"
              >
                <i className="fas fa-stop mr-1"></i> Stop Camera
              </button>
            </div>
          )}

          {/* ─── Result message ──────────────────────────────────── */}
          {result && (
            <div
              className={`p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <p className="font-medium">{result.message}</p>

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

          {/* ─── Manual input (external scanner friendly) ──────── */}
          <form onSubmit={handleManualSubmit} className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500">
                External Scanner / Manual Entry
              </label>
              {!scanning && (
                <span className="text-[10px] text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Scanner ready
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste or scan QR data here..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                autoFocus={!scanning}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check In'}
              </button>
            </div>
            {!scanning && (
              <p className="text-[10px] text-gray-400 mt-1">
                Focus this field and scan with your external scanner – it will auto‑submit.
              </p>
            )}
            {loading && (
              <p className="text-xs text-gray-400 mt-1">
                <i className="fas fa-spinner fa-spin mr-1"></i> Processing...
              </p>
            )}
          </form>
        </div>

        {/* ─── Instructions ──────────────────────────────────────── */}
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="font-semibold text-gray-600">How it works:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Each QR code is unique and tied to a specific recipient.</li>
            <li>Once scanned, the code becomes invalid for future entries.</li>
            <li>QR codes from one event cannot be used for another event.</li>
            <li>All scan attempts are logged for audit.</li>
            <li>External scanners: focus the input field and scan – the system auto‑submits.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}