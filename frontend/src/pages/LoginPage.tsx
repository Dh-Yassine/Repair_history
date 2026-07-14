import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthVisualPanel from '../components/auth/AuthVisualPanel';
import LanguageToggle from '../components/LanguageToggle';
import { scrollFieldIntoView } from '../hooks/useOverlayPanel';
import { useLanguage } from '../i18n/LanguageContext';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, password);
      navigate(
        u.role === 'ADMIN' ? '/admin' : u.role === 'SHOP' ? '/shop' : u.role === 'BUYER' ? '/buyer' : '/'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.couldNotSignIn'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthVisualPanel />

      <div className="auth-form-panel">
        <motion.div
          className="auth-form-inner"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <LanguageToggle compact />
          </div>
          <div className="auth-form-mobile-logo sidebar-logo">
            <div className="sidebar-logo-mark">A</div>
            <span className="sidebar-logo-text">AUTOHISTORY</span>
          </div>

          <p className="auth-form-eyebrow mono">{t('auth.account')}</p>
          <h1 className="display auth-form-title">{t('auth.signInTitle')}</h1>
          <p className="muted auth-form-desc">{t('auth.signInLead')}</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label className="label" htmlFor="email">
                {t('auth.email')}
              </label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => scrollFieldIntoView(e.target)}
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="password">
                {t('auth.password')}
              </label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => scrollFieldIntoView(e.target)}
                required
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-solid auth-submit" disabled={loading}>
              {loading ? (
                t('auth.signingIn')
              ) : (
                <>
                  {t('common.signIn')} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="muted auth-switch">
            {t('auth.noAccount')} <Link to="/register">{t('common.createAccount')}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
