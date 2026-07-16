import { Construction, ShoppingBag } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import { useLanguage } from '../i18n/LanguageContext';

/** Marketplace is paused — keep the route for bookmarks, hide from nav. */
export default function MarketplacePage() {
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className="hero-panel page-hero compact">
        <div className="hero-copy">
          <div className="hero-icon" style={{ marginBottom: 14 }}>
            <ShoppingBag size={24} />
          </div>
          <p className="section-eyebrow">{t('marketplace.title')}</p>
          <h1 className="display page-title">{t('marketplace.underConstruction')}</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 480 }}>
            {t('marketplace.underConstructionLead')}
          </p>
        </div>
        <div className="hero-actions">
          <span className="tag tag-warning">
            <Construction size={12} /> {t('marketplace.comingSoon')}
          </span>
        </div>
      </div>

      <div className="card empty-panel" style={{ minHeight: 160 }}>
        <div>
          <div className="feature-card-icon" style={{ margin: '0 auto 12px' }}>
            <Construction size={20} />
          </div>
          <p>{t('marketplace.underConstructionBody')}</p>
        </div>
      </div>
    </PageTransition>
  );
}
