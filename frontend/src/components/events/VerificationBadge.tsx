import { useLanguage } from '../../i18n/LanguageContext';
import StampBadge from '../ui/StampBadge';
import type { MaintenanceEvent } from '../../types';

export function verificationLabel(event: MaintenanceEvent, t: (key: string) => string) {
  if (event.source === 'SHOP') return t('events.shopVerified');
  if (event.verified) return t('events.shopVerified');
  if (event.documents?.length || event.documentCount) return t('events.selfReportedProof');
  return t('events.selfReported');
}

export default function VerificationBadge({ event }: { event: MaintenanceEvent }) {
  const { t } = useLanguage();
  const verified = Boolean(event.verified || event.source === 'SHOP');
  return (
    <StampBadge
      variant={verified ? 'verified' : 'declared'}
      label={verificationLabel(event, t)}
      size="sm"
    />
  );
}
