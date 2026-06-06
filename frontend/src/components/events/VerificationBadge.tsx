import { ShieldCheck, FileText } from 'lucide-react';
import type { MaintenanceEvent } from '../../types';

export function verificationLabel(event: MaintenanceEvent) {
  if (event.source === 'SHOP') return 'Shop-created verified';
  if (event.verified) return 'Shop verified';
  if (event.documents?.length || event.documentCount) return 'Self-reported with proof';
  return 'Self-reported';
}

export default function VerificationBadge({ event }: { event: MaintenanceEvent }) {
  const hasProof = Boolean(event.documents?.length || event.documentCount || event.verification?.proofPath);
  if (event.verified) {
    return (
      <span className="tag tag-verified verification-chip">
        <ShieldCheck size={12} /> {verificationLabel(event)}
      </span>
    );
  }
  return (
    <span className={`tag ${hasProof ? 'tag-warning' : 'tag-self'} verification-chip`}>
      {hasProof && <FileText size={12} />} {verificationLabel(event)}
    </span>
  );
}
