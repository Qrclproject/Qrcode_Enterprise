import { useState, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useToast } from '../components/layout/Toast';
import Modal from '../components/common/Modal';
import api from '../services/api';

export default function CheckInPage() {
  const { campaignId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const showToast = useToast();

  const [scanning, setScanning] = useState(true);
  const [inputMode, setInputMode] = useState('camera');
  const [cameraError, setCameraError] = useState(null);
  const [result, setResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendee, setAttendee] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [scanHistory, setScanHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [selectedHistoryScan, setSelectedHistoryScan] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const inputRef = useRef(null);
  const autoSubmitTimer = useRef(null);
  const scanLockRef = useRef(false);

  // ─── Fetch scan history ────────────────────────────────────
  const fetchScanHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/campaigns/${campaignId}/scan-history`, {
        params: { page: 1, limit: 20 },
      });
      if (res.success) {
        setScanHistory(res.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load scan history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchScanHistory();
  }, [campaignId]);

  // ─── Switch mode ──────────────────────────────────────────────
  const switchToCamera = () => {
    setInputMode('camera');
    setScanning(true);
    setCameraError(null);
    scanLockRef.current = false;
    if (inputRef.current) inputRef.current.blur();
  };

  const switchToExternal = () => {
    setInputMode('external');
    setScanning(false);
    setCameraError(null);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  // ─── Auto‑process QR from URL parameter ──────────────────────
  useEffect(() => {
    const qrParam = new URLSearchParams(location.search).get('qr');
    if (qrParam) {
      processCheckIn(qrParam);
    }
  }, [location.search]);

  // ─── Auto‑submit for external scanners ──────────────────────
  useEffect(() => {
    if (autoSubmitTimer.current) {
      clearTimeout(autoSubmitTimer.current);
      autoSubmitTimer.current = null;
    }

    if (manualInput.length > 20) {
      autoSubmitTimer.current = setTimeout(() => {
        if (manualInput.trim()) {
          processCheckIn(manualInput.trim());
        }
        autoSubmitTimer.current = null;
      }, 500);
    }
  }, [manualInput]);

  useEffect(() => {
    return () => {
      if (autoSubmitTimer.current) {
        clearTimeout(autoSubmitTimer.current);
      }
    };
  }, []);

  // ─── Focus input when external mode is active ──────────────
  useEffect(() => {
    if (inputMode === 'external' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputMode]);

  // ─── Handle QR scan from camera ─────────────────────────────
  const handleScan = (detectedCodes) => {
    if (!detectedCodes || detectedCodes.length === 0) return;
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScanning(false);
    const data = detectedCodes[0].rawValue;
    processCheckIn(data);
  };

  const handleError = (err) => {
    console.error('QR scan error:', err);
    if (err && err.message && err.message.toLowerCase().includes('camera')) {
      setCameraError('Camera unavailable. Switch to external scanner mode.');
      setScanning(false);
    }
  };

  // ─── Process check‑in ──────────────────────────────────────────
  const processCheckIn = async (qrData) => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await api.post(`/campaigns/${campaignId}/check-in`, { qrData });
      const { recipient } = res.data;

      setAttendee(recipient);
      setResult({
        success: true,
        message: `✅ ${recipient.name || 'Attendee'} checked in successfully!`,
      });
      showToast('success', 'Checked In', `${recipient.name || 'Attendee'} has been admitted.`);
      fetchScanHistory();
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

  // ─── Manual submit ──────────────────────────────────────────────
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
    scanLockRef.current = false;
    if (inputMode === 'camera') {
      setScanning(true);
    } else {
      setScanning(false);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
    if (autoSubmitTimer.current) {
      clearTimeout(autoSubmitTimer.current);
      autoSubmitTimer.current = null;
    }
  };

  // ─── Switch camera front/back ──────────────────────────────────
  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // ─── Helper to build a list of attendee fields to display (NO phone) ──
  const getAttendeeFields = (attendee) => {
    if (!attendee) return [];
    const fields = [];
    const excludedKeys = [
      '_id', '__v', 'checkedIn', 'checkedInAt', 'status', 'qrUrl', 'qrDataFields', 'phone'
    ];

    // If QR Data Content exists, show those first
    if (attendee.qrDataFields && attendee.qrDataFields.length > 0) {
      attendee.qrDataFields.forEach(field => {
        fields.push({ label: field.label, value: field.value });
      });
    }

    // Then show all other fields not excluded and not already displayed
    Object.entries(attendee).forEach(([key, value]) => {
      if (excludedKeys.includes(key)) return;
      if (fields.some(f => f.label === key)) return;
      if (typeof value === 'object' || value === undefined || value === null) return;
      fields.push({ label: key, value: String(value) });
    });

    return fields;
  };

  const attendeeFields = getAttendeeFields(attendee);

  // ─── History helpers (no phone displayed) ────────────────────
  const getHistoryPrimaryText = (scan) => {
    if (scan.qrDataFields && scan.qrDataFields.length > 0) {
      const nameField = scan.qrDataFields.find(f => f.label.toLowerCase().includes('name')) || scan.qrDataFields[0];
      return nameField.value || 'Attendee';
    }
    return 'Attendee';
  };

  const getHistorySecondaryText = (scan) => {
    // We intentionally do not show phone
    return '';
  };

  const getHistoryBadgeText = (scan) => {
    if (scan.qrDataFields && scan.qrDataFields.length > 0) {
      return scan.qrDataFields.length + ' field(s)';
    }
    return '';
  };

  const openHistoryDetails = (scan) => {
    setSelectedHistoryScan(scan);
    setHistoryModalOpen(true);
  };

  const statusBadge = (status) =>
    status === 'success'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3">
              <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                <i className="fas fa-qrcode"></i>
              </span>
              Event Check‑In
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Scan attendee QR codes for instant verification.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/campaigns/${campaignId}/scan-history`)}
              className="text-sm text-blue-600 hover:underline"
            >
              📋 Full History
            </button>
            <button
              onClick={() => navigate('/check-in')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Choose another event
            </button>
          </div>
        </div>

        {/* Main grid: Scanner left, Scan History right (desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Scanner and result */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              {/* Mode selector */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold text-gray-500 mr-2">Scan mode:</span>
                <button
                  onClick={switchToCamera}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                    inputMode === 'camera'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📷 Camera
                </button>
                <button
                  onClick={switchToExternal}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                    inputMode === 'external'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🔌 External Scanner
                </button>
              </div>

              {/* Camera Scanner */}
              {inputMode === 'camera' && (
                <>
                  {scanning ? (
                    <div className="w-full max-w-sm mx-auto mb-4 bg-gray-100 rounded-xl overflow-hidden relative">
                      {cameraError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 z-10">
                          <p className="text-sm text-red-600 text-center px-4">{cameraError}</p>
                        </div>
                      )}
                      <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                        <Scanner
                          onScan={handleScan}
                          onError={handleError}
                          constraints={{
                            facingMode: facingMode,
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                          }}
                          scanDelay={500}
                          paused={!scanning}
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
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-3/4 h-3/4 border-2 border-orange-500 rounded-xl opacity-70"></div>
                          <div className="absolute w-8 h-1 bg-orange-500 animate-pulse rounded-full" style={{ top: '48%' }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <button
                        onClick={() => {
                          scanLockRef.current = false;
                          setScanning(true);
                        }}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600"
                      >
                        <i className="fas fa-camera mr-1"></i> Start Camera
                      </button>
                    </div>
                  )}

                  {scanning && !cameraError && (
                    <div className="flex justify-center gap-2 mb-4">
                      <button
                        onClick={toggleCamera}
                        className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-full"
                      >
                        <i className="fas fa-sync-alt mr-1"></i> Switch Camera
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* External Scanner mode */}
              {inputMode === 'external' && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                  <p className="text-sm text-green-700">
                    <i className="fas fa-plug mr-2"></i>
                    External scanner mode active – focus the input field below and scan.
                  </p>
                </div>
              )}

              {/* Result message */}
              {result && (
                <div
                  className={`p-4 rounded-xl border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i className={`fas ${result.success ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'} text-2xl`}></i>
                    <div>
                      <p className="font-semibold text-gray-800">{result.success ? 'Check‑in Successful' : 'Check‑in Failed'}</p>
                      <p className="text-sm text-gray-600">{result.message}</p>
                    </div>
                  </div>

                  {result.success && attendee && (
                    <div className="mt-4 bg-white rounded-xl p-4 border border-green-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">Attendee Details</h3>
                        <span className="text-xs text-green-600">
                          <i className="fas fa-clock mr-1"></i>
                          {new Date().toLocaleString()}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {attendeeFields.map((field, idx) => (
                          <div key={idx} className="py-2 flex items-start justify-between gap-4">
                            <span className="text-gray-500 text-sm font-medium capitalize">{field.label}</span>
                            <span className="text-gray-700 text-sm font-medium break-words text-right">{field.value || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resetScan}
                    className="mt-4 w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Scan another
                  </button>
                </div>
              )}

              {/* Manual input */}
              <form onSubmit={handleManualSubmit} className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-500">
                    {inputMode === 'external' ? 'External Scanner' : 'Manual Entry'}
                  </label>
                  {inputMode === 'external' && (
                    <span className="text-[10px] text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Ready
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder={inputMode === 'external' ? 'Scan QR code...' : 'Paste QR data...'}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    autoFocus={inputMode === 'external'}
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
                {inputMode === 'external' && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    The scanner will auto‑submit after typing the data.
                  </p>
                )}
                {loading && (
                  <p className="text-xs text-gray-400 mt-1">
                    <i className="fas fa-spinner fa-spin mr-1"></i> Processing...
                  </p>
                )}
              </form>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="font-semibold text-gray-700">How it works:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Each QR code is unique and tied to a specific recipient.</li>
                <li>Once scanned, the code becomes invalid for future entries.</li>
                <li>QR codes from one event cannot be used for another event.</li>
                <li>All scan attempts are logged for audit.</li>
                <li><strong>External scanners:</strong> switch to External Scanner mode, focus the input, and scan – it auto‑submits.</li>
              </ul>
            </div>
          </div>

          {/* Right: Scan History list (desktop) */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-fit lg:sticky lg:top-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fas fa-history text-orange-500"></i> Scan History
            </h2>
            {historyLoading ? (
              <div className="flex justify-center py-10">
                <i className="fas fa-spinner fa-pulse text-2xl text-gray-400"></i>
              </div>
            ) : scanHistory.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No scans yet.</p>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                {scanHistory.map((scan, idx) => (
                  <div
                    key={idx}
                    onClick={() => openHistoryDetails(scan)}
                    className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {getHistoryPrimaryText(scan)}
                        </p>
                        {getHistoryBadgeText(scan) && (
                          <span className="inline-block mt-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {getHistoryBadgeText(scan)}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        scan.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {scan.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(scan.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Detail Modal */}
      {selectedHistoryScan && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title="Scan Details"
          size="max-w-md"
        >
          <div className="space-y-2 text-sm">
            <p>
              <strong>Status:</strong>{' '}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(selectedHistoryScan.status)}`}>
                {selectedHistoryScan.status}
              </span>
            </p>
            <p><strong>Time:</strong> {new Date(selectedHistoryScan.timestamp).toLocaleString()}</p>
            {selectedHistoryScan.message && <p><strong>Message:</strong> {selectedHistoryScan.message}</p>}

            <div className="border-t pt-2 mt-2">
              <p className="font-semibold text-gray-700 mb-1">Attendee Details</p>
              {selectedHistoryScan.qrDataFields && selectedHistoryScan.qrDataFields.length > 0 ? (
                selectedHistoryScan.qrDataFields.map((field, idx) => (
                  <p key={idx}>
                    <strong>{field.label}:</strong> {field.value || '—'}
                  </p>
                ))
              ) : (
                <p>No additional details available.</p>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setHistoryModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded text-sm">
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}