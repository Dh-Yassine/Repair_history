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

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

/* ─── SVG car silhouette ───────────────────────────────────────────────── */
function CarSilhouette() {
  return (
    <svg
      viewBox="0 0 900 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="car-svg"
      aria-hidden
    >
      {/* ── defs ── */}
      <defs>
        {/* underglow gradient */}
        <radialGradient id="underglow" cx="50%" cy="0%" r="60%">
          <stop offset="0%" stopColor="#e8ff47" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#e8ff47" stopOpacity="0" />
        </radialGradient>
        {/* headlight glow */}
        <radialGradient id="headlight-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#e8ff47" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e8ff47" stopOpacity="0" />
        </radialGradient>
        {/* taillight glow */}
        <radialGradient id="taillight-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff5050" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#ff2020" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff2020" stopOpacity="0" />
        </radialGradient>
        {/* scan gradient */}
        <linearGradient id="scan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e8ff47" stopOpacity="0" />
          <stop offset="50%" stopColor="#e8ff47" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#e8ff47" stopOpacity="0" />
        </linearGradient>
        {/* car body fill */}
        <linearGradient id="body-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2030" />
          <stop offset="100%" stopColor="#0d1118" />
        </linearGradient>
        {/* wheel fill */}
        <radialGradient id="wheel-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#252b3a" />
          <stop offset="70%" stopColor="#141820" />
          <stop offset="100%" stopColor="#0d1118" />
        </radialGradient>
        {/* rim spokes gradient */}
        <linearGradient id="rim-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a5260" />
          <stop offset="100%" stopColor="#252b38" />
        </linearGradient>
        {/* speed line fade */}
        <linearGradient id="speed-fade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e8ff47" stopOpacity="0" />
          <stop offset="100%" stopColor="#e8ff47" stopOpacity="0.3" />
        </linearGradient>
        {/* clip for scan line */}
        <clipPath id="car-clip">
          <path d="M 60 215 C 55 207,50 192,58 178 C 65 166,80 157,96 152 L 105 148 C 115 144,126 141,138 139 L 306 128 C 324 122,342 113,360 101 L 424 68 C 436 58,456 52,478 50 L 568 50 C 590 50,615 60,630 76 L 686 130 C 697 143,705 158,707 172 C 709 183,707 200,700 212 C 694 222,678 228,662 230 L 620 215 A 52 52 0 0 0 516 215 L 238 215 A 52 52 0 0 0 134 215 Z" />
        </clipPath>
        {/* filter for glow */}
        <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── speed lines (behind car, fade in from left) ── */}
      {[
        { y: 168, w: 260, delay: '0s' },
        { y: 178, w: 310, delay: '0.15s' },
        { y: 188, w: 290, delay: '0.3s' },
        { y: 198, w: 340, delay: '0.05s' },
        { y: 208, w: 270, delay: '0.22s' },
        { y: 148, w: 220, delay: '0.4s' },
        { y: 158, w: 240, delay: '0.18s' },
      ].map((l, i) => (
        <line
          key={i}
          x1={60 - l.w}
          y1={l.y}
          x2={60}
          y2={l.y}
          stroke="url(#speed-fade)"
          strokeWidth={i % 3 === 0 ? 1.5 : 1}
          className="speed-line"
          style={{ animationDelay: l.delay }}
        />
      ))}

      {/* ── road line ── */}
      <line x1="0" y1="267" x2="900" y2="267" stroke="#252932" strokeWidth="1.5" />

      {/* ── underglow ── */}
      <ellipse cx="378" cy="267" rx="240" ry="12" fill="url(#underglow)" className="car-underglow" />

      {/* ── main body ── */}
      <path
        d="
          M 60 215
          C 55 207, 50 192, 58 178
          C 65 166, 80 157, 96 152
          L 105 148
          C 115 144, 126 141, 138 139
          L 306 128
          C 324 122, 342 113, 360 101
          L 424 68
          C 436 58, 456 52, 478 50
          L 568 50
          C 590 50, 615 60, 630 76
          L 686 130
          C 697 143, 705 158, 707 172
          C 709 183, 707 200, 700 212
          C 694 222, 678 228, 662 230
          L 620 215
          A 52 52 0 0 0 516 215
          L 238 215
          A 52 52 0 0 0 134 215
          Z
        "
        fill="url(#body-fill)"
        stroke="#e8ff47"
        strokeWidth="1.2"
        strokeOpacity="0.45"
        filter="url(#glow-filter)"
      />

      {/* ── cabin / glass area ── */}
      <path
        d="
          M 368 105
          L 427 70
          C 438 61, 457 55, 478 53
          L 567 53
          C 588 53, 610 62, 624 77
          L 674 128
          L 616 128
          C 600 120, 582 115, 562 115
          L 498 115
          L 392 115
          L 368 105
          Z
        "
        fill="#0c1320"
        fillOpacity="0.85"
        stroke="#e8ff47"
        strokeWidth="0.8"
        strokeOpacity="0.3"
      />

      {/* ── window split (B-pillar) ── */}
      <line x1="494" y1="53" x2="498" y2="115" stroke="#e8ff47" strokeWidth="1" strokeOpacity="0.25" />

      {/* ── rear wheels ── */}
      <circle cx="568" cy="215" r="52" fill="url(#wheel-grad)" stroke="#e8ff47" strokeWidth="1" strokeOpacity="0.35" />
      {/* rim spokes */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <line
          key={angle}
          x1={568 + 14 * Math.cos((angle * Math.PI) / 180)}
          y1={215 + 14 * Math.sin((angle * Math.PI) / 180)}
          x2={568 + 42 * Math.cos((angle * Math.PI) / 180)}
          y2={215 + 42 * Math.sin((angle * Math.PI) / 180)}
          stroke="#4a5468"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ))}
      <circle cx="568" cy="215" r="14" fill="#1a1f2c" stroke="#5a6278" strokeWidth="1.5" />
      <circle cx="568" cy="215" r="6" fill="#e8ff47" fillOpacity="0.6" />

      {/* ── front wheel ── */}
      <circle cx="186" cy="215" r="52" fill="url(#wheel-grad)" stroke="#e8ff47" strokeWidth="1" strokeOpacity="0.35" />
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <line
          key={angle}
          x1={186 + 14 * Math.cos((angle * Math.PI) / 180)}
          y1={215 + 14 * Math.sin((angle * Math.PI) / 180)}
          x2={186 + 42 * Math.cos((angle * Math.PI) / 180)}
          y2={215 + 42 * Math.sin((angle * Math.PI) / 180)}
          stroke="#4a5468"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ))}
      <circle cx="186" cy="215" r="14" fill="#1a1f2c" stroke="#5a6278" strokeWidth="1.5" />
      <circle cx="186" cy="215" r="6" fill="#e8ff47" fillOpacity="0.6" />

      {/* ── headlight beam ── */}
      <ellipse cx="85" cy="162" rx="32" ry="18" fill="url(#headlight-glow)" className="headlight-pulse" />
      {/* headlight housing */}
      <path d="M 62 168 C 68 156, 84 148, 98 150 L 102 155 C 88 154, 74 160, 68 170 Z"
        fill="#c8d8ff" fillOpacity="0.55" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.5" />

      {/* ── taillight ── */}
      <ellipse cx="706" cy="178" rx="24" ry="14" fill="url(#taillight-glow)" className="taillight-pulse" />
      <path d="M 698 168 C 706 162, 714 165, 716 172 L 714 183 C 712 188, 705 190, 698 186 Z"
        fill="#ff4040" fillOpacity="0.7" stroke="#ff6060" strokeWidth="0.5" strokeOpacity="0.6" />

      {/* ── front logo (small grille ornament) ── */}
      <circle cx="78" cy="197" r="5" fill="none" stroke="#e8ff47" strokeWidth="1" strokeOpacity="0.6" />

      {/* ── side mirror ── */}
      <path d="M 365 104 L 355 98 L 350 108 L 360 112 Z"
        fill="#1c2230" stroke="#e8ff47" strokeWidth="0.8" strokeOpacity="0.3" />

      {/* ── door line ── */}
      <path d="M 156 215 C 156 175, 165 145, 180 138 L 500 128 C 520 128, 548 133, 565 145 L 575 165 L 575 215"
        fill="none" stroke="#e8ff47" strokeWidth="0.6" strokeOpacity="0.18" strokeDasharray="4 3" />

      {/* ── scan line overlay (animated) ── */}
      <rect
        x="-20"
        y="45"
        width="40"
        height="230"
        fill="url(#scan-grad)"
        className="scan-line"
        clipPath="url(#car-clip)"
      />

      {/* ── HUD overlay marks ── */}
      {/* front corner bracket */}
      <path d="M 30 30 L 30 50 M 30 30 L 50 30" stroke="#e8ff47" strokeWidth="1" strokeOpacity="0.4" />
      {/* rear corner bracket */}
      <path d="M 870 30 L 870 50 M 870 30 L 850 30" stroke="#e8ff47" strokeWidth="1" strokeOpacity="0.4" />
      <path d="M 30 245 L 30 225 M 30 245 L 50 245" stroke="#e8ff47" strokeWidth="1" strokeOpacity="0.4" />
      <path d="M 870 245 L 870 225 M 870 245 L 850 245" stroke="#e8ff47" strokeWidth="1" strokeOpacity="0.4" />
      {/* HUD label */}
      <text x="36" y="26" fill="#e8ff47" fillOpacity="0.5" fontSize="9" fontFamily="monospace" letterSpacing="2">AUTOHISTORY</text>
      <text x="36" y="258" fill="#e8ff47" fillOpacity="0.3" fontSize="8" fontFamily="monospace" letterSpacing="1">SCAN ACTIVE</text>
      <text x="760" y="258" fill="#e8ff47" fillOpacity="0.3" fontSize="8" fontFamily="monospace" letterSpacing="1">VER. 2.0</text>
    </svg>
  );
}

/* ─── Dot-grid background ──────────────────────────────────────────────── */
function DotGrid() {
  return <div className="landing-dotgrid" aria-hidden />;
}

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
      <section className="landing-hero-full">
        <DotGrid />

        {/* background glow blobs */}
        <div className="landing-glow landing-glow-1" aria-hidden />
        <div className="landing-glow landing-glow-2" aria-hidden />

        {/* car visual — full width, above the text */}
        <motion.div
          className="landing-car-stage"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <CarSilhouette />
        </motion.div>

        {/* text + CTA below car */}
        <motion.div
          className="landing-hero-content"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.span variants={fadeUp} className="landing-eyebrow landing-eyebrow-hero">
            <Zap size={12} /> Your verified vehicle history
          </motion.span>
          <motion.h1 variants={fadeUp} className="landing-h1 landing-h1-hero">
            Sell with proof.<br />Buy with confidence.
          </motion.h1>
          <motion.p variants={fadeUp} className="landing-lead landing-lead-hero">
            AutoHistory turns maintenance receipts and shop records into a single verified timeline — shareable with one link, trusted by buyers.
          </motion.p>
          <motion.div variants={fadeUp} className="landing-hero-ctas">
            <Link to="/register" className="btn btn-solid landing-cta-primary">
              Start free — no card needed <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-ghost">
              Sign in
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} className="landing-hero-badges">
            <span className="tag tag-verified"><ShieldCheck size={12} /> Shop verified records</span>
            <span className="tag tag-self"><FileText size={12} /> Owner proof uploads</span>
            <span className="tag tag-green"><Share2 size={12} /> Buyer-ready link</span>
          </motion.div>
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
              { n: '01', title: 'Add your vehicle', body: 'Enter your VIN or French numéro de série. We fill in make, model and year automatically.', icon: Car },
              { n: '02', title: 'Log every service', body: 'Add self-reported entries with photos, or visit a partner shop for instantly verified records.', icon: Wrench },
              { n: '03', title: 'Share one link', body: 'Generate a buyer-ready link. Set how much detail to reveal — summary to full history.', icon: Share2 },
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

      {/* ── 3 roles ── */}
      <section className="landing-section landing-roles-section">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <span className="landing-eyebrow">Who it's for</span>
            <h2 className="landing-h2">One platform, three perspectives</h2>
          </div>
          <div className="landing-roles">
            {[
              {
                role: 'landing-role-owner', icon: Car, title: 'Vehicle Owner',
                desc: 'Keep a verified timeline of every service. When it\'s time to sell, share a trusted history link — no haggling over undocumented maintenance.',
                features: ['Add up to 3 vehicles free', 'Self-report with photo proof', 'Shop-verified records', 'Buyer-ready share link', 'Trust score & reminders'],
              },
              {
                role: 'landing-role-shop', icon: Wrench, title: 'Repair Shop',
                desc: 'Create certified service records for your customers in 30 seconds. Earn new clients through the AutoHistory partner network.',
                features: ['Instant verified record creation', 'Customer lookup by email', 'Proof photo / receipt upload', 'Shop analytics dashboard', 'Service reminders for clients'],
              },
              {
                role: 'landing-role-buyer', icon: Search, title: 'Buyer',
                desc: 'Before you commit to any used car purchase, scan the seller\'s share link. See verified shop records and an independent trust score.',
                features: ['No account needed to view', 'Verified vs self-reported split', 'Trust score at a glance', 'Shop certification details', 'Spot gaps in the history'],
              },
            ].map((r) => (
              <div key={r.title} className={`landing-role ${r.role}`}>
                <div className="landing-role-icon"><r.icon size={26} /></div>
                <h3>{r.title}</h3>
                <p>{r.desc}</p>
                <ul className="landing-role-list">
                  {r.features.map(f => <li key={f}><CheckCircle2 size={13} />{f}</li>)}
                </ul>
                <Link to="/register" className="btn btn-solid" style={{ marginTop: 'auto' }}>
                  Start as {r.title.split(' ')[0].toLowerCase()} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust callout ── */}
      <section className="landing-trust-section">
        <div className="landing-section-inner">
          <div className="landing-trust-grid">
            <div className="landing-trust-copy">
              <span className="landing-eyebrow"><Lock size={12} /> Privacy &amp; security</span>
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
                {['Bank-grade encryption', 'GDPR compliant storage', 'No data sold to third parties'].map(f => (
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

      {/* ── Quote ── */}
      <section className="landing-section">
        <div className="landing-section-inner" style={{ maxWidth: 780 }}>
          <div className="landing-quote">
            <Star size={18} style={{ color: 'var(--color-accent)' }} />
            <blockquote>
              "I was skeptical about buying a used car until the seller sent an AutoHistory link. Six verified shop records, receipts attached, trust score 88 %. Bought it the same day."
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
          <div className="landing-hero-ctas" style={{ marginTop: 28, justifyContent: 'center' }}>
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
