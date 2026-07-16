import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { api } from '../api';
import PageTransition from '../components/layout/PageTransition';
import { useToast } from '../components/ui/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import {
  mapsDirectionsUrl,
  mapsNearbyRepairsEmbedUrl,
  mapsNearbyRepairsUrl,
  mapsSearchUrl,
  requestUserLocation,
  type LatLng,
} from '../lib/geo';
import type { FeaturedShopAd } from '../types';

export default function FeaturedShopsPage() {
  const toast = useToast();
  const { t, locale } = useLanguage();
  const [ads, setAds] = useState<FeaturedShopAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [addressQuery, setAddressQuery] = useState('');
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [contactAd, setContactAd] = useState<FeaturedShopAd | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const repairQuery = locale === 'fr' ? 'garage automobile' : 'car repair';

  const mapsQuery = useMemo(() => {
    const area = addressQuery.trim();
    return area ? `${repairQuery} ${area}` : repairQuery;
  }, [addressQuery, repairQuery]);

  useEffect(() => {
    api
      .featuredShops()
      .then((d) => setAds(d.ads))
      .catch(() => setAds([]))
      .finally(() => setLoadingAds(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLocationLoading(true);
    setLocationError('');
    requestUserLocation()
      .then((loc) => {
        if (!cancelled) setUserLocation(loc);
      })
      .catch((err) => {
        if (!cancelled) {
          const code = err instanceof Error ? err.message : '';
          if (code === 'GEOLOCATION_DENIED') setLocationError(t('shops.locationDenied'));
          else if (code === 'GEOLOCATION_UNAVAILABLE') setLocationError(t('shops.locationUnavailable'));
          else setLocationError(t('shops.locationFailed'));
        }
      })
      .finally(() => {
        if (!cancelled) setLocationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function refreshLocation() {
    setLocationLoading(true);
    setLocationError('');
    try {
      const loc = await requestUserLocation();
      setUserLocation(loc);
      toast.success(t('shops.locationOn'));
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'GEOLOCATION_DENIED') {
        setLocationError(t('shops.locationDenied'));
        toast.error(t('shops.locationDenied'));
      } else {
        setLocationError(t('shops.locationFailed'));
        toast.error(t('shops.locationFailed'));
      }
    } finally {
      setLocationLoading(false);
    }
  }

  const partnerAds = useMemo(() => {
    const q = addressQuery.trim().toLowerCase();
    if (!q) return ads;
    return ads.filter((ad) => {
      const address = (ad.shop.address || '').toLowerCase();
      const name = (ad.shop.shopName || '').toLowerCase();
      return address.includes(q) || name.includes(q);
    });
  }, [ads, addressQuery]);

  async function sendRequest(e: FormEvent) {
    e.preventDefault();
    if (!contactAd) return;
    setSending(true);
    try {
      const result = await api.contactFeaturedShop(contactAd.id, message.trim() || undefined);
      toast.success(result.message);
      setContactAd(null);
      setMessage('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('shops.couldNotSend'));
    } finally {
      setSending(false);
    }
  }

  return (
    <PageTransition>
      <div className="hero-panel page-hero compact">
        <div className="hero-copy">
          <div className="hero-icon" style={{ marginBottom: 14 }}>
            <Wrench size={24} />
          </div>
          <p className="section-eyebrow">{t('shops.partnerShops')}</p>
          <h1 className="display page-title">{t('shops.title')}</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            {t('shops.leadMaps')}
          </p>
        </div>
        <div className="hero-actions">
          <span className="tag tag-verified">
            <Sparkles size={12} /> {t('shops.verifiedNetwork')}
          </span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '1 1 220px', margin: 0 }}>
            <label className="label" htmlFor="shop-area-filter">
              {t('shops.filterArea')}
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <input
                id="shop-area-filter"
                className="input"
                type="search"
                placeholder={t('shops.filterPlaceholder')}
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={refreshLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <>
                <Loader2 size={14} className="spinning" /> {t('shops.locating')}
              </>
            ) : (
              <>
                <Navigation size={14} /> {t('shops.refreshLocation')}
              </>
            )}
          </button>
        </div>
        <p className="mono muted" style={{ fontSize: 12, marginTop: 8 }}>
          {t('shops.mapsSearchHint', { query: mapsQuery })}
        </p>
      </div>

      {locationLoading && <div className="skeleton" style={{ height: 280, marginBottom: 16 }} />}

      {!locationLoading && locationError && (
        <div className="card empty-panel" style={{ marginBottom: 16 }}>
          <p>{locationError}</p>
          <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={refreshLocation}>
            <Navigation size={14} /> {t('shops.enableLocation')}
          </button>
        </div>
      )}

      {!locationLoading && userLocation && (
        <div className="card" style={{ marginBottom: 16, overflow: 'hidden', padding: 0 }}>
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p className="mono muted" style={{ fontSize: 11, marginBottom: 4 }}>
                {t('shops.mapPreview')}
              </p>
              <p style={{ fontSize: 14, margin: 0 }}>{mapsQuery}</p>
            </div>
            <a
              href={mapsNearbyRepairsUrl(userLocation, mapsQuery)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-solid btn-sm"
            >
              <ExternalLink size={14} /> {t('shops.openFullMaps')}
            </a>
          </div>
          <iframe
            title={t('shops.mapPreview')}
            src={mapsNearbyRepairsEmbedUrl(userLocation, mapsQuery)}
            style={{ width: '100%', height: 360, border: 0, display: 'block' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}

      {!loadingAds && partnerAds.length > 0 && (
        <>
          <p className="section-eyebrow" style={{ marginBottom: 10 }}>
            {t('shops.partnerList')}
          </p>
          <div className="shops-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {partnerAds.map((ad) => (
              <article
                key={ad.id}
                className="card"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16,
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{ad.shop.shopName}</h3>
                    {ad.shop.shopVerified && (
                      <span className="tag tag-green">
                        <ShieldCheck size={12} /> {t('shops.verified')}
                      </span>
                    )}
                  </div>
                  {ad.shop.address ? (
                    <p
                      className="muted"
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 14, margin: 0 }}
                    >
                      <MapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{ad.shop.address}</span>
                    </p>
                  ) : (
                    <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                      {t('shops.noAddress')}
                    </p>
                  )}
                  <p className="mono muted" style={{ marginTop: 10, fontSize: 12 }}>
                    <CalendarCheck size={12} style={{ verticalAlign: 'middle' }} />{' '}
                    {t('shops.featuredUntil', { date: new Date(ad.endDate).toLocaleDateString() })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ad.shop.address && userLocation && (
                    <a
                      href={mapsDirectionsUrl(userLocation, ad.shop.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm"
                    >
                      <Navigation size={14} /> {t('shops.directions')}
                    </a>
                  )}
                  {ad.shop.address && (
                    <a
                      href={mapsSearchUrl(ad.shop.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      <ExternalLink size={14} /> {t('shops.openMaps')}
                    </a>
                  )}
                  <button type="button" className="btn btn-solid btn-sm" onClick={() => setContactAd(ad)}>
                    {ad.ctaButton || t('shops.requestQuote')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {!loadingAds && partnerAds.length === 0 && (
        <div className="card empty-panel">
          <p>{t('shops.noneMaps')}</p>
        </div>
      )}

      {contactAd && (
        <div className="overlay" onClick={() => setContactAd(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('shops.contact', { shop: contactAd.shop.shopName ?? '' })}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="display" style={{ fontSize: 24 }}>
                    {t('shops.requestQuote')}
                  </h2>
                  <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {contactAd.shop.shopName}
                    {contactAd.shop.address ? ` · ${contactAd.shop.address}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setContactAd(null)}
                  aria-label={t('common.close')}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <form onSubmit={sendRequest} style={{ padding: 24 }}>
              <div className="field">
                <label className="label" htmlFor="shop-contact-message">
                  {t('shops.whatNeed')} ({t('common.optional')})
                </label>
                <textarea
                  id="shop-contact-message"
                  className="input"
                  rows={4}
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
                {t('shops.contactHint')}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-solid" disabled={sending}>
                  {sending ? t('common.sending') : t('shops.sendRequest')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setContactAd(null)}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
