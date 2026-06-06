import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Copy, ExternalLink, Eye, Lock, RotateCcw, Users } from 'lucide-react';
import { api } from '../api';
import PageTransition from '../components/layout/PageTransition';
import { useToast } from '../components/ui/Toast';
import type { ShareLevel, ShareSettings, VisibilityType } from '../types';

type ListingMode = 'PRIVATE' | 'PUBLIC';

const DETAIL_OPTIONS: Array<{ value: ShareLevel; title: string; desc: string }> = [
  {
    value: 'SUMMARY',
    title: 'Trust summary',
    desc: 'Dates, mileage, service types, and verification status.',
  },
  {
    value: 'FULL',
    title: 'Full history',
    desc: 'Includes garage, costs, notes, and shop verification details.',
  },
];

const LISTING_OPTIONS: Array<{ value: ListingMode; title: string; desc: string; icon: typeof Lock }> = [
  {
    value: 'PRIVATE',
    title: 'Private link',
    desc: 'Send directly to one buyer. VIN shown only with full history.',
    icon: Lock,
  },
  {
    value: 'PUBLIC',
    title: 'Public listing',
    desc: 'For ads and marketplaces. VIN visible even in trust summary.',
    icon: Users,
  },
];

function normalizeVisibility(v: VisibilityType): ListingMode {
  return v === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';
}

export default function VehicleSharePage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const toast = useToast();
  const [share, setShare] = useState<ShareSettings | null>(null);
  const [listingMode, setListingMode] = useState<ListingMode>('PRIVATE');
  const [shareLevel, setShareLevel] = useState<ShareLevel>('SUMMARY');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const stats = share?.stats;

  const sharingEnabled = shareLevel !== 'NONE' && Boolean(share?.shareUrl);
  const settingsDirty =
    share &&
    (normalizeVisibility(share.visibility) !== listingMode || share.shareLevel !== shareLevel);

  async function load() {
    if (!vehicleId) return;
    const { share: s } = await api.getShareSettings(vehicleId);
    setShare(s);
    setListingMode(normalizeVisibility(s.visibility));
    setShareLevel(s.shareLevel);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [vehicleId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!vehicleId) return;
    setSaving(true);
    const visibility = listingMode;
    try {
      if (share?.shareToken) await api.updateSharing(vehicleId, { shareLevel, visibility });
      else await api.enableSharing(vehicleId, { shareLevel, visibility });
      await load();
      toast.success(shareLevel === 'NONE' ? 'Sharing turned off' : 'Sharing settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save sharing settings');
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!share?.shareUrl) return;
    navigator.clipboard.writeText(share.shareUrl);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="skeleton card" style={{ height: 320 }} />;

  return (
    <PageTransition>
      <div className="hero-panel page-hero compact">
        <div className="hero-copy">
          <Link to={`/vehicles/${vehicleId}`} className="mono muted" style={{ fontSize: 12 }}>
            ← Timeline
          </Link>
          <p className="section-eyebrow" style={{ marginTop: 14 }}>
            Share with buyers
          </p>
          <h1 className="display page-title">Share vehicle history</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 480 }}>
            Choose how much detail buyers see, then copy your link.
          </p>
        </div>
        <div className="share-score-card">
          <span className="mono muted">Trust score</span>
          <strong>{stats?.trustScore ?? 0}%</strong>
          <p className="muted">
            {stats?.verifiedCount ?? 0}/{stats?.totalEvents ?? 0} verified
          </p>
        </div>
      </div>

      <form onSubmit={save} className="share-page-stack">
        <section className="card share-section">
          <div className="share-section-head">
            <h2 className="display" style={{ fontSize: 22 }}>
              What buyers see
            </h2>
            <p className="muted">Pick the level of detail on the shared timeline.</p>
          </div>

          <div className="share-detail-grid">
            {DETAIL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`share-choice-card ${shareLevel === option.value ? 'active' : ''}`}
                onClick={() => setShareLevel(option.value)}
              >
                <Eye size={20} />
                <strong>{option.title}</strong>
                <span>{option.desc}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`share-off-toggle ${shareLevel === 'NONE' ? 'active' : ''}`}
            onClick={() => setShareLevel(shareLevel === 'NONE' ? 'SUMMARY' : 'NONE')}
          >
            {shareLevel === 'NONE' ? 'Sharing is off — tap to enable' : 'Turn sharing off'}
          </button>
        </section>

        {shareLevel !== 'NONE' && (
          <section className="card share-section">
            <div className="share-section-head">
              <h2 className="display" style={{ fontSize: 22 }}>
                Listing style
              </h2>
              <p className="muted">How the vehicle appears on the buyer page.</p>
            </div>
            <div className="share-listing-grid">
              {LISTING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`share-choice-card ${listingMode === option.value ? 'active' : ''}`}
                  onClick={() => setListingMode(option.value)}
                >
                  <option.icon size={20} />
                  <strong>{option.title}</strong>
                  <span>{option.desc}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="share-actions-row">
          <button type="submit" className="btn btn-solid" disabled={saving}>
            <CheckCircle2 size={16} /> {saving ? 'Saving…' : 'Save settings'}
          </button>
          {settingsDirty && <span className="tag tag-warning">Unsaved changes</span>}
          {share && !settingsDirty && share.shareLevel !== 'NONE' && (
            <span className="tag tag-verified">Saved</span>
          )}
        </div>

        {sharingEnabled && (
          <section className="card share-section share-link-section">
            <div className="share-section-head">
              <h2 className="display" style={{ fontSize: 22 }}>
                Buyer link
              </h2>
              <p className="muted">Copy and send this link to interested buyers.</p>
            </div>
            <div className="share-link-box">
              <code>{share!.shareUrl}</code>
            </div>
            <div className="button-row">
              <button type="button" className="btn btn-solid btn-sm" onClick={copyLink}>
                <Copy size={14} /> {copied ? 'Copied' : 'Copy link'}
              </button>
              <a href={share!.shareUrl!} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                <ExternalLink size={14} /> Preview
              </a>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  if (vehicleId) {
                    await api.regenerateShareToken(vehicleId);
                    await load();
                    toast.info('New link created. The old link no longer works.');
                  }
                }}
              >
                <RotateCcw size={14} /> New link
              </button>
            </div>
          </section>
        )}

        {shareLevel === 'NONE' && (
          <div className="card empty-panel" style={{ minHeight: 100 }}>
            <p className="muted">Sharing is off. Enable a detail level above to generate a buyer link.</p>
          </div>
        )}
      </form>
    </PageTransition>
  );
}
