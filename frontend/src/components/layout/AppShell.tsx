import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationsPanel from '../NotificationsPanel';
import LanguageToggle from '../LanguageToggle';
import PageBackButton from './PageBackButton';
import { resolveBackTarget } from '../../lib/pageBack';
import { useLanguage } from '../../i18n/LanguageContext';

interface TopbarContext {
  title: string;
  subtitle: string;
}

function buildTopbarContext(
  pathname: string,
  t: (key: string) => string,
  role?: string
): TopbarContext {
  if (pathname.startsWith('/vehicles/') && pathname.endsWith('/share')) {
    return { title: t('topbar.shareTitle'), subtitle: t('topbar.shareSub') };
  }
  if (pathname.startsWith('/vehicles/')) {
    return { title: t('topbar.serviceTitle'), subtitle: t('topbar.serviceSub') };
  }
  if (pathname.startsWith('/analytics')) {
    return {
      title: t('topbar.analyticsTitle'),
      subtitle: role === 'SHOP' ? t('topbar.analyticsSubShop') : t('topbar.analyticsSub'),
    };
  }
  if (pathname.startsWith('/marketplace')) {
    return { title: t('topbar.marketplaceTitle'), subtitle: t('topbar.marketplaceSub') };
  }
  if (pathname.startsWith('/shops')) {
    return { title: t('topbar.shopsTitle'), subtitle: t('topbar.shopsSub') };
  }
  if (pathname.startsWith('/settings')) {
    return { title: t('topbar.settingsTitle'), subtitle: t('topbar.settingsSub') };
  }
  if (pathname.startsWith('/buyer') || pathname.startsWith('/history/')) {
    return { title: t('topbar.historyTitle'), subtitle: t('topbar.historySub') };
  }
  if (pathname.startsWith('/shop')) {
    return { title: t('topbar.shopTitle'), subtitle: t('topbar.shopSub') };
  }
  if (pathname.startsWith('/admin')) {
    return { title: t('topbar.adminTitle'), subtitle: t('topbar.adminSub') };
  }
  if (role === 'OWNER') {
    return { title: t('topbar.dashboardTitle'), subtitle: t('topbar.dashboardSub') };
  }
  return { title: t('topbar.dashboardTitle'), subtitle: '' };
}

export default function AppShell({
  children,
  theme = 'owner',
}: {
  children: React.ReactNode;
  theme?: 'owner' | 'shop' | 'buyer';
}) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const topbar = buildTopbarContext(location.pathname, t, user?.role);
  const backTarget = resolveBackTarget(location.pathname, user?.role);

  const ownerNav = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/analytics', icon: BarChart3, label: t('nav.analytics') },
    { to: '/shops', icon: Wrench, label: t('nav.shops') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const shopNav = [
    { to: '/shop', icon: Wrench, label: t('nav.records') },
    { to: '/analytics', icon: BarChart3, label: t('nav.analytics') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const buyerNav = [{ to: '/buyer', icon: Clock, label: t('nav.history') }];
  const adminNav = [{ to: '/admin', icon: Shield, label: t('nav.admin') }];

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

  const planLabel = t('common.plan', { plan: user?.subscriptionType || t('common.free') });

  return (
    <div className={`app-shell ${theme === 'shop' ? 'theme-shop' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">A</div>
          <span className="sidebar-logo-text">AutoHistory</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
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
            {user?.role !== 'ADMIN' && (
              <span className="tag" style={{ marginTop: 4, fontSize: 10 }}>
                {planLabel}
              </span>
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout} aria-label={t('common.signOut')}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-leading">
            {backTarget && <PageBackButton target={backTarget} />}
            <div className="topbar-copy">
              <h2 className="display topbar-title">{topbar.title}</h2>
              {topbar.subtitle && <span className="muted topbar-subtitle">{topbar.subtitle}</span>}
            </div>
          </div>
          <div className="topbar-actions">
            <LanguageToggle compact />
            {(user?.role === 'OWNER' || user?.role === 'SHOP') && <NotificationsPanel />}
            <div className="topbar-avatar mobile-only" aria-hidden>
              {initials}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm topbar-icon-btn mobile-only"
              onClick={logout}
              aria-label={t('common.signOut')}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>

      <nav className="mobile-tabs" aria-label={t('nav.mainNav')}>
        {nav.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
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
