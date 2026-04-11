import { useState, useEffect, useRef, lazy, Suspense, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Wand2,
  Target,
  Lightbulb,
  TrendingUp,
  Mic,
  Shield,
  Linkedin,
  GitCompareArrows,
  FileText,
  UserCheck,
  FileSearch,
  Send,
  Building2,
  FileSignature,
  FileOutput,
  ArrowRight,
  X,
  Clock,
  QrCode,
  Layers,
  ScanLine,
  DollarSign,
  XCircle,
  FileCheck,
  Star,
  Mail,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AIEngineBadge } from '@/components/editor/ai/AIEngineBadge';
import { AICreditsIndicator } from '@/components/editor/ai/AICreditsIndicator';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useResumeStore } from '@/store/resumeStore';
import { useResume, useResumes, dbToResumeData } from '@/hooks/useResumes';
import { calcOverallScore } from '@/lib/resumeCompletionRules';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsStore } from '@/store/settingsStore';
import { AIStudioTourModal } from '@/components/ai-studio/AIStudioTourModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { CompanyBriefingSheet } from '@/components/interview/CompanyBriefingSheet';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { AIHealthBadge } from '@/components/ai/AIHealthBadge';
import { Badge } from '@/components/ui/badge';
import { SalaryNegotiationSheet } from '@/components/ai-studio/SalaryNegotiationSheet';
import { JobRejectionSheet } from '@/components/ai-studio/JobRejectionSheet';
import { ReferenceLetterSheet } from '@/components/ai-studio/ReferenceLetterSheet';
import { PersonalBrandingSheet } from '@/components/ai-studio/PersonalBrandingSheet';
import { ColdEmailSheet } from '@/components/ai-studio/ColdEmailSheet';
import { SkillsGapSheet } from '@/components/ai-studio/SkillsGapSheet';
import { PortfolioBioSheet } from '@/components/ai-studio/PortfolioBioSheet';

// Lazy-loaded sheets
const TailorSheet = lazy(() => import('@/components/editor/TailorSheet').then((m) => ({ default: m.TailorSheet })));
const JobAnalysisSheet = lazy(() => import('@/components/editor/JobAnalysisSheet').then((m) => ({ default: m.JobAnalysisSheet })));
const RecruiterSimSheet = lazy(() => import('@/components/editor/ai/RecruiterSimSheet').then((m) => ({ default: m.RecruiterSimSheet })));
const AIDetectorSheet = lazy(() => import('@/components/editor/ai/AIDetectorSheet').then((m) => ({ default: m.AIDetectorSheet })));
const LinkedInOptimizerSheet = lazy(() => import('@/components/editor/ai/LinkedInOptimizerSheet').then((m) => ({ default: m.LinkedInOptimizerSheet })));
const OnePageWizardSheet = lazy(() => import('@/components/editor/ai/OnePageWizardSheet').then((m) => ({ default: m.OnePageWizardSheet })));
const AgenticChatSheet = lazy(() => import('@/components/editor/AgenticChatSheet').then((m) => ({ default: m.AgenticChatSheet })));
const CareerPathSheet = lazy(() => import('@/components/editor/CareerPathSheet').then((m) => ({ default: m.CareerPathSheet })));
const AIEnhanceSheet = lazy(() => import('@/components/editor/ai/AIEnhanceSheet').then((m) => ({ default: m.AIEnhanceSheet })));
const ResumeABCompareSheet = lazy(() => import('@/components/ai-studio/ResumeABCompareSheet'));

const SUGGESTIONS = [
  'Write a summary for a software engineer',
  'Add metrics to my achievements',
  'Add skills for a React developer',
  'What can I improve?',
];

const PLACEHOLDER_EXAMPLES = [
  'Ask AI to edit your resume...',
  'Try: "Write a summary for a PM"',
  'Try: "Add metrics to my bullets"',
];

const PRO_TIPS = [
  'Paste a job URL or description to get a personalized match score and tailoring suggestions.',
  'Use Smart Tailor before applying — it adapts your resume keywords to match the job description.',
  'The A/B Compare tool lets you score two versions of your resume side-by-side.',
];

const FEATURED_TOOL_IDS = new Set(['tailor', 'job-match', 'enhance']);

// New tools launch date — "New" badge shows for 30 days after this date
const NEW_TOOLS_LAUNCH_DATE = new Date('2026-04-11');
const NEW_TOOL_IDS = new Set([
  'salary-negotiation', 'job-rejection', 'reference-letter',
  'personal-branding', 'cold-email', 'skills-gap', 'portfolio-bio',
]);

function isNewTool(id: string): boolean {
  if (!NEW_TOOL_IDS.has(id)) return false;
  const daysSinceLaunch = (Date.now() - NEW_TOOLS_LAUNCH_DATE.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLaunch <= 30;
}

const RECENT_TOOLS_KEY = 'wr-recent-ai-tools';
const TIP_DISMISSED_KEY = 'wr-ai-tip-dismissed';

function getRecentToolIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_TOOLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentToolId(id: string) {
  const recent = getRecentToolIds().filter((t) => t !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(recent.slice(0, 3)));
}

interface ToolEntry {
  id: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  cost: string;
  navigate?: string;
}

const toolCategories: { title: string; description: string; tools: ToolEntry[] }[] = [
  {
    title: 'Resume & Application',
    description: 'Optimize & improve your resume',
    tools: [
      { id: 'tailor', icon: Wand2, label: 'Smart Tailor', desc: 'Adapt to job descriptions', color: 'text-primary', cost: 'tailor' },
      { id: 'enhance', icon: Sparkles, label: 'Enhance', desc: 'Improve writing', color: 'text-cyan-500', cost: 'enhance' },
      { id: 'onepage', icon: FileText, label: '1-Page Wizard', desc: 'Condense resume', color: 'text-amber-500', cost: 'one-page' },
      { id: 'humanizer', icon: Shield, label: 'Humanize', desc: 'AI detection fix', color: 'text-violet-500', cost: 'detect-humanize' },
      { id: 'job-match', icon: Target, label: 'Job Match', desc: 'ATS compatibility score', color: 'text-green-500', cost: 'score' },
      { id: 'ab-compare', icon: GitCompareArrows, label: 'A/B Compare', desc: 'Score two resumes', color: 'text-indigo-500', cost: 'score' },
      { id: 'recruiter', icon: UserCheck, label: 'Recruiter Sim', desc: 'Simulate review', color: 'text-rose-500', cost: 'recruiter-sim' },
      { id: 'skills-gap', icon: TrendingUp, label: 'Skills Gap', desc: 'Identify missing skills', color: 'text-cyan-500', cost: 'skills-gap' },
    ],
  },
  {
    title: 'Career & Outreach',
    description: 'Plan your career and reach out to employers',
    tools: [
      { id: 'career', icon: TrendingUp, label: 'Career Plan', desc: 'Path advisor', color: 'text-emerald-500', cost: 'career-assessment', navigate: '/career' },
      { id: 'interview', icon: Mic, label: 'Interview Prep', desc: 'Practice Q&A', color: 'text-orange-500', cost: 'interview', navigate: '/interview' },
      { id: 'company-briefing', icon: Building2, label: 'Company Briefing', desc: 'Company research', color: 'text-teal-500', cost: 'company_briefing' },
      { id: 'salary-negotiation', icon: DollarSign, label: 'Salary Coach', desc: 'Negotiation scripts', color: 'text-green-500', cost: 'salary-negotiation' },
      { id: 'cold-email', icon: Mail, label: 'Cold Email', desc: 'Recruiter outreach', color: 'text-indigo-500', cost: 'cold-email' },
      { id: 'job-rejection', icon: XCircle, label: 'Rejection Analyzer', desc: 'Learn from rejection', color: 'text-rose-500', cost: 'job-rejection' },
    ],
  },
  {
    title: 'Personal Brand',
    description: 'Build your professional presence',
    tools: [
      { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', desc: 'Profile optimizer', color: 'text-blue-500', cost: 'linkedin' },
      { id: 'personal-branding', icon: Star, label: 'Brand Statement', desc: '3 style variants', color: 'text-amber-500', cost: 'personal-branding' },
      { id: 'portfolio-bio', icon: BookOpen, label: 'Portfolio Bio', desc: 'For your portfolio', color: 'text-violet-500', cost: 'portfolio-bio' },
      { id: 'cover-letters', icon: FileSignature, label: 'Cover Letters', desc: 'AI-generated letters', color: 'text-sky-500', cost: 'cover-letter', navigate: '/cover-letters' },
      { id: 'resignation-letters', icon: FileOutput, label: 'Resignation Letter', desc: 'Leave professionally', color: 'text-pink-500', cost: 'cover-letter', navigate: '/resignation-letters' },
      { id: 'reference-letter', icon: FileCheck, label: 'Reference Letter', desc: 'For your referee', color: 'text-sky-500', cost: 'reference-letter' },
    ],
  },
];

const qrTools: ToolEntry[] = [
  { id: 'qr-code', icon: QrCode, label: 'QR Generator', desc: 'Custom QR codes', color: 'text-primary', cost: 'free', navigate: '/qr-code' },
  { id: 'qr-batch', icon: Layers, label: 'Batch QR', desc: 'Bulk CSV → ZIP', color: 'text-amber-500', cost: 'free', navigate: '/qr-batch' },
  { id: 'qr-scan', icon: ScanLine, label: 'QR Scanner', desc: 'Decode from image', color: 'text-emerald-500', cost: 'free', navigate: '/qr-scan' },
];

// Flat lookup for recent tools
const allTools = [...toolCategories.flatMap((c) => c.tools), ...qrTools];

export default function AIStudioPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentResumeId = useResumeStore((s) => s.currentResumeId);
  const { data: resumeData } = useResume(currentResumeId);
  const hasSeenAIStudioTour = useSettingsStore((s) => s.hasSeenAIStudioTour);
  const setHasSeenAIStudioTour = useSettingsStore((s) => s.setHasSeenAIStudioTour);
  const isFirstVisit = !hasSeenAIStudioTour;

  // Cycling placeholder — pauses when tab hidden
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => { interval = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length), 3000); };
    const stop = () => { if (interval) { clearInterval(interval); interval = null; } };
    const onVisChange = () => { document.visibilityState === 'visible' ? start() : stop(); };
    start();
    document.addEventListener('visibilitychange', onVisChange);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisChange); };
  }, []);

  // Recent tools
  const [recentIds, setRecentIds] = useState(getRecentToolIds);
  const recentTools = useMemo(() => recentIds.map((id) => allTools.find((t) => t.id === id)).filter(Boolean) as ToolEntry[], [recentIds]);

  // Dismissible pro tip
  const [tipDismissed, setTipDismissed] = useState(() => localStorage.getItem(TIP_DISMISSED_KEY) === '1');
  const tipIdx = useMemo(() => new Date().getDate() % PRO_TIPS.length, []);

  // QR section collapse
  const [qrExpanded, setQrExpanded] = useState(false);

  // Sheet states
  const [showChat, setShowChat] = useState(false);
  const [showTailor, setShowTailor] = useState(false);
  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showRecruiterSim, setShowRecruiterSim] = useState(false);
  const [showAIDetector, setShowAIDetector] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [showOnePage, setShowOnePage] = useState(false);
  const [showCareerPath, setShowCareerPath] = useState(false);
  const [showEnhance, setShowEnhance] = useState(false);
  const [showABCompare, setShowABCompare] = useState(false);
  const [showCompanyBriefing, setShowCompanyBriefing] = useState(false);
  // New tool sheets
  const [showSalaryNegotiation, setShowSalaryNegotiation] = useState(false);
  const [showJobRejection, setShowJobRejection] = useState(false);
  const [showReferenceLetter, setShowReferenceLetter] = useState(false);
  const [showPersonalBranding, setShowPersonalBranding] = useState(false);
  const [showColdEmail, setShowColdEmail] = useState(false);
  const [showSkillsGap, setShowSkillsGap] = useState(false);
  const [showPortfolioBio, setShowPortfolioBio] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkHandled = useRef(false);

  // Deep-link: open tool from ?tool= query param
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const tool = searchParams.get('tool');
    if (!tool) return;
    deepLinkHandled.current = true;
    const toolMap: Record<string, () => void> = {
      'tailor': () => setShowTailor(true),
      'job-match': () => setShowJobSheet(true),
      'ab-compare': () => setShowABCompare(true),
      'enhance': () => setShowEnhance(true),
      'humanizer': () => setShowAIDetector(true),
      'linkedin': () => setShowLinkedIn(true),
      'onepage': () => setShowOnePage(true),
      'recruiter': () => setShowRecruiterSim(true),
      'career': () => setShowCareerPath(true),
      'chat': () => setShowChat(true),
      'company-briefing': () => setShowCompanyBriefing(true),
      'cover-letters': () => navigate('/cover-letters'),
      'resignation-letters': () => navigate('/resignation-letters'),
      'salary-negotiation': () => setShowSalaryNegotiation(true),
      'job-rejection': () => setShowJobRejection(true),
      'reference-letter': () => setShowReferenceLetter(true),
      'personal-branding': () => setShowPersonalBranding(true),
      'cold-email': () => setShowColdEmail(true),
      'skills-gap': () => setShowSkillsGap(true),
      'portfolio-bio': () => setShowPortfolioBio(true),
    };
    toolMap[tool]?.();
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, navigate]);

  const [chatInitialMessage, setChatInitialMessage] = useState('');

  const openChatWithMessage = useCallback((msg: string) => {
    haptics.light();
    if (!user) { setShowChat(true); return; }
    if (!currentResumeId) { toast.info('Select a resume first to chat with Wise AI'); return; }
    setChatInitialMessage(msg);
    setShowChat(true);
  }, [user, currentResumeId]);

  const [showResumePicker, setShowResumePicker] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const { data: allResumes } = useResumes({ select: (data) => data.slice(0, 5) });

  const requireResume = useCallback((action: () => void) => {
    if (!currentResumeId) {
      if (allResumes && allResumes.length > 0) {
        pendingActionRef.current = action;
        setShowResumePicker(true);
      } else {
        toast.info('Create a resume first to use this tool', {
          action: { label: 'Create', onClick: () => navigate('/dashboard?action=create') }
        });
      }
      return;
    }
    haptics.medium();
    action();
  }, [currentResumeId, navigate, allResumes]);

  const handleToolAction = useCallback((tool: ToolEntry) => {
    saveRecentToolId(tool.id);
    setRecentIds(getRecentToolIds());

    if (tool.navigate) { haptics.medium(); navigate(tool.navigate); return; }
    const action = () => {
      switch (tool.id) {
        case 'tailor': setShowTailor(true); break;
        case 'enhance': setShowEnhance(true); break;
        case 'onepage': setShowOnePage(true); break;
        case 'humanizer': setShowAIDetector(true); break;
        case 'job-match': setShowJobSheet(true); break;
        case 'ab-compare': setShowABCompare(true); break;
        case 'recruiter': setShowRecruiterSim(true); break;
        case 'linkedin': setShowLinkedIn(true); break;
        case 'company-briefing': setShowCompanyBriefing(true); break;
        case 'career': setShowCareerPath(true); break;
        case 'salary-negotiation': setShowSalaryNegotiation(true); break;
        case 'job-rejection': setShowJobRejection(true); break;
        case 'reference-letter': setShowReferenceLetter(true); break;
        case 'personal-branding': setShowPersonalBranding(true); break;
        case 'cold-email': setShowColdEmail(true); break;
        case 'skills-gap': setShowSkillsGap(true); break;
        case 'portfolio-bio': setShowPortfolioBio(true); break;
      }
    };
    requireResume(action);
  }, [navigate, requireResume]);

  const dismissTip = useCallback(() => {
    setTipDismissed(true);
    localStorage.setItem(TIP_DISMISSED_KEY, '1');
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-28 sm:pb-20 lg:pb-6">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-page-title">AI Studio</h1>
          </div>
          <div className="flex items-center gap-2">
            <AIHealthBadge />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div><AICreditsIndicator /></div>
                </TooltipTrigger>
                <TooltipContent>AI Credits Remaining</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="mt-1.5">
          <AIEngineBadge showSettingsLink />
        </div>
      </header>

      {/* Resume Context Bar */}
      <div className="px-4 py-2">
        {currentResumeId && resumeData ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border">
            <FileSearch className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm flex-1 break-words leading-snug" title={resumeData.title}>
              Working on: <span className="font-medium">{resumeData.title}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 min-h-[44px] text-xs text-primary"
              onClick={() => {
                if (allResumes && allResumes.length > 0) {
                  pendingActionRef.current = null;
                  setShowResumePicker(true);
                } else {
                  navigate('/dashboard');
                }
              }}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 justify-start gap-2"
              onClick={() => {
                if (allResumes && allResumes.length > 0) {
                  pendingActionRef.current = null;
                  setShowResumePicker(true);
                } else {
                  navigate('/dashboard');
                }
              }}
            >
              <FileSearch className="w-4 h-4" />
              Select a resume
            </Button>
            <Button className="shrink-0 gradient-primary" onClick={() => navigate('/dashboard?action=create')}>
              Create
            </Button>
          </div>
        )}
      </div>

      {/* Wise AI Chat Section */}
      <div className="px-4 pb-2">
        <div
          onClick={() => {
            haptics.light();
            if (!user) { setShowChat(true); return; }
            if (!currentResumeId) { toast.info('Select a resume first to chat with Wise AI'); return; }
            setShowChat(true);
          }}
          className={cn(
            "w-full p-4 rounded-2xl bg-card border border-primary/20 shadow-soft hover:border-primary/40 active:scale-[0.98] transition-all touch-manipulation cursor-pointer",
            isFirstVisit && 'ring-2 ring-primary/40 animate-[pulse_1.5s_ease-in-out_3]'
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-semibold text-sm">Ask Wise AI anything about your resume</p>
              <p className="text-muted-foreground truncate mt-1 text-sm">{PLACEHOLDER_EXAMPLES[placeholderIdx]}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); openChatWithMessage(s); }}
                className="px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs text-muted-foreground hover:bg-primary/10 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tools */}
      {recentTools.length > 0 && (
        <div className="px-4 pb-4">
          <div className="mb-2 px-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">Recent</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {recentTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolAction(tool)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:border-primary/20 active:scale-95 transition-all touch-manipulation shrink-0"
              >
                <tool.icon className={cn('w-4 h-4', tool.color)} />
                <span className="text-sm font-medium whitespace-nowrap">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recommended for You */}
      {(() => {
        const recommended: ToolEntry[] = [];
        const resumeInfo = resumeData ? dbToResumeData(resumeData) : null;
        const hasTailored = allResumes?.some((r) => r.parent_resume_id);

        if (!hasTailored) {
          const tailor = allTools.find((t) => t.id === 'tailor');
          if (tailor) recommended.push(tailor);
        }
        if (resumeInfo && calcOverallScore(resumeInfo) < 40) {
          const enhance = allTools.find((t) => t.id === 'enhance');
          if (enhance) recommended.push(enhance);
        }
        const interview = allTools.find((t) => t.id === 'interview');
        if (interview && recommended.length < 3) recommended.push(interview);

        if (recommended.length === 0) return null;

        return (
          <div className="px-4 pb-4">
            <div className="mb-2 px-1">
              <h2 className="text-base sm:text-sm font-semibold">Recommended for you</h2>
              <p className="text-xs text-muted-foreground">Based on your resume progress</p>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {recommended.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolAction(tool)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06] active:scale-95 transition-all touch-manipulation shrink-0 min-h-[56px]"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <tool.icon className={cn('w-4.5 h-4.5', tool.color)} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium block">{tool.label}</span>
                    <span className="text-[11px] text-muted-foreground">{tool.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* All Tools — Organized by Category */}
      {toolCategories.map((category) => (
        <div key={category.title} className="px-4 pb-4">
          {/* Section header with tool count */}
          <div className="mb-3 px-1 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-sm font-semibold">{category.title}</h2>
                <span className="text-xs text-muted-foreground">· {category.tools.length} tools</span>
              </div>
              <p className="text-xs text-muted-foreground">{category.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {category.tools.map((tool) => {
              const isFeatured = FEATURED_TOOL_IDS.has(tool.id);
              const showNew = isNewTool(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolAction(tool)}
                  className={cn(
                    "p-3 bg-card border active:scale-95 transition-all touch-manipulation min-h-[100px] relative flex flex-col items-center justify-center gap-1.5 text-center rounded-2xl",
                    isFeatured ? 'border-primary/20 shadow-soft-sm' : 'border-border hover:border-primary/20'
                  )}
                >
                  {isFeatured && !showNew && (
                    <Badge variant="secondary" className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0 h-4 font-medium">
                      Popular
                    </Badge>
                  )}
                  {showNew && (
                    <Badge className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0 h-4 font-medium bg-green-500 hover:bg-green-500 text-white">
                      New
                    </Badge>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <tool.icon className={cn('w-5 h-5', tool.color)} />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium block">{tool.label}</span>
                    <span className="text-xs text-muted-foreground leading-tight block">{tool.desc}</span>
                    <AICostBadge operation={tool.cost} className="mt-1" />
                  </div>
                  {tool.navigate && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground/50 absolute top-2 right-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* QR & Sharing — Collapsible "More Tools" */}
      <div className="px-4 pb-4">
        <button
          onClick={() => { setQrExpanded(v => !v); haptics.light(); }}
          className="w-full flex items-center justify-between px-1 mb-2 group"
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                QR & Sharing
              </h2>
              <span className="text-xs text-muted-foreground">· {qrTools.length} tools</span>
            </div>
            <p className="text-xs text-muted-foreground text-left">Generate & scan QR codes</p>
          </div>
          {qrExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {qrExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {qrTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolAction(tool)}
                className="p-3 bg-card border border-border hover:border-primary/20 active:scale-95 transition-all touch-manipulation min-h-[100px] relative flex flex-col items-center justify-center gap-1.5 text-center rounded-2xl"
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <tool.icon className={cn('w-5 h-5', tool.color)} />
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium block">{tool.label}</span>
                  <span className="text-xs text-muted-foreground leading-tight block">{tool.desc}</span>
                  <AICostBadge operation={tool.cost} className="mt-1" />
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50 absolute top-2 right-2" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pro Tip - dismissible & rotating */}
      {!tipDismissed && (
        <div className="px-4 pb-6">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 relative">
            <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground pr-6">
              <span className="text-foreground font-medium">Pro tip:</span> {PRO_TIPS[tipIdx]}
            </p>
            <button
              onClick={dismissTip}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors touch-manipulation"
              aria-label="Dismiss tip"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Resume Picker Sheet */}
      {showResumePicker && (
        <Sheet open={showResumePicker} onOpenChange={(open) => { if (!open) { setShowResumePicker(false); pendingActionRef.current = null; } }}>
          <SheetContent side="bottom" className="max-h-[60dvh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Which resume do you want to use?</SheetTitle>
            </SheetHeader>
            <div className="space-y-2 py-3">
              {allResumes?.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    const setId = useResumeStore.getState().setCurrentResumeId;
                    const setResume = useResumeStore.getState().setCurrentResume;
                    setId(r.id);
                    setResume(dbToResumeData(r));
                    setShowResumePicker(false);
                    haptics.medium();
                    const action = pendingActionRef.current;
                    pendingActionRef.current = null;
                    if (action) setTimeout(action, 100);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-muted/60 transition-colors"
                >
                  <p className="font-medium text-sm truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {r.target_job_title || 'No target role'}
                  </p>
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setShowResumePicker(false); navigate('/dashboard'); }}>
              View All Resumes
            </Button>
          </SheetContent>
        </Sheet>
      )}

      {/* Sheets */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          {showChat && <AgenticChatSheet open={showChat} onOpenChange={(o) => { setShowChat(o); if (!o) setChatInitialMessage(''); }} initialMessage={chatInitialMessage} />}
          {showTailor && <TailorSheet open={showTailor} onOpenChange={setShowTailor} />}
          {showJobSheet && <JobAnalysisSheet open={showJobSheet} onOpenChange={setShowJobSheet} />}
          {showRecruiterSim && <RecruiterSimSheet open={showRecruiterSim} onOpenChange={setShowRecruiterSim} />}
          {showAIDetector && <AIDetectorSheet open={showAIDetector} onOpenChange={setShowAIDetector} />}
          {showLinkedIn && <LinkedInOptimizerSheet open={showLinkedIn} onOpenChange={setShowLinkedIn} />}
          {showOnePage && <OnePageWizardSheet open={showOnePage} onOpenChange={setShowOnePage} />}
          {showCareerPath && <CareerPathSheet open={showCareerPath} onOpenChange={setShowCareerPath} />}
          {showEnhance && <AIEnhanceSheet open={showEnhance} onOpenChange={setShowEnhance} />}
          {showABCompare && <ResumeABCompareSheet open={showABCompare} onOpenChange={setShowABCompare} />}
          {showCompanyBriefing && <CompanyBriefingSheet open={showCompanyBriefing} onOpenChange={setShowCompanyBriefing} jobDescription="" resumeData={resumeData ? { summary: resumeData.summary ?? undefined, experience: resumeData.experience as any ?? undefined, skills: resumeData.skills as any ?? undefined } : undefined} />}
        </Suspense>
      </ErrorBoundary>

      {/* New tool sheets */}
      {showSalaryNegotiation && <SalaryNegotiationSheet open={showSalaryNegotiation} onOpenChange={setShowSalaryNegotiation} />}
      {showJobRejection && <JobRejectionSheet open={showJobRejection} onOpenChange={setShowJobRejection} />}
      {showReferenceLetter && <ReferenceLetterSheet open={showReferenceLetter} onOpenChange={setShowReferenceLetter} />}
      {showPersonalBranding && <PersonalBrandingSheet open={showPersonalBranding} onOpenChange={setShowPersonalBranding} />}
      {showColdEmail && <ColdEmailSheet open={showColdEmail} onOpenChange={setShowColdEmail} />}
      {showSkillsGap && <SkillsGapSheet open={showSkillsGap} onOpenChange={setShowSkillsGap} />}
      {showPortfolioBio && <PortfolioBioSheet open={showPortfolioBio} onOpenChange={setShowPortfolioBio} />}

      {/* Onboarding Tour — auto-dismiss inline banner */}
      {isFirstVisit && (
        <div className="fixed bottom-24 sm:bottom-20 left-4 right-4 z-40 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-primary/20 shadow-lg">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-foreground flex-1">Welcome to <span className="font-semibold">AI Studio</span> — tap any tool to supercharge your resume.</p>
            <Button size="sm" variant="ghost" className="shrink-0 min-h-[44px] text-xs" onClick={() => setHasSeenAIStudioTour(true)}>Got it</Button>
          </div>
        </div>
      )}
    </div>
  );
}
