import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Eye, Flag, Shield, Store, Users, XCircle } from 'lucide-react';
import { api } from '../api';
import PageTransition from '../components/layout/PageTransition';
import type {
  AdminStats,
  AdminUser,
  ModerationReport,
  MaintenanceEvent,
  BadgeAnalytics,
  SiteVisitStats,
} from '../types';

const PARTNER_KEY = import.meta.env.VITE_PARTNER_API_KEY || 'dev-partner-key-change-me';

type Tab = 'overview' | 'traffic' | 'users' | 'shops' | 'moderation' | 'partners';
type VisitRange = '24h' | '7d' | '30d' | '90d';

const RANGES: { id: VisitRange; label: string }[] = [
  { id: '24h', label: '24 hours' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
];

export default function AdminPage() {
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

  async function loadOverview() {
    const s = await api.adminStats();
    setStats(s);
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

  async function loadTab(t: Tab) {
    setLoading(true);
    setActionMsg('');
    try {
      if (t === 'overview') await loadOverview();
      if (t === 'traffic') await loadTraffic();
      if (t === 'users') await loadUsers();
      if (t === 'shops') await loadPendingShops();
      if (t === 'moderation') await loadModeration();
      if (t === 'partners') {
        try {
          setBadgeStats(await api.badgeAnalytics(PARTNER_KEY));
        } catch {
          setBadgeStats(null);
        }
        const ins = await api.insuranceSummary(PARTNER_KEY).catch(() => null);
        if (ins) setActionMsg(`Insurance feed: ${ins.fleetSize} vehicles, ${ins.platformVerificationRate}% verified`);
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
    setActionMsg(u.banned ? 'User unbanned' : 'User banned');
    loadUsers();
  }

  async function approveShop(id: string) {
    await api.adminVerifyShop(id, true);
    setActionMsg('Shop approved — they can verify records now');
    loadPendingShops();
    if (stats) setStats({ ...stats, pendingShops: Math.max(0, (stats.pendingShops ?? 1) - 1) });
  }

  async function rejectShop(id: string) {
    await api.adminVerifyShop(id, false);
    setActionMsg('Shop request rejected');
    loadPendingShops();
    if (stats) setStats({ ...stats, pendingShops: Math.max(0, (stats.pendingShops ?? 1) - 1) });
  }

  async function resolveReport(id: string, flagTarget: boolean) {
    await api.adminResolveReport(id, 'RESOLVED', flagTarget);
    setActionMsg('Report resolved');
    loadModeration();
  }

  async function unflagEvent(id: string) {
    await api.adminFlagEvent(id, false);
    loadModeration();
  }

  const maxDay = visitStats ? Math.max(1, ...visitStats.timeline.map((d) => d.count)) : 1;

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'traffic', label: 'Traffic', icon: Eye },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'shops', label: 'Shop approvals', icon: Store },
    { id: 'moderation', label: 'Moderation', icon: Flag },
    { id: 'partners', label: 'Partners', icon: Shield },
  ];

  return (
    <PageTransition>
      <h1 className="display" style={{ fontSize: 40, marginBottom: 8 }}>
        Admin console
      </h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Platform users, shop approvals, site traffic, fraud moderation, and partner analytics.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${tab === t.id ? 'btn-solid' : 'btn-ghost'}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} /> {t.label}
            {t.id === 'shops' && (stats?.pendingShops ?? pendingShops.length) > 0
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
                <span className="mono muted">Users</span>
                <strong style={{ fontSize: 28 }}>{stats.users}</strong>
              </div>
              <div className="card-stat">
                <span className="mono muted">Shops</span>
                <strong style={{ fontSize: 28 }}>{stats.shops}</strong>
              </div>
              <div className="card-stat">
                <span className="mono muted">Pending shops</span>
                <strong style={{ fontSize: 28, color: stats.pendingShops ? 'var(--color-warning)' : undefined }}>
                  {stats.pendingShops ?? 0}
                </strong>
              </div>
              <div className="card-stat">
                <span className="mono muted">Vehicles</span>
                <strong style={{ fontSize: 28 }}>{stats.vehicles}</strong>
              </div>
              <div className="card-stat">
                <span className="mono muted">Flagged</span>
                <strong style={{ fontSize: 28, color: stats.flaggedEvents ? 'var(--color-danger)' : undefined }}>
                  {stats.flaggedEvents}
                </strong>
              </div>
              {badgeStats && (
                <div className="card-stat" style={{ gridColumn: '1 / -1' }}>
                  <span className="mono muted">Badge ({badgeStats.period})</span>
                  <p style={{ marginTop: 8 }}>
                    {badgeStats.totalEvents} events · {badgeStats.conversionRate}% click rate ·{' '}
                    {badgeStats.uniqueBadges} badges
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'shops' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="muted" style={{ marginBottom: 4 }}>
                New repair shops cannot verify records until you approve them here.
              </p>
              {pendingShops.length === 0 ? (
                <p className="muted">No shop accounts waiting for approval.</p>
              ) : (
                pendingShops.map((s) => (
                  <div key={s.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <strong style={{ fontSize: 16 }}>{s.shopName || 'Unnamed shop'}</strong>
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
                          Requested {new Date(s.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <button type="button" className="btn btn-solid btn-sm" onClick={() => approveShop(s.id)}>
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => rejectShop(s.id)}>
                          <XCircle size={14} /> Reject
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
                  <span className="mono muted">Page views</span>
                  <strong style={{ fontSize: 28 }}>{visitStats.totalVisits}</strong>
                </div>
                <div className="card-stat">
                  <span className="mono muted">Unique visitors</span>
                  <strong style={{ fontSize: 28 }}>{visitStats.uniqueVisitors}</strong>
                </div>
                <div className="card-stat">
                  <span className="mono muted">Signed-in visitors</span>
                  <strong style={{ fontSize: 28 }}>{visitStats.signedInVisitors}</strong>
                </div>
              </div>

              {visitStats.timeline.length > 0 && (
                <section>
                  <h2 className="display" style={{ fontSize: 22, marginBottom: 12 }}>
                    Visits by day
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
                  Top pages
                </h2>
                {visitStats.topPaths.length === 0 ? (
                  <p className="muted">No visits in this period yet. Open the site in another tab to generate traffic.</p>
                ) : (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr className="mono muted" style={{ textAlign: 'left' }}>
                          <th style={{ padding: 8 }}>Path</th>
                          <th style={{ padding: 8 }}>Views</th>
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
                  Recent visits
                </h2>
                {visitStats.recent.length === 0 ? (
                  <p className="muted">No recent visits.</p>
                ) : (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr className="mono muted" style={{ textAlign: 'left' }}>
                          <th style={{ padding: 8 }}>When</th>
                          <th style={{ padding: 8 }}>Path</th>
                          <th style={{ padding: 8 }}>Session</th>
                          <th style={{ padding: 8 }}>Auth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitStats.recent.map((v, i) => (
                          <tr key={`${v.createdAt}-${i}`} style={{ borderTop: '1px solid var(--color-border)' }}>
                            <td style={{ padding: 8 }} className="mono muted">
                              {new Date(v.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: 8 }} className="mono">
                              {v.path}
                            </td>
                            <td style={{ padding: 8 }} className="mono muted">
                              {v.sessionId}…
                            </td>
                            <td style={{ padding: 8 }}>
                              {v.signedIn ? <span className="tag tag-green">signed in</span> : <span className="muted">guest</span>}
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
                    <th style={{ padding: 8 }}>Name</th>
                    <th style={{ padding: 8 }}>Email</th>
                    <th style={{ padding: 8 }}>Role</th>
                    <th style={{ padding: 8 }}>Status</th>
                    <th style={{ padding: 8 }}>Vehicles</th>
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
                          <span className="tag" style={{ color: 'var(--color-danger)' }}>Banned</span>
                        ) : u.role === 'SHOP' && !u.shopVerified ? (
                          <span className="tag tag-warning">Pending</span>
                        ) : u.role === 'SHOP' ? (
                          <span className="tag tag-verified">Approved</span>
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
                            <Ban size={14} /> {u.banned ? 'Unban' : 'Ban'}
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
                    Pending reports
                  </h2>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={async () => {
                      await api.adminSeedDemoReport();
                      loadModeration();
                    }}
                  >
                    Seed demo report
                  </button>
                </div>
                {reports.length === 0 ? (
                  <p className="muted">No pending reports.</p>
                ) : (
                  reports.map((r) => (
                    <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                      <p>
                        <strong>{r.targetType}</strong> · {r.reason}
                      </p>
                      <p className="mono muted" style={{ fontSize: 12 }}>
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-solid btn-sm"
                          onClick={() => resolveReport(r.id, true)}
                        >
                          Resolve & flag
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => resolveReport(r.id, false)}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section>
                <h2 className="display" style={{ fontSize: 22, marginBottom: 12 }}>
                  Flagged events
                </h2>
                {flagged.length === 0 ? (
                  <p className="muted">No flagged events.</p>
                ) : (
                  flagged.map((e) => (
                    <div key={e.id} className="card" style={{ marginBottom: 8 }}>
                      <p>
                        {e.eventType} · {e.vehicle?.year} {e.vehicle?.make} {e.vehicle?.model}
                      </p>
                      <p className="muted" style={{ fontSize: 13 }}>
                        Owner: {e.vehicle?.owner?.email}
                      </p>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={() => unflagEvent(e.id)}
                      >
                        Clear flag
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
                Badge analytics (30d)
              </h2>
              <div className="grid-stats" style={{ marginTop: 16 }}>
                <div className="card-stat">
                  <span className="mono muted">Total events</span>
                  <strong>{badgeStats.totalEvents}</strong>
                </div>
                <div className="card-stat">
                  <span className="mono muted">Click rate</span>
                  <strong>{badgeStats.conversionRate}%</strong>
                </div>
                <div className="card-stat">
                  <span className="mono muted">Active badges</span>
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
                Insurance API: GET /api/insurance/reliability (partner key). Embed tracks via POST
                /api/partners/badge-events.
              </p>
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}
