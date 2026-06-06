import { useEffect, useState } from 'react';
import { Ban, Flag, Shield, Users } from 'lucide-react';
import { api } from '../api';
import PageTransition from '../components/layout/PageTransition';
import type { AdminStats, AdminUser, ModerationReport, MaintenanceEvent, BadgeAnalytics } from '../types';

const PARTNER_KEY = import.meta.env.VITE_PARTNER_API_KEY || 'dev-partner-key-change-me';

type Tab = 'overview' | 'users' | 'moderation' | 'partners';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [flagged, setFlagged] = useState<MaintenanceEvent[]>([]);
  const [badgeStats, setBadgeStats] = useState<BadgeAnalytics | null>(null);
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

  async function loadUsers() {
    const { users: u } = await api.adminUsers();
    setUsers(u);
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
      if (t === 'users') await loadUsers();
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

  async function toggleBan(u: AdminUser) {
    await api.adminBanUser(u.id, !u.banned);
    setActionMsg(u.banned ? 'User unbanned' : 'User banned');
    loadUsers();
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

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'moderation', label: 'Moderation', icon: Flag },
    { id: 'partners', label: 'Partners', icon: Shield },
  ];

  return (
    <PageTransition>
      <h1 className="display" style={{ fontSize: 40, marginBottom: 8 }}>
        Admin console
      </h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Platform users, fraud moderation, and partner analytics.
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

          {tab === 'users' && (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr className="mono muted" style={{ textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>Name</th>
                    <th style={{ padding: 8 }}>Email</th>
                    <th style={{ padding: 8 }}>Role</th>
                    <th style={{ padding: 8 }}>Vehicles</th>
                    <th style={{ padding: 8 }} />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 8 }}>{u.fullName}</td>
                      <td style={{ padding: 8 }}>{u.email}</td>
                      <td style={{ padding: 8 }}>
                        <span className="tag">{u.role}</span>
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
