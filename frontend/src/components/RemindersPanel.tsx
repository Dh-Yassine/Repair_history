import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ServiceReminder } from '../types';

export default function RemindersPanel() {
  const [reminders, setReminders] = useState<ServiceReminder[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { reminders: list } = await api.reminders();
      setReminders(list);
    } catch {
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function complete(id: string) {
    await api.completeReminder(id);
    await load();
  }

  if (loading) return <div className="card skeleton" style={{ height: 100, marginBottom: 16 }} />;
  if (reminders.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(255, 140, 66, 0.35)' }}>
      <h3 className="display" style={{ fontSize: 18, marginBottom: 12, color: 'var(--color-warning)' }}>
        Service reminders
      </h3>
      {reminders.slice(0, 5).map((r) => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          <div>
            <strong>{r.serviceType}</strong>
            {r.vehicle && (
              <span className="mono muted" style={{ fontSize: 12, marginLeft: 8 }}>
                {r.vehicle.year} {r.vehicle.make}
              </span>
            )}
            <p className="mono subtle" style={{ fontSize: 11, margin: '2px 0 0' }}>
              {r.dueDate && `Due ${new Date(r.dueDate).toLocaleDateString()}`}
              {r.dueMileage != null && ` · ${r.dueMileage.toLocaleString()} km`}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => complete(r.id)}>
            Done
          </button>
        </div>
      ))}
    </div>
  );
}
