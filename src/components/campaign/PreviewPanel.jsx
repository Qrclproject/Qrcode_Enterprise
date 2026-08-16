import PhonePreview from '../common/PhonePreview';
import ToggleSwitch from '../common/ToggleSwitch';

export default function PreviewPanel({
  recipientData,
  messageText,
  qrUrl,
  showQR,
  currentIndex,
  total,
  onPrev,
  onNext,
  variantLabel,
  onCycleVariant,
  buttonType,
  buttonText,
  buttonValue,
  headerImageUrl,
  includeHeaderImage,
  setIncludeHeaderImage,
}) {
  return (
    <div className="dashboard-panel p-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="panel-header flex justify-between">
        <div className="flex items-center gap-2">
          <div className="panel-badge">3</div> LIVE PREVIEW
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xs px-1.5 py-0.5 rounded transition-colors"
            title="Previous recipient"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="text-[10px] text-gray-500 font-mono">
            {currentIndex}/{total}
          </span>
          <button
            onClick={onNext}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xs px-1.5 py-0.5 rounded transition-colors"
            title="Next recipient"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
          <span className="text-gray-300 mx-1">|</span>
          <button
            onClick={() => onCycleVariant(-1)}
            className="text-gray-400 hover:text-orange-600 hover:bg-orange-50 text-xs px-1.5 py-0.5 rounded transition-colors"
            title="Previous variant"
          >
            <i className="fas fa-sync-alt fa-rotate-270 text-[10px]"></i>
          </button>
          <span className="text-[10px] text-orange-500 font-mono">
            {variantLabel || 'V1'}
          </span>
          <button
            onClick={() => onCycleVariant(1)}
            className="text-gray-400 hover:text-orange-600 hover:bg-orange-50 text-xs px-1.5 py-0.5 rounded transition-colors"
            title="Next variant"
          >
            <i className="fas fa-sync-alt fa-rotate-90 text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* ─── Toggle for Header Image ───────────────────────────── */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <span className="text-[10px] font-semibold text-gray-500 uppercase">
          Include Header Image
        </span>
        <ToggleSwitch checked={includeHeaderImage} onChange={setIncludeHeaderImage} />
      </div>

      <PhonePreview
        name={recipientData?.name}
        phone={recipientData?.phone}
        message={messageText}
        isHtml={true}
        qrUrl={qrUrl}
        showQR={showQR}
        headerImageUrl={headerImageUrl}
        buttonType={buttonType}
        buttonText={buttonText}
        buttonValue={buttonValue}
      />

      {/* Quick link to view the actual QR/composite image */}
      {showQR && qrUrl && !headerImageUrl && (
        <div className="mt-2 text-center">
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-orange-500 underline hover:text-orange-700"
          >
            <i className="fas fa-external-link-alt mr-1"></i>
            View generated QR image
          </a>
          <div className="text-[9px] text-gray-400 mt-0.5 break-all">
            {qrUrl.length > 60 ? qrUrl.slice(0, 60) + '…' : qrUrl}
          </div>
        </div>
      )}
    </div>
  );
}