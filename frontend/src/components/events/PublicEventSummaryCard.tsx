import { Check, FileText } from 'lucide-react';
import type { MaintenanceEvent } from '../../types';
import { verificationLabel } from './VerificationBadge';
import { useLanguage, useEventTypeLabel } from '../../i18n/LanguageContext';
import { formatDate, formatKm } from '../../lib/format';

/** Minimal buyer view for SUMMARY share level: date, mileage and status only. */
export default function PublicEventSummaryCard({ event }: { event: MaintenanceEvent }) {
  const { t } = useLanguage();
  const labelEvent = useEventTypeLabel();
  const verified = Boolean(event.verified || event.source === 'SHOP');

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
      </div>
      <div className="ledger-row__side" />
    </article>
  );
}
