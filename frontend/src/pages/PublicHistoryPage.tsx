import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, EyeOff } from 'lucide-react';
import { api } from '../api';
import PageTransition, { stagger, staggerItem } from '../components/layout/PageTransition';
import EventTimelineItem from '../components/events/EventTimelineItem';
import PublicEventSummaryCard from '../components/events/PublicEventSummaryCard';
import PublicVehiclePhoto from '../components/PublicVehiclePhoto';
import PageBackButton from '../components/layout/PageBackButton';
import LanguageToggle from '../components/LanguageToggle';
import { resolvePublicBackTarget } from '../lib/pageBack';
import { useLanguage } from '../i18n/LanguageContext';
import type { PublicHistory } from '../types';

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
      <div className="public-history-page">
        <div className="public-history-main">
          <div className="skeleton card" style={{ height: 220 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-history-page">
        <header className="public-history-header">
          <div className="public-history-header__start">
            <PageBackButton target={resolvePublicBackTarget()} className="page-back-btn--ghost" />
            <div className="sidebar-logo" style={{ border: 'none', padding: 0 }}>
              <div className="sidebar-logo-mark">A</div>
              <span className="sidebar-logo-text">AUTOHISTORY</span>
            </div>
          </div>
        </header>
        <div className="public-history-main public-history-main--centered">
          <div className="card public-error-card">
            <EyeOff size={28} className="public-error-card__icon" />
            <h2 className="display public-error-card__title">
              {errorReason === 'disabled' ? t('public.sharingOff') : t('public.unavailable')}
            </h2>
            <p className="error-msg">{error}</p>
            <p className="muted public-error-card__body">{t('public.whatIsBody')}</p>
            <div className="public-error-card__actions">
              <Link to="/" className="btn btn-solid btn-sm">{t('public.whatIs')}</Link>
              <Link to="/login" className="btn btn-ghost btn-sm">{t('common.signIn')}</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !token) return null;

  const { vehicle, events } = data;
  const verifiedCount = vehicle.verifiedCount;
  const selfCount = Math.max(0, vehicle.totalEvents - verifiedCount);
  const isSummary = vehicle.shareLevel === 'SUMMARY';

  const idLine = vehicle.vin
    ? `VIN · ${vehicle.vin}`
    : vehicle.serialNumber
      ? `${t('editVehicle.serial')} · ${vehicle.serialNumber}`
      : t('public.idHidden');

  return (
    <div className="public-history-page">
      <header className="public-history-header">
        <div className="public-history-header__start">
          <PageBackButton target={resolvePublicBackTarget()} className="page-back-btn--ghost" />
          <div className="sidebar-logo" style={{ border: 'none', padding: 0 }}>
            <div className="sidebar-logo-mark">A</div>
            <span className="sidebar-logo-text">AUTOHISTORY</span>
          </div>
        </div>
        <div className="public-history-header__end">
          <span className="mono muted public-history-header__label">{t('public.sharedHistory')}</span>
          <LanguageToggle compact />
        </div>
      </header>

      <PageTransition>
        <main className="public-history-main">
          <article className="card public-vehicle-card">
            <PublicVehiclePhoto vehicle={vehicle} token={token} />

            <header className="public-vehicle-card__head">
              <p className="section-eyebrow">{t('public.vehicle')}</p>
              <h1 className="display public-vehicle-card__title">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <p className="mono subtle public-vehicle-card__id">{idLine}</p>
            </header>

            <div className="record-summary public-record-summary">
              <div className="record-summary__cell">
                <span className="record-summary__value mono tone-verified">{verifiedCount}</span>
                <span className="record-summary__label">{t('events.shopVerified')}</span>
              </div>
              <div className="record-summary__cell">
                <span className="record-summary__value mono tone-declared">{selfCount}</span>
                <span className="record-summary__label">{t('dashboard.selfReported')}</span>
              </div>
              <div className="record-summary__cell">
                <span className="record-summary__value mono">{vehicle.totalEvents}</span>
                <span className="record-summary__label">{t('public.totalRecords')}</span>
              </div>
            </div>

            <div className="public-legend">
              <p>
                <ShieldCheck size={13} className="tone-verified" aria-hidden="true" />
                <span>
                  <strong className="tone-verified">{t('vehicle.verified')}</strong>
                  {' '}{t('buyer.verifiedBody')}
                </span>
              </p>
              <p>
                <FileText size={13} className="tone-declared" aria-hidden="true" />
                <span>
                  <strong className="tone-declared">{t('dashboard.selfReported')}</strong>
                  {' '}{t('buyer.selfBody')}
                </span>
              </p>
            </div>
          </article>

          <section className="public-history-section" aria-labelledby="public-history-heading">
            <h2 id="public-history-heading" className="public-section-title">
              {t('vehicle.serviceHistory')}
            </h2>

            {events.length === 0 ? (
              <div className="card public-empty-card">
                <p className="muted">{t('public.noRecords')}</p>
              </div>
            ) : (
              <div className="card public-ledger-card">
                <motion.ol
                  className="ledger public-ledger"
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                >
                  {events.map((ev) => (
                    <motion.li key={ev.id} variants={staggerItem}>
                      {isSummary ? (
                        <PublicEventSummaryCard event={ev} />
                      ) : (
                        <EventTimelineItem event={ev} publicView detailLevel="FULL" />
                      )}
                    </motion.li>
                  ))}
                </motion.ol>
              </div>
            )}
          </section>
        </main>
      </PageTransition>
    </div>
  );
}
