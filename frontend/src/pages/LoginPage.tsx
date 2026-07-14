import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthVisualPanel from '../components/auth/AuthVisualPanel';
import { scrollFieldIntoView } from '../hooks/useOverlayPanel';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function LoginPage() {
  const { login } = useAuth();
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
      setError(err instanceof Error ? err.message : 'Could not sign in');
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
          <div className="auth-form-mobile-logo sidebar-logo">
            <div className="sidebar-logo-mark">A</div>
            <span className="sidebar-logo-text">AUTOHISTORY</span>
          </div>

          <p className="auth-form-eyebrow mono">Account</p>
          <h1 className="display auth-form-title">Sign in</h1>
          <p className="muted auth-form-desc">
            Sign in to manage your vehicles and service history
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
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
              <label className="label" htmlFor="password">Password</label>
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
              {loading ? 'Signing in…' : (
                <>Sign in <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="muted auth-switch">
            No account yet? <Link to="/register">Create account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
