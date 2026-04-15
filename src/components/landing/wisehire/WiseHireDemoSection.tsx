import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Brain, Kanban, FileText, Upload, Archive, CheckCircle2 } from 'lucide-react';
import { BriefDemo } from './BriefDemo';
import { PipelineDemo } from './PipelineDemo';
import { JDDemo } from './JDDemo';
import { BulkScreeningDemo } from './BulkScreeningDemo';
import { TalentPoolDemo } from './TalentPoolDemo';
import { OfferTrackerDemo } from './OfferTrackerDemo';

const TABS = [
  { key: 'brief', label: 'Brief Generator', icon: Brain, desc: 'AI reads a CV and produces a structured candidate brief with match score, strengths, red flags, and interview questions — in under 10 seconds.' },
  { key: 'jd', label: 'JD Writer', icon: FileText, desc: 'Type a job title, click generate. AI writes a complete, bias-aware job description tailored to the role and your company voice.' },
  { key: 'pipeline', label: 'Pipeline Board', icon: Kanban, desc: 'Visualise your full hiring funnel with drag-and-drop kanban. Every candidate, every stage, every status — at a glance.' },
  { key: 'bulk', label: 'Bulk Screening', icon: Upload, desc: 'Upload multiple CVs at once. AI scores and ranks every applicant against your role criteria — no manual reading required.' },
  { key: 'pool', label: 'Talent Pool', icon: Archive, desc: 'Never lose a great candidate. Build a searchable pool of past applicants you can re-engage for future roles instantly.' },
  { key: 'offers', label: 'Offer Tracker', icon: CheckCircle2, desc: 'Track every offer from sent to signed. See salary, status, and next steps for each candidate in one live view.' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function WiseHireDemoSection() {
  const [active, setActive] = useState<TabKey>('brief');
  const activeTab = TABS.find((t) => t.key === active)!;
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="wisehire-demo"
      style={{
        background: 'var(--lp-section-alt2)',
        borderTop: '1px solid var(--lp-border)',
        width: '100%',
        scrollMarginTop: '96px',
        transition: 'background 0.35s ease',
      }}
    >
      <div
        className="max-w-6xl mx-auto w-full"
        style={{ padding: 'clamp(52px, 6vw, 84px) clamp(20px, 4vw, 40px)' }}
      >
        {/* Heading */}
        <motion.div
          className="text-center mb-10"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
          whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.25 }}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        >
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
            See it in action
          </p>
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.9rem, 4vw, 2.8rem)',
              color: 'var(--lp-text)',
              letterSpacing: '-0.025em',
              transition: 'color 0.35s ease',
            }}
          >
            Watch AI handle the heavy lifting
          </h2>
        </motion.div>

        <motion.div
          className="flex flex-col lg:flex-row gap-6 items-start"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
          whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.08 }}
        >
          {/* Tab selector — 3-col grid on mobile, vertical list on desktop */}
          <style>{`
            .wh-tab-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 100%; }
            @media (min-width: 1024px) { .wh-tab-grid { display: flex; flex-direction: column; gap: 6px; width: 224px; flex-shrink: 0; } }
          `}</style>
          <div className="wh-tab-grid">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActive(tab.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 12px',
                      borderRadius: 12,
                      border: `1px solid ${isActive ? 'rgba(29,78,216,0.35)' : 'var(--lp-border-card)'}`,
                      background: isActive ? 'rgba(29,78,216,0.08)' : 'var(--lp-card-glass)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: isActive ? 'rgba(29,78,216,0.15)' : 'var(--lp-card-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: isActive ? '#3B82F6' : 'var(--lp-text-muted)', transition: 'color 0.2s ease' }} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.73rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--lp-text)' : 'var(--lp-text-muted)',
                        transition: 'color 0.2s ease',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* Demo pane */}
          <div className="flex-1 min-w-0">
            <div
              style={{
                borderRadius: 20,
                background: 'var(--lp-card)',
                border: '1px solid var(--lp-border-card)',
                padding: 'clamp(16px, 3vw, 28px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                transition: 'background 0.35s ease, border-color 0.35s ease',
              }}
            >
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--lp-text-muted)',
                  lineHeight: 1.6,
                  maxWidth: 480,
                  transition: 'color 0.35s ease',
                }}
              >
                {activeTab.desc}
              </p>

              <div className="flex justify-center">
                {active === 'brief' && <BriefDemo />}
                {active === 'jd' && <JDDemo />}
                {active === 'pipeline' && <PipelineDemo />}
                {active === 'bulk' && <BulkScreeningDemo />}
                {active === 'pool' && <TalentPoolDemo />}
                {active === 'offers' && <OfferTrackerDemo />}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
