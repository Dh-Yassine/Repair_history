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

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.09 } },
};

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ── Nav ── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="sidebar-logo" style={{ border: 'none', padding: 0 }}>
            <div className="sidebar-logo-mark">A</div>
            <span className="sidebar-logo-text">AUTOHISTORY</span>
          </div>
          <div className="landing-nav-links">
            <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link to="/register" className="btn btn-solid btn-sm">
              Get started free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-mesh" aria-hidden />
        <motion.div
          className="landing-hero-inner"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.span variants={fadeUp} className="landing-eyebrow">
            <Zap size={12} /> Verified vehicle history
          </motion.span>
          <motion.h1 variants={fadeUp} className="landing-h1">
            Sell with proof.<br />Buy with confidence.
          </motion.h1>
          <motion.p variants={fadeUp} className="landing-lead">
            AutoHistory turns your maintenance receipts and shop records into a single verified timeline — shareable with one link, trusted by buyers.
          </motion.p>
          <motion.div variants={fadeUp} className="landing-hero-ctas">
            <Link to="/register" className="btn btn-solid landing-cta-primary">
              Start free — no card needed <ArrowRight size={16} />
            </Link>
            <Link to="/history/demo" className="btn btn-ghost">
              See sample history
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} className="landing-hero-badges">
            <span className="tag tag-verified"><ShieldCheck size={12} /> Shop verified records</span>
            <span className="tag tag-self"><FileText size={12} /> Owner proof uploads</span>
            <span className="tag tag-green"><Share2 size={12} /> Buyer-ready link</span>
          </motion.div>
        </motion.div>

        {/* Floating card preview */}
        <motion.div
          className="landing-preview"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden
        >
          <div className="landing-preview-card">
            <div className="landing-preview-header">
              <span className="mono muted" style={{ fontSize: 10 }}>2021 RENAULT CLIO · VF1…</span>
              <span className="tag tag-verified" style={{ fontSize: 10 }}>
                <ShieldCheck size={10} /> 6 verified
              </span>
            </div>
            {[
              { type: 'Oil change', km: '82 400 km', date: 'Jun 2025', verified: true },
              { type: 'Brake service', km: '78 000 km', date: 'Jan 2025', verified: true },
              { type: 'Inspection', km: '70 200 km', date: 'Aug 2024', verified: true },
              { type: 'Tire rotation', km: '65 100 km', date: 'Mar 2024', verified: false },
            ].map((item, i) => (
              <div key={i} className="landing-preview-row">
                <div className={`landing-preview-dot ${item.verified ? 'verified' : 'self'}`} />
                <div className="landing-preview-row-body">
                  <span className="landing-preview-type">{item.type}</span>
                  <span className="mono muted" style={{ fontSize: 10 }}>{item.km} · {item.date}</span>
                </div>
                {item.verified && (
                  <ShieldCheck size={12} style={{ color: 'var(--color-verified)', flexShrink: 0 }} />
                )}
              </div>
            ))}
            <div className="landing-preview-trust">
              <div className="landing-preview-trust-bar">
                <div style={{ width: '75%' }} />
              </div>
              <span className="mono muted" style={{ fontSize: 10 }}>Trust score 75%</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats bar ── */}
      <section className="landing-statsbar">
        {[
          { value: '12 000+', label: 'Records created' },
          { value: '98%', label: 'Buyer satisfaction' },
          { value: '3 min', label: 'Avg setup time' },
          { value: 'Free', label: 'to get started' },
        ].map((s) => (
          <div key={s.label} className="landing-stat">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── How it works ── */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <span className="landing-eyebrow"><Clock size={12} /> How it works</span>
            <h2 className="landing-h2">Three steps to a trusted history</h2>
            <p className="landing-section-lead">No paperwork, no friction — just a timeline buyers can verify in seconds.</p>
          </div>
          <div className="landing-steps">
            {[
              {
                n: '01',
                title: 'Add your vehicle',
                body: 'Enter your VIN or French numéro de série. We auto-fill make, model, and year.',
                icon: Car,
              },
              {
                n: '02',
                title: 'Log every service',
                body: 'Add self-reported entries with photos, or visit a partner shop for instantly verified records.',
                icon: Wrench,
              },
              {
                n: '03',
                title: 'Share one link',
                body: 'Generate a buyer-ready link. Set how much detail to reveal — from summary to full history.',
                icon: Share2,
              },
            ].map((step) => (
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

      {/* ── 3 roles ── */}
      <section className="landing-section landing-roles-section">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <span className="landing-eyebrow">Who it's for</span>
            <h2 className="landing-h2">One platform, three perspectives</h2>
          </div>
          <div className="landing-roles">
            <div className="landing-role landing-role-owner">
              <div className="landing-role-icon"><Car size={26} /></div>
              <h3>Vehicle Owner</h3>
              <p>Keep a verified timeline of every service. When it's time to sell, share a trusted history link — no haggling over undocumented maintenance.</p>
              <ul className="landing-role-list">
                {['Add up to 3 vehicles free', 'Self-report with photo proof', 'Shop-verified records', 'Buyer-ready share link', 'Trust score & reminders'].map(f => (
                  <li key={f}><CheckCircle2 size={13} />{f}</li>
                ))}
              </ul>
              <Link to="/register" className="btn btn-solid" style={{ marginTop: 'auto' }}>
                Start as owner <ArrowRight size={14} />
              </Link>
            </div>

            <div className="landing-role landing-role-shop">
              <div className="landing-role-icon"><Wrench size={26} /></div>
              <h3>Repair Shop</h3>
              <p>Create certified service records for your customers in 30 seconds. Become a trusted partner shop and earn new clients through the AutoHistory network.</p>
              <ul className="landing-role-list">
                {['Instant verified record creation', 'Customer lookup by email', 'Proof photo / receipt upload', 'Shop analytics dashboard', 'Service reminders for clients'].map(f => (
                  <li key={f}><CheckCircle2 size={13} />{f}</li>
                ))}
              </ul>
              <Link to="/register" className="btn btn-solid" style={{ marginTop: 'auto', '--color-accent': 'var(--color-shop-accent)' } as React.CSSProperties}>
                Start as shop <ArrowRight size={14} />
              </Link>
            </div>

            <div className="landing-role landing-role-buyer">
              <div className="landing-role-icon"><Search size={26} /></div>
              <h3>Buyer</h3>
              <p>Before you commit to any used car purchase, scan the seller's share link. See verified shop records, self-reported events, and an independent trust score.</p>
              <ul className="landing-role-list">
                {['No account needed to view', 'Verified vs self-reported breakdown', 'Trust score at a glance', 'Shop certification details', 'Spot gaps in the history'].map(f => (
                  <li key={f}><CheckCircle2 size={13} />{f}</li>
                ))}
              </ul>
              <Link to="/register" className="btn btn-solid" style={{ marginTop: 'auto' }}>
                Start as buyer <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust callout ── */}
      <section className="landing-trust-section">
        <div className="landing-section-inner">
          <div className="landing-trust-grid">
            <div className="landing-trust-copy">
              <span className="landing-eyebrow"><Lock size={12} /> Privacy & security</span>
              <h2 className="landing-h2" style={{ marginTop: 12 }}>Your data stays yours</h2>
              <p className="landing-trust-body">
                You control what buyers see. Choose between a full history, a summary, or keep it completely private. VINs and costs are hidden by default.
              </p>
              <ul className="landing-trust-list">
                {[
                  'Share level controls — full, summary, or hidden',
                  'VIN only revealed on full history or public listings',
                  'Revoke or regenerate your link anytime',
                  'Powered by Supabase with enterprise-grade security',
                ].map(f => (
                  <li key={f}><ShieldCheck size={14} style={{ color: 'var(--color-verified)' }} />{f}</li>
                ))}
              </ul>
            </div>
            <div className="landing-trust-visual" aria-hidden>
              <div className="landing-shield">
                <ShieldCheck size={64} />
                <div className="landing-shield-glow" />
              </div>
              <div className="landing-trust-badges">
                <div className="landing-trust-badge">
                  <CheckCircle2 size={14} style={{ color: 'var(--color-verified)' }} />
                  <span>Bank-grade encryption</span>
                </div>
                <div className="landing-trust-badge">
                  <CheckCircle2 size={14} style={{ color: 'var(--color-verified)' }} />
                  <span>GDPR compliant storage</span>
                </div>
                <div className="landing-trust-badge">
                  <CheckCircle2 size={14} style={{ color: 'var(--color-verified)' }} />
                  <span>No data sold to third parties</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quote / social proof ── */}
      <section className="landing-section">
        <div className="landing-section-inner" style={{ maxWidth: 780 }}>
          <div className="landing-quote">
            <Star size={18} style={{ color: 'var(--color-accent)' }} />
            <blockquote>
              "I was skeptical about buying a used car until the seller sent an AutoHistory link. Six verified shop records, receipts attached, trust score 88%. I bought it the same day."
            </blockquote>
            <cite>— Mehdi B., car buyer, Lyon</cite>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-cta-section">
        <div className="landing-cta-inner">
          <h2 className="landing-h2">Ready to build your vehicle's trust history?</h2>
          <p className="landing-lead" style={{ marginTop: 12 }}>
            Free for owners. No credit card. Takes 3 minutes.
          </p>
          <div className="landing-hero-ctas" style={{ marginTop: 28 }}>
            <Link to="/register" className="btn btn-solid landing-cta-primary">
              Create free account <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-ghost">Already have an account?</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="sidebar-logo" style={{ border: 'none', padding: 0 }}>
            <div className="sidebar-logo-mark" style={{ width: 28, height: 28, fontSize: 13 }}>A</div>
            <span className="sidebar-logo-text" style={{ fontSize: 13 }}>AUTOHISTORY</span>
          </div>
          <p className="mono muted" style={{ fontSize: 11 }}>
            © {new Date().getFullYear()} AutoHistory · Transparent vehicle histories
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link to="/login" className="muted" style={{ fontSize: 12 }}>Sign in</Link>
            <Link to="/register" className="muted" style={{ fontSize: 12 }}>Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
