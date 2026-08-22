import { FormEvent, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Upload,
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
import { formatNumber } from '../lib/format';
import { api } from '../api';
import { useToast } from './ui/Toast';
import Portal from './ui/Portal';
import { useOverlayPanel, scrollFieldIntoView } from '../hooks/useOverlayPanel';
import { useIsMobileSheet } from '../hooks/useMediaQuery';
import { useLanguage, useEventTypeLabel } from '../i18n/LanguageContext';
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * A large mileage jump usually means a typo (e.g. an extra digit), not a real
 * odometer reading, so the owner gets a chance to double-check before saving.
 */
function isMileageJumpSuspicious(parsedMileage: number, vehicleMileage: number) {
  if (!vehicleMileage || vehicleMileage <= 0) return false;
  if (parsedMileage <= vehicleMileage) return false;
  const diff = parsedMileage - vehicleMileage;
  return diff > 50000 && parsedMileage > vehicleMileage * 3;
}

interface Props {
  vehicleId?: string;
  vehicle: Vehicle | null;
  allEvents: MaintenanceEvent[];
  open: boolean;
  mode: 'create' | 'edit';
  editTarget: MaintenanceEvent | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EventFormDrawer({
  vehicleId,
  vehicle,
  allEvents,
  open,
  mode,
  editTarget,
  onClose,
  onSaved,
}: Props) {
  const toast = useToast();
  const { t } = useLanguage();
  const labelEvent = useEventTypeLabel();
  const isMobileSheet = useIsMobileSheet();
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

  const closeDrawer = useCallback(() => {
    if (!submitting) onClose();
  }, [submitting, onClose]);

  useOverlayPanel(open, closeDrawer, !submitting);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && editTarget) {
      setEventType(editTarget.eventType);
      setDate(new Date(editTarget.date).toISOString().slice(0, 10));
      setMileage(String(editTarget.mileage));
      setCost(editTarget.cost != null ? String(editTarget.cost) : '');
      setGarageName(editTarget.garageName ?? '');
      setNotes(editTarget.notes ?? '');
    } else {
      setEventType(EVENT_TYPES[0].id);
      setDate(new Date().toISOString().slice(0, 10));
      setMileage('');
      setCost('');
      setGarageName('');
      setNotes('');
    }
    setUploadFile(null);
    setUploadPreview(null);
    setError('');
  }, [open, mode, editTarget]);

  useEffect(() => {
    if (open && vehicleId) {
      api.suggestions(vehicleId).then(({ suggestions: s }) => setSuggestions(s)).catch(() => setSuggestions([]));
    }
  }, [open, vehicleId]);

  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  function onPickFile(file: File | null) {
    setUploadFile(file);
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    if (file && file.type.startsWith('image/')) {
      setUploadPreview(URL.createObjectURL(file));
    } else {
      setUploadPreview(null);
    }
  }

  function confirmMileageOk(parsedMileage: number) {
    if (!vehicle || !isMileageJumpSuspicious(parsedMileage, vehicle.mileage)) return true;
    return window.confirm(
      t('vehicle.mileageJumpWarn', {
        mileage: formatNumber(parsedMileage),
        vehicle: formatNumber(vehicle.mileage),
      })
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!vehicleId) return;
    setError('');
    try {
      const parsedMileage = Number(mileage);
      if (!Number.isFinite(parsedMileage) || parsedMileage < 0) {
        throw new Error(t('vehicle.invalidMileage'));
      }
      const eventDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (eventDate > today) {
        throw new Error(t('vehicle.futureDateError'));
      }
      if (!confirmMileageOk(parsedMileage)) return;

      setSubmitting(true);

      const payload = {
        eventType,
        date,
        mileage: parsedMileage,
        cost: cost ? Number(cost) : undefined,
        garageName: garageName || undefined,
        notes: notes || undefined,
      };

      const { event } =
        mode === 'edit' && editTarget
          ? await api.updateEvent(vehicleId, editTarget.id, payload)
          : await api.createEvent(vehicleId, payload);

      if (uploadFile) {
        try {
          await api.uploadDocument(vehicleId, event.id, uploadFile);
          toast.info(t('vehicle.receiptAttached'));
        } catch (uploadErr) {
          const uploadMsg = uploadErr instanceof Error ? uploadErr.message : t('common.failed');
          toast.error(t('vehicle.eventSavedUploadFailed', { msg: uploadMsg }));
        }
      }

      onClose();
      onSaved();
      if (mode === 'edit') {
        toast.success(t('vehicle.recordUpdated'));
      } else {
        api.generateReminders(vehicleId).catch(() => {});
        toast.success(t('vehicle.recordAdded'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.failed');
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="overlay overlay-drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && onClose()}
          />
          <motion.div
            className={`drawer ${isMobileSheet ? 'drawer-sheet' : ''}`}
            initial={isMobileSheet ? { y: '100%' } : { x: '100%' }}
            animate={isMobileSheet ? { y: 0 } : { x: 0 }}
            exit={isMobileSheet ? { y: '100%' } : { x: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'edit' ? t('vehicle.editService') : t('vehicle.addService')}
          >
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}
            >
              <header className="drawer-header">
                <div>
                  <span className="drawer-eyebrow">
                    <FileText size={11} /> {mode === 'edit' ? t('vehicle.editRecord') : t('vehicle.ownerRecord')}
                  </span>
                  <h2 className="display" style={{ marginTop: 10 }}>
                    {mode === 'edit' ? t('vehicle.editService') : t('vehicle.addService')}
                  </h2>
                  <p>{mode === 'edit' ? t('vehicle.editServiceDesc') : t('vehicle.addServiceDesc')}</p>
                </div>
                <button
                  type="button"
                  className="drawer-close"
                  onClick={closeDrawer}
                  aria-label={t('common.close')}
                  disabled={submitting}
                >
                  <X size={18} />
                </button>
              </header>

              <div className="drawer-body">
                {mode === 'create' && suggestions[0] && (
                  <div className="drawer-suggestion">
                    <Sparkles size={16} />
                    <div>
                      <strong style={{ display: 'block', fontSize: 13 }}>{t('vehicle.recommendation')}</strong>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {t(`vehicle.suggestions.${suggestions[0].reasonKey}`, {
                          ...suggestions[0].reasonParams,
                          type: labelEvent(suggestions[0].serviceType),
                        })}
                      </span>
                    </div>
                  </div>
                )}

                <section className="drawer-section">
                  <div className="drawer-section-head">
                    <h3>{t('vehicle.serviceType')}</h3>
                  </div>
                  <div className="event-type-grid">
                    {orderEventTypes(allEvents).map((et) => (
                      <button
                        key={et.id}
                        type="button"
                        className={`event-type-card ${eventType === et.id ? 'selected' : ''}`}
                        onClick={() => setEventType(et.id)}
                        aria-pressed={eventType === et.id}
                      >
                        <et.icon size={18} />
                        <span>{labelEvent(et.id)}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="drawer-section">
                  <div className="drawer-section-head">
                    <h3>{t('vehicle.serviceDetails')}</h3>
                  </div>
                  <div className="field-grid-2">
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label className="label" htmlFor="ev-date">
                        * {t('vehicle.date')}
                      </label>
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
                      <label className="label" htmlFor="ev-mileage">
                        * {t('vehicle.mileage')}
                      </label>
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
                    </div>
                  </div>
                  <div className="field-grid-2" style={{ marginTop: 12 }}>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label className="label" htmlFor="ev-cost">
                        {t('vehicle.costOptional')}
                      </label>
                      <div className="input-prefix">
                        <span className="input-prefix-symbol">€</span>
                        <input
                          id="ev-cost"
                          className="input input-mono"
                          type="number"
                          step="1"
                          min={0}
                          placeholder="0"
                          value={cost}
                          onChange={(e) => setCost(e.target.value)}
                          onFocus={(e) => scrollFieldIntoView(e.target)}
                        />
                      </div>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label className="label" htmlFor="ev-garage">
                        {t('vehicle.garageOptional')}
                      </label>
                      <input
                        id="ev-garage"
                        className="input"
                        value={garageName}
                        onChange={(e) => setGarageName(e.target.value)}
                        onFocus={(e) => scrollFieldIntoView(e.target)}
                        placeholder={t('vehicle.garagePlaceholder')}
                      />
                    </div>
                  </div>
                  <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                    <label className="label" htmlFor="ev-notes">
                      {t('vehicle.notesOptional')}
                    </label>
                    <textarea
                      id="ev-notes"
                      className="textarea"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onFocus={(e) => scrollFieldIntoView(e.target)}
                      placeholder={t('vehicle.notesPlaceholder')}
                    />
                  </div>
                </section>

                <section className="drawer-section">
                  <div className="drawer-section-head">
                    <h3>{t('vehicle.proofOfService')}</h3>
                  </div>
                  <p className="muted" style={{ fontSize: 13, marginTop: -4, marginBottom: 10 }}>
                    {t('vehicle.proofDesc')}
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
                            {t('vehicle.dropBrowse')}
                          </span>
                          <span className="upload-meta">{t('vehicle.fileHint')}</span>
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
                        aria-label={t('vehicle.removeFile')}
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

                <p className="mono subtle" style={{ fontSize: 11, marginTop: 4 }}>
                  {t('vehicle.requiredLegend')}
                </p>

                {error && <p className="error-msg" style={{ marginTop: 8 }}>{error}</p>}
              </div>

              <footer className="drawer-footer">
                <button type="button" className="btn btn-ghost" onClick={closeDrawer} disabled={submitting}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-solid" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spinning" /> {t('common.saving')}
                    </>
                  ) : mode === 'edit' ? (
                    <>
                      <Pencil size={16} /> {t('vehicle.saveChanges')}
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> {t('vehicle.addRecord')}
                    </>
                  )}
                </button>
              </footer>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </Portal>
  );
}
