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
  const { login, requestPasswordReset } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
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

  async function handleForgotPassword() {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError(t('auth.forgotNeedEmail'));
      return;
    }
    setResetting(true);
    try {
      await requestPasswordReset(email);
      setInfo(t('auth.forgotSent'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg === 'PASSWORD_RESET_UNAVAILABLE' ? t('auth.forgotUnavailable') : msg || t('auth.forgotFailed'));
    } finally {
      setResetting(false);
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <label className="label" htmlFor="password">
                  {t('auth.password')}
                </label>
                <button
                  type="button"
                  className="btn-link mono"
                  style={{ fontSize: 12, padding: 0, border: 0, background: 'none', cursor: 'pointer', color: 'var(--color-accent)' }}
                  onClick={handleForgotPassword}
                  disabled={resetting || loading}
                >
                  {resetting ? t('auth.forgotSending') : t('auth.forgotPassword')}
                </button>
              </div>
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
            {info && (
              <p className="muted" style={{ fontSize: 13, color: 'var(--color-verified, #2d6a4f)' }}>
                {info}
              </p>
            )}
            <button type="submit" className="btn btn-solid auth-submit" disabled={loading || resetting}>
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
