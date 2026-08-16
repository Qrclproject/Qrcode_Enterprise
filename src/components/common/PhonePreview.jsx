export default function PhonePreview({
  name,
  phone,
  message,
  qrUrl,
  showQR = true,
  headerImageUrl,
  buttonType,
  buttonText,
  buttonValue,
}) {
  const imageToShow = headerImageUrl || (showQR ? qrUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=Sample' : null);

  const renderButton = () => {
    if (!buttonType || buttonType === 'none') return null;

    let icon = 'fas fa-phone';
    let label = buttonText || (buttonType === 'phone_number' ? 'Call' : 'Visit');
    let href = '';
    let target = '';

    if (buttonType === 'phone_number') {
      href = `tel:${buttonValue}`;
      icon = 'fas fa-phone';
    } else if (buttonType === 'url') {
      href = buttonValue;
      icon = 'fas fa-external-link-alt';
      target = '_blank';
    }

    return (
      <div className="mt-2 text-center">
        <a
          href={href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #25D366 0%, #1DA851 100%)',
          }}
        >
          <i className={icon}></i> {label}
        </a>
      </div>
    );
  };

  return (
    <div className="phone-frame flex flex-col">
      <div className="phone-notch-bar"></div>
      <div className="wa-chat-header" style={{ background: 'linear-gradient(135deg, #075e54 0%, #054d44 100%)' }}>
        <i className="fas fa-arrow-left text-[10px]"></i>
        <div className="w-7 h-7 rounded-full bg-gray-300 overflow-hidden flex-shrink-0 ring-2 ring-white/20">
          <img
            src={`https://ui-avatars.com/api/?name=EP&background=075e54&color=fff&size=28`}
            alt="avatar"
          />
        </div>
        <div className="leading-tight min-w-0">
          <div className="font-semibold text-[11px] truncate">EventPass</div>
          <div className="text-[9px] text-green-300">Official Business</div>
        </div>
      </div>

      {/* ─── Scrollable message area ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        <div className="wa-bubble-out">
          {imageToShow && (
            <div className="mb-2 bg-white p-1.5 rounded-lg border border-gray-200 text-center shadow-sm">
              <img
                src={imageToShow}
                alt={headerImageUrl ? 'Header' : 'QR'}
                className="mx-auto w-24 h-24 object-contain rounded"
              />
              <div className="text-[9px] text-gray-400 mt-0.5 truncate">
                {headerImageUrl ? 'header_image.png' : 'qr_pass.png'}
              </div>
            </div>
          )}

          <div
            className="leading-relaxed text-[12px] break-words ql-snow ql-editor !p-0"
            dangerouslySetInnerHTML={{
              __html: message || '<p className="text-gray-300">Type your variant body message...</p>',
            }}
          />

          {renderButton()}

          <div className="text-right text-[9px] text-gray-400 mt-1.5">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
            <i className="fas fa-check-double text-blue-400"></i>
          </div>
        </div>
      </div>

      {/* ─── Bottom input bar ───────────────────────────────────── */}
      <div className="flex-shrink-0 bg-gradient-to-b from-[#f0f0f0] to-[#e5e5e5] p-1.5 flex items-center gap-1.5 border-t border-gray-200">
        <i className="far fa-smile text-gray-400 text-sm pl-1"></i>
        <div className="bg-white rounded-full flex-1 h-7 px-2 flex items-center text-[10px] text-gray-400 shadow-inner">
          Message
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00897b] to-[#00695c] text-white flex items-center justify-center text-[10px] shadow-md">
          <i className="fas fa-microphone"></i>
        </div>
      </div>
    </div>
  );
}