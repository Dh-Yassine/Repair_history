import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CarFront, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthVisualPanel from '../components/auth/AuthVisualPanel';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../i18n/LanguageContext';

type AccountType = 'owner' | 'shop';

export default function RegisterPage() {
  const { register, registerShop } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType>('owner');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const ROLES: Array<{
    id: AccountType;
    icon: typeof CarFront;
    title: string;
    blurb: string;
  }> = [
    {
      id: 'owner',
      icon: CarFront,
      title: t('auth.personal'),
      blurb: t('auth.personalBlurb'),
    },
    {
      id: 'shop',
      icon: Wrench,
      title: t('auth.repairShop'),
      blurb: t('auth.shopBlurb'),
    },
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEmailSent(false);
    setLoading(true);
    try {
      if (accountType === 'owner') {
        await register({ fullName, email, password, phone: phone || undefined });
        navigate('/');
      } else {
        await registerShop({
          fullName,
          email,
          password,
          phone: phone || undefined,
          shopName,
          address: address || undefined,
        });
        navigate('/shop');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.registrationFailed');
      if (msg.startsWith('CHECK_EMAIL:')) {
        setEmailSent(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthVisualPanel variant="register" />
      <div className="auth-form-panel">
        <motion.div
          className="auth-form-inner"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <LanguageToggle compact />
          </div>
          <div className="sidebar-logo" style={{ border: 'none', padding: 0, marginBottom: 16 }}>
            <div className="sidebar-logo-mark">A</div>
            <span className="sidebar-logo-text">AUTOHISTORY</span>
          </div>
          <h1 className="display" style={{ fontSize: 36, marginBottom: 6 }}>
            {t('auth.createTitle')}
          </h1>
          <p className="muted" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.4 }}>
            {t('auth.createLead')}
          </p>

          <div className="role-grid">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`role-card ${accountType === r.id ? 'active' : ''}`}
                onClick={() => setAccountType(r.id)}
              >
                <div className="role-card-icon">
                  <r.icon size={16} />
                </div>
                <strong>{r.title}</strong>
                <span>{r.blurb}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">{t('auth.fullName')}</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">{t('auth.email')}</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">{t('auth.phoneOptional')}</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {accountType === 'shop' && (
              <>
                <div className="field">
                  <label className="label">{t('auth.shopName')}</label>
                  <input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
                </div>
                <div className="field">
                  <label className="label">{t('auth.address')}</label>
                  <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                  {t('auth.shopApprovalNote')}
                </p>
              </>
            )}
            <div className="field">
              <label className="label">{t('auth.password')}</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <p className="mono subtle" style={{ fontSize: 11, marginTop: 6 }}>
                {t('auth.passwordHint')}
              </p>
            </div>
            {emailSent && (
              <p className="success-msg" style={{ color: 'var(--color-green)', marginBottom: '1rem' }}>
                {t('auth.checkEmail')}
              </p>
            )}
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-solid" style={{ width: '100%' }} disabled={loading}>
              {loading
                ? t('auth.creating')
                : accountType === 'shop'
                  ? t('auth.requestShop')
                  : t('common.createAccount')}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 24, fontSize: 14 }}>
            {t('auth.alreadyHaveAccount')} <Link to="/login">{t('common.signIn')}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
