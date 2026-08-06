import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar({ onCloseMobile }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const permissions = user?.permissions || [];

  const menuItems = [
    { to: '/', label: 'Campaign Builder', icon: 'fa-inbox', permission: 'campaigns' },
    { to: '/history', label: 'Sent History', icon: 'fa-history', permission: 'history' },
    { to: '/templates', label: 'Templates', icon: 'fa-file-alt', permission: 'templates' },
    { to: '/analytics', label: 'Analytics', icon: 'fa-chart-bar', permission: 'analytics' },
    { to: '/designs', label: 'Designs', icon: 'fa-paint-brush', permission: 'designs' },
    { to: '/check-in', label: 'Check‑In', icon: 'fa-check-circle', permission: 'checkin' },
  ];

  const visibleItems = isAdmin
    ? menuItems
    : menuItems.filter(item => permissions.includes(item.permission));

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition ${
      isActive 
        ? 'bg-orange-50 text-orange-600 border border-orange-600 shadow-sm' 
        : 'text-gray-500 hover:bg-gray-50'
    }`;

  return (
    <aside className="w-60 h-full bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
      {/* ─── Brand: Logo only ──────────────────────────────────── */}
      <div className="h-16 flex items-center justify-center px-5 border-b border-gray-200 bg-white">
        <img 
          src="/logo.png" 
          alt="QRCODE.NG" 
          className="h-19 w-auto object-contain" 
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-2 mt-2 overflow-y-auto">
        {visibleItems.length === 0 && !isAdmin && (
          <div className="text-xs text-gray-400 text-center py-4">
            No pages assigned. Contact admin.
          </div>
        )}
        {visibleItems.map(item => (
          <NavLink key={item.to} to={item.to} className={linkClass} onClick={onCloseMobile} end={item.to === '/'}>
            <i className={`fas ${item.icon} w-4`}></i> {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink to="/settings" className={linkClass} onClick={onCloseMobile}>
            <i className="fas fa-cog w-4"></i> Settings
          </NavLink>
        )}
      </nav>

      {/* API status */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
          <span className="w-2 h-2 rounded-full bg-green-500 pulse-dot"></span>
          API Connected • {user?.role === 'admin' ? 'Admin' : 'Agent'}
        </div>
      </div>
    </aside>
  );
}