import { useState } from 'react';
import ProgressBar from '../common/ProgressBar';

export default function SettingsPanel({
  batchSize, setBatchSize,
  waitValue, setWaitValue,
  waitUnit, setWaitUnit,
  scheduleTime, setScheduleTime,
  onLaunch, onTestSend,
  isRunning, progress, status,
  variantCount,
  generateQr,
  onToggleQR,
  onOpenDesignModal,
  selectedDesignName,
  headerImageUrl,
  onHeaderImageUpload,
  uploadingHeader,
  panelDisabled,
  canLaunch,
  templateSupportsImage,   // 👈 new prop
}) {
  const [testNumber, setTestNumber] = useState('');

  return (
    <div className="dashboard-panel p-4">
      <div className="panel-header"><div className="panel-badge">4</div> SETTINGS & LAUNCH</div>

      <fieldset disabled={panelDisabled} className="space-y-3 flex-1">
        {/* Messages Per Batch */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Messages Per Batch</label>
          <div className="flex items-center gap-2 mt-0.5">
            <input type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))}
              min="1" max="500" className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-lg p-2" />
            <span className="text-[10px] text-gray-400">contacts</span>
          </div>
        </div>

        {/* Wait Between Batches */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Wait Between Batches</label>
          <div className="flex items-center gap-2 mt-0.5">
            <input type="number" value={waitValue} onChange={(e) => setWaitValue(Number(e.target.value))}
              min="1" max="999" className="w-20 bg-white border border-gray-200 text-gray-700 text-xs rounded-lg p-2" />
            <select value={waitUnit} onChange={(e) => setWaitUnit(e.target.value)}
              className="flex-1 bg-white border border-gray-200 text-gray-700 text-xs rounded-lg p-2">
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Start Sending At (optional)</label>
          <input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-lg p-2 mt-0.5" />
        </div>

        {/* ─── Static Header Image ─────────────────────────────── */}
        <div className="border-t pt-3">
          <label className="text-[10px] font-semibold text-gray-400 uppercase">
            Attach Header Image (optional)
          </label>
          <p className="text-[9px] text-gray-400 mt-0.5">
            Use the same image for all recipients. Overrides personalised QR codes.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onHeaderImageUpload(e.target.files[0])}
            className="w-full text-xs mt-1 border border-gray-200 rounded-lg p-1.5"
            disabled={uploadingHeader || !templateSupportsImage}   // 👈 disabled if not supported
          />
          {uploadingHeader && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <i className="fas fa-spinner fa-spin"></i> Uploading...
            </span>
          )}
          {!templateSupportsImage && (
            <p className="text-[10px] text-red-500 mt-1">
              This template does not support an image header.
            </p>
          )}
          {headerImageUrl && templateSupportsImage && !uploadingHeader && (
            <div className="mt-1 flex items-center gap-2">
              <img src={headerImageUrl} alt="Header" className="w-10 h-10 object-cover rounded border" />
              <span className="text-[10px] text-green-600">✓ Image ready</span>
              <button
                onClick={() => onHeaderImageUpload(null)}
                className="text-red-500 hover:text-red-700 text-xs"
                title="Remove image"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          )}
        </div>

        {/* ─── QR Generation Toggle ─────────────────────────────── */}
        <div className={`flex items-center justify-between ${!templateSupportsImage ? 'opacity-50' : ''}`}>
          <span className="text-[10px] font-semibold text-gray-500 uppercase">Generate QR codes</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={generateQr}
              onChange={(e) => onToggleQR(e.target.checked)}
              className="sr-only peer"
              disabled={!templateSupportsImage}   // 👈 disabled if not supported
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
        {!templateSupportsImage && (
          <p className="text-[10px] text-red-500 -mt-2">This template does not support QR codes.</p>
        )}

        {/* Design selection (when QR is enabled) */}
        {generateQr && templateSupportsImage && (
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase">Pass Design</label>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-700 truncate flex-1">{selectedDesignName}</span>
              <button
                onClick={onOpenDesignModal}
                className="bg-white border border-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-50"
              >
                {selectedDesignName === 'None' ? 'Select' : 'Change'}
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-2.5 text-[10px] space-y-1.5">
          <div className="flex justify-between"><span>Variants Active:</span> <strong>{variantCount}</strong></div>
        </div>

        {/* Test Send */}
        <button
          onClick={() => onTestSend(testNumber)}
          disabled={panelDisabled || !canLaunch || uploadingHeader}
          className="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-flask"></i> Send Test to My Number
        </button>
        <div>
          <input type="tel" value={testNumber} onChange={(e) => setTestNumber(e.target.value)}
            placeholder="+234 801 234 5678" className="w-full border border-gray-200 rounded-lg p-2 text-xs mt-1" />
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="mt-3">
            <ProgressBar value={progress} max={100} label="Progress" />
            <p className="text-[10px] text-gray-400 mt-1 text-center">{status}</p>
          </div>
        )}

        {/* Launch Button */}
        <button
          onClick={onLaunch}
          disabled={panelDisabled || !canLaunch || isRunning || uploadingHeader}
          className="w-full bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-600 transition shadow-md shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-rocket"></i> <span>LAUNCH CAMPAIGN</span>
        </button>
      </fieldset>
    </div>
  );
}