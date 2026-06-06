import { FormEvent, useState } from 'react';
import { Bell, ShieldCheck } from 'lucide-react';
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

  if (events.length === 0) {
    return (
      <div className="card empty-state">
        <p className="muted">No pending owner reports. Most service records should be created from the verified record tab.</p>
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
              <p className="mono muted">{new Date(event.date).toLocaleDateString()} · {event.mileage.toLocaleString()} km</p>
            </div>
            <VerificationBadge event={event} />
          </div>
          {event.documents?.length > 0 && <p className="muted">{event.documents.length} owner proof file(s) attached</p>}
          <div className="button-row">
            <button type="button" className="btn btn-solid btn-sm" onClick={() => setActiveId(event.id)}>
              <ShieldCheck size={14} /> Verify owner report
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReminderFor(event.id)}>
              <Bell size={14} /> Remind
            </button>
          </div>

          {activeId === event.id && (
            <form className="inline-action" onSubmit={(e) => verify(e, event.id)}>
              <div className="field">
                <label className="label">Shop proof (optional)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="field">
                <label className="label">Verification notes</label>
                <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-solid btn-sm">Confirm verification</button>
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
              <button type="submit" className="btn btn-outline btn-sm">Notify owner</button>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
