import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';

export default function BuyerPage() {
  const navigate = useNavigate();
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const match = link.trim().match(/\/history\/([a-f0-9]+)/i);
    const token = match?.[1] || link.trim();
    if (!token) {
      setError('Paste a share link or paste only the token.');
      return;
    }
    navigate(`/history/${token}`);
  }

  return (
    <PageTransition>
      <div className="hero-panel page-hero compact">
        <div className="hero-copy">
          <p className="section-eyebrow">Buyer</p>
          <h1 className="display page-title">Vehicle history</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 560 }}>
            Paste a share link to review the maintenance timeline.
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Share link or token</label>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-text-muted)', pointerEvents: 'none' }}
              />
              <input
                className="input input-mono"
                style={{ paddingLeft: 38 }}
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://autohistory.app/history/…"
                required
              />
            </div>
            <p className="mono subtle" style={{ fontSize: 11, marginTop: 6 }}>
              Full URL or token only.
            </p>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-solid">
            View history <ArrowRight size={16} />
          </button>
        </form>
      </div>

      <div className="grid-bottom" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="feature-card-icon">
            <ShieldCheck size={18} />
          </div>
          <h3 className="display" style={{ fontSize: 20, marginTop: 10 }}>
            Verified records
          </h3>
          <p className="muted" style={{ fontSize: 13 }}>
            These were created or certified by partner shops. Highest trust level.
          </p>
        </div>
        <div className="card">
          <div className="feature-card-icon">
            <FileText size={18} />
          </div>
          <h3 className="display" style={{ fontSize: 20, marginTop: 10 }}>
            Self-reported records
          </h3>
          <p className="muted" style={{ fontSize: 13 }}>
            These come from the owner. Ask for the original receipt or photo if anything looks off.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
