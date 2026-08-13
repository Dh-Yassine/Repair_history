import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Droplet, RotateCw, Disc3, BatteryCharging, ClipboardCheck, Wrench, MoreHorizontal } from 'lucide-react';
import { formatDate, formatKm } from '../lib/format';
import { api } from '../api';
import PageTransition, { stagger, staggerItem } from '../components/layout/PageTransition';
import EventTimelineItem from '../components/events/EventTimelineItem';
import EventFormDrawer from '../components/EventFormDrawer';
import { useToast } from '../components/ui/Toast';
import { useLanguage, useEventTypeLabel } from '../i18n/LanguageContext';
import type { MaintenanceEvent, Vehicle } from '../types';

const EVENT_TYPES = [
  { id: 'Oil change', icon: Droplet },
  { id: 'Tire rotation', icon: RotateCw },
  { id: 'Brake service', icon: Disc3 },
  { id: 'Battery replacement', icon: BatteryCharging },
  { id: 'Inspection', icon: ClipboardCheck },
  { id: 'Repair', icon: Wrench },
  { id: 'Other', icon: MoreHorizontal },
];

const FILTERS = ['All', ...EVENT_TYPES.map((e) => e.id)];

export default function VehicleDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { t } = useLanguage();
  const toast = useToast();
  const labelEvent = useEventTypeLabel();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [allEvents, setAllEvents] = useState<MaintenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [trustFilter, setTrustFilter] = useState<'all' | 'verified' | 'self'>('all');
  const [filterYear, setFilterYear] = useState('all');

  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editEventTarget, setEditEventTarget] = useState<MaintenanceEvent | null>(null);

  function openAddDrawer() {
    setDrawerMode('create');
    setEditEventTarget(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(ev: MaintenanceEvent) {
    setDrawerMode('edit');
    setEditEventTarget(ev);
    setDrawerOpen(true);
  }

  async function load() {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const { events: list } = await api.events(vehicleId);
      setAllEvents(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('shop.failedLoad'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [vehicleId]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    for (const e of allEvents) {
      years.add(new Date(e.date).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [allEvents]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (filterType !== 'All' && event.eventType !== filterType) return false;
      if (trustFilter === 'verified' && !(event.verified || event.source === 'SHOP')) return false;
      if (trustFilter === 'self' && (event.verified || event.source === 'SHOP')) return false;
      if (filterYear !== 'all' && String(new Date(event.date).getFullYear()) !== filterYear) return false;
      return true;
    });
  }, [allEvents, filterType, trustFilter, filterYear]);

  const verifiedCount = useMemo(
    () => allEvents.filter((event) => event.verified || event.source === 'SHOP').length,
    [allEvents]
  );
  const selfReportedCount = allEvents.length - verifiedCount;
  const lastServiceDate = allEvents[0]?.date;

  useEffect(() => {
    if (!vehicleId) return;
    api
      .vehicle(vehicleId)
      .then(({ vehicle: v }) => setVehicle(v))
      .catch(() => setVehicle(null));
  }, [vehicleId]);

  const headerMileage = allEvents[0]?.mileage ?? 0;

  return (
    <PageTransition>
      <header className="masthead">
        <div className="masthead__row">
          <div className="masthead__identity">
            <h1 className="masthead__title">
              {vehicle
                ? vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                : t('vehicle.serviceHistory')}
            </h1>
            {vehicle?.nickname && (
              <p className="masthead__sub">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
            )}
          </div>
          <div className="masthead__actions">
            <Link to={`/vehicles/${vehicleId}/share`} className="btn btn-outline btn-sm">
              {t('vehicle.shareHistory')}
            </Link>
            <button type="button" className="btn btn-primary btn-sm" onClick={openAddDrawer}>
              <Plus size={16} /> {t('vehicle.addRecord')}
            </button>
          </div>
        </div>
        <div className="masthead__meta mono">
          <span>{formatKm(vehicle?.mileage ?? headerMileage)}</span>
          {(vehicle?.serialNumber || vehicle?.vin) && (
            <span className="masthead__vin" title={vehicle.serialNumber || vehicle.vin || undefined}>
              {vehicle.serialNumber || vehicle.vin}
            </span>
          )}
        </div>
      </header>

      <div className="record-summary record-summary--vehicle">
        <div className="record-summary__cell">
          <span className="record-summary__value mono tone-verified">{verifiedCount}</span>
          <span className="record-summary__label">{t('events.shopVerified')}</span>
        </div>
        <div className="record-summary__cell">
          <span className="record-summary__value mono tone-declared">{selfReportedCount}</span>
          <span className="record-summary__label">{t('dashboard.selfReported')}</span>
        </div>
        <div className="record-summary__cell">
          <span className="record-summary__value mono">{allEvents.length}</span>
          <span className="record-summary__label">{t('public.totalRecords')}</span>
        </div>
        <div className="record-summary__cell">
          <span className="record-summary__value mono record-summary__value--date">
            {lastServiceDate ? formatDate(lastServiceDate) : '—'}
          </span>
          <span className="record-summary__label">{t('vehicle.lastService')}</span>
        </div>
      </div>

      <div className="control-bar">
        <div className="control-group">
          <span className="mono muted" style={{ fontSize: 11 }}>{t('vehicle.source')}</span>
          <div className="segmented">
            {[
              { id: 'all', label: t('common.all') },
              { id: 'verified', label: t('vehicle.verified') },
              { id: 'self', label: t('vehicle.owner') },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={trustFilter === item.id ? 'active' : ''}
                onClick={() => setTrustFilter(item.id as typeof trustFilter)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <span className="mono muted" style={{ fontSize: 11 }}>{t('vehicle.filterYear')}</span>
          <div className="segmented segmented--scroll">
            <button
              type="button"
              className={filterYear === 'all' ? 'active' : ''}
              onClick={() => setFilterYear('all')}
            >
              {t('common.all')}
            </button>
            {yearOptions.map((year) => (
              <button
                key={year}
                type="button"
                className={filterYear === String(year) ? 'active' : ''}
                onClick={() => setFilterYear(String(year))}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group pills-scroll">
          <span className="mono muted" style={{ fontSize: 11 }}>{t('vehicle.type')}</span>
          <div className="pills-row">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`pill ${filterType === f ? 'active' : ''}`} onClick={() => setFilterType(f)}>
              {f === 'All' ? t('common.all') : labelEvent(f)}
            </button>
          ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton card" style={{ height: 120 }} />
      ) : filteredEvents.length === 0 ? (
        <div className="card empty-state">
          <p style={{ fontSize: 48 }}>🚗</p>
          {filterType !== 'All' || trustFilter !== 'all' || filterYear !== 'all' ? (
            <>
              <p>{t('vehicle.emptyFiltered')}</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setFilterType('All');
                    setTrustFilter('all');
                    setFilterYear('all');
                  }}
                >
                  {t('vehicle.clearFilters')}
                </button>
              </div>
            </>
          ) : (
            <>
              <p>{t('dashboard.noRecords')}</p>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {t('vehicle.emptyNoneSub')}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" onClick={openAddDrawer}>
                  <Plus size={14} /> {t('vehicle.logFirst')}
                </button>
                <Link to="/shops" className="btn btn-ghost">
                  {t('vehicle.findShop')}
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
        <div className="ledger-head" aria-hidden="true">
          <span />
          <span>{t('vehicle.colEntry')}</span>
          <span>{t('vehicle.colAmount')}</span>
        </div>
        <motion.ol className="ledger" variants={stagger} initial="initial" animate="animate">
          {filteredEvents.map((ev) => (
            <motion.li key={ev.id} variants={staggerItem} style={{ listStyle: 'none' }}>
              <EventTimelineItem
                event={ev}
                vehicleId={vehicleId}
                onEdit={ev.source !== 'SHOP' && !ev.verified ? openEditDrawer : undefined}
                onDelete={
                  ev.source !== 'SHOP' && !ev.verified
                    ? async () => {
                        if (confirm(t('vehicle.deleteConfirm'))) {
                          await api.deleteEvent(vehicleId!, ev.id);
                          load();
                        }
                      }
                    : undefined
                }
              />
            </motion.li>
          ))}
        </motion.ol>
        </>
      )}

      <EventFormDrawer
        vehicleId={vehicleId}
        vehicle={vehicle}
        allEvents={allEvents}
        open={drawerOpen}
        mode={drawerMode}
        editTarget={editEventTarget}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
      />
    </PageTransition>
  );
}
