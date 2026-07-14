import { FormEvent, useEffect, useState } from 'react';
import { CalendarCheck, MapPin, ShieldCheck, Sparkles, Wrench, X } from 'lucide-react';
import { api } from '../api';
import PageTransition from '../components/layout/PageTransition';
import { useToast } from '../components/ui/Toast';
import type { FeaturedShopAd } from '../types';

export default function FeaturedShopsPage() {
  const toast = useToast();
  const [ads, setAds] = useState<FeaturedShopAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contactAd, setContactAd] = useState<FeaturedShopAd | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .featuredShops()
      .then((d) => setAds(d.ads))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

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
      toast.error(err instanceof Error ? err.message : 'Could not send request');
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
          <p className="section-eyebrow">Partner shops</p>
          <h1 className="display page-title">Shops</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            Shops that can add verified records to your timeline.
          </p>
        </div>
        <div className="hero-actions">
          <span className="tag tag-verified">
            <Sparkles size={12} /> Verified network
          </span>
        </div>
      </div>

      {loading && <div className="skeleton" style={{ height: 160 }} />}
      {error && <p className="error-msg">{error}</p>}

      {!loading && !error && ads.length === 0 && (
        <div className="card empty-panel">
          <div>
            <div className="feature-card-icon" style={{ margin: '0 auto 12px' }}>
              <Wrench size={20} />
            </div>
            <p>No featured shops right now.</p>
          </div>
        </div>
      )}

      <div className="grid-cards">
        {ads.map((ad) => (
          <article key={ad.id} className="card feature-card card-hover">
            <div className="feature-card-top">
              <div className="feature-card-icon">
                <Wrench size={18} />
              </div>
              {ad.shop.shopVerified && (
                <span className="tag tag-green">
                  <ShieldCheck size={12} /> Verified
                </span>
              )}
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{ad.shop.shopName}</h3>
            {ad.shop.address && (
              <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <MapPin size={14} /> {ad.shop.address}
              </p>
            )}
            <p className="mono muted" style={{ marginTop: 12, fontSize: 12 }}>
              <CalendarCheck size={12} style={{ verticalAlign: 'middle' }} /> Featured until {new Date(ad.endDate).toLocaleDateString()}
            </p>
            <button
              type="button"
              className="btn btn-solid btn-sm"
              style={{ marginTop: 16 }}
              onClick={() => setContactAd(ad)}
            >
              {ad.ctaButton}
            </button>
          </article>
        ))}
      </div>

      {contactAd && (
        <div className="overlay" onClick={() => setContactAd(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Contact ${contactAd.shop.shopName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="display" style={{ fontSize: 24 }}>
                    Request a quote
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
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <form onSubmit={sendRequest} style={{ padding: 24 }}>
              <div className="field">
                <label className="label" htmlFor="shop-contact-message">What do you need? (optional)</label>
                <textarea
                  id="shop-contact-message"
                  className="input"
                  rows={4}
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Front brake pads for a 2019 Clio, available next week?"
                />
              </div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
                The shop receives your name and email and will reply directly.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-solid" disabled={sending}>
                  {sending ? 'Sending…' : 'Send request'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setContactAd(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
