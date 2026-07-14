import { FormEvent, useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Upload,
  Info,
  ShieldCheck,
  FileText,
  Droplet,
  RotateCw,
  Disc3,
  BatteryCharging,
  ClipboardCheck,
  Wrench,
  MoreHorizontal,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  Pencil,
} from 'lucide-react';
import { api } from '../api';
import PageTransition, { stagger, staggerItem } from '../components/layout/PageTransition';
import EventTimelineItem from '../components/events/EventTimelineItem';
import { useToast } from '../components/ui/Toast';
import { useOverlayPanel, scrollFieldIntoView } from '../hooks/useOverlayPanel';
import { useIsMobileSheet } from '../hooks/useMediaQuery';
import type { MaintenanceEvent, MaintenanceSuggestion, Vehicle } from '../types';

const EVENT_TYPES = [
  { id: 'Oil change', icon: Droplet },
  { id: 'Tire rotation', icon: RotateCw },
  { id: 'Brake service', icon: Disc3 },
  { id: 'Battery replacement', icon: BatteryCharging },
  { id: 'Inspection', icon: ClipboardCheck },
  { id: 'Repair', icon: Wrench },
  { id: 'Other', icon: MoreHorizontal },
];

/** Frequently logged types float to the top of the grid for this vehicle. */
function orderEventTypes(events: MaintenanceEvent[]) {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.eventType, (counts.get(e.eventType) || 0) + 1);
  return [...EVENT_TYPES].sort((a, b) => {
    const diff = (counts.get(b.id) || 0) - (counts.get(a.id) || 0);
    if (diff !== 0) return diff;
    return EVENT_TYPES.findIndex((t) => t.id === a.id) - EVENT_TYPES.findIndex((t) => t.id === b.id);
  });
}

const FILTERS = ['All', ...EVENT_TYPES.map((e) => e.id)];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function VehicleDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const toast = useToast();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [trustFilter, setTrustFilter] = useState<'all' | 'verified' | 'self'>('all');
  const [suggestions, setSuggestions] = useState<MaintenanceSuggestion[]>([]);

  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editEventTarget, setEditEventTarget] = useState<MaintenanceEvent | null>(null);
  const [eventType, setEventType] = useState(EVENT_TYPES[0].id);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [garageName, setGarageName] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isMobileSheet = useIsMobileSheet();

  const closeDrawer = useCallback(() => {
    if (!submitting) setDrawerOpen(false);
  }, [submitting]);

  useOverlayPanel(drawerOpen, closeDrawer, !submitting);

  function openAddDrawer() {
    setDrawerMode('create');
    setEditEventTarget(null);
    setEventType(EVENT_TYPES[0].id);
    setDate(new Date().toISOString().slice(0, 10));
    setMileage('');
    setCost('');
    setGarageName('');
    setNotes('');
    setUploadFile(null);
    setUploadPreview(null);
    setError('');
    setDrawerOpen(true);
  }

  function openEditDrawer(ev: MaintenanceEvent) {
    setDrawerMode('edit');
    setEditEventTarget(ev);
    setEventType(ev.eventType);
    setDate(new Date(ev.date).toISOString().slice(0, 10));
    setMileage(String(ev.mileage));
    setCost(ev.cost != null ? String(ev.cost) : '');
    setGarageName(ev.garageName ?? '');
    setNotes(ev.notes ?? '');
    setUploadFile(null);
    setUploadPreview(null);
    setError('');
    setDrawerOpen(true);
  }

  function resetForm() {
    setEventType(EVENT_TYPES[0].id);
    setMileage('');
    setCost('');
    setGarageName('');
    setNotes('');
    setUploadFile(null);
    setUploadPreview(null);
    setError('');
  }

  function onPickFile(file: File | null) {
    setUploadFile(file);
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    if (file && file.type.startsWith('image/')) {
      setUploadPreview(URL.createObjectURL(file));
    } else {
      setUploadPreview(null);
    }
  }

  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  async function load() {
    if (!vehicleId) return;
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterType !== 'All') params.eventType = filterType;
    if (trustFilter === 'verified') params.verified = 'true';
    if (trustFilter === 'self') {
      params.verified = 'false';
      params.source = 'OWNER';
    }
    try {
      const { events: list } = await api.events(vehicleId, params);
      setEvents(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [vehicleId, filterType, trustFilter]);

  useEffect(() => {
    if (!vehicleId) return;
    api
      .vehicle(vehicleId)
      .then(({ vehicle: v }) => setVehicle(v))
      .catch(() => setVehicle(null));
  }, [vehicleId]);

  useEffect(() => {
    if (drawerOpen && vehicleId) {
      api.suggestions(vehicleId).then(({ suggestions: s }) => setSuggestions(s)).catch(() => setSuggestions([]));
    }
  }, [drawerOpen, vehicleId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!vehicleId) return;
    setError('');
    setSubmitting(true);
    try {
      const parsedMileage = Number(mileage);
      if (!Number.isFinite(parsedMileage) || parsedMileage < 0) {
        throw new Error('Enter a valid mileage in km');
      }
      const eventDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (eventDate > today) {
        throw new Error('Event date cannot be in the future.');
      }

      const { event } = await api.createEvent(vehicleId, {
        eventType,
        date,
        mileage: parsedMileage,
        cost: cost ? Number(cost) : undefined,
        garageName: garageName || undefined,
        notes: notes || undefined,
      });

      if (uploadFile) {
        try {
          await api.uploadDocument(vehicleId, event.id, uploadFile);
          toast.info('Receipt attached to this event.');
        } catch (uploadErr) {
          const uploadMsg = uploadErr instanceof Error ? uploadErr.message : 'Receipt upload failed';
          toast.error(`Event saved, but receipt upload failed: ${uploadMsg}`);
        }
      }

      setDrawerOpen(false);
      resetForm();
      await load();
      api.generateReminders(vehicleId).catch(() => {});
      toast.success('Service record added.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!vehicleId || !editEventTarget) return;
    setError('');
    setSubmitting(true);
    try {
      const parsedMileage = Number(mileage);
      if (!Number.isFinite(parsedMileage) || parsedMileage < 0) {
        throw new Error('Enter a valid mileage in km');
      }
      const eventDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (eventDate > today) {
        throw new Error('Event date cannot be in the future.');
      }
      await api.updateEvent(vehicleId, editEventTarget.id, {
        eventType,
        date,
        mileage: parsedMileage,
        cost: cost ? Number(cost) : undefined,
        garageName: garageName || undefined,
        notes: notes || undefined,
      });
      setDrawerOpen(false);
      resetForm();
      await load();
      toast.success('Service record updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const headerMileage = events[0]?.mileage ?? 0;
  const currentMileage = vehicle?.mileage ?? headerMileage;
  const parsedMileageInput = Number(mileage);
  // For edits of the record that set the current odometer, lowering is still blocked server-side;
  // warn inline before submit instead of failing on Save.
  const mileageWarning =
    mileage !== '' && Number.isFinite(parsedMileageInput) && parsedMileageInput < currentMileage
      ? `Below the vehicle's current odometer (${currentMileage.toLocaleString()} km). Mileage can never decrease.`
      : '';
  const verifiedCount = events.filter((event) => event.verified).length;
  const selfReportedCount = events.filter((event) => !event.verified).length;

  return (
    <PageTransition>
      <div className="hero-panel page-hero compact">
        <div className="hero-copy">
          <Link to="/" className="mono muted" style={{ fontSize: 12 }}>
            ← Dashboard
          </Link>
          <h1 className="display page-title" style={{ marginTop: 8 }}>
            {vehicle ? vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Service history'}
          </h1>
          {vehicle?.nickname && (
            <p className="mono muted" style={{ fontSize: 13 }}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
          )}
          <p className="mono" style={{ color: 'var(--color-accent)', fontSize: 24 }}>
            {(vehicle?.mileage ?? headerMileage).toLocaleString()} km
          </p>
          <p className="muted">Shop records are verified. Owner entries are self-reported and can include proof.</p>
        </div>
        <div className="hero-actions">
          <Link to={`/vehicles/${vehicleId}/share`} className="btn btn-primary">
            Share history
          </Link>
          <button type="button" className="btn btn-solid" onClick={openAddDrawer}>
            <Plus size={16} /> Add record
          </button>
        </div>
      </div>

      <div className="metric-strip">
        <div className="metric-pill-card">
          <span className="mono muted">Shop verified</span>
          <strong>{verifiedCount}</strong>
        </div>
        <div className="metric-pill-card">
          <span className="mono muted">Owner records</span>
          <strong>{selfReportedCount}</strong>
        </div>
        <div className="metric-pill-card">
          <span className="mono muted">Total records</span>
          <strong>{events.length}</strong>
        </div>
      </div>

      {trustFilter === 'verified' && (
        <div className="trust-callout verified">
          <ShieldCheck size={18} />
          <div>
            <strong>Shop-verified records</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              These are created or certified by a partner shop. They count fully toward your trust score.
            </p>
          </div>
        </div>
      )}
      {trustFilter === 'self' && (
        <div className="trust-callout self">
          <FileText size={18} />
          <div>
            <strong>Owner records</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              Your own entries with optional proof. A partner shop can verify them later.
            </p>
          </div>
        </div>
      )}
      {trustFilter === 'all' && events.length > 0 && (
        <div className="trust-callout">
          <Info size={18} />
          <div>
            <strong>Two trust levels</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              <span style={{ color: 'var(--color-verified)' }}>Verified</span> records are created by partner shops.
              <span style={{ color: 'var(--color-warning)' }}> Owner</span> records can include uploaded proof.
            </p>
          </div>
        </div>
      )}

      <div className="control-bar">
        <div className="control-group">
          <span className="mono muted" style={{ fontSize: 11 }}>TRUST</span>
          <div className="segmented">
            {[
              { id: 'all', label: 'All' },
              { id: 'verified', label: 'Verified' },
              { id: 'self', label: 'Owner' },
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
        <div className="control-group pills-scroll">
          <span className="mono muted" style={{ fontSize: 11 }}>TYPE</span>
          <div className="pills-row">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`pill ${filterType === f ? 'active' : ''}`} onClick={() => setFilterType(f)}>
              {f}
            </button>
          ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton card" style={{ height: 120 }} />
      ) : events.length === 0 ? (
        <div className="card empty-state">
          <p style={{ fontSize: 48 }}>🚗</p>
          {filterType !== 'All' || trustFilter !== 'all' ? (
            <>
              <p>No records match these filters.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { setFilterType('All'); setTrustFilter('all'); }}
                >
                  Clear filters
                </button>
              </div>
            </>
          ) : (
            <>
              <p>No service records yet.</p>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Log your first service below, or have a partner shop add a verified record.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" onClick={openAddDrawer}>
                  <Plus size={14} /> Log first service
                </button>
                <Link to="/shops" className="btn btn-ghost">
                  Find a shop
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <motion.ol className="timeline-rail" variants={stagger} initial="initial" animate="animate" style={{ listStyle: 'none', margin: 0, padding: '0 0 0 28px' }}>
          {events.map((ev) => (
            <motion.li key={ev.id} variants={staggerItem} style={{ listStyle: 'none' }}>
              <EventTimelineItem
                event={ev}
                vehicleId={vehicleId}
                onEdit={ev.source !== 'SHOP' && !ev.verified ? openEditDrawer : undefined}
                onDelete={
                  ev.source !== 'SHOP' && !ev.verified
                    ? async () => {
                        if (confirm('Delete this record?')) {
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
      )}

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="overlay overlay-drawer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setDrawerOpen(false)}
            />
            <motion.div
              className={`drawer ${isMobileSheet ? 'drawer-sheet' : ''}`}
              initial={isMobileSheet ? { y: '100%' } : { x: '100%' }}
              animate={isMobileSheet ? { y: 0 } : { x: 0 }}
              exit={isMobileSheet ? { y: '100%' } : { x: '100%' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label={drawerMode === 'edit' ? 'Edit service record' : 'Add service record'}
            >
              <form
                onSubmit={drawerMode === 'edit' ? handleUpdate : handleCreate}
                style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}
              >
                <header className="drawer-header">
                  <div>
                    <span className="drawer-eyebrow">
                      <FileText size={11} /> {drawerMode === 'edit' ? 'Edit record' : 'Owner record'}
                    </span>
                    <h2 className="display" style={{ marginTop: 10 }}>
                      {drawerMode === 'edit' ? 'Edit service record' : 'Add service record'}
                    </h2>
                    <p>
                      {drawerMode === 'edit'
                        ? 'Update the details of this owner record.'
                        : 'Add details and optional proof (receipt or photo).'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="drawer-close"
                    onClick={closeDrawer}
                    aria-label="Close"
                    disabled={submitting}
                  >
                    <X size={18} />
                  </button>
                </header>

                <div className="drawer-body">
                  {drawerMode === 'create' && suggestions[0] && (
                    <div className="drawer-suggestion">
                      <Sparkles size={16} />
                      <div>
                        <strong style={{ display: 'block', fontSize: 13 }}>Recommendation</strong>
                        <span style={{ color: 'var(--color-text-muted)' }}>{suggestions[0].reason}</span>
                      </div>
                    </div>
                  )}

                  <section className="drawer-section">
                    <div className="drawer-section-head">
                      <h3>Service type</h3>
                      <span className="hint">Pick the closest match</span>
                    </div>
                    <div className="event-type-grid">
                      {orderEventTypes(events).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`event-type-card ${eventType === t.id ? 'selected' : ''}`}
                          onClick={() => setEventType(t.id)}
                          aria-pressed={eventType === t.id}
                        >
                          <t.icon size={18} />
                          <span>{t.id}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="drawer-section">
                    <div className="drawer-section-head">
                      <h3>Service details</h3>
                      <span className="hint">Required: date and mileage</span>
                    </div>
                    <div className="field-grid-2">
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label" htmlFor="ev-date">Date</label>
                        <input
                          id="ev-date"
                          className="input input-mono"
                          type="date"
                          value={date}
                          min={vehicle ? `${vehicle.year}-01-01` : undefined}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setDate(e.target.value)}
                          onFocus={(e) => scrollFieldIntoView(e.target)}
                          required
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label" htmlFor="ev-mileage">Mileage</label>
                        <div className="input-prefix">
                          <input
                            id="ev-mileage"
                            className="input input-mono input-suffix"
                            type="number"
                            min={0}
                            placeholder="0"
                            value={mileage}
                            onChange={(e) => setMileage(e.target.value)}
                            onFocus={(e) => scrollFieldIntoView(e.target)}
                            required
                          />
                          <span className="input-prefix-suffix">km</span>
                        </div>
                        {mileageWarning && (
                          <p className="error-msg" style={{ marginTop: 6, fontSize: 12 }}>
                            {mileageWarning}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="field-grid-2" style={{ marginTop: 12 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label" htmlFor="ev-cost">Cost (optional)</label>
                        <div className="input-prefix">
                          <span className="input-prefix-symbol">$</span>
                          <input
                            id="ev-cost"
                            className="input input-mono"
                            type="number"
                            step="0.01"
                            min={0}
                            placeholder="0.00"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            onFocus={(e) => scrollFieldIntoView(e.target)}
                          />
                        </div>
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label" htmlFor="ev-garage">Garage (optional)</label>
                        <input
                          id="ev-garage"
                          className="input"
                          value={garageName}
                          onChange={(e) => setGarageName(e.target.value)}
                          onFocus={(e) => scrollFieldIntoView(e.target)}
                          placeholder="e.g. Joe's Auto"
                        />
                      </div>
                    </div>
                    <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                      <label className="label" htmlFor="ev-notes">Notes (optional)</label>
                      <textarea
                        id="ev-notes"
                        className="textarea"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onFocus={(e) => scrollFieldIntoView(e.target)}
                        placeholder="Parts replaced, observations, next steps…"
                      />
                    </div>
                  </section>

                  {drawerMode === 'create' && <section className="drawer-section">
                    <div className="drawer-section-head">
                      <h3>Proof of service</h3>
                      <span className="hint">Optional but recommended</span>
                    </div>
                    <p className="muted" style={{ fontSize: 13, marginTop: -4, marginBottom: 10 }}>
                      Attach a receipt or photo. Buyers and shops can use it to confirm the work.
                    </p>
                    <label className={`upload-zone-rich ${uploadFile ? 'has-file' : ''}`}>
                      <div className="upload-icon">
                        {uploadPreview ? (
                          <div className="upload-preview-thumb">
                            <img src={uploadPreview} alt="" />
                          </div>
                        ) : uploadFile ? (
                          <FileText size={20} />
                        ) : (
                          <Upload size={20} />
                        )}
                      </div>
                      <div className="upload-body">
                        {uploadFile ? (
                          <>
                            <span className="upload-title">{uploadFile.name}</span>
                            <span className="upload-meta">
                              {formatFileSize(uploadFile.size)}
                              {uploadFile.type.startsWith('image/') && ' · image'}
                              {uploadFile.type === 'application/pdf' && ' · PDF'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="upload-title" style={{ color: 'var(--color-text)' }}>
                              Drop or browse a receipt
                            </span>
                            <span className="upload-meta">JPG, PNG or PDF · up to 10 MB</span>
                          </>
                        )}
                      </div>
                      {uploadFile ? (
                        <button
                          type="button"
                          className="upload-remove"
                          onClick={(e) => {
                            e.preventDefault();
                            onPickFile(null);
                          }}
                          aria-label="Remove file"
                        >
                          <X size={16} />
                        </button>
                      ) : (
                        <ImageIcon size={14} style={{ color: 'var(--color-text-muted)' }} />
                      )}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </section>}

                  {error && <p className="error-msg" style={{ marginTop: 8 }}>{error}</p>}
                </div>

                <footer className="drawer-footer">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={closeDrawer}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-solid" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="spinning" /> Saving…
                      </>
                    ) : drawerMode === 'edit' ? (
                      <>
                        <Pencil size={16} /> Save changes
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Add record
                      </>
                    )}
                  </button>
                </footer>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
