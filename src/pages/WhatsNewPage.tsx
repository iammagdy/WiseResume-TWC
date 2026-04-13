import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import triggerHaptic from '@/lib/haptics';
import { Sparkles, Shield, Zap, Globe, BarChart3, Mic, FileText, Bot, Wand2, Target, Star } from 'lucide-react';

interface ChangelogEntry {
  date: string;
  tag: string;
  tagColor: string;
  icon: React.ElementType;
  title: string;
  description: string;
  highlights: string[];
}

const changelog: ChangelogEntry[] = [
  {
    date: 'March 2026',
    tag: 'AI & Parsing',
    tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    icon: Target,
    title: 'Parsing & ATS Simulation Overhaul',
    description:
      'Completely rebuilt the resume parser and ATS simulator. International date formats, new section headers, and a richer ATS feedback UI with matched/missing keywords.',
    highlights: [
      'Expanded section recognition (Work History, Career Summary, Awards, Projects, Volunteering)',
      'ATS scores now show matched and missing keywords inline',
      'Gemini AI fallback parser keeps things running during AI outages',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Security',
    tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: Shield,
    title: 'Security Audit & Hardening',
    description:
      'A comprehensive security audit fixed JWT verification, rate-limited public portfolio endpoints, and hardened the token bridge.',
    highlights: [
      'Full HS256 JWT signature verification in the auth middleware',
      'Rate limiting on public portfolio pages (60 req/min per IP)',
      'Bridge token stored in localStorage for resilient offline access',
    ],
  },
  {
    date: 'March 2026',
    tag: 'AI',
    tagColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    icon: Bot,
    title: 'Wise AI — Direct Gemini Integration',
    description:
      'Replaced the legacy AI gateway with a direct Gemini integration. Faster responses, lower latency, and support for BYOK (Bring Your Own Key).',
    highlights: [
      'BYOK Ollama → BYOK Gemini → WiseResume AI priority chain',
      '5-minute cooldown for AI connection tests to prevent abuse',
      'Structured JSON output from the interview simulator',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Design',
    tagColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    icon: Star,
    title: '3D Animated Landing Page Background',
    description:
      'The landing page now has a full-screen 3D animated sky background built with React Three Fiber. Stars in dark mode, floating clouds in both modes, and a cinematic theme-toggle transition.',
    highlights: [
      '3D clouds and stars rendered with React Three Fiber + Drei',
      'Camera parallax on mouse move for depth effect',
      'Mobile uses a lightweight CSS background — zero 3D overhead',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Portfolio',
    tagColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    icon: Globe,
    title: 'Portfolio Chat & Visitor Analytics',
    description:
      'Public portfolio pages now have a built-in AI chat widget and a visitors analytics panel for portfolio owners.',
    highlights: [
      'AI-powered chat on every public portfolio page',
      '5-message visitor limit for fallback (no-key) sessions',
      'Portfolio view count and live visitor stats for owners',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Features',
    tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    icon: BarChart3,
    title: 'Company Briefing Tool',
    description:
      'Prepare for any interview with a deep-research Company Briefing. Search by company name or paste a job description to get a full brief with competitors, tech stack, and workplace insights.',
    highlights: [
      'Powered by Gemini 2.5 Pro for deep research',
      'Covers products, tech stack, culture, and Glassdoor-style insights',
      'Export as a beautifully formatted PDF with one click',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Features',
    tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    icon: Wand2,
    title: 'Smart Tailoring & AI Studio',
    description:
      'AI Studio is the new hub for all AI-powered career tools. Smart tailoring now shows a before/after comparison and raises your ATS match score with precision.',
    highlights: [
      'Paste any job description — get a tailored resume in 30 seconds',
      'Before/after comparison shows exactly what changed',
      'Dedicated AI Studio page consolidating all AI tools',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Interview',
    tagColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    icon: Mic,
    title: 'Voice Interview Coach',
    description:
      'Practice real interviews with AI that listens to your spoken answers, scores you, and gives specific improvement tips for each response.',
    highlights: [
      'Real-time voice recognition — just speak naturally',
      'AI scores each answer with strengths and improvements',
      'Session history and overall performance assessment',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Core',
    tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    icon: FileText,
    title: 'Application Tracker (Kanban)',
    description:
      'Track every job application with a visual Kanban board. Drag cards across pipeline stages and see your full application funnel at a glance.',
    highlights: [
      'Kanban board with drag-and-drop pipeline stages',
      'Status history for each application',
      'Analytics showing your application funnel',
    ],
  },
  {
    date: 'February 2026',
    tag: 'Platform',
    tagColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    icon: Zap,
    title: 'Kinde Auth & Token Bridge',
    description:
      'Migrated from Supabase Auth to Kinde for authentication. A seamless token bridge ensures all existing RLS policies and edge functions continue to work without any disruption.',
    highlights: [
      'Google OAuth and email login via Kinde',
      'Deterministic UUID bridge for Supabase RLS compatibility',
      'Auto-refresh token every 50 minutes for uninterrupted sessions',
    ],
  },
  {
    date: 'February 2026',
    tag: 'Core',
    tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    icon: Sparkles,
    title: 'AI-Powered Resume Editor',
    description:
      'The core resume editor launched with live ATS scoring, one-click AI section enhancement, and multi-template PDF export.',
    highlights: [
      'Live ATS score updates as you type',
      'One-click AI enhancement for any section',
      'Multiple professional PDF templates',
    ],
  },
];

export default function WhatsNewPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { register: kindeRegister } = useKindeAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Simple nav header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-6xl mx-auto">
          <Link to="/" className="text-base font-bold text-primary tracking-tight hover:opacity-80 transition-opacity">
            WiseResume
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Pricing
            </Link>
            {isAuthenticated ? (
              <button
                onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}
                className="text-sm font-medium px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => { triggerHaptic.light(); kindeRegister(); }}
                className="text-sm font-medium px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get Started Free
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Changelog</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">What's New</h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Major updates, new features, and improvements to WiseResume — curated for you.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border sm:left-[23px]" aria-hidden="true" />

          <ol className="space-y-10">
            {changelog.map((entry, idx) => {
              const Icon = entry.icon;
              return (
                <li key={idx} className="relative flex gap-5 sm:gap-6">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-sm sm:w-12 sm:h-12">
                    <Icon className="w-4 h-4 text-muted-foreground sm:w-5 sm:h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${entry.tagColor}`}>
                        {entry.tag}
                      </span>
                      <span className="text-xs text-muted-foreground">{entry.date}</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold mb-2 leading-snug">{entry.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{entry.description}</p>
                    <ul className="space-y-1.5">
                      {entry.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Stay up to date</p>
          <h2 className="text-2xl font-bold mb-2">More is coming</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            We ship fast. Sign up to get early access to new features as soon as they launch.
          </p>
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm"
            >
              Go to Dashboard
            </button>
          ) : (
            <button
              onClick={() => kindeRegister()}
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm"
            >
              Get Started Free
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center text-sm text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-4 mb-2">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
        <p>© {new Date().getFullYear()} WiseResume. All rights reserved.</p>
      </footer>
    </div>
  );
}
