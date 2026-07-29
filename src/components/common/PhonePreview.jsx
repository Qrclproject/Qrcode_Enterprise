export default function PhonePreview({ name, phone, message, qrUrl, showQR = true }) {
  return (
    <div className="phone-frame flex flex-col">
      <div className="phone-notch-bar"></div>
      <div className="wa-chat-header">
        <i className="fas fa-arrow-left text-[10px]"></i>
        <div className="w-7 h-7 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
          <img src={`https://ui-avatars.com/api/?name=EP&background=075e54&color=fff&size=28`} alt="avatar" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="font-semibold text-[11px] truncate">EventPass</div>
          <div className="text-[9px] text-green-300">Official Business</div>
        </div>
      </div>

      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        <div className="wa-bubble-out">
          <div
            className="leading-relaxed text-[12px] break-words ql-snow ql-editor !p-0"
            /* 🌟 Added fallback string check to avoid empty container runtime exceptions */
            dangerouslySetInnerHTML={{ __html: message || '<p className="text-gray-300">Type your variant body message...</p>' }}
          ></div>
          {showQR && (
            <div className="mt-2 bg-white p-1.5 rounded border border-gray-200 text-center">
              <img
                src={qrUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=Sample'}
                alt="QR"
                className="mx-auto w-24 h-24 object-contain"
              />
              <div className="text-[9px] text-gray-400 mt-0.5 truncate">qr_pass.png</div>
            </div>
          )}
          <div className="text-right text-[9px] text-gray-400 mt-1.5">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
            <i className="fas fa-check-double text-blue-400"></i>
          </div>
        </div>
      </div>

      {/* Bottom input bar */}
      <div className="flex-shrink-0 bg-[#f0f0f0] p-1.5 flex items-center gap-1.5">
        <i className="far fa-smile text-gray-400 text-sm pl-1"></i>
        <div className="bg-white rounded-full flex-1 h-7 px-2 flex items-center text-[10px] text-gray-300">
          Message
        </div>
        <div className="w-7 h-7 rounded-full bg-[#00897b] text-white flex items-center justify-center text-[10px]">
          <i className="fas fa-microphone"></i>
        </div>
      </div>
    </div>
  );
}
