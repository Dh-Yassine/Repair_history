import { ShieldCheck, FileText } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { MaintenanceEvent } from '../../types';

export function verificationLabel(event: MaintenanceEvent, t: (key: string) => string) {
  if (event.source === 'SHOP') return t('events.shopVerified');
  if (event.verified) return t('events.shopVerified');
  if (event.documents?.length || event.documentCount) return t('events.selfReportedProof');
  return t('events.selfReported');
}

export default function VerificationBadge({ event }: { event: MaintenanceEvent }) {
  const { t } = useLanguage();
  if (event.verified) {
    return (
      <span className="tag tag-verified verification-chip">
        <ShieldCheck size={12} /> {verificationLabel(event, t)}
      </span>
    );
  }
  return (
    <span className={`tag tag-warning verification-chip`}>
      <FileText size={12} /> {verificationLabel(event, t)}
    </span>
  );
}
