import { ShieldCheck, FileText } from 'lucide-react';
import type { MaintenanceEvent } from '../../types';

export function verificationLabel(event: MaintenanceEvent) {
  if (event.source === 'SHOP') return 'Shop verified';
  if (event.verified) return 'Shop verified';
  if (event.documents?.length || event.documentCount) return 'Self-reported · proof attached';
  return 'Self-reported';
}

export default function VerificationBadge({ event }: { event: MaintenanceEvent }) {
  if (event.verified) {
    return (
      <span className="tag tag-verified verification-chip">
        <ShieldCheck size={12} /> {verificationLabel(event)}
      </span>
    );
  }
  return (
    <span className={`tag tag-warning verification-chip`}>
      <FileText size={12} /> {verificationLabel(event)}
    </span>
  );
}
