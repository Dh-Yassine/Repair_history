import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Share2 } from 'lucide-react';
import authHeroB from '../../assets/hero-car-optionb.png';
import authHeroA from '../../assets/hero-car-optionA.png';
import { useLanguage } from '../../i18n/LanguageContext';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay: 0.15 + i * 0.1 },
  }),
};

type Props = {
  variant?: 'login' | 'register';
};

export default function AuthVisualPanel({ variant = 'login' }: Props) {
  const { t } = useLanguage();
  const hero = variant === 'register' ? authHeroA : authHeroB;

  const PROOF = [
    { icon: ShieldCheck, label: t('auth.shopVerified'), className: 'tag tag-verified' },
    { icon: FileText, label: t('auth.ownerRecords'), className: 'tag tag-self' },
    { icon: Share2, label: t('auth.shareableLink'), className: 'tag tag-green' },
  ];

  return (
    <div className="auth-visual">
      <div className="auth-visual-bg" aria-hidden>
        <img src={hero} alt="" className="auth-visual-img" draggable={false} />
        <div className="auth-visual-vignette" />
        <div className="auth-visual-scan" />
        <div className="auth-visual-grain" />
      </div>

      <div className="auth-visual-hud" aria-hidden>
        <span className="auth-hud-corner auth-hud-tl" />
        <span className="auth-hud-corner auth-hud-tr" />
        <span className="auth-hud-corner auth-hud-bl" />
        <span className="auth-hud-corner auth-hud-br" />
      </div>

      <Link to="/" className="auth-visual-logo sidebar-logo">
        <div className="sidebar-logo-mark">A</div>
        <span className="sidebar-logo-text">AUTOHISTORY</span>
      </Link>

      <div className="auth-tagline">
        <motion.p
          className="auth-tagline-headline"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        >
          {t('auth.verified')}
          <br />
          {t('auth.maintenance')}
          <br />
          <span className="auth-tagline-accent">{t('auth.history')}</span>
        </motion.p>

        <motion.p
          className="auth-tagline-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          {variant === 'register' ? t('auth.taglineRegister') : t('auth.taglineLogin')}
        </motion.p>

        <div className="auth-proof-stack">
          {PROOF.map((item, i) => (
            <motion.span
              key={item.label}
              className={item.className}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="show"
            >
              <item.icon size={12} /> {item.label}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}
