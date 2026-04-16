import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface CompletionItem {
  label: string;
  weight: number;
  ok: boolean;
  why: string;
}

interface CompletionScoreBarProps {
  score: number;
  items: CompletionItem[];
}

export function CompletionScoreBar({ score, items }: CompletionScoreBarProps) {
  const [open, setOpen] = useState(false);

  const missing = items.filter((i) => !i.ok);
  const filled = items.filter((i) => i.ok);

  const color =
    score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  const label =
    score === 100
      ? 'Profile complete!'
      : score >= 80
      ? 'Strong profile'
      : score >= 50
      ? 'Good — a few things left'
      : 'Needs attention';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full px-3 py-2.5 flex items-center gap-3 touch-manipulation active:bg-muted/30 transition-colors"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-foreground">Completion</span>
            <span className="text-xs font-bold tabular-nums" style={{ color }}>
              {score}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${score}%`, background: color }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-left">{label}</p>
        </div>
        <span className="shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-1.5">
          {missing.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Missing ({missing.length})
              </p>
              {missing.map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                  <span className="text-[10px] mt-0.5 shrink-0" style={{ color }}>●</span>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">+{item.weight}%</span>
                    <p className="text-[10px] text-muted-foreground">{item.why}</p>
                  </div>
                </div>
              ))}
            </>
          )}
          {filled.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-2">
                Done ({filled.length})
              </p>
              {filled.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-[10px] shrink-0 text-green-500">✓</span>
                  <span className="text-xs text-muted-foreground line-through">{item.label}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function buildCompletionItems(opts: {
  bio: string;
  avatarUrl: string | null | undefined;
  username: string;
  hasExperience: boolean;
  hasSkills: boolean;
  hasSocialLink: boolean;
  hasCaseStudies: boolean;
  hasTestimonials: boolean;
  metaTitle: string;
  availabilityStatus: string;
  accentColor: string;
  hasLinkedIn: boolean;
}): CompletionItem[] {
  return [
    {
      label: 'Profile photo',
      weight: 15,
      ok: !!opts.avatarUrl,
      why: 'Portfolios with photos get 3× more recruiter clicks.',
    },
    {
      label: 'Work experience',
      weight: 15,
      ok: opts.hasExperience,
      why: 'Experience is the #1 thing recruiters look at first.',
    },
    {
      label: 'Bio',
      weight: 10,
      ok: opts.bio.trim().length >= 50,
      why: 'A strong bio sets the context before anything else.',
    },
    {
      label: 'Skills',
      weight: 10,
      ok: opts.hasSkills,
      why: 'Skills are used for keyword matching by ATS tools.',
    },
    {
      label: 'Username',
      weight: 10,
      ok: opts.username.length >= 3,
      why: 'Required to publish and share your portfolio.',
    },
    {
      label: 'Social / contact link',
      weight: 10,
      ok: opts.hasSocialLink,
      why: 'Recruiters need a way to reach you — add email or LinkedIn.',
    },
    {
      label: 'Projects or case studies',
      weight: 10,
      ok: opts.hasCaseStudies,
      why: 'Portfolio projects increase callbacks by 2×.',
    },
    {
      label: 'LinkedIn profile',
      weight: 5,
      ok: opts.hasLinkedIn,
      why: 'Linking LinkedIn signals professionalism and verifiability.',
    },
    {
      label: 'Testimonials',
      weight: 8,
      ok: opts.hasTestimonials,
      why: 'Social proof dramatically increases trust for recruiters.',
    },
    {
      label: 'SEO page title',
      weight: 4,
      ok: opts.metaTitle.length > 0,
      why: 'Helps your portfolio rank when recruiters search your name.',
    },
    {
      label: 'Availability status',
      weight: 3,
      ok: opts.availabilityStatus !== 'not-looking',
      why: 'Active job seekers get surfaced more in talent searches.',
    },
  ];
}
