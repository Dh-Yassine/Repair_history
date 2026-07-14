import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Share2, Clock, ShieldCheck, FileText, CarFront, ShoppingBag, Bell, ArrowRight, Pencil } from 'lucide-react';
import { api } from '../api';
import AddVehicleModal from '../components/AddVehicleModal';
import EditVehicleModal from '../components/EditVehicleModal';
import RemindersPanel from '../components/RemindersPanel';
import VehiclePhoto from '../components/VehiclePhoto';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import TrustRing from '../components/ui/TrustRing';
import PageTransition, { stagger, staggerItem } from '../components/layout/PageTransition';
import EventTimelineItem from '../components/events/EventTimelineItem';
import type { Vehicle, VehicleLimits, OwnerAnalytics, MaintenanceEvent } from '../types';

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [limits, setLimits] = useState<VehicleLimits | null>(null);
  const [analytics, setAnalytics] = useState<OwnerAnalytics | null>(null);
  const [recentEvents, setRecentEvents] = useState<MaintenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  const active = useMemo(() => vehicles.find((v) => v.id === activeId) ?? vehicles[0], [vehicles, activeId]);

  async function load() {
    setLoading(true);
    try {
      const [vData, aData] = await Promise.all([
        api.vehicles(),
        api.ownerAnalytics().catch(() => ({ analytics: null })),
      ]);
      setVehicles(vData.vehicles);
      setLimits(vData.limits);
      if (aData.analytics) setAnalytics(aData.analytics);
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
      setRecentEvents([]);
      return;
    }
    let cancelled = false;
    setEventsLoading(true);
    api
      .events(active.id)
      .then(({ events }) => {
        if (!cancelled) setRecentEvents(events.slice(0, 4));
      })
      .catch(() => !cancelled && setRecentEvents([]))
      .finally(() => !cancelled && setEventsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [active]);

  const verifiedCount = analytics?.shopVerifiedCount ?? analytics?.verifiedCount ?? 0;
  const selfCount = analytics?.selfReportedCount ?? 0;
  const totalEvents = analytics?.totalEvents ?? 0;
  const trustPct = analytics ? analytics.trustScore ?? Math.round(analytics.conversionRate * 100) : 0;

  if (loading) {
    return (
      <PageTransition>
        <div className="skeleton card" style={{ height: 160, marginBottom: 16 }} />
        <div className="grid-stats">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-stat skeleton" style={{ height: 80 }} />
          ))}
        </div>
      </PageTransition>
    );
  }

  const nextStep = computeNextStep({
    vehiclesCount: vehicles.length,
    totalEvents,
    verifiedCount,
    selfCount,
    trustPct,
    activeVehicleId: active?.id,
    onAddVehicle: () => setModalOpen(true),
  });

  return (
    <PageTransition>
      <div className="hero-panel page-hero">
        <div className="hero-copy">
          <p className="section-eyebrow">Overview</p>
          <h1 className="display page-title">Your vehicles</h1>
          <p className="muted" style={{ maxWidth: 620, marginTop: 10 }}>
            Add shop-verified records through a partner, or log your own entries with proof.
          </p>
          {limits && (
            <p className="mono muted" style={{ marginTop: 12 }}>
              {limits.count}/{limits.max} vehicles · {limits.subscriptionType} plan
            </p>
          )}
        </div>
        <div className="hero-actions">
          <Link to="/shops" className="btn btn-primary">
            <ShieldCheck size={18} /> Find a shop
          </Link>
          <button type="button" className="btn btn-solid" onClick={() => setModalOpen(true)} disabled={!limits?.canAdd}>
            <Plus size={18} /> Add vehicle
          </button>
        </div>
      </div>

      {vehicles.length > 1 && (
        <div className="vehicle-switcher" role="tablist" aria-label="Switch active vehicle">
          {vehicles.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={v.id === active?.id}
              className={`vehicle-switch-pill ${v.id === active?.id ? 'active' : ''}`}
              onClick={() => setActiveId(v.id)}
            >
              <VehiclePhoto vehicle={v} className="vehicle-photo-thumb" />
              <span>
                {v.nickname || `${v.year} ${v.make} ${v.model}`}
              </span>
              <span className="pill-count">{v._count?.events ?? 0}</span>
            </button>
          ))}
          {limits?.canAdd && (
            <button
              type="button"
              className="vehicle-switch-pill add"
              onClick={() => setModalOpen(true)}
            >
              <Plus size={14} /> Add another
            </button>
          )}
        </div>
      )}

      {nextStep && (
        <div className="next-step-card" role="region" aria-label="Recommended next step">
          <div className="next-step-icon">
            <nextStep.Icon size={22} />
          </div>
          <div className="next-step-body">
            <p className="eyebrow">Recommended next step</p>
            <h3>{nextStep.title}</h3>
            <span>{nextStep.desc}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {nextStep.primary && (
              nextStep.primary.to ? (
                <Link to={nextStep.primary.to} className="btn btn-solid">
                  {nextStep.primary.label} <ArrowRight size={16} />
                </Link>
              ) : (
                <button type="button" className="btn btn-solid" onClick={() => nextStep.primary?.onClick?.()}>
                  {nextStep.primary.label} <ArrowRight size={16} />
                </button>
              )
            )}
          </div>
        </div>
      )}

      <div className="grid-stats dashboard-stats-grid" style={{ marginTop: 16 }}>
        {[
          { label: 'Shop verified', value: verifiedCount },
          { label: 'Self-reported', value: selfCount },
          { label: 'Total events', value: totalEvents },
        ].map((s) => (
          <div key={s.label} className="card-stat">
            <div style={{ fontSize: 28, fontFamily: 'var(--font-mono)' }}>
              <AnimatedNumber value={s.value} />
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {!active ? (
        <div className="card empty-state" style={{ marginTop: 16 }}>
          <p>No vehicles yet. Add one to begin.</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Add vehicle
          </button>
        </div>
      ) : (
        <>
          <div className="grid-2-1" style={{ marginTop: 16 }}>
            <div className="card card-hover dashboard-vehicle-card">
              <div>
                <div className="vehicle-title-row">
                  <div>
                    <p className="section-eyebrow">Active vehicle</p>
                    <h2 className="display dashboard-vehicle-title" style={{ margin: '8px 0' }}>
                      {active.year} {active.make} {active.model}
                    </h2>
                    {(active.vin || active.serialNumber) && (
                      <p className="mono subtle" style={{ marginBottom: 12 }}>
                        {active.vin ? `VIN · ${active.vin}` : `N° série · ${active.serialNumber}`}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="tag tag-green">
                      <CarFront size={12} /> {active._count?.events ?? 0} records
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditVehicle(active)}
                      aria-label="Edit vehicle"
                      title="Edit vehicle"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <VehiclePhoto vehicle={active} className="vehicle-photo-hero" />
                <p className="mono" style={{ color: 'var(--color-accent)', fontSize: 24, marginBottom: 12 }}>
                  {active.mileage.toLocaleString()} km
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to={`/vehicles/${active.id}`} className="btn btn-primary">
                  <Clock size={16} /> Timeline
                </Link>
                <Link to={`/vehicles/${active.id}/share`} className="btn btn-primary">
                  <Share2 size={16} /> Share
                </Link>
              </div>
              <div className="status-chip-row">
                <span className="tag tag-verified">
                  <ShieldCheck size={12} /> {verifiedCount} verified
                </span>
                <span className="tag tag-self">
                  <FileText size={12} /> {selfCount} self-reported
                </span>
              </div>
            </div>

            <div className="card trust-score-card" style={{ textAlign: 'center' }}>
              <p className="mono muted" style={{ fontSize: 11, marginBottom: 12 }}>
                TRUST SCORE
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <TrustRing score={trustPct} />
              </div>
              <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
                {verifiedCount} of {totalEvents} events are shop verified
              </p>
              <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                More shop-verified records raise the trust score.
              </p>
            </div>
          </div>

          <div className="grid-bottom">
            <div className="card">
              <div className="section-head">
                <div>
                  <p className="section-eyebrow">Latest activity</p>
                  <h3 className="display" style={{ fontSize: 20 }}>Recent timeline</h3>
                </div>
                <Link to={`/vehicles/${active.id}`} className="btn btn-ghost btn-sm">
                  View timeline
                </Link>
              </div>
              {eventsLoading ? (
                <div className="skeleton" style={{ height: 80, marginTop: 8 }} />
              ) : recentEvents.length === 0 ? (
                <div className="timeline-empty">
                  No service records yet.
                  <div style={{ marginTop: 10 }}>
                    <Link to="/shops" className="btn btn-primary btn-sm">
                      Find a shop
                    </Link>
                  </div>
                </div>
              ) : (
                <motion.ol className="timeline-rail" variants={stagger} initial="initial" animate="animate" style={{ listStyle: 'none', padding: '0 0 0 28px', margin: 0 }}>
                  {recentEvents.map((ev) => (
                    <motion.li key={ev.id} variants={staggerItem} style={{ listStyle: 'none' }}>
                      <EventTimelineItem event={ev} vehicleId={active.id} />
                    </motion.li>
                  ))}
                </motion.ol>
              )}
            </div>

            <div>
              <RemindersPanel />
              <div className="card">
                <p className="section-eyebrow">Marketplace</p>
                <h3 className="display" style={{ fontSize: 20, marginBottom: 8 }}>
                  Parts &amp; shops
                </h3>
                <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                  Shops and parts for {active.year} {active.make} {active.model}.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to="/shops" className="btn btn-primary btn-sm">
                    <ShieldCheck size={14} /> View shops
                  </Link>
                  <Link to="/marketplace" className="btn btn-ghost btn-sm">
                    <ShoppingBag size={14} /> Parts
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <AddVehicleModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={load} canAdd={limits?.canAdd ?? true} />
      <EditVehicleModal
        vehicle={editVehicle}
        onClose={() => setEditVehicle(null)}
        onSaved={(updated) => {
          setVehicles((prev) => prev.map((v) => v.id === updated.id ? { ...v, ...updated } : v));
        }}
        onDeleted={(id) => {
          setVehicles((prev) => prev.filter((v) => v.id !== id));
          if (activeId === id) setActiveId('');
        }}
      />
    </PageTransition>
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

function computeNextStep({
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
}): NextStep | null {
  if (vehiclesCount === 0) {
    return {
      Icon: Plus,
      title: 'Add a vehicle',
      desc: 'Start tracking maintenance for a vehicle you own.',
      primary: { label: 'Add vehicle', onClick: onAddVehicle },
    };
  }
  if (totalEvents === 0) {
    return {
      Icon: ShieldCheck,
      title: 'Add a shop-verified record',
      desc: 'Partner shops create verified entries on your timeline.',
      primary: { label: 'Find a shop', to: '/shops' },
    };
  }
  if (verifiedCount === 0 && selfCount > 0) {
    return {
      Icon: ShieldCheck,
      title: 'Get a shop-verified record',
      desc: 'Shop-verified entries carry more weight than owner records alone.',
      primary: { label: 'Find a shop', to: '/shops' },
    };
  }
  if (trustPct >= 80 && activeVehicleId) {
    return {
      Icon: Share2,
      title: 'Share this vehicle’s history',
      desc: 'Create a link others can open to review the timeline.',
      primary: { label: 'Share history', to: `/vehicles/${activeVehicleId}/share` },
    };
  }
  return {
    Icon: Bell,
    title: 'Browse parts for this vehicle',
    desc: 'Compatible parts and accessories in the marketplace.',
    primary: { label: 'View marketplace', to: '/marketplace' },
  };
}
