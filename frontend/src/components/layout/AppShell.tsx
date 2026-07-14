import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  ShoppingBag,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationsPanel from '../NotificationsPanel';

interface TopbarContext {
  title: string;
  subtitle: string;
}

function buildTopbarContext(pathname: string, role?: string): TopbarContext {
  if (pathname.startsWith('/vehicles/') && pathname.endsWith('/share')) {
    return { title: 'Share history', subtitle: 'Set detail level, then copy the link' };
  }
  if (pathname.startsWith('/vehicles/')) {
    return { title: 'Service history', subtitle: 'Shop-verified and owner records' };
  }
  if (pathname.startsWith('/analytics')) {
    return { title: 'Analytics', subtitle: 'Trust score, spend, and service types' };
  }
  if (pathname.startsWith('/marketplace')) {
    return { title: 'Marketplace', subtitle: 'Parts matched to your vehicle' };
  }
  if (pathname.startsWith('/shops')) {
    return { title: 'Shops', subtitle: 'Partners that add verified records' };
  }
  if (pathname.startsWith('/settings')) {
    return { title: 'Settings', subtitle: 'Profile and plan' };
  }
  if (pathname.startsWith('/buyer') || pathname.startsWith('/history/')) {
    return { title: 'History', subtitle: 'Open a shared maintenance link' };
  }
  if (pathname.startsWith('/shop')) {
    return { title: 'Shop', subtitle: 'Verified records and owner reports' };
  }
  if (pathname.startsWith('/admin')) {
    return { title: 'Admin', subtitle: 'Users, moderation, and partners' };
  }
  if (role === 'OWNER') {
    return { title: 'Dashboard', subtitle: 'Vehicles and recent activity' };
  }
  return { title: 'Dashboard', subtitle: '' };
}

const ownerNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
  { to: '/shops', icon: Wrench, label: 'Shops' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const shopNav = [
  { to: '/shop', icon: Wrench, label: 'Records' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const buyerNav = [{ to: '/buyer', icon: Clock, label: 'History' }];

const adminNav = [{ to: '/admin', icon: Shield, label: 'Admin' }];

export default function AppShell({
  children,
  theme = 'owner',
}: {
  children: React.ReactNode;
  theme?: 'owner' | 'shop' | 'buyer';
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const topbar = buildTopbarContext(location.pathname, user?.role);
  const nav =
    user?.role === 'ADMIN'
      ? adminNav
      : user?.role === 'SHOP'
        ? shopNav
        : user?.role === 'BUYER'
          ? buyerNav
          : ownerNav;
  const initials = (user?.fullName || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`app-shell ${theme === 'shop' ? 'theme-shop' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">A</div>
          <span className="sidebar-logo-text">AUTOHISTORY</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.shopName || user?.fullName}
            </div>
            <span className="tag" style={{ marginTop: 4, fontSize: 10 }}>
              {user?.subscriptionType || 'free'} plan
            </span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout} aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-copy">
            <h2 className="display topbar-title">{topbar.title}</h2>
            {topbar.subtitle && <span className="mono muted topbar-subtitle">{topbar.subtitle}</span>}
          </div>
          <div className="topbar-actions">
            {user?.role === 'OWNER' && <NotificationsPanel />}
            <div className="topbar-avatar mobile-only" aria-hidden>
              {initials}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm topbar-icon-btn mobile-only"
              onClick={logout}
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>

      <nav className="mobile-tabs" aria-label="Main navigation">
        {nav.slice(0, 5).map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `mobile-tab-link ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <item.icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                <span>{item.label.split(' ')[0]}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
