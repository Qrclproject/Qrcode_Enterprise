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
  const [inputMode, setInputMode] = useState('camera'); // 'camera' | 'external'
  const [cameraError, setCameraError] = useState(null);
  const [result, setResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendee, setAttendee] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [torchOn, setTorchOn] = useState(false); // optional
  const inputRef = useRef(null);
  const autoSubmitTimer = useRef(null);
  const scanLockRef = useRef(false); // prevent multiple detections

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
    if (scanLockRef.current) return; // already processing
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
          {/* Mode selector */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-gray-500">Scan mode:</span>
            <button
              onClick={switchToCamera}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                inputMode === 'camera'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              📷 Camera
            </button>
            <button
              onClick={switchToExternal}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                inputMode === 'external'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              External Scanner
            </button>
          </div>

          {/* Camera Scanner */}
          {inputMode === 'camera' && (
            <>
              {scanning ? (
                <div className="w-full max-w-sm mx-auto mb-4 bg-gray-100 rounded-lg overflow-hidden relative">
                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 z-10">
                      <p className="text-sm text-red-600 text-center px-4">{cameraError}</p>
                    </div>
                  )}
                  <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                    <Scanner
                      onResult={handleScan}
                      onError={handleError}
                      constraints={{
                        facingMode: facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                      }}
                      formats={['qr_code']}  // only QR codes
                      scanDelay={500}
                      paused={!scanning}
                      components={{
                        torch: true,
                        zoom: true,
                      }}
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
                      <div className="w-3/4 h-3/4 border-2 border-orange-500 rounded-lg opacity-70"></div>
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
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-sm text-green-700">
                <i className="fas fa-plug mr-2"></i>
                External scanner mode active – focus the input field below and scan.
              </p>
            </div>
          )}

          {/* Result message */}
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
                  <p className="font-semibold">Attendee Details</p>
                  {attendee.qrDataFields && attendee.qrDataFields.length > 0 ? (
                    attendee.qrDataFields.map((field, idx) => (
                      <p key={idx}>
                        <strong>{field.label}:</strong> {field.value || '—'}
                      </p>
                    ))
                  ) : (
                    <>
                      <p><strong>Name:</strong> {attendee.name || '—'}</p>
                      {attendee.event && <p><strong>Event:</strong> {attendee.event}</p>}
                      {attendee.date && <p><strong>Date:</strong> {attendee.date}</p>}
                    </>
                  )}
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
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="font-semibold text-gray-600">How it works:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Each QR code is unique and tied to a specific recipient.</li>
            <li>Once scanned, the code becomes invalid for future entries.</li>
            <li>QR codes from one event cannot be used for another event.</li>
            <li>All scan attempts are logged for audit.</li>
            <li><strong>External scanners:</strong> switch to External Scanner mode, focus the input, and scan – it auto‑submits.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
