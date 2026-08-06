import { NavLink } from 'react-router-dom';

export default function Sidebar({ onCloseMobile }) {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition ${
      isActive 
        ? 'bg-orange-50 text-orange-600 border border-orange-600 shadow-sm' 
        : 'text-gray-500 hover:bg-gray-50'
    }`;

  return (
    <aside className="w-60 h-full bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2.5 text-orange-600 font-bold text-lg tracking-wide">
          <i className="fas fa-qrcode text-orange-500 text-2xl"></i>
          <span>QRCODE.NG</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-2 mt-2">
        <NavLink to="/" className={linkClass} onClick={onCloseMobile} end>
          <i className="fas fa-inbox w-4"></i> Campaign Builder
        </NavLink>
        <NavLink to="/history" className={linkClass} onClick={onCloseMobile}>
          <i className="fas fa-history w-4"></i> Sent History
        </NavLink>
        <NavLink to="/templates" className={linkClass} onClick={onCloseMobile}>
          <i className="fas fa-file-alt w-4"></i> Templates
        </NavLink>
        <NavLink to="/analytics" className={linkClass} onClick={onCloseMobile}>
          <i className="fas fa-chart-bar w-4"></i> Analytics
        </NavLink>
        <NavLink to="/designs" className={linkClass} onClick={onCloseMobile}>
          <i className="fas fa-paint-brush w-4"></i> Designs
        </NavLink>
        {/* ─── Check‑In ─────────────────────────────────────────── */}
        <NavLink to="/check-in" className={linkClass} onClick={onCloseMobile}>
          <i className="fas fa-check-circle w-4"></i> Check‑In
        </NavLink>
        <NavLink to="/settings" className={linkClass} onClick={onCloseMobile}>
          <i className="fas fa-cog w-4"></i> Settings
        </NavLink>
      </nav>

      {/* API status */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
          <span className="w-2 h-2 rounded-full bg-green-500 pulse-dot"></span>
          API Connected • Tier 2
        </div>
      </div>
    </aside>
  );
}