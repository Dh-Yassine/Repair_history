import { useEffect, useState } from 'react';
import { ClipboardCheck, Clock, History, ShieldCheck, UsersRound } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/layout/PageTransition';
import CreateVerifiedEventForm from '../components/shop/CreateVerifiedEventForm';
import PendingVerificationList from '../components/shop/PendingVerificationList';
import VerificationHistoryList from '../components/shop/VerificationHistoryList';
import { useLanguage } from '../i18n/LanguageContext';
import type { MaintenanceEvent, Verification } from '../types';

type ShopTab = 'create' | 'pending' | 'history';

export default function ShopDashboardPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
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
      setError(err instanceof Error ? err.message : t('shop.failedLoad'));
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
    { id: 'create', label: t('shop.newRecord'), icon: ShieldCheck },
    { id: 'pending', label: t('shop.pendingTab', { n: events.length }), icon: ClipboardCheck },
    { id: 'history', label: t('shop.historyTab', { n: verifications.length }), icon: History },
  ];

  if (!approved) {
    return (
      <PageTransition>
        <div className="hero-panel shop-hero">
          <div>
            <span className="tag tag-warning">{t('shop.pendingApproval')}</span>
            <h1 className="display page-title" style={{ marginTop: 8 }}>
              {user?.shopName || t('shop.defaultName')}
            </h1>
            <p className="muted" style={{ maxWidth: 520 }}>
              {t('shop.waitingAdmin')}
            </p>
          </div>
        </div>
        <div className="card" style={{ padding: 28, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Clock size={22} style={{ marginTop: 2, color: 'var(--color-warning)' }} />
          <div>
            <strong>{t('shop.whatNext')}</strong>
            <p className="muted" style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5 }}>
              {t('shop.whatNextBody')}
            </p>
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => refreshUser?.()}>
              {t('shop.checkStatus')}
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
          <span className="tag tag-verified">{t('shop.approvedPartner')}</span>
          <h1 className="display page-title" style={{ marginTop: 8 }}>
            {user?.shopName || t('shop.defaultName')}
          </h1>
          <p className="muted">{t('shop.createLead')}</p>
        </div>
        <div className="hero-actions">
          <div className="hero-metric">
            <span className="mono muted">{t('shop.verifiedRecords')}</span>
            <strong>{verifications.length}</strong>
          </div>
          <div className="hero-metric">
            <span className="mono muted">{t('shop.ownerReports')}</span>
            <strong>{events.length}</strong>
          </div>
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="tab-strip" role="tablist" aria-label={t('shop.sections')}>
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
            <strong>{t('shop.howItWorks')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t('shop.howBody')}</p>
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
