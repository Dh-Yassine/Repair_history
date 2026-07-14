import { useEffect, useState } from 'react';
import { ClipboardCheck, Clock, History, ShieldCheck, UsersRound } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/layout/PageTransition';
import CreateVerifiedEventForm from '../components/shop/CreateVerifiedEventForm';
import PendingVerificationList from '../components/shop/PendingVerificationList';
import VerificationHistoryList from '../components/shop/VerificationHistoryList';
import type { MaintenanceEvent, Verification } from '../types';

type ShopTab = 'create' | 'pending' | 'history';

export default function ShopDashboardPage() {
  const { user, refreshUser } = useAuth();
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [verifications, setVerifications] = useState<(Verification & { event?: MaintenanceEvent })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ShopTab>('create');

  const approved = Boolean(user?.shopVerified);

  async function load() {
    if (!approved) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ events: list }, { verifications: history }] = await Promise.all([
        api.shopEvents(),
        api.shopVerifications(),
      ]);
      setEvents(list);
      setVerifications(history);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [approved]);

  useEffect(() => {
    if (approved) return;
    const id = window.setInterval(() => {
      void refreshUser?.();
    }, 20000);
    return () => window.clearInterval(id);
  }, [approved, refreshUser]);

  const tabs: { id: ShopTab; label: string; icon: typeof ShieldCheck }[] = [
    { id: 'create', label: 'New record', icon: ShieldCheck },
    { id: 'pending', label: `Pending (${events.length})`, icon: ClipboardCheck },
    { id: 'history', label: `History (${verifications.length})`, icon: History },
  ];

  if (!approved) {
    return (
      <PageTransition>
        <div className="hero-panel shop-hero">
          <div>
            <span className="tag tag-warning">Pending approval</span>
            <h1 className="display page-title" style={{ marginTop: 8 }}>
              {user?.shopName || 'Shop'}
            </h1>
            <p className="muted" style={{ maxWidth: 520 }}>
              Your shop account is waiting for an admin to approve it. You can sign in, but you cannot
              create or verify service records until then.
            </p>
          </div>
        </div>
        <div className="card" style={{ padding: 28, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Clock size={22} style={{ marginTop: 2, color: 'var(--color-warning)' }} />
          <div>
            <strong>What happens next</strong>
            <p className="muted" style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5 }}>
              An admin reviews new shop requests in the admin console. Once approved, this page unlocks
              and your verifications count as shop-confirmed on owner timelines.
            </p>
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => refreshUser?.()}>
              Check approval status
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="hero-panel shop-hero">
        <div>
          <span className="tag tag-verified">Approved partner</span>
          <h1 className="display page-title" style={{ marginTop: 8 }}>
            {user?.shopName || 'Shop'}
          </h1>
          <p className="muted">
            Create verified service records. Owners are notified when a record is added.
          </p>
        </div>
        <div className="hero-actions">
          <div className="hero-metric">
            <span className="mono muted">Verified records</span>
            <strong>{verifications.length}</strong>
          </div>
          <div className="hero-metric">
            <span className="mono muted">Owner reports</span>
            <strong>{events.length}</strong>
          </div>
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="tab-strip" role="tablist" aria-label="Shop sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`tab-button ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={16} /> {item.label}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <div className="trust-callout" style={{ marginTop: -4 }}>
          <UsersRound size={18} />
          <div>
            <strong>How it works</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              Find the customer by email, VIN, or serial number → fill in service details → the record
              appears in the owner&apos;s timeline as verified and the owner is notified.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton card" style={{ height: 240 }} />
      ) : (
        <>
          {tab === 'create' && <CreateVerifiedEventForm onCreated={load} />}
          {tab === 'pending' && <PendingVerificationList events={events} onChanged={load} />}
          {tab === 'history' && <VerificationHistoryList verifications={verifications} />}
        </>
      )}
    </PageTransition>
  );
}
