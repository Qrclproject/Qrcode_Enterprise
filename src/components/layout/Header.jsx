import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Modal from '../common/Modal';   // ✅ correct path
import Button from '../common/Button'; // ✅ correct path

// ─── Breadcrumb mapping ──────────────────────────────────────────
const breadcrumbMap = {
  '/': ['Campaigns', 'New Broadcast'],
  '/history': ['History', 'Campaign Logs'],
  '/templates': ['Templates', 'Manage Templates'],
  '/analytics': ['Analytics', 'Dashboard'],
  '/settings': ['Settings', 'Configuration'],
  '/designs': ['Designs', 'Manage Designs'],
};

export default function Header({ onToggleMobileMenu }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [parent, current] = breadcrumbMap[location.pathname] || ['', 'Page'];

  // ─── WhatsApp API health status ──────────────────────────────
  const [apiStatus, setApiStatus] = useState('loading');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.get('/whatsapp/health');
        setApiStatus('healthy');
      } catch {
        setApiStatus('unhealthy');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Logout confirmation & loading ────────────────────────────
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const openLogoutModal = () => setShowLogoutModal(true);
  const closeLogoutModal = () => {
    if (!isLoggingOut) setShowLogoutModal(false);
  };

  // ─── Status styling ──────────────────────────────────────────
  const statusConfig = {
    healthy: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'API Healthy',
    },
    unhealthy: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: 'API Error',
    },
    loading: {
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      dot: 'bg-gray-400 animate-pulse',
      label: 'Checking...',
    },
  };
  const status = statusConfig[apiStatus] || statusConfig.loading;

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden text-gray-500 hover:text-gray-800 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <i className="fas fa-bars text-lg"></i>
          </button>
          <div className="text-xs text-gray-400 font-medium">
            {parent} / <span className="text-gray-700">{current}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* ─── Dynamic health badge ─────────────────────────────── */}
          <span
            className={`${status.bg} ${status.text} px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 transition-colors duration-300`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
            {status.label}
          </span>

          <i className="fas fa-bell text-gray-400 cursor-pointer hover:text-gray-600"></i>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-gray-700 font-medium">{user?.name || 'User'}</span>
            <button
              onClick={openLogoutModal}
              className="text-gray-400 hover:text-red-500 transition"
              title="Logout"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-sign-out-alt"></i>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Logout Confirmation Modal ───────────────────────────── */}
      <Modal
        isOpen={showLogoutModal}
        onClose={closeLogoutModal}
        title="Confirm Logout"
        size="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to log out? You will need to log in again to access your account.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={closeLogoutModal}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-1"></i> Logging out...
                </>
              ) : (
                'Logout'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}