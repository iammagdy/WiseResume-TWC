import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import triggerHaptic from '@/lib/haptics';
import { toast } from 'sonner';
import {
  Sparkles, Shield, Zap, Globe, BarChart3, Mic, FileText,
  Bot, Wand2, Target, Star, Rocket, Clock, Smartphone,
  Gauge, BookOpen, QrCode, Trophy, Layers, PenLine, Palette,
} from 'lucide-react';

interface ChangelogEntry {
  date: string;
  tag: string;
  tagBg: string;
  tagText: string;
  iconBg: string;
  icon: React.ElementType;
  title: string;
  description: string;
  highlights: string[];
}

interface ComingSoonEntry {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  description: string;
}

const changelog: ChangelogEntry[] = [
  // ── April 2026 ──────────────────────────────────────────────
  {
    date: 'April 2026',
    tag: 'Performance',
    tagBg: 'bg-cyan-500/10',
    tagText: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-500/15',
    icon: Gauge,
    title: 'The App Feels Faster',
    description:
      'We made major speed improvements across the whole app. Pages load quicker, AI responds faster, and moving between tools feels instant — no waiting around.',
    highlights: [
      'Everything loads noticeably faster than before',
      'Smoother transitions when switching between pages',
      'Better performance on older devices and slower internet connections',
    ],
  },
  {
    date: 'April 2026',
    tag: 'New Feature',
    tagBg: 'bg-violet-500/10',
    tagText: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-500/15',
    icon: BookOpen,
    title: 'Browse Real Resume Examples',
    description:
      'Not sure how your resume should look? The new Examples Gallery shows real, anonymized resumes for different job types and industries — so you can see what works before you write.',
    highlights: [
      'Browse examples by job title or industry',
      'See how others structure their work history and skills',
      'Use any example as inspiration when building your own resume',
    ],
  },
  // ── March 2026 ──────────────────────────────────────────────
  {
    date: 'March 2026',
    tag: 'Smarter Scanning',
    tagBg: 'bg-rose-500/10',
    tagText: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-500/15',
    icon: Target,
    title: 'Your Resume is Read More Accurately',
    description:
      'We improved how WiseResume reads and understands your resume. It now correctly handles more formats, different date styles, and a wider range of section headings — so nothing important gets missed.',
    highlights: [
      'Work history, projects, volunteer work, and awards are all picked up automatically',
      'See exactly which keywords your resume has — and which ones are missing for each job',
      'A backup system keeps everything running even when AI services have downtime',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Security',
    tagBg: 'bg-emerald-500/10',
    tagText: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    icon: Shield,
    title: 'Your Account is More Secure',
    description:
      'We ran a thorough review of how we protect your account and data. Several improvements have been made behind the scenes to keep your information safe.',
    highlights: [
      'Stronger identity checks so only you can access your account',
      'Extra protections added to your public portfolio page',
      'Your login session stays active reliably, even with a spotty internet connection',
    ],
  },
  {
    date: 'March 2026',
    tag: 'AI',
    tagBg: 'bg-blue-500/10',
    tagText: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/15',
    icon: Bot,
    title: 'Faster, Smarter AI',
    description:
      'We upgraded the AI powering WiseResume. Suggestions, rewrites, and feedback now arrive faster and with noticeably better quality across every feature.',
    highlights: [
      'AI responses are quicker across the whole app',
      'Better results for resume rewrites, cover letters, and interview coaching',
      'Option to connect your own account for more AI usage per day',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Design',
    tagBg: 'bg-purple-500/10',
    tagText: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/15',
    icon: Star,
    title: 'A Fresh New Look',
    description:
      'WiseResume got a beautiful visual upgrade. The homepage now has a smooth animated background — stars at night, clouds during the day — that makes the app feel more alive and polished.',
    highlights: [
      'Animated sky effect that changes with light and dark mode',
      'Subtle depth as you move your mouse for a premium feel',
      'Lightweight on mobile — no extra battery drain',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Portfolio',
    tagBg: 'bg-teal-500/10',
    tagText: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-500/15',
    icon: Globe,
    title: 'See Who\'s Viewing Your Portfolio',
    description:
      'Your public portfolio page just got smarter. Visitors can now chat with an AI assistant that knows your background, and you can see how many people have visited your page.',
    highlights: [
      'Anyone who visits your portfolio can ask it questions about you',
      'See your total view count right from your portfolio dashboard',
      'A great way to impress recruiters and stand out from other candidates',
    ],
  },
  {
    date: 'March 2026',
    tag: 'New Feature',
    tagBg: 'bg-amber-500/10',
    tagText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    icon: BarChart3,
    title: 'Research Any Company in Seconds',
    description:
      'Walking into an interview unprepared is risky. The new Company Briefing tool gives you a complete overview of any company — their story, culture, what employees say, and more.',
    highlights: [
      'Search any company by name, or paste a job posting to get started',
      'Get insights on company culture, products, and what to expect in the role',
      'Export a clean PDF summary to review before your interview',
    ],
  },
  {
    date: 'March 2026',
    tag: 'AI Tools',
    tagBg: 'bg-amber-500/10',
    tagText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    icon: Wand2,
    title: 'Tailor Your Resume for Any Job in 30 Seconds',
    description:
      'Paste a job description and watch AI rewrite your resume to match it — instantly. A new AI hub brings all your career tools together in one convenient place.',
    highlights: [
      'Paste any job posting to get a version of your resume tailored specifically for it',
      'See a side-by-side before-and-after so you can review every change',
      'All AI tools — resume, cover letter, interview prep — now live in one place',
    ],
  },
  {
    date: 'March 2026',
    tag: 'Interview Prep',
    tagBg: 'bg-orange-500/10',
    tagText: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-500/15',
    icon: Mic,
    title: 'Practice Interviews Out Loud',
    description:
      'The best way to prepare for an interview is to actually practice speaking. Our Interview Coach listens to your answers and gives you honest, specific feedback on what worked and what to improve.',
    highlights: [
      'Just speak naturally — no typing needed, AI listens in real time',
      'Get a score and detailed tips after every answer',
      'Track your improvement across multiple practice sessions',
    ],
  },
  {
    date: 'March 2026',
    tag: 'New Feature',
    tagBg: 'bg-indigo-500/10',
    tagText: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/15',
    icon: FileText,
    title: 'Track Every Job You Apply To',
    description:
      'Staying organized during a job search can be overwhelming. The Application Tracker gives you a visual board where every application has a place — so nothing slips through the cracks.',
    highlights: [
      'Visual board showing all your applications at a glance',
      'Move applications through stages: Applied, Interview, Offer, and more',
      'See your whole job search at once from a single dashboard',
    ],
  },
  // ── February 2026 ───────────────────────────────────────────
  {
    date: 'February 2026',
    tag: 'Sign-In',
    tagBg: 'bg-sky-500/10',
    tagText: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-500/15',
    icon: Zap,
    title: 'Sign In with Google or Email',
    description:
      'We upgraded how you sign into WiseResume. It\'s now faster, more reliable, and works with your Google account or any email address.',
    highlights: [
      'Sign in with Google in one tap, or use your email address',
      'Your session stays active automatically — no repeated logins',
      'All your existing data stays safe and exactly where you left it',
    ],
  },
  // ── January 2026 ────────────────────────────────────────────
  {
    date: 'January 2026',
    tag: 'New Feature',
    tagBg: 'bg-indigo-500/10',
    tagText: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/15',
    icon: QrCode,
    title: 'Share Your Resume with a QR Code',
    description:
      'Generate a scannable QR code for your resume in seconds. Perfect for networking events, business cards, or attaching to a printed copy of your CV.',
    highlights: [
      'One-tap QR code generation from any resume',
      'Scanning it opens your live portfolio or resume PDF',
      'Download and print your QR code to use anywhere',
    ],
  },
  {
    date: 'January 2026',
    tag: 'Motivation',
    tagBg: 'bg-amber-500/10',
    tagText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    icon: Trophy,
    title: 'Track Your Progress with Achievements',
    description:
      'Job searching takes time — so we added Achievements to keep you motivated and moving forward. Earn milestones as you build your profile and apply to jobs.',
    highlights: [
      'Earn badges for completing your resume, adding skills, and more',
      'See your overall profile completion score at a glance',
      'A more complete profile leads to better AI suggestions throughout the app',
    ],
  },
  // ── December 2025 ───────────────────────────────────────────
  {
    date: 'December 2025',
    tag: 'Portfolio',
    tagBg: 'bg-teal-500/10',
    tagText: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-500/15',
    icon: Globe,
    title: 'Your Resume as a Beautiful Website',
    description:
      'Turn your resume into a public portfolio site with a shareable link — no design skills needed. Perfect for sharing with recruiters or adding to your email signature.',
    highlights: [
      'Automatically built from your resume — always stays up to date',
      'Choose from multiple layouts and color themes',
      'Share your link anywhere: email, LinkedIn, WhatsApp, or your business card',
    ],
  },
  {
    date: 'December 2025',
    tag: 'Design',
    tagBg: 'bg-purple-500/10',
    tagText: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/15',
    icon: Layers,
    title: 'Professional Resume Templates',
    description:
      'Not happy with how your resume looks? Pick from a set of professionally designed templates that make your experience shine — and switch between them in one click.',
    highlights: [
      'Multiple styles to suit different industries and career stages',
      'Switch templates any time without losing your content',
      'Every template is designed to pass recruiter screening and look great as a PDF',
    ],
  },
  // ── November 2025 ───────────────────────────────────────────
  {
    date: 'November 2025',
    tag: 'New Feature',
    tagBg: 'bg-rose-500/10',
    tagText: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-500/15',
    icon: PenLine,
    title: 'Write a Cover Letter in Minutes',
    description:
      'Getting a great cover letter used to take hours. Now AI writes a personalized one for you, matched to the job you\'re applying for — ready in under a minute.',
    highlights: [
      'Tailored to the job description you paste in',
      'Matches the tone and keywords recruiters are looking for',
      'Edit it to your liking and download as a PDF',
    ],
  },
  {
    date: 'November 2025',
    tag: 'Design',
    tagBg: 'bg-purple-500/10',
    tagText: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/15',
    icon: Palette,
    title: 'Dark Mode & Custom Themes',
    description:
      'Your eyes will thank you. WiseResume now supports dark mode and a selection of color themes so the app looks and feels exactly how you like it.',
    highlights: [
      'Switch between light and dark mode with one tap',
      'Your theme choice carries across the entire app',
      'Your preference is remembered automatically on every device',
    ],
  },
  // ── October 2025 ────────────────────────────────────────────
  {
    date: 'October 2025',
    tag: 'Launch',
    tagBg: 'bg-primary/10',
    tagText: 'text-primary',
    iconBg: 'bg-primary/15',
    icon: Sparkles,
    title: 'WiseResume Launches!',
    description:
      'The first version of WiseResume goes live! Build and improve your resume with AI guidance, check how well it matches any job, and export a polished PDF — all in one place.',
    highlights: [
      'Live score that shows how well your resume fits a job as you write',
      'One click to improve any section with AI',
      'Professional PDF export in multiple styles',
    ],
  },
];

const comingSoon: ComingSoonEntry[] = [
  {
    icon: Smartphone,
    iconBg: 'bg-emerald-500/10',
    title: 'Mobile App',
    description: 'Take your job search anywhere with a native mobile app for iOS and Android.',
  },
  {
    icon: Rocket,
    iconBg: 'bg-amber-500/10',
    title: 'One-Click Apply Assistant',
    description: 'Apply to jobs faster with an assistant that auto-fills applications using your resume data.',
  },
];

export default function WhatsNewPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { register: kindeRegister } = useKindeAuth();

  const handleGetStarted = () => {
    triggerHaptic.light();
    void Promise.resolve(kindeRegister()).catch(() => {
      toast.error('Could not open sign-up. Please try again.');
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-6xl mx-auto">
          <Link to="/" className="text-base font-bold text-primary tracking-tight hover:opacity-80 transition-opacity">
            WiseResume
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => { triggerHaptic.light(); navigate('/dashboard'); }}
                className="text-sm font-medium px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={handleGetStarted}
                className="text-sm font-medium px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get Started Free
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Always improving
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">What's New</h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
            We're constantly adding new features and making WiseResume better. Here's everything that's been added recently.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border sm:left-[23px]" aria-hidden="true" />

          <ol className="space-y-8">
            {changelog.map((entry, idx) => {
              const Icon = entry.icon;
              return (
                <li key={idx} className="relative flex gap-5 sm:gap-6">
                  {/* Timeline icon dot */}
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${entry.iconBg} border border-border flex items-center justify-center shadow-sm sm:w-12 sm:h-12`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${entry.tagText}`} />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 min-w-0 bg-card border border-border rounded-2xl px-5 py-4 shadow-sm mb-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${entry.tagBg} ${entry.tagText}`}>
                        {entry.tag}
                      </span>
                      <span className="text-xs text-muted-foreground">{entry.date}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground/60 font-medium hidden sm:block">🚀 Shipped</span>
                    </div>
                    <h2 className="text-base font-bold mb-1.5 leading-snug text-foreground">{entry.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{entry.description}</p>
                    <ul className="space-y-1.5">
                      {entry.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
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

        {/* Coming Soon section */}
        <div className="mt-14">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">🔜 Coming Soon</h2>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {comingSoon.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 p-4 rounded-xl border border-dashed border-border bg-muted/30"
                >
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-0.5">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 rounded-2xl border border-border bg-card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">We ship new features every week</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto leading-relaxed">
            Sign up free to use all of these features and be the first to try what's coming next.
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
              onClick={handleGetStarted}
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
          <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
        <p>© {new Date().getFullYear()} WiseResume. All rights reserved.</p>
      </footer>
    </div>
  );
}
