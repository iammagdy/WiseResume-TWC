import { Brain, FileText, Kanban, Users, Archive, Rocket } from 'lucide-react';

const pillars = [
  {
    icon: Brain,
    title: 'AI Brief Generator',
    desc: 'Instantly generate a structured candidate brief — match score, key strengths, red flags, and top interview questions — from any CV.',
    badge: '01',
  },
  {
    icon: FileText,
    title: 'JD Writer',
    desc: 'Write bias-free, compelling job descriptions in seconds. AI tailors the tone and requirements to attract the right candidates.',
    badge: '02',
  },
  {
    icon: Kanban,
    title: 'Pipeline Board',
    desc: 'Drag-and-drop kanban for your hiring pipeline. Track every candidate from applied to offer with full status history.',
    badge: '03',
  },
  {
    icon: Users,
    title: 'Bulk Screening',
    desc: 'Upload multiple CVs at once. AI scores and ranks every applicant against your role criteria — no manual reading required.',
    badge: '04',
  },
  {
    icon: Archive,
    title: 'Talent Pool',
    desc: 'Never lose a great candidate. Build a searchable pool of past applicants you can re-engage for future roles instantly.',
    badge: '05',
  },
];

interface WiseHireFeaturesProps {
  onOpenWaitlist: () => void;
}

export function WiseHireFeatures({ onOpenWaitlist }: WiseHireFeaturesProps) {
  return (
    <section
      style={{
        background: 'var(--lp-section-alt)',
        borderTop: '1px solid var(--lp-border)',
        borderBottom: '1px solid var(--lp-border)',
        width: '100%',
        transition: 'background 0.35s ease',
      }}
    >
      <div
        className="max-w-6xl mx-auto w-full"
        style={{ padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)' }}
      >
        {/* Heading */}
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
            Platform pillars
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
            Five tools. One hiring OS.
          </h2>
          <p
            className="max-w-md mx-auto text-sm"
            style={{ color: 'var(--lp-text-muted)', lineHeight: 1.65, transition: 'color 0.35s ease' }}
          >
            Everything your hiring team needs in one place — from writing the JD to making the offer.
          </p>
        </div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className={`lp-animate lp-feature-card ${i % 2 === 0 ? 'lp-from-left' : 'lp-from-right'} flex flex-col gap-4 p-6`}
                style={{
                  borderRadius: 18,
                  background: 'var(--lp-card)',
                  border: '1px solid var(--lp-border-card)',
                  transitionDelay: `${i * 60}ms`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(29,78,216,0.10)' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: 'var(--lp-eyebrow)', transition: 'color 0.35s ease' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: 'var(--lp-eyebrow)',
                        marginBottom: 4,
                        transition: 'color 0.35s ease',
                      }}
                    >
                      {pillar.badge}
                    </div>
                    <h3
                      className="font-semibold text-sm leading-snug"
                      style={{ color: 'var(--lp-text)', marginBottom: 6, transition: 'color 0.35s ease' }}
                    >
                      {pillar.title}
                    </h3>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--lp-text-muted)', lineHeight: 1.6, transition: 'color 0.35s ease' }}
                    >
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* CTA card — fills the last slot; single <button> for full keyboard accessibility */}
          <button
            className="lp-animate lp-from-right flex flex-col items-center justify-center gap-4 p-6 text-center w-full"
            style={{
              borderRadius: 18,
              background: 'rgba(29,78,216,0.07)',
              border: '1px solid rgba(29,78,216,0.18)',
              transitionDelay: `${pillars.length * 60}ms`,
              cursor: 'pointer',
            }}
            onClick={onOpenWaitlist}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(29,78,216,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Rocket className="w-6 h-6" style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--lp-text)' }}>Get early access</p>
              <p className="text-xs" style={{ color: 'var(--lp-text-muted)' }}>Join the waitlist and be first to try WiseHire</p>
            </div>
            <span
              style={{
                background: '#1D4ED8',
                color: '#fff',
                borderRadius: 99,
                padding: '7px 18px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Join Waitlist
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
