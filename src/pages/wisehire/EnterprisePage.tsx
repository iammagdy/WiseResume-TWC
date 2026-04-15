import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Shield,
  Plug,
  Headphones,
  Cpu,
  Lock,
  TrendingUp,
  Users,
  ChevronRight,
  X,
} from 'lucide-react';

// ── lp-animate intersection observer ────────────────────────────────────────
function useLpAnimate() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-animate:not(.lp-visible)');
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('lp-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ── Section: Hero ────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section
      className="relative flex flex-col items-center text-center px-4 sm:px-6 overflow-hidden"
      style={{
        background: 'var(--lp-bg)',
        paddingTop: 'calc(7.75rem + env(safe-area-inset-top))',
        paddingBottom: '5rem',
        transition: 'background 0.35s ease',
      }}
    >
      <style>{`
        .wh-gradient-text {
          background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 40%, #1D4ED8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-root[data-lp-scheme="light"] .wh-gradient-text {
          background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        @keyframes wh-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(29,78,216,0); }
          50% { box-shadow: 0 0 0 10px rgba(29,78,216,0.14); }
        }
        .wh-cta-pulse { animation: wh-pulse 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .wh-cta-pulse { animation: none; } }
      `}</style>

      {/* Radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 55% at 50% 0%, var(--lp-hero-glow) 0%, transparent 65%)',
          transition: 'background 0.35s ease',
        }}
      />

      {/* Brand pill */}
      <div
        className="relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
        style={{
          background: 'var(--lp-brand-pill-bg)',
          border: '1px solid var(--lp-brand-pill-border)',
          boxShadow: '0 0 18px 0 var(--lp-brand-pill-glow)',
          transition: 'background 0.35s ease, border-color 0.35s ease',
        }}
      >
        <Building2 className="w-4 h-4" style={{ color: 'var(--lp-eyebrow)' }} />
        <span
          className="font-semibold tracking-tight"
          style={{ fontSize: '0.85rem', color: 'var(--lp-eyebrow)', transition: 'color 0.35s ease' }}
        >
          WiseHire Enterprise
        </span>
      </div>

      {/* Eyebrow */}
      <p
        className="relative z-10 mb-6"
        style={{
          fontSize: '0.8rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--lp-eyebrow)',
          fontWeight: 600,
          transition: 'color 0.35s ease',
        }}
      >
        Built for organisations that hire at scale
      </p>

      {/* Headline */}
      <h1
        className="relative z-10 font-extrabold leading-[1.05] max-w-4xl"
        style={{
          fontSize: 'clamp(2rem, 7vw, 5.5rem)',
          color: 'var(--lp-text)',
          letterSpacing: '-0.035em',
          transition: 'color 0.35s ease',
        }}
      >
        Hiring at scale?{' '}
        <span className="wh-gradient-text">WiseHire Enterprise</span>
        <br />
        is built for you.
      </h1>

      {/* Subheadline */}
      <p
        className="relative z-10 mt-6 mb-10"
        style={{
          fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
          lineHeight: 1.65,
          color: 'var(--lp-text-muted)',
          maxWidth: 560,
          transition: 'color 0.35s ease',
        }}
      >
        SSO, custom AI training, ATS/HRIS integrations, dedicated support, and an SLA — everything
        your enterprise hiring team needs, configured to your requirements.
      </p>

      {/* CTAs */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3">
        <a
          href="#enterprise-contact"
          className="wh-cta-pulse h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2 transition-all"
          style={{ background: '#1D4ED8', color: '#fff', textDecoration: 'none' }}
        >
          Request a Demo
          <ArrowRight className="w-4 h-4" />
        </a>
        <a
          href="/?for=companies#wisehire-pricing"
          className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2 transition-all"
          style={{
            background: 'transparent',
            color: 'var(--lp-eyebrow)',
            border: '1.5px solid rgba(29,78,216,0.35)',
            textDecoration: 'none',
          }}
        >
          See pricing
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      {/* Trust badges */}
      <div className="relative z-10 mt-8 flex items-center gap-5 sm:gap-7 text-xs flex-wrap justify-center">
        {['SOC 2-ready infrastructure', 'SLA guarantee', 'Dedicated onboarding', 'Custom MSA'].map((item) => (
          <span
            key={item}
            className="flex items-center gap-1.5"
            style={{ color: 'var(--lp-trust-color)', transition: 'color 0.3s ease' }}
          >
            <CheckCircle2
              className="w-3.5 h-3.5"
              style={{ color: 'var(--lp-trust-icon)', transition: 'color 0.3s ease' }}
            />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Section: Social Proof ────────────────────────────────────────────────────
function SocialProofSection() {
  const logos = ['Nexara Health', 'Fintell Group', 'Moda Retail', 'Vertex Labs', 'ClearPath HR', 'Orbis Capital'];
  return (
    <section
      style={{
        borderTop: '1px solid var(--lp-border)',
        borderBottom: '1px solid var(--lp-border)',
        background: 'var(--lp-section-alt)',
        transition: 'background 0.35s ease',
      }}
    >
      <div
        className="max-w-6xl mx-auto w-full text-center"
        style={{ padding: 'clamp(28px, 4vw, 48px) clamp(20px, 4vw, 40px)' }}
      >
        <p
          className="lp-animate text-xs uppercase tracking-widest font-semibold mb-8"
          style={{ color: 'var(--lp-text-muted)', transition: 'color 0.35s ease' }}
        >
          Trusted by enterprise teams at
        </p>
        <div className="lp-animate flex flex-wrap justify-center gap-x-8 gap-y-3">
          {logos.map((name) => (
            <span
              key={name}
              className="font-bold text-base tracking-tight opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--lp-text)', transition: 'color 0.35s ease' }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Enterprise Features ─────────────────────────────────────────────
const ENT_FEATURES = [
  {
    icon: Lock,
    title: 'SSO / SCIM Provisioning',
    desc: 'Connect your identity provider (Okta, Azure AD, Google Workspace) for single sign-on and automatic user lifecycle management.',
  },
  {
    icon: Cpu,
    title: 'Custom AI Training',
    desc: 'Fine-tune AI brief and screening models on your own historical hiring data and role criteria for higher match precision.',
  },
  {
    icon: Plug,
    title: 'ATS / HRIS Integrations',
    desc: 'Native connectors for Workday, Greenhouse, Lever, Bamboo HR, and more — with custom integration support available.',
  },
  {
    icon: Headphones,
    title: 'Dedicated Customer Success',
    desc: 'A named CSM who onboards your team, runs quarterly business reviews, and escalates issues same-day.',
  },
  {
    icon: Shield,
    title: 'SLA & Uptime Guarantee',
    desc: '99.9% uptime SLA with incident response SLOs, priority support queue, and a status page with real-time notifications.',
  },
  {
    icon: TrendingUp,
    title: 'Advanced Security & Compliance',
    desc: 'SOC 2-ready infrastructure, data residency options, custom DPA, and GDPR / CCPA tooling included.',
  },
];

function EnterpriseFeaturesSection() {
  return (
    <section
      style={{
        background: 'var(--lp-bg)',
        transition: 'background 0.35s ease',
      }}
    >
      <div
        className="max-w-6xl mx-auto w-full"
        style={{ padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)' }}
      >
        <div className="text-center mb-12 lp-animate">
          <p
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lp-eyebrow)',
              fontWeight: 600,
              marginBottom: '0.75rem',
              transition: 'color 0.35s ease',
            }}
          >
            Enterprise capabilities
          </p>
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.9rem, 4vw, 3rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.025em',
              marginBottom: '0.75rem',
              transition: 'color 0.35s ease',
            }}
          >
            Everything your organisation needs
          </h2>
          <p
            className="max-w-md mx-auto text-sm"
            style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
          >
            WiseHire Enterprise is built to meet the security, scale, and compliance requirements of large organisations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ENT_FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`lp-animate lp-feature-card flex items-start gap-4 p-6 ${i % 2 === 0 ? 'lp-from-left' : 'lp-from-right'}`}
                style={{
                  borderRadius: 18,
                  background: 'var(--lp-card)',
                  border: '1px solid var(--lp-border-card)',
                  transitionDelay: `${i * 55}ms`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(29,78,216,0.10)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--lp-eyebrow)', transition: 'color 0.35s ease' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-sm leading-snug mb-1.5"
                    style={{ color: 'var(--lp-text)', transition: 'color 0.35s ease' }}
                  >
                    {feat.title}
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--lp-text-muted)', lineHeight: 1.6, transition: 'color 0.35s ease' }}
                  >
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Section: How it Works ────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    step: '01',
    title: 'Book a discovery call',
    desc: "We'll learn about your team size, ATS stack, compliance requirements, and hiring volume to tailor the right solution.",
  },
  {
    step: '02',
    title: 'Custom onboarding',
    desc: 'Your dedicated CSM sets up SSO, configures integrations, runs admin training, and migrates existing pipeline data.',
  },
  {
    step: '03',
    title: 'Go live with your team',
    desc: "Your whole hiring team is productive within days — with a tailored AI model trained on your roles' criteria.",
  },
];

function HowItWorksSection() {
  return (
    <section
      style={{
        background: 'var(--lp-section-alt2)',
        borderTop: '1px solid var(--lp-border)',
        borderBottom: '1px solid var(--lp-border)',
        transition: 'background 0.35s ease',
      }}
    >
      <div
        className="max-w-6xl mx-auto w-full"
        style={{ padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)' }}
      >
        <div className="text-center mb-12 lp-animate">
          <p
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lp-eyebrow)',
              fontWeight: 600,
              marginBottom: '0.75rem',
              transition: 'color 0.35s ease',
            }}
          >
            How it works
          </p>
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.9rem, 4vw, 3rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.025em',
              transition: 'color 0.35s ease',
            }}
          >
            From call to live in days
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_STEPS.map((s, i) => (
            <div
              key={s.step}
              className="lp-animate relative flex flex-col gap-4 p-7"
              style={{
                borderRadius: 20,
                background: 'var(--lp-card-glass)',
                border: '1px solid var(--lp-border-card)',
                transitionDelay: `${i * 80}ms`,
              }}
            >
              {/* Connector line (desktop) */}
              {i < HOW_STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="hidden md:block absolute top-1/3 -right-3 w-6 h-px"
                  style={{ background: 'rgba(29,78,216,0.25)' }}
                />
              )}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{ background: 'rgba(29,78,216,0.12)', color: '#3B82F6' }}
              >
                {s.step}
              </div>
              <div>
                <h3
                  className="font-semibold text-base mb-2"
                  style={{ color: 'var(--lp-text)', transition: 'color 0.35s ease' }}
                >
                  {s.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
                >
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Comparison Table ────────────────────────────────────────────────
const COMPARISON_ROWS = [
  { feature: 'Active roles', business: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Candidate briefs / month', business: '1,000', enterprise: 'Unlimited' },
  { feature: 'Bulk CV screening', business: true, enterprise: true },
  { feature: 'Talent Pool', business: true, enterprise: true },
  { feature: 'API access', business: true, enterprise: true },
  { feature: 'SSO / SCIM provisioning', business: false, enterprise: true },
  { feature: 'Custom AI training', business: false, enterprise: true },
  { feature: 'ATS / HRIS integrations', business: false, enterprise: true },
  { feature: 'Dedicated CSM', business: false, enterprise: true },
  { feature: 'SLA & uptime guarantee', business: false, enterprise: true },
  { feature: 'Custom MSA / DPA', business: false, enterprise: true },
  { feature: 'Data residency options', business: false, enterprise: true },
  { feature: 'Support', business: 'Priority', enterprise: 'Enterprise (24 h SLO)' },
];

function ComparisonSection() {
  return (
    <section style={{ background: 'var(--lp-bg)', transition: 'background 0.35s ease' }}>
      <div
        className="max-w-4xl mx-auto w-full"
        style={{ padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)' }}
      >
        <div className="text-center mb-12 lp-animate">
          <p
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lp-eyebrow)',
              fontWeight: 600,
              marginBottom: '0.75rem',
              transition: 'color 0.35s ease',
            }}
          >
            Business vs Enterprise
          </p>
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.025em',
              transition: 'color 0.35s ease',
            }}
          >
            What makes Enterprise different
          </h2>
        </div>

        <div
          className="lp-animate overflow-hidden"
          style={{ borderRadius: 20, border: '1px solid var(--lp-border-card)', overflow: 'hidden' }}
        >
          {/* Header row */}
          <div
            className="grid grid-cols-3 text-sm font-semibold"
            style={{ borderBottom: '1px solid var(--lp-border-card)' }}
          >
            <div
              className="px-5 py-4"
              style={{ color: 'var(--lp-text-muted)', transition: 'color 0.35s ease' }}
            >
              Feature
            </div>
            <div
              className="px-5 py-4 text-center"
              style={{
                color: 'var(--lp-text)',
                background: 'var(--lp-card)',
                borderLeft: '1px solid var(--lp-border-card)',
                transition: 'color 0.35s ease, background 0.35s ease',
              }}
            >
              Business
            </div>
            <div
              className="px-5 py-4 text-center"
              style={{
                color: '#fff',
                background: '#1D4ED8',
                borderLeft: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              Enterprise
            </div>
          </div>

          {/* Data rows */}
          {COMPARISON_ROWS.map((row, i) => (
            <div
              key={row.feature}
              className="grid grid-cols-3 text-sm"
              style={{
                borderBottom: i < COMPARISON_ROWS.length - 1 ? '1px solid var(--lp-border-card)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'var(--lp-section-alt)',
              }}
            >
              <div
                className="px-5 py-3.5"
                style={{ color: 'var(--lp-text)', transition: 'color 0.35s ease' }}
              >
                {row.feature}
              </div>
              <div
                className="px-5 py-3.5 text-center"
                style={{
                  color: 'var(--lp-text-muted)',
                  borderLeft: '1px solid var(--lp-border-card)',
                  transition: 'color 0.35s ease',
                }}
              >
                {typeof row.business === 'boolean' ? (
                  row.business ? (
                    <CheckCircle2 className="w-4 h-4 mx-auto" style={{ color: '#3B82F6' }} />
                  ) : (
                    <X className="w-4 h-4 mx-auto opacity-30" style={{ color: 'var(--lp-text-muted)' }} />
                  )
                ) : (
                  row.business
                )}
              </div>
              <div
                className="px-5 py-3.5 text-center font-medium"
                style={{
                  color: '#e0eaff',
                  background: 'rgba(29,78,216,0.07)',
                  borderLeft: '1px solid rgba(29,78,216,0.20)',
                }}
              >
                {typeof row.enterprise === 'boolean' ? (
                  row.enterprise ? (
                    <CheckCircle2 className="w-4 h-4 mx-auto" style={{ color: '#60A5FA' }} />
                  ) : (
                    <X className="w-4 h-4 mx-auto opacity-30" />
                  )
                ) : (
                  <span style={{ color: 'var(--lp-text)' }}>{row.enterprise}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Contact / Demo Request Form ──────────────────────────────────────
const COMPANY_SIZES = [
  '50–200',
  '200–1000',
  '1000+',
];

function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [size, setSize] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`WiseHire Enterprise Demo Request — ${name}`);
    const body = encodeURIComponent(
      `Hi WiseHire team,\n\nName: ${name}\nWork email: ${email}\nCompany size: ${size}\n\n${message}\n`,
    );
    window.location.href = `mailto:enterprise@thewise.cloud?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <section
      id="enterprise-contact"
      style={{
        background: 'var(--lp-section-alt2)',
        borderTop: '1px solid var(--lp-border)',
        transition: 'background 0.35s ease',
      }}
    >
      <div
        className="max-w-2xl mx-auto w-full"
        style={{ padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)' }}
      >
        <div className="text-center mb-10 lp-animate">
          <p
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lp-eyebrow)',
              fontWeight: 600,
              marginBottom: '0.75rem',
              transition: 'color 0.35s ease',
            }}
          >
            Get in touch
          </p>
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.025em',
              marginBottom: '0.5rem',
              transition: 'color 0.35s ease',
            }}
          >
            Request a demo
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
          >
            Tell us about your team and we'll be in touch within one business day.
          </p>
        </div>

        {submitted ? (
          <div
            className="lp-animate flex flex-col items-center gap-4 py-10 text-center rounded-2xl"
            style={{ background: 'var(--lp-card)', border: '1px solid var(--lp-border-card)' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(29,78,216,0.12)' }}
            >
              <CheckCircle2 className="w-7 h-7" style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <p className="font-bold text-lg mb-1" style={{ color: 'var(--lp-text)' }}>
                Message sent!
              </p>
              <p className="text-sm" style={{ color: 'var(--lp-text-muted)' }}>
                We'll be in touch within one business day.
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="lp-animate flex flex-col gap-4 p-8 rounded-2xl"
            style={{ background: 'var(--lp-card)', border: '1px solid var(--lp-border-card)' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ent-name"
                  className="text-xs font-semibold"
                  style={{ color: 'var(--lp-text)', transition: 'color 0.35s ease' }}
                >
                  Your name
                </label>
                <input
                  id="ent-name"
                  type="text"
                  required
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    background: 'var(--lp-bg)',
                    border: '1px solid var(--lp-border-card)',
                    color: 'var(--lp-text)',
                    transition: 'background 0.35s ease, border-color 0.35s ease, color 0.35s ease',
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ent-email"
                  className="text-xs font-semibold"
                  style={{ color: 'var(--lp-text)', transition: 'color 0.35s ease' }}
                >
                  Work email
                </label>
                <input
                  id="ent-email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    background: 'var(--lp-bg)',
                    border: '1px solid var(--lp-border-card)',
                    color: 'var(--lp-text)',
                    transition: 'background 0.35s ease, border-color 0.35s ease, color 0.35s ease',
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ent-size"
                className="text-xs font-semibold"
                style={{ color: 'var(--lp-text)', transition: 'color 0.35s ease' }}
              >
                Company size
              </label>
              <select
                id="ent-size"
                required
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  background: 'var(--lp-bg)',
                  border: '1px solid var(--lp-border-card)',
                  color: size ? 'var(--lp-text)' : 'var(--lp-text-muted)',
                  transition: 'background 0.35s ease, border-color 0.35s ease, color 0.35s ease',
                }}
              >
                <option value="" disabled>
                  Select company size
                </option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ent-message"
                className="text-xs font-semibold"
                style={{ color: 'var(--lp-text)', transition: 'color 0.35s ease' }}
              >
                Tell us about your hiring needs
              </label>
              <textarea
                id="ent-message"
                rows={4}
                placeholder="e.g. We hire ~200 people per year across 3 offices and need SSO + Workday integration…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                style={{
                  background: 'var(--lp-bg)',
                  border: '1px solid var(--lp-border-card)',
                  color: 'var(--lp-text)',
                  transition: 'background 0.35s ease, border-color 0.35s ease, color 0.35s ease',
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: '#1D4ED8', color: '#fff' }}
            >
              Request Demo
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-xs text-center" style={{ color: 'var(--lp-text-muted)' }}>
              We respect your privacy. No spam, ever.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

// ── Section: Footer CTA ───────────────────────────────────────────────────────
function FooterCtaSection() {
  return (
    <section style={{ background: 'var(--lp-bg)', transition: 'background 0.35s ease' }}>
      <div
        className="max-w-4xl mx-auto w-full text-center"
        style={{ padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)' }}
      >
        <div
          className="lp-animate rounded-3xl p-12 flex flex-col items-center gap-6"
          style={{
            background: 'rgba(29,78,216,0.07)',
            border: '1px solid rgba(29,78,216,0.18)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(29,78,216,0.12)' }}
          >
            <Users className="w-7 h-7" style={{ color: '#3B82F6' }} />
          </div>
          <div>
            <h2
              className="font-extrabold leading-tight mb-3"
              style={{
                fontSize: 'clamp(1.6rem, 3.5vw, 2.75rem)',
                color: 'var(--lp-text)',
                letterSpacing: '-0.025em',
                transition: 'color 0.35s ease',
              }}
            >
              Ready to scale your hiring?
            </h2>
            <p
              className="text-sm max-w-sm mx-auto"
              style={{ color: 'var(--lp-text-muted)', lineHeight: 1.7, transition: 'color 0.35s ease' }}
            >
              Book a 30-minute discovery call and we'll show you how WiseHire Enterprise fits your organisation.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <a
              href="#enterprise-contact"
              className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: '#1D4ED8', color: '#fff', textDecoration: 'none' }}
            >
              Talk to Sales
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to="/?for=companies"
              className="h-12 px-8 text-base font-semibold rounded-xl flex items-center gap-2 transition-all"
              style={{
                background: 'transparent',
                color: 'var(--lp-eyebrow)',
                border: '1.5px solid rgba(29,78,216,0.35)',
                textDecoration: 'none',
              }}
            >
              Back to WiseHire
            </Link>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs" style={{ color: 'var(--lp-text-muted)' }}>
          <Link to="/privacy-policy" className="hover:underline" style={{ color: 'var(--lp-text-muted)' }}>
            Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="hover:underline" style={{ color: 'var(--lp-text-muted)' }}>
            Terms of Service
          </Link>
          <a href="/?for=companies#wisehire-pricing" className="hover:underline" style={{ color: 'var(--lp-text-muted)' }}>
            Pricing
          </a>
          <Link to="/" className="hover:underline" style={{ color: 'var(--lp-text-muted)' }}>
            WiseResume
          </Link>
        </div>
        <p className="mt-4 text-xs" style={{ color: 'var(--lp-text-muted)', opacity: 0.5 }}>
          © {new Date().getFullYear()} thewise.cloud. All rights reserved.
        </p>
      </div>
    </section>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function EnterpriseNav() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-8"
      style={{
        height: 64,
        background: 'var(--lp-bg)',
        borderBottom: '1px solid var(--lp-border)',
        transition: 'background 0.35s ease',
      }}
    >
      <Link
        to="/?for=companies"
        className="flex items-center gap-2 font-extrabold tracking-tight"
        style={{ color: '#2563EB', textDecoration: 'none', fontSize: '1.15rem' }}
      >
        <Building2 className="w-5 h-5" />
        WiseHire
        <span
          className="ml-1 text-xs font-bold rounded px-1.5 py-0.5"
          style={{ background: 'rgba(29,78,216,0.12)', color: '#3B82F6' }}
        >
          Enterprise
        </span>
      </Link>
      <a
        href="#enterprise-contact"
        className="h-9 px-5 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-all hover:opacity-90"
        style={{ background: '#1D4ED8', color: '#fff', textDecoration: 'none' }}
      >
        Request Demo
      </a>
    </nav>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────
export default function EnterprisePage() {
  useLpAnimate();

  useEffect(() => {
    document.title = 'WiseHire Enterprise — Hire at Scale';
    return () => { document.title = 'WiseResume — AI-Powered Career Platform'; };
  }, []);

  return (
    <div
      className="lp-root min-h-[100dvh] flex flex-col"
      data-lp-product="wisehire"
      style={{ background: 'var(--lp-bg)', transition: 'background 0.35s ease' }}
    >
      <EnterpriseNav />
      <HeroSection />
      <SocialProofSection />
      <EnterpriseFeaturesSection />
      <HowItWorksSection />
      <ComparisonSection />
      <ContactSection />
      <FooterCtaSection />
    </div>
  );
}
