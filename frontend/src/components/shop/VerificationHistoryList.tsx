import { useLanguage } from '../../i18n/LanguageContext';
import type { MaintenanceEvent, Verification } from '../../types';
import EventTimelineItem from '../events/EventTimelineItem';

export default function VerificationHistoryList({
  verifications,
}: {
  verifications: (Verification & { event?: MaintenanceEvent })[];
}) {
  const { t } = useLanguage();

  if (verifications.length === 0) {
    return (
      <div className="card empty-state">
        <p className="muted">{t('shop.noHistory')}</p>
      </div>
    );
  }

  return (
    <div>
      {verifications.map((verification) =>
        verification.event ? (
          <EventTimelineItem
            key={verification.id}
            event={{
              ...verification.event,
              verified: true,
              verification: { ...verification, event: undefined } as Verification,
            }}
          />
        ) : null
      )}
    </div>
  );
}
