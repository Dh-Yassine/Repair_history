import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  FileText,
  Share2,
  ArrowRight,
  CheckCircle2,
  Car,
  Wrench,
  Search,
  Star,
  Lock,
  Zap,
  Clock,
} from 'lucide-react';
import heroCar from '../assets/hero-car-optionA.png';
import LanguageToggle from '../components/LanguageToggle';
import HudCorners from '../components/ui/HudCorners';
import { useLanguage } from '../i18n/LanguageContext';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

function DotGrid() {
  return <div className="landing-dotgrid" aria-hidden />;
}

export default function LandingPage() {
  const { t, tList } = useLanguage();

  const steps = [
    { n: '01', title: t('landing.step1Title'), body: t('landing.step1Body'), icon: Car },
    { n: '02', title: t('landing.step2Title'), body: t('landing.step2Body'), icon: Wrench },
    { n: '03', title: t('landing.step3Title'), body: t('landing.step3Body'), icon: Share2 },
  ];

  const roles = [
    {
      role: 'landing-role-owner',
      icon: Car,
      title: t('landing.personalTitle'),
      cta: t('common.createAccount'),
      desc: t('landing.personalDesc'),
      features: tList('landing.personalFeatures'),
    },
    {
      role: 'landing-role-shop',
      icon: Wrench,
      title: t('landing.shopTitle'),
      cta: t('landing.shopCta'),
      desc: t('landing.shopDesc'),
      features: tList('landing.shopFeatures'),
    },
  ];

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="sidebar-logo" style={{ border: 'none', padding: 0 }}>
            <div className="sidebar-logo-mark">A</div>
            <span className="sidebar-logo-text">AUTOHISTORY</span>
          </div>
          <div className="landing-nav-links">
            <LanguageToggle compact />
            <Link to="/login" className="btn btn-ghost btn-sm">
              {t('common.signIn')}
            </Link>
            <Link to="/register" className="btn btn-solid btn-sm">
              <span className="landing-label-full">{t('common.createAccount')}</span>
              <span className="landing-label-short">{t('common.join')}</span>
              <ArrowRight size={14} className="landing-cta-arrow" />
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero-full">
        <div className="hero-bg-img" aria-hidden>
          <img src={heroCar} alt="" draggable={false} />
          <div className="hero-bg-vignette" />
          <div className="hero-bg-bottom-fade" />
        </div>

        <DotGrid />
        <HudCorners />
        <div className="landing-glow landing-glow-1" aria-hidden />

        <motion.div
          className="landing-hero-content"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.span variants={fadeUp} className="landing-eyebrow landing-eyebrow-hero">
            <Zap size={12} /> {t('landing.eyebrow')}
          </motion.span>
          <motion.h1 variants={fadeUp} className="landing-h1 landing-h1-hero">
            {t('landing.heroTitle1')}
            <br />
            {t('landing.heroTitle2')}
          </motion.h1>
          <motion.p variants={fadeUp} className="landing-lead landing-lead-hero">
            {t('landing.heroLead')}
          </motion.p>
          <motion.div variants={fadeUp} className="landing-hero-ctas">
            <Link to="/register" className="btn btn-solid landing-cta-primary">
              <span className="landing-label-full">{t('common.createAccount')}</span>
              <span className="landing-label-short">{t('common.join')}</span>
              <ArrowRight size={16} className="landing-cta-arrow" />
            </Link>
            <Link to="/login" className="btn btn-ghost">
              {t('common.signIn')}
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} className="landing-hero-badges">
            <span className="landing-proof landing-proof--primary">
              <ShieldCheck size={14} aria-hidden /> {t('auth.shopVerified')}
            </span>
            <span className="landing-proof landing-proof--secondary">
              <FileText size={13} aria-hidden /> {t('auth.ownerRecords')}
            </span>
            <span className="landing-proof landing-proof--secondary">
              <Share2 size={13} aria-hidden /> {t('auth.shareableLink')}
            </span>
          </motion.div>
        </motion.div>
      </section>

      <section className="landing-statsbar">
        {[
          { value: t('landing.stat1v'), label: t('landing.stat1l') },
          { value: t('landing.stat2v'), label: t('landing.stat2l') },
          { value: t('landing.stat3v'), label: t('landing.stat3l') },
          { value: t('landing.stat4v'), label: t('landing.stat4l') },
        ].map((s) => (
          <div key={s.label} className="landing-stat">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      <section className="landing-section">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <span className="landing-eyebrow">
              <Clock size={12} /> {t('landing.howEyebrow')}
            </span>
            <h2 className="landing-h2">{t('landing.howTitle')}</h2>
            <p className="landing-section-lead">{t('landing.howLead')}</p>
          </div>
          <div className="landing-steps">
            {steps.map((step) => (
              <div key={step.n} className="landing-step">
                <div className="landing-step-icon">
                  <step.icon size={22} />
                </div>
                <span className="landing-step-n">{step.n}</span>
                <h3 className="landing-step-title">{step.title}</h3>
                <p className="landing-step-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner" style={{ maxWidth: 820 }}>
          <div className="landing-section-head">
            <span className="landing-eyebrow">
              <Search size={12} /> {t('landing.whatEyebrow')}
            </span>
            <h2 className="landing-h2">{t('landing.whatTitle')}</h2>
          </div>
          <p className="landing-lead" style={{ marginTop: 16 }}>
            {t('landing.whatBody')}
          </p>
        </div>
      </section>

      <section className="landing-section landing-roles-section">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <span className="landing-eyebrow">{t('landing.whoEyebrow')}</span>
            <h2 className="landing-h2">{t('landing.whoTitle')}</h2>
            <p className="landing-lead" style={{ marginTop: 12, maxWidth: 560 }}>
              {t('landing.whoLead')}
            </p>
          </div>
          <div
            className="landing-roles"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            {roles.map((r) => (
              <div key={r.title} className={`landing-role ${r.role}`}>
                <div className="landing-role-icon">
                  <r.icon size={26} />
                </div>
                <h3>{r.title}</h3>
                <p>{r.desc}</p>
                <ul className="landing-role-list">
                  {r.features.map((f) => (
                    <li key={f}>
                      <CheckCircle2 size={13} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="btn btn-solid" style={{ marginTop: 'auto' }}>
                  {r.cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-trust-section">
        <div className="landing-section-inner">
          <div className="landing-trust-grid">
            <div className="landing-trust-copy">
              <span className="landing-eyebrow">
                <Lock size={12} /> {t('landing.privacyEyebrow')}
              </span>
              <h2 className="landing-h2" style={{ marginTop: 12 }}>
                {t('landing.privacyTitle')}
              </h2>
              <p className="landing-trust-body">{t('landing.privacyBody')}</p>
              <ul className="landing-trust-list">
                {tList('landing.privacyBullets').map((f) => (
                  <li key={f}>
                    <ShieldCheck size={14} style={{ color: 'var(--color-verified)' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="landing-trust-visual" aria-hidden>
              <div className="landing-shield">
                <ShieldCheck size={64} />
                <div className="landing-shield-glow" />
              </div>
              <div className="landing-trust-badges">
                {tList('landing.privacyBadges').map((f) => (
                  <div key={f} className="landing-trust-badge">
                    <CheckCircle2 size={14} style={{ color: 'var(--color-verified)' }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner" style={{ maxWidth: 780 }}>
          <div className="landing-quote">
            <Star size={18} style={{ color: 'var(--color-accent)' }} />
            <blockquote>{t('landing.quote')}</blockquote>
            <cite>{t('landing.quoteCite')}</cite>
          </div>
        </div>
      </section>

      <section className="landing-cta-section">
        <div className="landing-cta-inner">
          <h2 className="landing-h2">{t('landing.ctaTitle')}</h2>
          <p className="landing-lead" style={{ marginTop: 12 }}>
            {t('landing.ctaLead')}
          </p>
          <div className="landing-hero-ctas" style={{ marginTop: 28, justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-solid landing-cta-primary">
              <span className="landing-label-full">{t('common.createAccount')}</span>
              <span className="landing-label-short">{t('common.join')}</span>
              <ArrowRight size={16} className="landing-cta-arrow" />
            </Link>
            <Link to="/login" className="btn btn-ghost">
              {t('common.signIn')}
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="sidebar-logo" style={{ border: 'none', padding: 0 }}>
            <div className="sidebar-logo-mark" style={{ width: 28, height: 28, fontSize: 13 }}>
              A
            </div>
            <span className="sidebar-logo-text" style={{ fontSize: 13 }}>
              AUTOHISTORY
            </span>
          </div>
          <p className="mono muted" style={{ fontSize: 11 }}>
            {t('landing.footerTag', { year: new Date().getFullYear() })}
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <LanguageToggle compact />
            <Link to="/login" className="muted" style={{ fontSize: 12 }}>
              {t('common.signIn')}
            </Link>
            <Link to="/register" className="muted" style={{ fontSize: 12 }}>
              {t('common.createAccount')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
