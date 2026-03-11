import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const NAV_ITEMS = {
  donor: [
    { path: '/dashboard/donor', label: 'Dashboard' },
    { path: '/dashboard/history', label: 'Donation History' },
    { path: '/dashboard/profile', label: 'Profile' },
    { path: '/dashboard/map', label: 'Map' },
  ],
  patient: [
    { path: '/dashboard/patient', label: 'Dashboard' },
    { path: '/dashboard/requests/new', label: 'New Request' },
    { path: '/dashboard/profile', label: 'Profile' },
    { path: '/dashboard/map', label: 'Map' },
  ],
  hospital: [
    { path: '/dashboard/hospital', label: 'Dashboard' },
    { path: '/dashboard/requests/new', label: 'New Request' },
    { path: '/dashboard/map', label: 'Map' },
    { path: '/dashboard/profile', label: 'Profile' },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { unreadCount, markAllRead } = useNotifications();
  const location = useLocation();

  const navItems = NAV_ITEMS[user?.role] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link to={`/dashboard/${user?.role}`} className="text-xl font-bold text-primary-600">
            RaktSetu
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <button
              onClick={markAllRead}
              className="relative p-2 text-gray-500 hover:text-gray-700"
              title="Notifications"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700 font-medium">{user?.name}</span>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full capitalize">
                {user?.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-600 font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex overflow-x-auto px-4 pb-2 space-x-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                location.pathname === item.path
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
