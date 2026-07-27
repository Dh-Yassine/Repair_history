import { Check, FileText, Trash2, Pencil } from 'lucide-react';
import { formatCurrency, formatDate, formatKm } from '../../lib/format';
import { api } from '../../api';
import { useLanguage, useEventTypeLabel } from '../../i18n/LanguageContext';
import type { MaintenanceEvent } from '../../types';
import { verificationLabel } from './VerificationBadge';

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

/**
 * One line of the service logbook. Rows are separated by hairlines rather than
 * boxed as cards, so a history reads as a continuous record; the seal in the
 * gutter and the coloured edge carry the verified/declared distinction.
 */
export default function EventTimelineItem({
  event,
  vehicleId,
  publicView = false,
  detailLevel = 'FULL',
  onDelete,
  onEdit,
}: {
  event: MaintenanceEvent;
  vehicleId?: string;
  publicView?: boolean;
  detailLevel?: 'SUMMARY' | 'FULL';
  onDelete?: () => void;
  onEdit?: (event: MaintenanceEvent) => void;
}) {
  const { t } = useLanguage();
  const labelEvent = useEventTypeLabel();
  const verified = Boolean(event.verified || event.source === 'SHOP');
  const showDetails = !publicView || detailLevel === 'FULL';
  const certifier = showDetails ? shopName(event) : null;
  const isOwnerEditable = Boolean(!publicView && event.source !== 'SHOP' && !event.verified);
  const canDelete = Boolean(onDelete && isOwnerEditable);
  const canEdit = Boolean(onEdit && isOwnerEditable);

  return (
    <article className={`ledger-row ${verified ? 'ledger-row--verified' : 'ledger-row--declared'}`}>
      <span className="ledger-seal" aria-hidden="true">
        {verified ? <Check size={15} strokeWidth={3} /> : <FileText size={13} />}
      </span>

      <div className="ledger-row__body">
        <p className="ledger-row__meta mono">
          <span>{formatDate(event.date)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatKm(event.mileage)}</span>
          <span aria-hidden="true">·</span>
          <span className={verified ? 'tone-verified' : 'tone-declared'}>
            {verificationLabel(event, t)}
          </span>
        </p>

        <h3 className="ledger-row__title">{labelEvent(event.eventType)}</h3>

        {certifier && (
          <p className="ledger-row__by">
            {verified ? t('events.certifiedBy') : t('events.reportedAt')} <strong>{certifier}</strong>
            {event.verification?.verifiedAt && (
              <span className="mono"> · {formatDate(event.verification.verifiedAt)}</span>
            )}
          </p>
        )}

        {showDetails && event.notes && <p className="ledger-row__note">{event.notes}</p>}
        {showDetails && event.verification?.notes && (
          <p className="ledger-row__note">
            {t('events.shopNote')} {event.verification.notes}
          </p>
        )}

        {showDetails && publicView && (event.documentCount ?? 0) > 0 && (
          <p className="ledger-row__proof">
            <FileText size={13} />
            <span className="mono">{t('events.proofFiles', { n: event.documentCount ?? 0 })}</span>
          </p>
        )}

        {!publicView &&
          vehicleId &&
          event.documents?.map((doc) => (
            <p key={doc.id} className="ledger-row__proof">
              <FileText size={13} />
              <a href={api.documentUrl(vehicleId, event.id, doc.id)} target="_blank" rel="noreferrer">
                {doc.fileName}
              </a>
              {doc.ocrResult && <span className="mono"> OCR {doc.ocrResult.parsedAmount ?? '?'} €</span>}
            </p>
          ))}

        {event.verification?.proofPath && (
          <p className="ledger-row__proof">
            <FileText size={13} />
            <a href={api.shopProofUrl(event.verification.proofPath)} target="_blank" rel="noreferrer">
              {t('events.shopProof')}
            </a>
          </p>
        )}
      </div>

      <div className="ledger-row__side">
        {showDetails && event.cost != null && (
          <span className="ledger-row__cost mono">{formatCurrency(event.cost)}</span>
        )}
        {(canEdit || canDelete) && (
          <div className="ledger-row__actions">
            {canEdit && (
              <button
                type="button"
                className="ledger-row__action"
                onClick={() => onEdit!(event)}
                aria-label={t('events.editEvent')}
                title={t('common.edit')}
              >
                <Pencil size={14} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="ledger-row__action ledger-row__action--danger"
                onClick={onDelete}
                aria-label={t('events.deleteRecord')}
                title={t('events.deleteRecord')}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
