import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

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
      navigate(u.role === 'SHOP' ? '/shop' : u.role === 'BUYER' ? '/buyer' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-mesh" />
        <div className="auth-tagline">
          <p>YOUR CAR REMEMBERS EVERYTHING.</p>
          <div className="auth-proof-stack">
            <span className="tag tag-verified">Shop verified records</span>
            <span className="tag tag-self">Owner proof uploads</span>
            <span className="tag tag-green">Buyer-ready share link</span>
          </div>
        </div>
      </div>
      <div className="auth-form-panel">
        <motion.div
          className="auth-form-inner"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="sidebar-logo" style={{ border: 'none', padding: 0, marginBottom: 32 }}>
            <div className="sidebar-logo-mark">A</div>
            <span className="sidebar-logo-text">AUTOHISTORY</span>
          </div>
          <h1 className="display" style={{ fontSize: 36, marginBottom: 8 }}>
            Sign in
          </h1>
          <p className="muted" style={{ marginBottom: 24 }}>
            Access your verified maintenance history
          </p>
          <button type="button" className="btn btn-ghost" style={{ width: '100%', marginBottom: 20, background: '#fff', color: '#0a0b0d' }} disabled>
            Continue with Google (soon)
          </button>
          <p className="mono subtle" style={{ textAlign: 'center', marginBottom: 20, fontSize: 12 }}>
            — or email —
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="email">
                Email
              </label>
              <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-solid" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 24, fontSize: 14 }}>
            No account? <Link to="/register">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
