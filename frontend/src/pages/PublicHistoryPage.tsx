import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Lock, Users, Eye, EyeOff } from 'lucide-react';
import { api } from '../api';
import PageTransition, { stagger, staggerItem } from '../components/layout/PageTransition';
import EventTimelineItem from '../components/events/EventTimelineItem';
import PublicEventSummaryCard from '../components/events/PublicEventSummaryCard';
import TrustRing from '../components/ui/TrustRing';
import type { PublicHistory } from '../types';

function accessIcon(visibility?: string) {
  if (visibility === 'PUBLIC') return Users;
  return Lock;
}

export default function PublicHistoryPage() {
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
        setError(err.message || 'Unavailable');
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
            {errorReason === 'disabled' ? 'Sharing is off' : 'History unavailable'}
          </h2>
          <p className="error-msg" style={{ marginTop: 12 }}>
            {error}
          </p>
          <Link to="/login" className="btn btn-ghost btn-sm" style={{ marginTop: 20 }}>
            Sign in as owner
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { vehicle, events, badge, share } = data;
  const verifiedCount = vehicle.verifiedCount;
  const selfCount = Math.max(0, vehicle.totalEvents - verifiedCount);
  const trustScore = badge?.trustScore ?? Math.round((verifiedCount / Math.max(1, vehicle.totalEvents)) * 100);
  const isSummary = vehicle.shareLevel === 'SUMMARY';
  const AccessIcon = accessIcon(share?.visibility ?? vehicle.visibility);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="sidebar-logo" style={{ border: 'none', padding: 0 }}>
          <div className="sidebar-logo-mark">A</div>
          <span className="sidebar-logo-text">AUTOHISTORY</span>
        </div>
        <span className="mono muted" style={{ fontSize: 11 }}>Buyer-ready history</span>
      </header>
      <PageTransition>
        <div className="page-content" style={{ maxWidth: 760, margin: '0 auto' }}>
          {share && (
            <div className="public-share-banner">
              <div className="public-share-banner-item">
                <AccessIcon size={16} />
                <div>
                  <strong>{share.accessLabel}</strong>
                  <span>{share.accessDescription}</span>
                </div>
              </div>
              <div className="public-share-banner-item">
                {isSummary ? <Eye size={16} /> : <Eye size={16} style={{ color: 'var(--color-verified)' }} />}
                <div>
                  <strong>{share.detailLabel}</strong>
                  <span>{share.description}</span>
                </div>
              </div>
            </div>
          )}

          <div className="hero-panel" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <p className="section-eyebrow">Vehicle</p>
              <h1 className="display page-title">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              {vehicle.vin ? (
                <p className="mono subtle" style={{ marginTop: 8, fontSize: 12 }}>
                  VIN · {vehicle.vin}
                </p>
              ) : (
                <p className="mono subtle" style={{ marginTop: 8, fontSize: 12 }}>
                  VIN hidden in this view
                </p>
              )}
              <p className="muted" style={{ marginTop: 10 }}>
                <span style={{ color: 'var(--color-verified)' }}>Verified</span> records were created or certified by repair shops.
                <span style={{ color: 'var(--color-warning)' }}> Self-reported</span> records may include owner proof but are not shop-certified.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <span className="tag tag-verified">
                  <ShieldCheck size={12} /> {verifiedCount} verified
                </span>
                <span className="tag tag-self">
                  <FileText size={12} /> {selfCount} self-reported
                </span>
                {share && (
                  <span className="tag">{share.detailLabel}</span>
                )}
              </div>
            </div>
            <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
              <TrustRing score={trustScore} />
              <p className="mono muted" style={{ fontSize: 11, marginTop: 8 }}>
                TRUST SCORE
              </p>
            </div>
          </div>

          <div className="metric-strip">
            <div className="metric-pill-card">
              <span className="mono muted">Total records</span>
              <strong>{vehicle.totalEvents}</strong>
            </div>
            <div className="metric-pill-card">
              <span className="mono muted">Shop verified</span>
              <strong>{verifiedCount}</strong>
            </div>
            <div className="metric-pill-card">
              <span className="mono muted">Self-reported</span>
              <strong>{selfCount}</strong>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="timeline-empty" style={{ marginTop: 16 }}>
              No public maintenance records available yet.
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
