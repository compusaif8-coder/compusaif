import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getDashboardSession, DashboardPermission, PERMISSION_ROUTES } from '@/lib/dashboardAuth';

// Map each route path → required permission
const ROUTE_PERMISSION_MAP: Record<string, DashboardPermission> = {
  '/analytics': 'analytics',
  '/visitor-logs': 'visitor-logs',
  '/profit-analysis': 'profit-analysis',
  '/orders': 'orders',
  '/admin': 'admin',
  '/works': 'works',
  '/cashier': 'cashier',
  '/attendance': 'attendance',
  '/site-customizer': 'site-customizer',
};

const ProtectedDashboardRoute = () => {
  const location = useLocation();
  const session = getDashboardSession();

  // Not logged in at all → go to dashboard login
  if (!session) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  // Check if the current route requires a specific permission
  const requiredPermission = ROUTE_PERMISSION_MAP[location.pathname];

  if (requiredPermission && !session.permissions.includes(requiredPermission)) {
    // User is logged in but doesn't have permission for this page
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8 bg-white rounded-2xl border shadow-sm max-w-md">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900">غير مصرح لك بالوصول</h1>
          <p className="text-gray-500">
            حسابك <span className="font-semibold text-gray-700">"{session.displayName}"</span> لا يملك صلاحية الوصول إلى هذه الصفحة.
          </p>
          <p className="text-sm text-gray-400">تواصل مع المسؤول لمنحك الصلاحية المطلوبة.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedDashboardRoute;
