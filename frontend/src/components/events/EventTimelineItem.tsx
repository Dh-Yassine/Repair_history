import { FileText, Trash2 } from 'lucide-react';
import { api } from '../../api';
import type { MaintenanceEvent } from '../../types';
import VerificationBadge from './VerificationBadge';

function shopName(event: MaintenanceEvent) {
  return (
    event.verification?.shop?.shopName ||
    event.createdByShop?.shopName ||
    event.garageName ||
    event.verification?.shop?.fullName ||
    event.createdByShop?.fullName ||
    null
  );
}

export default function EventTimelineItem({
  event,
  vehicleId,
  publicView = false,
  detailLevel = 'FULL',
  onDelete,
}: {
  event: MaintenanceEvent;
  vehicleId?: string;
  publicView?: boolean;
  detailLevel?: 'SUMMARY' | 'FULL';
  onDelete?: () => void;
}) {
  const showDetails = !publicView || detailLevel === 'FULL';
  const certifier = showDetails ? shopName(event) : null;
  const canDelete = Boolean(onDelete && event.source !== 'SHOP' && !event.verified);

  return (
    <div className={`timeline-item ${event.verified ? 'timeline-verified' : 'timeline-self'}`}>
      <span className="timeline-dot" aria-hidden="true" />
      <article className="card card-hover event-card">
        <div className="event-card-head">
          <div>
            <span className="mono muted" style={{ fontSize: 11 }}>
              {new Date(event.date).toLocaleDateString()} · {event.mileage.toLocaleString()} km
            </span>
            <h3 className="event-card-title">{event.eventType}</h3>
          </div>
          <VerificationBadge event={event} />
        </div>

        {certifier && (
          <p className="event-card-certifier">
            {event.verified ? 'Certified by ' : 'Reported at '}
            <strong>{certifier}</strong>
            {event.verification?.verifiedAt && (
              <span className="mono muted"> · {new Date(event.verification.verifiedAt).toLocaleDateString()}</span>
            )}
          </p>
        )}

        {showDetails && event.cost != null && (
          <p className="mono" style={{ color: 'var(--color-accent)', fontSize: 16 }}>
            ${event.cost.toFixed(2)}
          </p>
        )}
        {showDetails && event.notes && <p style={{ fontSize: 14 }}>{event.notes}</p>}
        {showDetails && event.verification?.notes && <p className="muted">Shop note: {event.verification.notes}</p>}
        {showDetails && publicView && (event.documentCount ?? 0) > 0 && (
          <p className="event-proof-link">
            <FileText size={14} />
            <span className="mono muted">{event.documentCount} proof file(s) on record</span>
          </p>
        )}

        {!publicView && vehicleId && event.documents?.map((doc) => (
          <p key={doc.id} className="event-proof-link">
            <FileText size={14} />
            <a href={api.documentUrl(vehicleId, event.id, doc.id)} target="_blank" rel="noreferrer">
              {doc.fileName}
            </a>
            {doc.ocrResult && <span className="mono muted"> OCR ${doc.ocrResult.parsedAmount ?? '?'}</span>}
          </p>
        ))}

        {event.verification?.proofPath && (
          <p className="event-proof-link">
            <FileText size={14} />
            <a href={api.shopProofUrl(event.verification.proofPath)} target="_blank" rel="noreferrer">
              Shop proof
            </a>
          </p>
        )}

        {canDelete && (
          <button type="button" className="btn btn-danger btn-sm event-delete" onClick={onDelete}>
            <Trash2 size={14} /> Delete self-report
          </button>
        )}
      </article>
    </div>
  );
}
