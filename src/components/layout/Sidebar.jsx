import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar({ onCloseMobile }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const permissions = user?.permissions || [];

  // ─── Collapsed state (persisted) ─────────────────────────────
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', collapsed);
  }, [collapsed]);

  const toggleCollapsed = () => {
    setCollapsed(prev => !prev);
  };

  const menuItems = [
    { to: '/', label: 'Campaign Builder', icon: 'fa-inbox', permission: 'campaigns' },
    { to: '/history', label: 'Sent History', icon: 'fa-history', permission: 'history' },
    { to: '/templates', label: 'Templates', icon: 'fa-file-alt', permission: 'templates' },
    { to: '/analytics', label: 'Analytics', icon: 'fa-chart-bar', permission: 'analytics' },
    { to: '/designs', label: 'Designs', icon: 'fa-paint-brush', permission: 'designs' },
    { to: '/excel-test', label: 'Excel Test', icon: 'fa-table', permission: 'excel-test' },
    { to: '/check-in', label: 'Check‑In', icon: 'fa-check-circle', permission: 'checkin' },
    { to: '/media', label: 'Media Library', icon: 'fa-images', permission: 'media' }
  ];

  const visibleItems = isAdmin
    ? menuItems
    : menuItems.filter(item => permissions.includes(item.permission));

  const linkClass = ({ isActive }) =>
    `flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
      isActive 
        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border border-orange-500 shadow-md shadow-orange-200' 
        : 'text-gray-600 hover:bg-orange-50 hover:text-orange-700'
    }`;

  return (
    <aside
      className={`${collapsed ? 'w-20' : 'w-60'} h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col z-20 shadow-md transition-all duration-300`}
    >
      {/* ─── Brand + Collapse Toggle ─────────────────────────── */}
      <div className={`h-16 flex items-center border-b border-gray-200 bg-white/80 ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
        {!collapsed && (
          <img 
            src="/logo.png" 
            alt="QRCODE.NG" 
            className="h-10 w-auto object-contain" 
          />
        )}
        <button
          onClick={toggleCollapsed}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          title={collapsed ? 'Expand sidebar' : 'Minimise sidebar'}
        >
          <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-sm`}></i>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-2 mt-2 overflow-y-auto">
        {visibleItems.length === 0 && !isAdmin && (
          <div className="text-xs text-gray-400 text-center py-4">
            {collapsed ? '—' : 'No pages assigned. Contact admin.'}
          </div>
        )}
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={linkClass}
            onClick={onCloseMobile}
            end={item.to === '/'}
            title={collapsed ? item.label : undefined}
          >
            <i className={`fas ${item.icon} ${collapsed ? 'text-lg' : 'w-4'}`}></i>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/settings"
            className={linkClass}
            onClick={onCloseMobile}
            title={collapsed ? 'Settings' : undefined}
          >
            <i className={`fas fa-cog ${collapsed ? 'text-lg' : 'w-4'}`}></i>
            {!collapsed && <span>Settings</span>}
          </NavLink>
        )}
      </nav>

      {/* API status */}
      <div className="p-2 border-t border-gray-100">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'} text-xs text-gray-500 bg-gradient-to-r from-gray-50 to-white rounded-lg p-2.5 border border-gray-100`}>
          <span className="w-2 h-2 rounded-full bg-green-500 pulse-dot"></span>
          {!collapsed && (
            <span>API Connected • {user?.role === 'admin' ? 'Admin' : 'Agent'}</span>
          )}
        </div>
      </div>
    </aside>
  );
}