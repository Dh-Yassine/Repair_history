import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Share2, Clock, ShieldCheck, FileText, Bell, ArrowRight, Pencil, Gauge } from 'lucide-react';
import { formatKm } from '../lib/format';
import { api } from '../api';
import AddVehicleModal from '../components/AddVehicleModal';
import EditVehicleModal from '../components/EditVehicleModal';
import RemindersPanel from '../components/RemindersPanel';
import VehicleSwitcher from '../components/VehicleSwitcher';
import VehiclePhoto from '../components/VehiclePhoto';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import Card from '../components/ui/Card';
import PageTransition, { stagger, staggerItem } from '../components/layout/PageTransition';
import EventTimelineItem from '../components/events/EventTimelineItem';
import { useLanguage } from '../i18n/LanguageContext';
import type { Vehicle, VehicleLimits, MaintenanceEvent } from '../types';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const statList = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};

const statRow = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [slideDir, setSlideDir] = useState(0);
  const [limits, setLimits] = useState<VehicleLimits | null>(null);
  const [vehicleEvents, setVehicleEvents] = useState<MaintenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  const selectVehicle = useCallback((id: string, direction: number) => {
    setSlideDir(direction);
    setActiveId(id);
  }, []);

  const active = useMemo(() => vehicles.find((v) => v.id === activeId) ?? vehicles[0], [vehicles, activeId]);

  async function load() {
    setLoading(true);
    try {
      const vData = await api.vehicles();
      setVehicles(vData.vehicles);
      setLimits(vData.limits);
      if (!activeId && vData.vehicles[0]) setActiveId(vData.vehicles[0].id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!active) {
      setVehicleEvents([]);
      return;
    }
    let cancelled = false;
    setEventsLoading(true);
    api
      .events(active.id)
      .then(({ events }) => {
        if (!cancelled) setVehicleEvents(events);
      })
      .catch(() => !cancelled && setVehicleEvents([]))
      .finally(() => !cancelled && setEventsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [active]);

  /** All counts below are scoped to the selected vehicle, not the whole garage. */
  const recentEvents = useMemo(() => vehicleEvents.slice(0, 4), [vehicleEvents]);
  const verifiedCount = useMemo(
    () => vehicleEvents.filter((e) => e.verified || e.source === 'SHOP').length,
    [vehicleEvents]
  );
  const totalEvents = vehicleEvents.length;
  const selfCount = totalEvents - verifiedCount;
  const trustPct = totalEvents > 0 ? Math.round((verifiedCount / totalEvents) * 100) : 0;

  if (loading) {
    return (
      <PageTransition>
        <div className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 16 }} />
        <div className="dash-bento">
          <div className="skeleton" style={{ height: 340, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 340, borderRadius: 12 }} />
        </div>
      </PageTransition>
    );
  }

  const nextStep = computeNextStep(t, {
    vehiclesCount: vehicles.length,
    totalEvents,
    verifiedCount,
    selfCount,
    trustPct,
    activeVehicleId: active?.id,
    onAddVehicle: () => setModalOpen(true),
  });

  const displayName = active ? active.nickname || `${active.year} ${active.make} ${active.model}` : '';
  const modelLine = active ? `${active.year} ${active.make} ${active.model}` : '';
  const plate = active?.serialNumber || active?.vin || null;

  return (
    <PageTransition>
      {!active ? (
        <>
          <Card className="empty-state">
            <p>{t('dashboard.noVehicles')}</p>
            <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModalOpen(true)}>
              <Plus size={16} /> {t('dashboard.addVehicle')}
            </button>
          </Card>
          {nextStep && <NextStepBanner step={nextStep} recommendedLabel={t('dashboard.recommended')} />}
        </>
      ) : (
        <>
          <div className="dash-bar">
            <VehicleSwitcher
              vehicles={vehicles}
              activeId={active.id}
              canAdd={limits?.canAdd}
              onSelect={selectVehicle}
              onAdd={() => setModalOpen(true)}
            />
            <div className="dash-bar__actions">
              <Link to={`/vehicles/${active.id}`} className="btn btn-outline btn-sm">
                <Clock size={14} /> {t('dashboard.timeline')}
              </Link>
              <Link to={`/vehicles/${active.id}/share`} className="btn btn-outline btn-sm">
                <Share2 size={14} /> {t('dashboard.share')}
              </Link>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setModalOpen(true)}
                disabled={!limits?.canAdd}
              >
                <Plus size={14} /> {t('dashboard.addVehicle')}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              className="dash-bento"
              initial={{ opacity: 0, x: slideDir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideDir * -20 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <article className="dash-hero">
                <VehiclePhoto vehicle={active} className="dash-hero__media" />
                <span className="dash-hero__scrim" aria-hidden />
                <span className="dash-hero__sheen" aria-hidden />
                <button
                  type="button"
                  className="dash-hero__edit"
                  onClick={() => setEditVehicle(active)}
                  aria-label={t('dashboard.editVehicle')}
                  title={t('dashboard.editVehicle')}
                >
                  <Pencil size={14} />
                </button>
                <div className="dash-hero__overlay">
                  <h1 className="dash-hero__name">{displayName}</h1>
                  <p className="dash-hero__model">{modelLine}</p>
                  <div className="dash-hero__chips">
                    <span className="dash-chip dash-chip--km mono">
                      <Gauge size={13} aria-hidden />
                      {formatKm(active.mileage)}
                    </span>
                    {plate && (
                      <span className="dash-chip dash-chip--plate mono" title={plate}>
                        {plate}
                      </span>
                    )}
                  </div>
                </div>
              </article>

              <aside className="dash-trust" aria-busy={eventsLoading}>
                <div className="dash-trust__head">
                  <h2 className="section-title">{t('dashboard.recordsSummary')}</h2>
                  <span className="dash-trust__scope">{t('dashboard.thisVehicle')}</span>
                </div>

                {totalEvents > 0 && (
                  <div className="dash-split" role="img" aria-label={t('dashboard.recordsSummary')}>
                    <motion.span
                      className="dash-split__seg dash-split__seg--verified"
                      initial={{ flexGrow: 0 }}
                      animate={{ flexGrow: verifiedCount || 0 }}
                      transition={{ duration: 0.7, ease: EASE }}
                    />
                    <motion.span
                      className="dash-split__seg dash-split__seg--declared"
                      initial={{ flexGrow: 0 }}
                      animate={{ flexGrow: selfCount || 0 }}
                      transition={{ duration: 0.7, ease: EASE }}
                    />
                  </div>
                )}

                <motion.ul className="dash-stat-list" variants={statList} initial="initial" animate="animate">
                  <motion.li className="dash-stat-row" variants={statRow}>
                    <span className="dash-stat-row__key">
                      <span className="dash-dot dash-dot--verified" aria-hidden>
                        <ShieldCheck size={11} />
                      </span>
                      {t('dashboard.shopVerified')}
                    </span>
                    <strong className="mono tone-verified">
                      <AnimatedNumber value={verifiedCount} />
                    </strong>
                  </motion.li>
                  <motion.li className="dash-stat-row" variants={statRow}>
                    <span className="dash-stat-row__key">
                      <span className="dash-dot dash-dot--declared" aria-hidden>
                        <FileText size={11} />
                      </span>
                      {t('dashboard.selfReported')}
                    </span>
                    <strong className="mono tone-declared">
                      <AnimatedNumber value={selfCount} />
                    </strong>
                  </motion.li>
                  <motion.li className="dash-stat-row dash-stat-row--total" variants={statRow}>
                    <span className="dash-stat-row__key">{t('dashboard.totalEvents')}</span>
                    <strong className="mono">
                      <AnimatedNumber value={totalEvents} />
                    </strong>
                  </motion.li>
                </motion.ul>
              </aside>
            </motion.div>
          </AnimatePresence>

          <div className="grid-bottom">
            <Card>
              <div className="section-head">
                <h2 className="section-title">{t('dashboard.recentTimeline')}</h2>
                <Link to={`/vehicles/${active.id}`} className="btn btn-ghost btn-sm">
                  {t('dashboard.viewTimeline')}
                </Link>
              </div>
              {eventsLoading ? (
                <div className="skeleton" style={{ height: 80, marginTop: 8 }} />
              ) : recentEvents.length === 0 ? (
                <div className="timeline-empty">
                  {t('dashboard.noRecords')}
                  <div style={{ marginTop: 10 }}>
                    <Link to="/shops" className="btn btn-primary btn-sm">
                      {t('dashboard.findShop')}
                    </Link>
                  </div>
                </div>
              ) : (
                <motion.ol
                  className="ledger"
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                  style={{ marginTop: 4 }}
                >
                  {recentEvents.map((ev) => (
                    <motion.li key={ev.id} variants={staggerItem} style={{ listStyle: 'none' }}>
                      <EventTimelineItem event={ev} vehicleId={active.id} />
                    </motion.li>
                  ))}
                </motion.ol>
              )}
            </Card>

            <RemindersPanel vehicleId={active.id} />
          </div>

          {nextStep && <NextStepBanner step={nextStep} recommendedLabel={t('dashboard.recommended')} />}
        </>
      )}

      <AddVehicleModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={load} canAdd={limits?.canAdd ?? true} />
      <EditVehicleModal
        vehicle={editVehicle}
        onClose={() => setEditVehicle(null)}
        onSaved={(updated) => {
          setVehicles((prev) => prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v)));
        }}
        onDeleted={(id) => {
          setVehicles((prev) => prev.filter((v) => v.id !== id));
          if (activeId === id) setActiveId('');
        }}
      />
    </PageTransition>
  );
}

function NextStepBanner({ step, recommendedLabel }: { step: NextStep; recommendedLabel: string }) {
  return (
    <div className="next-step-card" role="region" aria-label={recommendedLabel} style={{ marginTop: 16 }}>
      <div className="next-step-icon">
        <step.Icon size={22} />
      </div>
      <div className="next-step-body">
        <p className="section-eyebrow">{recommendedLabel}</p>
        <h3>{step.title}</h3>
        <span>{step.desc}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {step.primary &&
          (step.primary.to ? (
            <Link to={step.primary.to} className="btn btn-primary">
              {step.primary.label} <ArrowRight size={16} />
            </Link>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => step.primary?.onClick?.()}>
              {step.primary.label} <ArrowRight size={16} />
            </button>
          ))}
      </div>
    </div>
  );
}

interface NextStepCta {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface NextStep {
  Icon: typeof Plus;
  title: string;
  desc: string;
  primary?: NextStepCta;
}

function computeNextStep(
  t: (key: string, vars?: Record<string, string | number>) => string,
  {
    vehiclesCount,
    totalEvents,
    verifiedCount,
    selfCount,
    trustPct,
    activeVehicleId,
    onAddVehicle,
  }: {
    vehiclesCount: number;
    totalEvents: number;
    verifiedCount: number;
    selfCount: number;
    trustPct: number;
    activeVehicleId?: string;
    onAddVehicle: () => void;
  }
): NextStep | null {
  if (vehiclesCount === 0) {
    return {
      Icon: Plus,
      title: t('dashboard.nextEmptyTitle'),
      desc: t('dashboard.nextEmptyDesc'),
      primary: { label: t('dashboard.addVehicle'), onClick: onAddVehicle },
    };
  }
  if (totalEvents === 0) {
    return {
      Icon: ShieldCheck,
      title: t('dashboard.nextEventsTitle'),
      desc: t('dashboard.nextEventsDesc'),
      primary: { label: t('dashboard.findShop'), to: '/shops' },
    };
  }
  if (verifiedCount === 0 && selfCount > 0) {
    return {
      Icon: ShieldCheck,
      title: t('dashboard.nextVerifyTitle'),
      desc: t('dashboard.nextVerifyDesc'),
      primary: { label: t('dashboard.findShop'), to: '/shops' },
    };
  }
  if (trustPct >= 80 && activeVehicleId) {
    return {
      Icon: Share2,
      title: t('dashboard.nextShareTitle'),
      desc: t('dashboard.nextShareDesc'),
      primary: { label: t('vehicle.shareHistory'), to: `/vehicles/${activeVehicleId}/share` },
    };
  }
  return {
    Icon: Bell,
    title: t('dashboard.nextPartsTitle'),
    desc: t('dashboard.nextPartsDesc'),
    primary: { label: t('dashboard.findShop'), to: '/shops' },
  };
}
