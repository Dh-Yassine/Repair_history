import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  ShoppingBag,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  Bell,
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
    return { title: 'Share history', subtitle: 'Choose access, detail, then send a buyer-ready link' };
  }
  if (pathname.startsWith('/vehicles/')) {
    return { title: 'Timeline', subtitle: 'Verified shop records and self-reported events' };
  }
  if (pathname.startsWith('/analytics')) {
    return { title: 'Analytics', subtitle: 'Trust score, cost trends, and upcoming services' };
  }
  if (pathname.startsWith('/marketplace')) {
    return { title: 'Marketplace', subtitle: 'Parts and accessories matched to your vehicle' };
  }
  if (pathname.startsWith('/shops')) {
    return { title: 'Verified shops', subtitle: 'Partner garages that create trusted service records' };
  }
  if (pathname.startsWith('/settings')) {
    return { title: 'Settings', subtitle: 'Profile, plan, and integrations' };
  }
  if (pathname.startsWith('/buyer') || pathname.startsWith('/history/')) {
    return { title: 'Check history', subtitle: 'Inspect a seller-shared link before you buy' };
  }
  if (pathname.startsWith('/shop')) {
    return { title: 'Shop operations', subtitle: 'Create verified records, manage owner reports' };
  }
  if (pathname.startsWith('/admin')) {
    return { title: 'Admin', subtitle: 'Platform overview' };
  }
  if (role === 'OWNER') {
    return { title: 'Dashboard', subtitle: 'Your verified vehicle history at a glance' };
  }
  return { title: 'Dashboard', subtitle: '' };
}

const ownerNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
  { to: '/shops', icon: Wrench, label: 'Verified Shops' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const shopNav = [
  { to: '/shop', icon: Wrench, label: 'Service Records' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const buyerNav = [{ to: '/buyer', icon: Clock, label: 'Check History' }];

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
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <h2 className="display" style={{ fontSize: 22, lineHeight: 1 }}>
              {topbar.title}
            </h2>
            {topbar.subtitle && (
              <span className="mono muted" style={{ fontSize: 11, marginTop: 4, letterSpacing: '0.04em' }}>
                {topbar.subtitle}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user?.role === 'OWNER' && <NotificationsPanel />}
            {user?.role !== 'OWNER' && (
              <button type="button" className="btn btn-ghost btn-sm" aria-label="Notifications">
                <Bell size={18} />
              </button>
            )}
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>

      <nav className="mobile-tabs">
        {nav.slice(0, 5).map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
              padding: '4px 8px',
            })}
          >
            <item.icon size={20} />
            {item.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
