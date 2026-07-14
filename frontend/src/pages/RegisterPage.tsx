import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CarFront, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthVisualPanel from '../components/auth/AuthVisualPanel';

type AccountType = 'owner' | 'shop';

const ROLES: Array<{
  id: AccountType;
  icon: typeof CarFront;
  title: string;
  blurb: string;
}> = [
  {
    id: 'owner',
    icon: CarFront,
    title: 'Personal',
    blurb: 'Track vehicles and share history links.',
  },
  {
    id: 'shop',
    icon: Wrench,
    title: 'Repair shop',
    blurb: 'Verify work — needs admin approval.',
  },
];

export default function RegisterPage() {
  const { register, registerShop } = useAuth();
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
      const msg = err instanceof Error ? err.message : 'Registration failed';
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
          <div className="sidebar-logo" style={{ border: 'none', padding: 0, marginBottom: 16 }}>
            <div className="sidebar-logo-mark">A</div>
            <span className="sidebar-logo-text">AUTOHISTORY</span>
          </div>
          <h1 className="display" style={{ fontSize: 36, marginBottom: 6 }}>
            Create account
          </h1>
          <p className="muted" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.4 }}>
            Personal accounts own and buy. Shops need admin approval to verify work.
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
              <label className="label">Full name</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Phone (optional)</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {accountType === 'shop' && (
              <>
                <div className="field">
                  <label className="label">Shop name</label>
                  <input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
                </div>
                <div className="field">
                  <label className="label">Address</label>
                  <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                  After you sign up, an admin must approve your shop before you can create verified
                  records.
                </p>
              </>
            )}
            <div className="field">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <p className="mono subtle" style={{ fontSize: 11, marginTop: 6 }}>
                At least 6 characters.
              </p>
            </div>
            {emailSent && (
              <p className="success-msg" style={{ color: 'var(--color-green)', marginBottom: '1rem' }}>
                Check your email for a confirmation link. After confirming, return here to sign in.
              </p>
            )}
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-solid" style={{ width: '100%' }} disabled={loading}>
              {loading
                ? 'Creating account…'
                : accountType === 'shop'
                  ? 'Request shop account'
                  : 'Create account'}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 24, fontSize: 14 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
