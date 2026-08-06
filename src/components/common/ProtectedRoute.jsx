import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const pagePermissions = {
  '/': 'campaigns',
  '/history': 'history',
  '/templates': 'templates',
  '/analytics': 'analytics',
  '/designs': 'designs',
  '/check-in': 'checkin',
  '/settings': 'settings',
};

const getFirstAllowedRoute = (permissions) => {
  console.log('🔎 getFirstAllowedRoute - permissions:', permissions);
  
  // Map permission keys to routes (all lowercase)
  const routeMap = {
    history: '/history',
    templates: '/templates',
    analytics: '/analytics',
    designs: '/designs',
    checkin: '/check-in',
    campaigns: '/', // optional – but agents usually don't have this
  };

  // Normalize permissions to lower case for matching
  for (const perm of permissions) {
    const key = perm.toLowerCase().trim();
    console.log(`  Checking permission: "${perm}" → key: "${key}"`);
    if (routeMap[key]) {
      console.log(`  ✅ Found route for "${key}": ${routeMap[key]}`);
      return routeMap[key];
    }
  }
  console.log('  ❌ No matching permission found, returning /no-access');
  return '/no-access';
};

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const requiredPermission = pagePermissions[location.pathname];
  const isAdmin = user.role === 'admin';

  console.log('\n🔐 ProtectedRoute:', {
    path: location.pathname,
    role: user.role,
    permissions: user.permissions,
    requiredPermission,
    isAdmin,
  });

  if (isAdmin) {
    console.log('  ✅ Admin – full access');
    return children;
  }

  // Agent
  if (requiredPermission) {
    const hasPermission = user.permissions?.includes(requiredPermission);
    console.log(`  🔍 Checking permission for "${requiredPermission}": ${hasPermission}`);
    if (!hasPermission) {
      if (location.pathname === '/') {
        const firstRoute = getFirstAllowedRoute(user.permissions || []);
        console.log(`  🔄 Redirecting from / to first allowed: ${firstRoute}`);
        return <Navigate to={firstRoute} replace />;
      }
      console.log('  ⛔ No access – redirecting to /no-access');
      return <Navigate to="/no-access" replace />;
    }
  } else {
    // No permission required (e.g., /no-access, /spreadsheet-editor, etc.)
    console.log('  ✅ No permission required, access granted');
    return children;
  }

  console.log('  ✅ Access granted');
  return children;
}