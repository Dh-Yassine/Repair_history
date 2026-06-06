import { useEffect, useState } from 'react';
import { ClipboardCheck, History, ShieldCheck, UsersRound } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/layout/PageTransition';
import CreateVerifiedEventForm from '../components/shop/CreateVerifiedEventForm';
import PendingVerificationList from '../components/shop/PendingVerificationList';
import VerificationHistoryList from '../components/shop/VerificationHistoryList';
import type { MaintenanceEvent, Verification } from '../types';

type ShopTab = 'create' | 'pending' | 'history';

export default function ShopDashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [verifications, setVerifications] = useState<(Verification & { event?: MaintenanceEvent })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ShopTab>('create');

  async function load() {
    setLoading(true);
    try {
      const [{ events: list }, { verifications: history }] = await Promise.all([
        api.shopEvents(),
        api.shopVerifications(),
      ]);
      setEvents(list);
      setVerifications(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const tabs: { id: ShopTab; label: string; icon: typeof ShieldCheck }[] = [
    { id: 'create', label: 'Create verified record', icon: ShieldCheck },
    { id: 'pending', label: `Pending owner reports (${events.length})`, icon: ClipboardCheck },
    { id: 'history', label: `Verified history (${verifications.length})`, icon: History },
  ];

  return (
    <PageTransition>
      <div className="hero-panel shop-hero">
        <div>
          <span className="tag tag-verified">Certified Partner</span>
          <h1 className="display page-title" style={{ marginTop: 8 }}>
            {user?.shopName || 'Shop Portal'}
          </h1>
          <p className="muted">
            Create trusted service records for customers. Shop-created records are verified immediately and owners are notified.
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
              Find the customer by email → fill in service details → the record appears in the owner's timeline as verified and the owner is notified.
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
