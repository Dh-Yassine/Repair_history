import { FormEvent, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { api } from '../api';
import PageTransition, { stagger, staggerItem } from '../components/layout/PageTransition';
import EventTimelineItem from '../components/events/EventTimelineItem';
import { useToast } from '../components/ui/Toast';
import type { MaintenanceEvent, MaintenanceSuggestion } from '../types';

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function VehicleDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const toast = useToast();
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [trustFilter, setTrustFilter] = useState<'all' | 'verified' | 'self'>('all');
  const [suggestions, setSuggestions] = useState<MaintenanceSuggestion[]>([]);

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
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

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
      const { event } = await api.createEvent(vehicleId, {
        eventType,
        date,
        mileage,
        cost: cost || undefined,
        garageName: garageName || undefined,
        notes: notes || undefined,
      });
      if (uploadFile) {
        const res = await api.uploadDocument(vehicleId, event.id, uploadFile);
        if (res.ocrResult) {
          toast.info(`Receipt OCR: $${res.ocrResult.parsedAmount ?? '—'} · ${res.ocrResult.parsedVendor ?? 'parsed'}`);
        } else {
          toast.info('Receipt uploaded — OCR runs in the background.');
        }
      }
      setDrawerOpen(false);
      resetForm();
      await load();
      api.generateReminders(vehicleId).catch(() => {});
      toast.success('Self-reported event added to your timeline.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const headerMileage = events[0]?.mileage ?? 0;
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
            Maintenance timeline
          </h1>
          <p className="mono" style={{ color: 'var(--color-accent)', fontSize: 24 }}>
            {headerMileage.toLocaleString()} km
          </p>
          <p className="muted">Shop-created records are verified. Your own entries stay self-reported and proof-backed.</p>
        </div>
        <div className="hero-actions">
          <Link to={`/vehicles/${vehicleId}/share`} className="btn btn-primary">
            Share history
          </Link>
          <button type="button" className="btn btn-solid" onClick={() => setDrawerOpen(true)}>
            <Plus size={16} /> Add self-report
          </button>
        </div>
      </div>

      <div className="metric-strip">
        <div className="metric-pill-card">
          <span className="mono muted">Shop verified</span>
          <strong>{verifiedCount}</strong>
        </div>
        <div className="metric-pill-card">
          <span className="mono muted">Self-reported</span>
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
            <strong>Self-reported records</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              These are your own entries with optional proof. Ask a partner shop to verify them when possible.
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
              <span style={{ color: 'var(--color-warning)' }}> Self-reported</span> entries keep your timeline complete with owner-uploaded proof.
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
              { id: 'self', label: 'Self-reported' },
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
          <span className="mono muted" style={{ fontSize: 11 }}>TYPE</span>
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`pill ${filterType === f ? 'active' : ''}`} onClick={() => setFilterType(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="skeleton card" style={{ height: 120 }} />
      ) : events.length === 0 ? (
        <div className="card empty-state">
          <p style={{ fontSize: 48 }}>🚗</p>
          <p>No maintenance events match these filters yet.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <Link to="/shops" className="btn btn-primary">
              Find a verified shop
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => setDrawerOpen(true)}>
              Add a self-report
            </button>
          </div>
        </div>
      ) : (
        <motion.ol className="timeline-rail" variants={stagger} initial="initial" animate="animate" style={{ listStyle: 'none', margin: 0, padding: '0 0 0 28px' }}>
          {events.map((ev) => (
            <motion.li key={ev.id} variants={staggerItem} style={{ listStyle: 'none' }}>
              <EventTimelineItem
                event={ev}
                vehicleId={vehicleId}
                onDelete={
                  ev.source !== 'SHOP' && !ev.verified
                    ? async () => {
                        if (confirm('Delete self-reported event?')) {
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
              className="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setDrawerOpen(false)}
              style={{ alignItems: 'stretch', justifyContent: 'flex-end' }}
            />
            <motion.div
              className="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Add self-reported event"
            >
              <form
                onSubmit={handleCreate}
                style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}
              >
                <header className="drawer-header">
                  <div>
                    <span className="drawer-eyebrow">
                      <FileText size={11} /> Self-reported
                    </span>
                    <h2 className="display" style={{ marginTop: 10 }}>
                      Add a maintenance event
                    </h2>
                    <p>
                      Your own entry — attach a receipt or photo so buyers and shops can trust it later.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="drawer-close"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close"
                    disabled={submitting}
                  >
                    <X size={18} />
                  </button>
                </header>

                <div className="drawer-body">
                  {suggestions[0] && (
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
                      {EVENT_TYPES.map((t) => (
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
                          onChange={(e) => setDate(e.target.value)}
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
                            required
                          />
                          <span className="input-prefix-suffix">km</span>
                        </div>
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
                        placeholder="Parts replaced, observations, next steps…"
                      />
                    </div>
                  </section>

                  <section className="drawer-section">
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
                  </section>

                  {error && <p className="error-msg" style={{ marginTop: 8 }}>{error}</p>}
                </div>

                <footer className="drawer-footer">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setDrawerOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-solid" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="spinning" /> Saving…
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Save event
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
