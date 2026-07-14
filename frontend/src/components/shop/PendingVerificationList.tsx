import { FormEvent, useState } from 'react';
import { Bell, ExternalLink, FileText, ShieldCheck, UserRound } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../ui/Toast';
import type { MaintenanceEvent } from '../../types';
import VerificationBadge from '../events/VerificationBadge';

export default function PendingVerificationList({
  events,
  onChanged,
}: {
  events: MaintenanceEvent[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const [activeId, setActiveId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [reminderFor, setReminderFor] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderType, setReminderType] = useState('Inspection');
  const [error, setError] = useState('');

  async function verify(e: FormEvent, eventId: string) {
    e.preventDefault();
    setError('');
    try {
      await api.verifyEvent(eventId, proofFile ?? undefined, notes || undefined);
      setActiveId('');
      setProofFile(null);
      setNotes('');
      toast.success('Owner report verified.');
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
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
      toast.success('Reminder sent to the owner.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reminder failed';
      setError(msg);
      toast.error(msg);
    }
  }

  async function openProof(eventId: string, documentId: string) {
    try {
      const { url } = await api.shopDocumentFile(eventId, documentId);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the proof file');
    }
  }

  if (events.length === 0) {
    return (
      <div className="card empty-state">
        <p>No pending reports from your customers.</p>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          You only see unverified reports from owners connected to your shop — customers you have
          looked up or serviced before. New service work is faster to add from the verified record tab.
        </p>
      </div>
    );
  }

  return (
    <div className="shop-card-list">
      {error && <p className="error-msg">{error}</p>}
      {events.map((event) => (
        <article key={event.id} className="card shop-work-card">
          <div className="event-card-head">
            <div>
              <p className="mono muted" style={{ fontSize: 11 }}>
                {event.vehicle ? `${event.vehicle.year} ${event.vehicle.make} ${event.vehicle.model}` : 'Vehicle'}
              </p>
              <h3>{event.eventType}</h3>
              {event.vehicle?.owner?.email && (
                <p className="mono muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <UserRound size={12} /> {event.vehicle.owner.email}
                </p>
              )}
            </div>
            <VerificationBadge event={event} />
          </div>

          {/* The owner's claim, laid out for actual review before confirming */}
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
              <span className="mono muted" style={{ fontSize: 10, display: 'block' }}>CLAIMED DATE</span>
              <strong style={{ fontSize: 14 }}>{new Date(event.date).toLocaleDateString()}</strong>
            </div>
            <div>
              <span className="mono muted" style={{ fontSize: 10, display: 'block' }}>CLAIMED MILEAGE</span>
              <strong style={{ fontSize: 14 }}>{event.mileage.toLocaleString()} km</strong>
            </div>
            {event.cost != null && (
              <div>
                <span className="mono muted" style={{ fontSize: 10, display: 'block' }}>CLAIMED COST</span>
                <strong style={{ fontSize: 14 }}>{event.cost.toFixed(2)} €</strong>
              </div>
            )}
            {event.garageName && (
              <div>
                <span className="mono muted" style={{ fontSize: 10, display: 'block' }}>GARAGE NAMED</span>
                <strong style={{ fontSize: 14 }}>{event.garageName}</strong>
              </div>
            )}
          </div>

          {event.notes && (
            <p style={{ fontSize: 13, margin: '4px 0' }}>
              <span className="mono muted" style={{ fontSize: 10 }}>OWNER NOTES · </span>
              {event.notes}
            </p>
          )}

          {(event.documents?.length ?? 0) > 0 ? (
            <div style={{ margin: '6px 0' }}>
              <span className="mono muted" style={{ fontSize: 10 }}>OWNER PROOF</span>
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
              No proof attached by the owner
            </p>
          )}

          <div className="button-row">
            <button type="button" className="btn btn-solid btn-sm" onClick={() => setActiveId(event.id)}>
              <ShieldCheck size={14} /> Review &amp; verify
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReminderFor(event.id)}>
              <Bell size={14} /> Remind
            </button>
          </div>

          {activeId === event.id && (
            <form className="inline-action" onSubmit={(e) => verify(e, event.id)}>
              <p style={{ fontSize: 13, margin: '0 0 10px' }}>
                By verifying, you confirm this <strong>{event.eventType.toLowerCase()}</strong> was
                performed around <strong>{new Date(event.date).toLocaleDateString()}</strong> at{' '}
                <strong>{event.mileage.toLocaleString()} km</strong>. It becomes a permanent
                shop-verified record under your shop&apos;s name.
              </p>
              <div className="field">
                <label className="label">Shop proof (optional)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="field">
                <label className="label">Verification notes</label>
                <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Matches our workshop invoice #1042" />
              </div>
              <div className="button-row">
                <button type="submit" className="btn btn-solid btn-sm">
                  <ShieldCheck size={14} /> Confirm verification
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveId('')}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {reminderFor === event.id && (
            <form className="inline-action" onSubmit={(e) => remind(e, event)}>
              <div className="grid-form-2">
                <div className="field">
                  <label className="label">Service</label>
                  <input className="input" value={reminderType} onChange={(e) => setReminderType(e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Due date</label>
                  <input className="input" type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-outline btn-sm">Send reminder</button>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
