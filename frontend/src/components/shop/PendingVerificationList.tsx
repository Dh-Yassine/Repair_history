import { FormEvent, useState } from 'react';
import { Bell, ExternalLink, FileText, ShieldCheck, UserRound } from 'lucide-react';
import { formatCurrency, formatDate, formatKm, formatNumber } from '../../lib/format';
import { api } from '../../api';
import { useLanguage, useEventTypeLabel } from '../../i18n/LanguageContext';
import { useToast } from '../ui/Toast';
import type { MaintenanceEvent } from '../../types';
import VerificationBadge from '../events/VerificationBadge';

const EVENT_TYPES = ['Oil change', 'Tire rotation', 'Brake service', 'Battery replacement', 'Inspection', 'Repair', 'Other'];

export default function PendingVerificationList({
  events,
  onChanged,
}: {
  events: MaintenanceEvent[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const { t } = useLanguage();
  const labelEvent = useEventTypeLabel();
  const [activeId, setActiveId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [reminderFor, setReminderFor] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderType, setReminderType] = useState(EVENT_TYPES[4]);
  const [error, setError] = useState('');

  async function verify(e: FormEvent, eventId: string) {
    e.preventDefault();
    setError('');
    try {
      await api.verifyEvent(eventId, proofFile ?? undefined, notes || undefined);
      setActiveId('');
      setProofFile(null);
      setNotes('');
      toast.success(t('shop.toastVerified'));
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('shop.verifyFailed');
      setError(msg);
      toast.error(msg);
    }
  }

  async function remind(e: FormEvent, event: MaintenanceEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.shopCreateReminder({ vehicleId: event.vehicleId, serviceType: reminderType, dueDate: reminderDate });
      setReminderFor('');
      toast.success(t('shop.toastReminder'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('shop.reminderFailed');
      setError(msg);
      toast.error(msg);
    }
  }

  async function openProof(eventId: string, documentId: string) {
    try {
      const { url } = await api.shopDocumentFile(eventId, documentId);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('shop.couldNotOpen'));
    }
  }

  if (events.length === 0) {
    return (
      <div className="card empty-state">
        <p>{t('shop.noPending')}</p>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {t('shop.noPendingDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="shop-card-list">
      {error && <p className="error-msg">{error}</p>}
      {events.map((event) => (
        <article key={event.id} className="card shop-work-card">
          <div className="shop-work-card__head">
            <div>
              <p className="mono muted" style={{ fontSize: 11 }}>
                {event.vehicle
                  ? `${event.vehicle.year} ${event.vehicle.make} ${event.vehicle.model}`
                  : t('shop.vehicleFallback')}
              </p>
              <h3>{labelEvent(event.eventType)}</h3>
              {event.vehicle?.owner?.email && (
                <p className="mono muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <UserRound size={12} /> {event.vehicle.owner.email}
                </p>
              )}
            </div>
            <VerificationBadge event={event} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 10,
              margin: '10px 0',
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
            }}
          >
            <div>
              <span className="mono muted" style={{ fontSize: 10, display: 'block' }}>
                {t('shop.claimedDate')}
              </span>
              <strong style={{ fontSize: 14 }}>{formatDate(event.date)}</strong>
            </div>
            <div>
              <span className="mono muted" style={{ fontSize: 10, display: 'block' }}>
                {t('shop.claimedMileage')}
              </span>
              <strong style={{ fontSize: 14 }}>{formatKm(event.mileage)}</strong>
            </div>
            {event.cost != null && (
              <div>
                <span className="mono muted" style={{ fontSize: 10, display: 'block' }}>
                  {t('shop.claimedCost')}
                </span>
                <strong style={{ fontSize: 14 }}>{formatCurrency(event.cost)}</strong>
              </div>
            )}
            {event.garageName && (
              <div>
                <span className="mono muted" style={{ fontSize: 10, display: 'block' }}>
                  {t('shop.garageNamed')}
                </span>
                <strong style={{ fontSize: 14 }}>{event.garageName}</strong>
              </div>
            )}
          </div>

          {event.notes && (
            <p style={{ fontSize: 13, margin: '4px 0' }}>
              <span className="mono muted" style={{ fontSize: 10 }}>
                {t('shop.ownerNotes')} ·{' '}
              </span>
              {event.notes}
            </p>
          )}

          {(event.documents?.length ?? 0) > 0 ? (
            <div style={{ margin: '6px 0' }}>
              <span className="mono muted" style={{ fontSize: 10 }}>
                {t('shop.ownerProof')}
              </span>
              {event.documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}
                  onClick={() => openProof(event.id, doc.id)}
                >
                  <FileText size={13} /> {doc.fileName} <ExternalLink size={11} />
                </button>
              ))}
            </div>
          ) : (
            <p className="mono muted" style={{ fontSize: 11, margin: '6px 0' }}>
              {t('shop.noProof')}
            </p>
          )}

          <div className="button-row">
            <button type="button" className="btn btn-solid btn-sm" onClick={() => setActiveId(event.id)}>
              <ShieldCheck size={14} /> {t('shop.reviewVerify')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReminderFor(event.id)}>
              <Bell size={14} /> {t('shop.remind')}
            </button>
          </div>

          {activeId === event.id && (
            <form className="inline-action" onSubmit={(e) => verify(e, event.id)}>
              <p style={{ fontSize: 13, margin: '0 0 10px' }}>
                {t('shop.confirmVerifyDetail', {
                  type: labelEvent(event.eventType),
                  date: formatDate(event.date),
                  mileage: formatNumber(event.mileage),
                })}
              </p>
              <div className="field">
                <label className="label">
                  {t('shop.proofFile')} ({t('common.optional')})
                </label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="field">
                <label className="label">{t('shop.verificationNote')}</label>
                <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="button-row">
                <button type="submit" className="btn btn-solid btn-sm">
                  <ShieldCheck size={14} /> {t('shop.confirmVerification')}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveId('')}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          )}

          {reminderFor === event.id && (
            <form className="inline-action" onSubmit={(e) => remind(e, event)}>
              <div className="grid-form-2">
                <div className="field">
                  <label className="label">{t('shop.service')}</label>
                  <select className="input" value={reminderType} onChange={(e) => setReminderType(e.target.value)}>
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {labelEvent(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">{t('shop.dueDate')}</label>
                  <input className="input" type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-outline btn-sm">
                {t('shop.sendReminder')}
              </button>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
