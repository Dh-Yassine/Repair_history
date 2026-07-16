import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Lock, Users, Eye, EyeOff } from 'lucide-react';
import { api } from '../api';
import PageTransition, { stagger, staggerItem } from '../components/layout/PageTransition';
import EventTimelineItem from '../components/events/EventTimelineItem';
import PublicEventSummaryCard from '../components/events/PublicEventSummaryCard';
import TrustRing from '../components/ui/TrustRing';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../i18n/LanguageContext';
import { translateShareMeta } from '../i18n/shareMeta';
import type { PublicHistory } from '../types';

function accessIcon(visibility?: string) {
  if (visibility === 'PUBLIC') return Users;
  return Lock;
}

export default function PublicHistoryPage() {
  const { t } = useLanguage();
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PublicHistory | null>(null);
  const [error, setError] = useState('');
  const [errorReason, setErrorReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .publicHistory(token, searchParams.get('partnerKey') || undefined)
      .then(setData)
      .catch((e) => {
        const err = e as Error & { reason?: string };
        setError(err.message || t('public.unavailable'));
        setErrorReason(err.reason || '');
      })
      .finally(() => setLoading(false));
  }, [token, searchParams]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: 24 }}>
        <div className="skeleton card" style={{ height: 200, maxWidth: 720, margin: '0 auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: 48 }}>
        <div className="card" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <EyeOff size={32} style={{ color: 'var(--color-warning)', marginBottom: 12 }} />
          <h2 className="display" style={{ fontSize: 24 }}>
            {errorReason === 'disabled' ? t('public.sharingOff') : t('public.unavailable')}
          </h2>
          <p className="error-msg" style={{ marginTop: 12 }}>
            {error}
          </p>
          <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
            {t('public.whatIsBody')}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-solid btn-sm">
              {t('public.whatIs')}
            </Link>
            <Link to="/login" className="btn btn-ghost btn-sm">
              {t('common.signIn')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { vehicle, events, badge, share } = data;
  const shareUi = share ? translateShareMeta(t, share) : null;
  const verifiedCount = vehicle.verifiedCount;
  const selfCount = Math.max(0, vehicle.totalEvents - verifiedCount);
  const trustScore =
    data.trustScore ?? badge?.trustScore ?? Math.round((verifiedCount / Math.max(1, vehicle.totalEvents)) * 100);
  const isSummary = vehicle.shareLevel === 'SUMMARY';
  const AccessIcon = accessIcon(share?.visibility ?? vehicle.visibility);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="sidebar-logo" style={{ border: 'none', padding: 0 }}>
          <div className="sidebar-logo-mark">A</div>
          <span className="sidebar-logo-text">AUTOHISTORY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="mono muted" style={{ fontSize: 11 }}>{t('public.sharedHistory')}</span>
          <LanguageToggle compact />
        </div>
      </header>
      <PageTransition>
        <div className="page-content" style={{ maxWidth: 760, margin: '0 auto' }}>
          {share && shareUi && (
            <div className="public-share-banner">
              <div className="public-share-banner-item">
                <AccessIcon size={16} />
                <div>
                  <strong>{shareUi.accessLabel}</strong>
                  <span>{shareUi.accessDescription}</span>
                </div>
              </div>
              <div className="public-share-banner-item">
                {isSummary ? <Eye size={16} /> : <Eye size={16} style={{ color: 'var(--color-verified)' }} />}
                <div>
                  <strong>{shareUi.detailLabel}</strong>
                  <span>{shareUi.description}</span>
                </div>
              </div>
            </div>
          )}

          {/* Trust score is the page's headline element — larger than any other block */}
          <div className="hero-panel" style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
              <TrustRing score={trustScore} size={200} />
              <p className="mono" style={{ fontSize: 13, marginTop: 10, letterSpacing: '0.08em' }}>
                {t('public.trustScore')}
              </p>
              <p className="muted" style={{ fontSize: 12, marginTop: 4, maxWidth: 220 }}>
                {t('public.trustExplain')}
              </p>
            </div>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <p className="section-eyebrow">{t('public.vehicle')}</p>
              <h1 className="display" style={{ fontSize: 30 }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              {vehicle.vin ? (
                <p className="mono subtle" style={{ marginTop: 8, fontSize: 12 }}>
                  VIN · {vehicle.vin}
                </p>
              ) : vehicle.serialNumber ? (
                <p className="mono subtle" style={{ marginTop: 8, fontSize: 12 }}>
                  {t('editVehicle.serial')} · {vehicle.serialNumber}
                </p>
              ) : (
                <p className="mono subtle" style={{ marginTop: 8, fontSize: 12 }}>
                  {t('public.idHidden')}
                </p>
              )}
              <p className="muted" style={{ marginTop: 10 }}>
                <span style={{ color: 'var(--color-verified)' }}>{t('vehicle.verified')}</span> {t('buyer.verifiedBody')}
                <span style={{ color: 'var(--color-warning)' }}> {t('dashboard.selfReported')}</span> {t('buyer.selfBody')}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <span className="tag tag-verified">
                  <ShieldCheck size={12} /> {t('public.verifiedCount', { n: verifiedCount })}
                </span>
                <span className="tag tag-self">
                  <FileText size={12} /> {t('public.selfCount', { n: selfCount })}
                </span>
                {shareUi && (
                  <span className="tag">{shareUi.detailLabel}</span>
                )}
              </div>
            </div>
          </div>

          <div className="metric-strip">
            <div className="metric-pill-card">
              <span className="mono muted">{t('public.totalRecords')}</span>
              <strong>{vehicle.totalEvents}</strong>
            </div>
            <div className="metric-pill-card">
              <span className="mono muted">{t('public.shopVerified')}</span>
              <strong>{verifiedCount}</strong>
            </div>
            <div className="metric-pill-card">
              <span className="mono muted">{t('public.selfReported')}</span>
              <strong>{selfCount}</strong>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="timeline-empty" style={{ marginTop: 16 }}>
              {t('public.noRecords')}
            </div>
          ) : (
            <motion.ol
              className="timeline-rail"
              variants={stagger}
              initial="initial"
              animate="animate"
              style={{ listStyle: 'none', padding: '24px 0 0 28px', margin: 0 }}
            >
              {events.map((ev) => (
                <motion.li key={ev.id} variants={staggerItem} style={{ listStyle: 'none' }}>
                  {isSummary ? (
                    <PublicEventSummaryCard event={ev} />
                  ) : (
                    <EventTimelineItem event={ev} publicView detailLevel="FULL" />
                  )}
                </motion.li>
              ))}
            </motion.ol>
          )}
        </div>
      </PageTransition>
    </div>
  );
}
