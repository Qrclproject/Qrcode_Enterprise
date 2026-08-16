export default function Modal({ isOpen, onClose, title, children, size = 'max-w-lg' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div
        className={`relative z-10 w-full ${size} bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100`}
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors duration-200"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}