import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Eye, Flag, Shield, Store, Users, XCircle } from 'lucide-react';
import { formatDateTime } from '../lib/format';
import { api } from '../api';
import PageTransition from '../components/layout/PageTransition';
import { useLanguage, useEventTypeLabel } from '../i18n/LanguageContext';
import type {
  AdminStats,
  AdminUser,
  ModerationReport,
  MaintenanceEvent,
  BadgeAnalytics,
  SiteVisitStats,
} from '../types';

const PARTNER_KEY = import.meta.env.VITE_PARTNER_API_KEY || '';

type Tab = 'overview' | 'traffic' | 'users' | 'shops' | 'moderation' | 'partners';
type VisitRange = '24h' | '7d' | '30d' | '90d';

export default function AdminPage() {
  const { t } = useLanguage();
  const labelEvent = useEventTypeLabel();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingShops, setPendingShops] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [flagged, setFlagged] = useState<MaintenanceEvent[]>([]);
  const [badgeStats, setBadgeStats] = useState<BadgeAnalytics | null>(null);
  const [visitStats, setVisitStats] = useState<SiteVisitStats | null>(null);
  const [visitRange, setVisitRange] = useState<VisitRange>('7d');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const RANGES: { id: VisitRange; label: string }[] = [
    { id: '24h', label: t('admin.range24h') },
    { id: '7d', label: t('admin.range7d') },
    { id: '30d', label: t('admin.range30d') },
    { id: '90d', label: t('admin.range90d') },
  ];

  async function loadOverview() {
    const s = await api.adminStats();
    setStats(s);
    if (!PARTNER_KEY) {
      setBadgeStats(null);
      return;
    }
    try {
      setBadgeStats(await api.badgeAnalytics(PARTNER_KEY));
    } catch {
      setBadgeStats(null);
    }
  }

  async function loadTraffic(range: VisitRange = visitRange) {
    setVisitStats(await api.adminVisits(range));
  }

  async function loadUsers() {
    const { users: u } = await api.adminUsers();
    setUsers(u);
  }

  async function loadPendingShops() {
    const { shops } = await api.adminPendingShops();
    setPendingShops(shops);
  }

  async function loadModeration() {
    const [r, f] = await Promise.all([api.adminReports(), api.adminFlaggedEvents()]);
    setReports(r.reports);
    setFlagged(f.events);
  }

  async function loadTab(tTab: Tab) {
    setLoading(true);
    setActionMsg('');
    try {
      if (tTab === 'overview') await loadOverview();
      if (tTab === 'traffic') await loadTraffic();
      if (tTab === 'users') await loadUsers();
      if (tTab === 'shops') await loadPendingShops();
      if (tTab === 'moderation') await loadModeration();
      if (tTab === 'partners') {
        if (PARTNER_KEY) {
          try {
            setBadgeStats(await api.badgeAnalytics(PARTNER_KEY));
          } catch {
            setBadgeStats(null);
          }
          const ins = await api.insuranceSummary(PARTNER_KEY).catch(() => null);
          if (ins) {
            setActionMsg(
              t('admin.insuranceFeed', { size: ins.fleetSize, rate: ins.platformVerificationRate })
            );
          }
        } else {
          setBadgeStats(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  async function changeVisitRange(range: VisitRange) {
    setVisitRange(range);
    setLoading(true);
    try {
      await loadTraffic(range);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBan(u: AdminUser) {
    await api.adminBanUser(u.id, !u.banned);
    setActionMsg(u.banned ? t('admin.userUnbanned') : t('admin.userBanned'));
    loadUsers();
  }

  async function approveShop(id: string) {
    await api.adminVerifyShop(id, true);
    setActionMsg(t('admin.shopApproved'));
    loadPendingShops();
    if (stats) setStats({ ...stats, pendingShops: Math.max(0, (stats.pendingShops ?? 1) - 1) });
  }

  async function rejectShop(id: string) {
    await api.adminVerifyShop(id, false);
    setActionMsg(t('admin.shopRejected'));
    loadPendingShops();
    if (stats) setStats({ ...stats, pendingShops: Math.max(0, (stats.pendingShops ?? 1) - 1) });
  }

  async function resolveReport(id: string, flagTarget: boolean) {
    await api.adminResolveReport(id, 'RESOLVED', flagTarget);
    setActionMsg(t('admin.reportResolved'));
    loadModeration();
  }

  async function unflagEvent(id: string) {
    await api.adminFlagEvent(id, false);
    loadModeration();
  }

  const maxDay = visitStats ? Math.max(1, ...visitStats.timeline.map((d) => d.count)) : 1;

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: t('admin.overview'), icon: Shield },
    { id: 'traffic', label: t('admin.traffic'), icon: Eye },
    { id: 'users', label: t('admin.users'), icon: Users },
    { id: 'shops', label: t('admin.shopApprovals'), icon: Store },
    { id: 'moderation', label: t('admin.moderation'), icon: Flag },
    { id: 'partners', label: t('admin.partners'), icon: Shield },
  ];

  return (
    <PageTransition>
      <h1 className="display" style={{ fontSize: 40, marginBottom: 8 }}>
        {t('admin.title')}
      </h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        {t('admin.lead')}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {tabs.map((tTab) => (
          <button
            key={tTab.id}
            type="button"
            className={`btn ${tab === tTab.id ? 'btn-solid' : 'btn-ghost'}`}
            onClick={() => setTab(tTab.id)}
          >
            <tTab.icon size={16} /> {tTab.label}
            {tTab.id === 'shops' && (stats?.pendingShops ?? pendingShops.length) > 0
              ? ` (${stats?.pendingShops ?? pendingShops.length})`
              : ''}
          </button>
        ))}
      </div>

      {actionMsg && (
        <p className="tag tag-green" style={{ marginBottom: 16 }}>
          {actionMsg}
        </p>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : (
        <>
          {tab === 'overview' && stats && (
            <div className="grid-stats">
              <div className="card-stat">
                <span className="mono muted">{t('admin.usersCount')}</span>
                <strong style={{ fontSize: 28 }}>{stats.users}</strong>
              </div>
              <div className="card-stat">
                <span className="mono muted">{t('admin.shops')}</span>
                <strong style={{ fontSize: 28 }}>{stats.shops}</strong>
              </div>
              <div className="card-stat">
                <span className="mono muted">{t('admin.pendingShops')}</span>
                <strong style={{ fontSize: 28, color: stats.pendingShops ? 'var(--color-warning)' : undefined }}>
                  {stats.pendingShops ?? 0}
                </strong>
              </div>
              <div className="card-stat">
                <span className="mono muted">{t('admin.vehicles')}</span>
                <strong style={{ fontSize: 28 }}>{stats.vehicles}</strong>
              </div>
              <div className="card-stat">
                <span className="mono muted">{t('admin.flagged')}</span>
                <strong style={{ fontSize: 28, color: stats.flaggedEvents ? 'var(--color-danger)' : undefined }}>
                  {stats.flaggedEvents}
                </strong>
              </div>
              {badgeStats && (
                <div className="card-stat" style={{ gridColumn: '1 / -1' }}>
                  <span className="mono muted">
                    {t('admin.badgeLabel')} ({badgeStats.period})
                  </span>
                  <p style={{ marginTop: 8 }}>
                    {t('admin.badgeSummary', {
                      events: badgeStats.totalEvents,
                      rate: badgeStats.conversionRate,
                      badges: badgeStats.uniqueBadges,
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'shops' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="muted" style={{ marginBottom: 4 }}>
                {t('admin.shopPendingLead')}
              </p>
              {pendingShops.length === 0 ? (
                <p className="muted">{t('admin.noPendingShops')}</p>
              ) : (
                pendingShops.map((s) => (
                  <div key={s.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <strong style={{ fontSize: 16 }}>{s.shopName || t('admin.unnamedShop')}</strong>
                        <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
                          {s.fullName} · {s.email}
                          {s.phone ? ` · ${s.phone}` : ''}
                        </p>
                        {s.address && (
                          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                            {s.address}
                          </p>
                        )}
                        <p className="mono muted" style={{ marginTop: 8, fontSize: 11 }}>
                          {t('admin.requested', { date: formatDateTime(s.createdAt) })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <button type="button" className="btn btn-solid btn-sm" onClick={() => approveShop(s.id)}>
                          <CheckCircle2 size={14} /> {t('admin.approve')}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => rejectShop(s.id)}>
                          <XCircle size={14} /> {t('admin.reject')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'traffic' && visitStats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`btn btn-sm ${visitRange === r.id ? 'btn-solid' : 'btn-outline'}`}
                    onClick={() => changeVisitRange(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="grid-stats">
                <div className="card-stat">
                  <span className="mono muted">{t('admin.pageViews')}</span>
                  <strong style={{ fontSize: 28 }}>{visitStats.totalVisits}</strong>
                </div>
                <div className="card-stat">
                  <span className="mono muted">{t('admin.uniqueVisitors')}</span>
                  <strong style={{ fontSize: 28 }}>{visitStats.uniqueVisitors}</strong>
                </div>
                <div className="card-stat">
                  <span className="mono muted">{t('admin.signedInVisitors')}</span>
                  <strong style={{ fontSize: 28 }}>{visitStats.signedInVisitors}</strong>
                </div>
              </div>

              {visitStats.timeline.length > 0 && (
                <section>
                  <h2 className="display" style={{ fontSize: 22, marginBottom: 12 }}>
                    {t('admin.visitsByDay')}
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 6,
                      height: 120,
                      overflowX: 'auto',
                      paddingBottom: 4,
                    }}
                  >
                    {visitStats.timeline.map((d) => (
                      <div
                        key={d.date}
                        title={`${d.date}: ${d.count}`}
                        style={{
                          flex: '1 0 28px',
                          minWidth: 28,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          height: '100%',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <span className="mono" style={{ fontSize: 10 }}>
                          {d.count}
                        </span>
                        <div
                          style={{
                            width: '100%',
                            height: `${Math.max(4, (d.count / maxDay) * 80)}px`,
                            background: 'var(--color-accent, #1a5c4a)',
                            borderRadius: 4,
                            opacity: 0.85,
                          }}
                        />
                        <span className="mono muted" style={{ fontSize: 9 }}>
                          {d.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="display" style={{ fontSize: 22, marginBottom: 12 }}>
                  {t('admin.topPages')}
                </h2>
                {visitStats.topPaths.length === 0 ? (
                  <p className="muted">{t('admin.noVisits')}</p>
                ) : (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr className="mono muted" style={{ textAlign: 'left' }}>
                          <th style={{ padding: 8 }}>{t('admin.path')}</th>
                          <th style={{ padding: 8 }}>{t('admin.views')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitStats.topPaths.map((p) => (
                          <tr key={p.path} style={{ borderTop: '1px solid var(--color-border)' }}>
                            <td style={{ padding: 8 }} className="mono">
                              {p.path}
                            </td>
                            <td style={{ padding: 8 }}>{p.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h2 className="display" style={{ fontSize: 22, marginBottom: 12 }}>
                  {t('admin.recentVisits')}
                </h2>
                {visitStats.recent.length === 0 ? (
                  <p className="muted">{t('admin.noRecentVisits')}</p>
                ) : (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr className="mono muted" style={{ textAlign: 'left' }}>
                          <th style={{ padding: 8 }}>{t('admin.when')}</th>
                          <th style={{ padding: 8 }}>{t('admin.path')}</th>
                          <th style={{ padding: 8 }}>{t('admin.session')}</th>
                          <th style={{ padding: 8 }}>{t('admin.auth')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitStats.recent.map((v, i) => (
                          <tr key={`${v.createdAt}-${i}`} style={{ borderTop: '1px solid var(--color-border)' }}>
                            <td style={{ padding: 8 }} className="mono muted">
                              {formatDateTime(v.createdAt)}
                            </td>
                            <td style={{ padding: 8 }} className="mono">
                              {v.path}
                            </td>
                            <td style={{ padding: 8 }} className="mono muted">
                              {v.sessionId}…
                            </td>
                            <td style={{ padding: 8 }}>
                              {v.signedIn ? (
                                <span className="tag tag-green">{t('admin.signedIn')}</span>
                              ) : (
                                <span className="muted">{t('admin.guest')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === 'users' && (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr className="mono muted" style={{ textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>{t('admin.name')}</th>
                    <th style={{ padding: 8 }}>{t('admin.email')}</th>
                    <th style={{ padding: 8 }}>{t('admin.role')}</th>
                    <th style={{ padding: 8 }}>{t('admin.status')}</th>
                    <th style={{ padding: 8 }}>{t('admin.vehicles')}</th>
                    <th style={{ padding: 8 }} />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 8 }}>
                        {u.fullName}
                        {u.shopName ? <span className="muted"> · {u.shopName}</span> : null}
                      </td>
                      <td style={{ padding: 8 }}>{u.email}</td>
                      <td style={{ padding: 8 }}>
                        <span className="tag">{u.role}</span>
                      </td>
                      <td style={{ padding: 8 }}>
                        {u.banned ? (
                          <span className="tag" style={{ color: 'var(--color-danger)' }}>
                            {t('admin.banned')}
                          </span>
                        ) : u.role === 'SHOP' && !u.shopVerified ? (
                          <span className="tag tag-warning">{t('admin.pending')}</span>
                        ) : u.role === 'SHOP' ? (
                          <span className="tag tag-verified">{t('admin.approved')}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td style={{ padding: 8 }}>{u._count?.vehicles ?? '—'}</td>
                      <td style={{ padding: 8 }}>
                        {u.role !== 'ADMIN' && (
                          <button
                            type="button"
                            className={`btn btn-sm ${u.banned ? 'btn-outline' : 'btn-ghost'}`}
                            onClick={() => toggleBan(u)}
                          >
                            <Ban size={14} /> {u.banned ? t('admin.unban') : t('admin.ban')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'moderation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 className="display" style={{ fontSize: 22 }}>
                    {t('admin.pendingReports')}
                  </h2>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={async () => {
                      await api.adminSeedDemoReport();
                      loadModeration();
                    }}
                  >
                    {t('admin.seedDemo')}
                  </button>
                </div>
                {reports.length === 0 ? (
                  <p className="muted">{t('admin.noReports')}</p>
                ) : (
                  reports.map((r) => (
                    <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                      <p>
                        <strong>{r.targetType}</strong> · {r.reason}
                      </p>
                      <p className="mono muted" style={{ fontSize: 12 }}>
                        {formatDateTime(r.createdAt)}
                      </p>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-solid btn-sm"
                          onClick={() => resolveReport(r.id, true)}
                        >
                          {t('admin.resolveFlag')}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => resolveReport(r.id, false)}>
                          {t('admin.dismiss')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section>
                <h2 className="display" style={{ fontSize: 22, marginBottom: 12 }}>
                  {t('admin.flaggedEvents')}
                </h2>
                {flagged.length === 0 ? (
                  <p className="muted">{t('admin.noFlagged')}</p>
                ) : (
                  flagged.map((e) => (
                    <div key={e.id} className="card" style={{ marginBottom: 8 }}>
                      <p>
                        {labelEvent(e.eventType)} · {e.vehicle?.year} {e.vehicle?.make} {e.vehicle?.model}
                      </p>
                      <p className="muted" style={{ fontSize: 13 }}>
                        {t('admin.ownerLabel', { email: e.vehicle?.owner?.email ?? '—' })}
                      </p>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={() => unflagEvent(e.id)}
                      >
                        {t('admin.clearFlag')}
                      </button>
                    </div>
                  ))
                )}
              </section>
            </div>
          )}

          {tab === 'partners' && badgeStats && (
            <div className="card">
              <h2 className="display" style={{ fontSize: 22 }}>
                {t('admin.badgeAnalytics')}
              </h2>
              <div className="grid-stats" style={{ marginTop: 16 }}>
                <div className="card-stat">
                  <span className="mono muted">{t('analytics.totalEvents')}</span>
                  <strong>{badgeStats.totalEvents}</strong>
                </div>
                <div className="card-stat">
                  <span className="mono muted">{t('admin.clickRate')}</span>
                  <strong>{badgeStats.conversionRate}%</strong>
                </div>
                <div className="card-stat">
                  <span className="mono muted">{t('admin.activeBadges')}</span>
                  <strong>{badgeStats.uniqueBadges}</strong>
                </div>
              </div>
              <ul style={{ marginTop: 16, paddingLeft: 20 }}>
                {Object.entries(badgeStats.byType).map(([k, v]) => (
                  <li key={k} className="mono">
                    {k}: {v}
                  </li>
                ))}
              </ul>
              <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
                {t('admin.insuranceApiNote')}
              </p>
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}
