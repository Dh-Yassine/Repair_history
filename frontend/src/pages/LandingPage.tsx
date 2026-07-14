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

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

function DotGrid() {
  return <div className="landing-dotgrid" aria-hidden />;
}

function HudCorners() {
  return (
    <div className="hud-corners" aria-hidden>
      <span className="hud-corner hud-tl" />
      <span className="hud-corner hud-tr" />
      <span className="hud-corner hud-bl" />
      <span className="hud-corner hud-br" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="sidebar-logo" style={{ border: 'none', padding: 0 }}>
            <div className="sidebar-logo-mark">A</div>
            <span className="sidebar-logo-text">AUTOHISTORY</span>
          </div>
          <div className="landing-nav-links">
            <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link to="/register" className="btn btn-solid btn-sm">
              Create account <ArrowRight size={14} />
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
            <Zap size={12} /> Sell with proof. Buy with confidence.
          </motion.span>
          <motion.h1 variants={fadeUp} className="landing-h1 landing-h1-hero">
            A well-kept car is<br />worth more. Prove it.
          </motion.h1>
          <motion.p variants={fadeUp} className="landing-lead landing-lead-hero">
            Log every oil change, tire swap, and repair as it happens. When you sell, buyers open one
            link and see the whole history — verified by real shops, not just your word.
          </motion.p>
          <motion.div variants={fadeUp} className="landing-hero-ctas">
            <Link to="/register" className="btn btn-solid landing-cta-primary">
              Create account <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-ghost">
              Sign in
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} className="landing-hero-badges">
            <span className="tag tag-verified"><ShieldCheck size={12} /> Shop-verified</span>
            <span className="tag tag-self"><FileText size={12} /> Owner records</span>
            <span className="tag tag-green"><Share2 size={12} /> Shareable link</span>
          </motion.div>
        </motion.div>
      </section>

      <section className="landing-statsbar">
        {[
          { value: '< 30 s', label: 'to log a service' },
          { value: '1 link', label: 'shows the full history' },
          { value: 'No account', label: 'needed for buyers' },
          { value: 'Free', label: 'for owners, 3 vehicles' },
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
            <span className="landing-eyebrow"><Clock size={12} /> How it works</span>
            <h2 className="landing-h2">Three steps</h2>
            <p className="landing-section-lead">Self-reported entries build the timeline; shop-verified entries build the credibility.</p>
          </div>
          <div className="landing-steps">
            {[
              { n: '01', title: 'Add your vehicle', body: 'Type the VIN and the make, model, and year fill in automatically.', icon: Car },
              { n: '02', title: 'Log each service', body: 'Record the date, mileage, and a receipt photo — or have the shop that did the work add it as a verified entry.', icon: Wrench },
              { n: '03', title: 'Share one link', body: 'Buyers open it without an account and see exactly which records a real shop confirmed.', icon: Share2 },
            ].map((step) => (
              <div key={step.n} className="landing-step">
                <div className="landing-step-icon"><step.icon size={22} /></div>
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
            <span className="landing-eyebrow"><Search size={12} /> What you get</span>
            <h2 className="landing-h2">A verified maintenance timeline, not a guess</h2>
          </div>
          <p className="landing-lead" style={{ marginTop: 16 }}>
            AutoHistory records every oil change, brake job, and repair against mileage and date —
            then marks which ones a real shop confirmed. Buyers open one link and see that timeline
            with a trust score up top. No paperwork hunt. No relying on the seller&apos;s word alone.
          </p>
        </div>
      </section>

      <section className="landing-section landing-roles-section">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <span className="landing-eyebrow">Who it&apos;s for</span>
            <h2 className="landing-h2">Personal accounts and repair shops</h2>
            <p className="landing-lead" style={{ marginTop: 12, maxWidth: 560 }}>
              One personal account covers owning a vehicle and reviewing a history link before you buy.
              Shop accounts are separate — and reviewed by an admin before they can verify work.
            </p>
          </div>
          <div className="landing-roles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {[
              {
                role: 'landing-role-owner',
                icon: Car,
                title: 'Personal account',
                cta: 'Create account',
                desc: 'Log maintenance on your vehicles, attach proof, share a link when you sell, and open links from sellers when you buy.',
                features: [
                  'Up to 3 vehicles free',
                  'Attach receipt photos as proof',
                  'Share summary or full history',
                  'Open any shared link — no extra account',
                  'Reminders based on your last service',
                ],
              },
              {
                role: 'landing-role-shop',
                icon: Wrench,
                title: 'Repair shop',
                cta: 'Request shop account',
                desc: 'After admin approval, look up a customer by email or VIN and save a verified record in one step.',
                features: [
                  'Admin approval before verifying',
                  'Records verified on save',
                  'Lookup by email, VIN, or serial',
                  'Attach the invoice as proof',
                  'Monthly verified-work trend',
                ],
              },
            ].map((r) => (
              <div key={r.title} className={`landing-role ${r.role}`}>
                <div className="landing-role-icon"><r.icon size={26} /></div>
                <h3>{r.title}</h3>
                <p>{r.desc}</p>
                <ul className="landing-role-list">
                  {r.features.map((f) => (
                    <li key={f}><CheckCircle2 size={13} />{f}</li>
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
              <span className="landing-eyebrow"><Lock size={12} /> Privacy</span>
              <h2 className="landing-h2" style={{ marginTop: 12 }}>You choose what buyers see</h2>
              <p className="landing-trust-body">
                Before you share, a preview shows exactly what the buyer will see. Summary mode shows
                dates, mileage, and verification status; full mode adds costs, notes, and shop names.
              </p>
              <ul className="landing-trust-list">
                {[
                  'Preview the buyer view before sharing',
                  'VIN stays hidden unless you show it',
                  'Regenerate the link to cut off old copies — history stays intact',
                  'Turn sharing off entirely at any time',
                ].map((f) => (
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
                {['Encrypted in transit and at rest', 'GDPR-aligned storage', 'No sale of personal data'].map((f) => (
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
            <blockquote>
              What a buyer opens: a timeline of dated, mileage-stamped services — oil changes,
              brake jobs, inspections — each marked shop-verified or self-reported, with the trust
              score up top. No account, no download, one link.
            </blockquote>
            <cite>— The shared history page, exactly as buyers see it</cite>
          </div>
        </div>
      </section>

      <section className="landing-cta-section">
        <div className="landing-cta-inner">
          <h2 className="landing-h2">Start the record today, sell on it later</h2>
          <p className="landing-lead" style={{ marginTop: 12 }}>
            The history is only worth something if it exists when you sell. Free for owners, up to
            three vehicles, no credit card.
          </p>
          <div className="landing-hero-ctas" style={{ marginTop: 28, justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-solid landing-cta-primary">
              Create account <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-ghost">Sign in</Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="sidebar-logo" style={{ border: 'none', padding: 0 }}>
            <div className="sidebar-logo-mark" style={{ width: 28, height: 28, fontSize: 13 }}>A</div>
            <span className="sidebar-logo-text" style={{ fontSize: 13 }}>AUTOHISTORY</span>
          </div>
          <p className="mono muted" style={{ fontSize: 11 }}>
            © {new Date().getFullYear()} AutoHistory · Vehicle maintenance history
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link to="/login" className="muted" style={{ fontSize: 12 }}>Sign in</Link>
            <Link to="/register" className="muted" style={{ fontSize: 12 }}>Create account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
