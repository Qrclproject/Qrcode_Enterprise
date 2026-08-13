import PhonePreview from '../common/PhonePreview';

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
  // ─── CTA button props ──────────────────────────────────────────
  buttonType,
  buttonText,
  buttonValue,
  // ─── NEW: Static header image ─────────────────────────────────
  headerImageUrl,
}) {
  return (
    <div className="dashboard-panel p-4 bg-gray-50/80">
      <div className="panel-header flex justify-between">
        <div className="flex items-center gap-2">
          <div className="panel-badge">3</div> LIVE PREVIEW
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="text-gray-400 hover:text-gray-700 text-xs px-1.5 py-0.5 rounded"
            title="Previous recipient"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="text-[10px] text-gray-500 font-mono">
            {currentIndex}/{total}
          </span>
          <button
            onClick={onNext}
            className="text-gray-400 hover:text-gray-700 text-xs px-1.5 py-0.5 rounded"
            title="Next recipient"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
          <span className="text-gray-300 mx-1">|</span>
          <button
            onClick={() => onCycleVariant(-1)}
            className="text-gray-400 hover:text-indigo-600 text-xs px-1.5 py-0.5 rounded"
            title="Previous variant"
          >
            <i className="fas fa-sync-alt fa-rotate-270 text-[10px]"></i>
          </button>
          <span className="text-[10px] text-indigo-500 font-mono">
            {variantLabel || 'V1'}
          </span>
          <button
            onClick={() => onCycleVariant(1)}
            className="text-gray-400 hover:text-indigo-600 text-xs px-1.5 py-0.5 rounded"
            title="Next variant"
          >
            <i className="fas fa-sync-alt fa-rotate-90 text-[10px]"></i>
          </button>
        </div>
      </div>

      <PhonePreview
        name={recipientData?.name}
        phone={recipientData?.phone}
        message={messageText}
        isHtml={true}
        qrUrl={qrUrl}
        showQR={showQR}
        headerImageUrl={headerImageUrl}   // 👈 pass header image
        // ─── Pass button props ──────────────────────────────────────
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
            className="text-[10px] text-blue-500 underline hover:text-blue-700"
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