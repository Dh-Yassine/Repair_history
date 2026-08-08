import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Copy, ExternalLink, Eye, RotateCcw } from 'lucide-react';
import { api } from '../api';
import PageTransition from '../components/layout/PageTransition';
import EventTimelineItem from '../components/events/EventTimelineItem';
import PublicEventSummaryCard from '../components/events/PublicEventSummaryCard';
import PublicVehiclePhoto from '../components/PublicVehiclePhoto';
import { useToast } from '../components/ui/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import type { PublicHistory, ShareLevel, ShareSettings } from '../types';

export default function VehicleSharePage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const toast = useToast();
  const { t } = useLanguage();
  const [share, setShare] = useState<ShareSettings | null>(null);
  const [shareLevel, setShareLevel] = useState<ShareLevel>('SUMMARY');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PublicHistory | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const DETAIL_OPTIONS = useMemo(
    () =>
      [
        { value: 'SUMMARY' as ShareLevel, title: t('share.summary'), desc: t('share.summaryDesc') },
        { value: 'FULL' as ShareLevel, title: t('share.full'), desc: t('share.fullDesc') },
      ],
    [t]
  );

  const sharingEnabled = shareLevel !== 'NONE' && Boolean(share?.shareUrl);
  const settingsDirty = share && share.shareLevel !== shareLevel;

  function applyShareUpdate(partial: ShareSettings) {
    setShare((prev) => (prev ? { ...prev, ...partial } : partial));
    setShareLevel(partial.shareLevel);
  }

  async function load() {
    if (!vehicleId) return;
    const { share: s } = await api.getShareSettings(vehicleId);
    setShare(s);
    setShareLevel(s.shareLevel);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId || shareLevel === 'NONE') {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    api
      .sharePreview(vehicleId, shareLevel)
      .then((p) => !cancelled && setPreview(p))
      .catch(() => !cancelled && setPreview(null))
      .finally(() => !cancelled && setPreviewLoading(false));
    return () => {
      cancelled = true;
    };
  }, [vehicleId, shareLevel]);

  async function persistSettings(level: ShareLevel) {
    if (!vehicleId) return;
    setSaving(true);
    const visibility = 'PRIVATE' as const;
    try {
      const { share: updated } = await api.updateSharing(vehicleId, { shareLevel: level, visibility });
      applyShareUpdate({
        visibility: updated.visibility,
        shareLevel: updated.shareLevel,
        shareToken: updated.shareToken,
        shareUrl: updated.shareUrl,
        badge: updated.badge ?? share?.badge ?? null,
        embedCode: share?.embedCode ?? null,
        vehicle: share?.vehicle,
        stats: share?.stats,
      });
      await load();
      toast.success(level === 'NONE' ? t('share.toastOff') : t('share.toastSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('share.couldNotSave'));
    } finally {
      setSaving(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    await persistSettings(shareLevel);
  }

  async function turnOffSharing() {
    if (!vehicleId) return;
    if (shareLevel === 'NONE') {
      setShareLevel('SUMMARY');
      return;
    }
    setShareLevel('NONE');
    await persistSettings('NONE');
  }

  function copyLink() {
    if (!share?.shareUrl) return;
    navigator.clipboard.writeText(share.shareUrl);
    setCopied(true);
    toast.success(t('share.toastCopied'));
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="skeleton card" style={{ height: 320 }} />;

  const previewModeLabel = shareLevel === 'SUMMARY' ? t('share.previewSummary') : t('share.previewFull');

  return (
    <PageTransition>
      <div className="hero-panel page-hero compact">
        <div className="hero-copy">
          <p className="section-eyebrow">{t('share.sharing')}</p>
          <h1 className="display page-title">{t('share.title')}</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 480 }}>
            {t('share.lead')}
          </p>
        </div>
      </div>

      <form onSubmit={save} className="share-page-stack">
        <section className="card share-section">
          <div className="share-section-head">
            <h2 className="display" style={{ fontSize: 22 }}>
              {t('share.whatViewersSee')}
            </h2>
            <p className="muted">{t('share.viewersSeeDesc')}</p>
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
            onClick={turnOffSharing}
            disabled={saving}
          >
            {shareLevel === 'NONE' ? t('share.sharingOff') : t('share.turnOff')}
          </button>
        </section>

        {shareLevel !== 'NONE' && (
          <section className="card share-section">
            <div className="share-section-head">
              <h2 className="display" style={{ fontSize: 22 }}>
                {t('share.buyerPreview')}
              </h2>
              <p className="muted">{t('share.previewDescTemplate', { mode: previewModeLabel })}</p>
            </div>

            {previewLoading && <div className="skeleton" style={{ height: 120 }} />}

            {!previewLoading && preview && (
              <div className="share-preview-panel">
                <PublicVehiclePhoto vehicle={preview.vehicle} token={share?.shareToken ?? ''} />
                <div className="share-preview-meta">
                  <span className="mono muted" style={{ fontSize: 12 }}>
                    {preview.vehicle.year} {preview.vehicle.make} {preview.vehicle.model}
                  </span>
                  <span className="mono muted" style={{ fontSize: 12 }}>
                    VIN{' '}
                    {preview.vehicle.vin
                      ? `${t('share.vinVisible')} (${preview.vehicle.vin})`
                      : t('share.vinHidden')}
                  </span>
                  <span className="mono muted" style={{ fontSize: 12 }}>
                    {t('share.verifiedOf', {
                      v: preview.vehicle.verifiedCount,
                      t: preview.vehicle.totalEvents,
                    })}
                  </span>
                </div>
                {preview.events.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13 }}>
                    {t('share.noEvents')}
                  </p>
                ) : (
                  <>
                    {preview.events.slice(0, 3).map((ev) =>
                      shareLevel === 'SUMMARY' ? (
                        <PublicEventSummaryCard key={ev.id} event={ev} />
                      ) : (
                        <EventTimelineItem
                          key={ev.id}
                          event={ev}
                          publicView
                          detailLevel="FULL"
                        />
                      )
                    )}
                    {preview.events.length > 3 && (
                      <p className="mono muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {t('share.moreEvents', { n: preview.events.length - 3 })}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        )}

        <div className="share-actions-row">
          <button type="submit" className="btn btn-solid" disabled={saving || shareLevel === 'NONE'}>
            <CheckCircle2 size={16} /> {saving ? t('common.saving') : t('share.saveSettings')}
          </button>
          {settingsDirty && shareLevel !== 'NONE' && (
            <span className="tag tag-warning">{t('share.unsaved')}</span>
          )}
          {share && !settingsDirty && share.shareLevel !== 'NONE' && (
            <span className="tag tag-verified">{t('share.saved')}</span>
          )}
        </div>

        {sharingEnabled && (
          <section className="card share-section share-link-section">
            <div className="share-section-head">
              <h2 className="display" style={{ fontSize: 22 }}>
                {t('share.shareLink')}
              </h2>
              <p className="muted">{t('share.shareLinkDesc')}</p>
            </div>
            <div className="share-link-box">
              <code>{share!.shareUrl}</code>
            </div>
            <div className="button-row">
              <button type="button" className="btn btn-solid btn-sm" onClick={copyLink}>
                <Copy size={14} /> {copied ? t('common.copied') : t('share.copyLink')}
              </button>
              <a href={share!.shareUrl!} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                <ExternalLink size={14} /> {t('common.preview')}
              </a>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  if (vehicleId) {
                    await api.regenerateShareToken(vehicleId);
                    await load();
                    toast.info(t('share.toastRegen'));
                  }
                }}
              >
                <RotateCcw size={14} /> {t('share.regenerate')}
              </button>
            </div>
          </section>
        )}

        {shareLevel === 'NONE' && (
          <div className="card empty-panel" style={{ minHeight: 100 }}>
            <p className="muted">{t('share.chooseLevel')}</p>
          </div>
        )}
      </form>
    </PageTransition>
  );
}
