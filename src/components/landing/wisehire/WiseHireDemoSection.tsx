import { useState } from 'react';
import { Brain, Kanban, FileText } from 'lucide-react';
import { BriefDemo } from './BriefDemo';
import { PipelineDemo } from './PipelineDemo';
import { JDDemo } from './JDDemo';

const TABS = [
  { key: 'brief', label: 'Brief Generator', icon: Brain, desc: 'AI reads a CV and produces a structured candidate brief with match score, strengths, red flags, and interview questions — in under 10 seconds.' },
  { key: 'pipeline', label: 'Pipeline Board', icon: Kanban, desc: 'Visualise your full hiring funnel with drag-and-drop kanban. Every candidate, every stage, every status — at a glance.' },
  { key: 'jd', label: 'JD Writer', icon: FileText, desc: 'Type a job title, click generate. AI writes a complete, bias-aware job description tailored to the role and your company voice.' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function WiseHireDemoSection() {
  const [active, setActive] = useState<TabKey>('brief');
  const activeTab = TABS.find((t) => t.key === active)!;

  return (
    <section
      style={{
        background: 'var(--lp-section-alt2)',
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
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Tab selector — left on desktop, top on mobile */}
          <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-64 lg:flex-shrink-0">
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
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: `1px solid ${isActive ? 'rgba(29,78,216,0.35)' : 'var(--lp-border-card)'}`,
                    background: isActive ? 'rgba(29,78,216,0.08)' : 'var(--lp-card-glass)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    flex: '1 1 auto',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isActive ? 'rgba(29,78,216,0.15)' : 'var(--lp-card-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: isActive ? '#3B82F6' : 'var(--lp-text-muted)', transition: 'color 0.2s ease' }} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--lp-text)' : 'var(--lp-text-muted)',
                      transition: 'color 0.2s ease',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
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
                {active === 'pipeline' && <PipelineDemo />}
                {active === 'jd' && <JDDemo />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
