import type { MaintenanceEvent } from '../../types';
import VerificationBadge from './VerificationBadge';

/** Minimal buyer view for SUMMARY share level */
export default function PublicEventSummaryCard({ event }: { event: MaintenanceEvent }) {
  return (
    <div className={`timeline-item ${event.verified ? 'timeline-verified' : 'timeline-self'}`}>
      <span className="timeline-dot" aria-hidden="true" />
      <article className="card event-card public-event-summary">
        <div className="event-card-head">
          <div>
            <span className="mono muted" style={{ fontSize: 11 }}>
              {new Date(event.date).toLocaleDateString()} · {event.mileage.toLocaleString()} km
            </span>
            <h3 className="event-card-title">{event.eventType}</h3>
          </div>
          <VerificationBadge event={event} />
        </div>
      </article>
    </div>
  );
}
