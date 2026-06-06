import { useEffect, useState } from 'react';
import { CalendarCheck, MapPin, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { api } from '../api';
import PageTransition from '../components/layout/PageTransition';
import type { FeaturedShopAd } from '../types';

export default function FeaturedShopsPage() {
  const [ads, setAds] = useState<FeaturedShopAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .featuredShops()
      .then((d) => setAds(d.ads))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <div className="hero-panel page-hero compact">
        <div className="hero-copy">
          <div className="hero-icon" style={{ marginBottom: 14 }}>
            <Wrench size={24} />
          </div>
          <p className="section-eyebrow">Verified repair network</p>
          <h1 className="display page-title">Featured shops</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            Choose shops that can create verified service records directly into your AutoHistory timeline.
          </p>
        </div>
        <div className="hero-actions">
          <span className="tag tag-verified">
            <Sparkles size={12} /> Trust-building service
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
            <p>No featured shops at the moment. Check back soon.</p>
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
            <button type="button" className="btn btn-solid btn-sm" style={{ marginTop: 16 }}>
              {ad.ctaButton}
            </button>
          </article>
        ))}
      </div>
    </PageTransition>
  );
}
