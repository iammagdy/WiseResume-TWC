import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  Target,
  SpellCheck,
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
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { AIEngineBadge } from '@/components/editor/ai/AIEngineBadge';
import { AICreditsIndicator } from '@/components/editor/ai/AICreditsIndicator';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useResumeStore } from '@/store/resumeStore';
import { useResume } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsStore } from '@/store/settingsStore';
import { AIStudioTourModal } from '@/components/ai-studio/AIStudioTourModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { CompanyBriefingSheet } from '@/components/interview/CompanyBriefingSheet';
import { AICostBadge } from '@/components/ai/AICostBadge';

// Lazy-loaded sheets
const TailorSheet = lazy(() => import('@/components/editor/TailorSheet').then(m => ({ default: m.TailorSheet })));
const JobAnalysisSheet = lazy(() => import('@/components/editor/JobAnalysisSheet').then(m => ({ default: m.JobAnalysisSheet })));
const RecruiterSimSheet = lazy(() => import('@/components/editor/ai/RecruiterSimSheet').then(m => ({ default: m.RecruiterSimSheet })));
const AIDetectorSheet = lazy(() => import('@/components/editor/ai/AIDetectorSheet').then(m => ({ default: m.AIDetectorSheet })));
const LinkedInOptimizerSheet = lazy(() => import('@/components/editor/ai/LinkedInOptimizerSheet').then(m => ({ default: m.LinkedInOptimizerSheet })));
const OnePageWizardSheet = lazy(() => import('@/components/editor/ai/OnePageWizardSheet').then(m => ({ default: m.OnePageWizardSheet })));
const AgenticChatSheet = lazy(() => import('@/components/editor/AgenticChatSheet').then(m => ({ default: m.AgenticChatSheet })));
const CareerPathSheet = lazy(() => import('@/components/editor/CareerPathSheet').then(m => ({ default: m.CareerPathSheet })));
const ProofreadSheet = lazy(() => import('@/components/editor/ProofreadSheet').then(m => ({ default: m.ProofreadSheet })));
const AIEnhanceSheet = lazy(() => import('@/components/editor/ai/AIEnhanceSheet').then(m => ({ default: m.AIEnhanceSheet })));
const ResumeABCompareSheet = lazy(() => import('@/components/ai-studio/ResumeABCompareSheet'));

const SUGGESTIONS = [
  'Write a summary for a software engineer',
  'Add metrics to my achievements',
  'Proofread my resume',
  'Add skills for a React developer',
  'What can I improve?',
];

const PLACEHOLDER_EXAMPLES = [
  'Ask AI to edit your resume...',
  'Try: "Write a summary for a PM"',
  'Try: "Add metrics to my bullets"',
  'Try: "Proofread my experience"',
];

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
    title: 'Resume Tools',
    description: 'Optimize & improve your resume',
    tools: [
      { id: 'tailor', icon: Wand2, label: 'Smart Tailor', desc: 'Adapt to job descriptions', color: 'text-primary', cost: 'tailor' },
      { id: 'proofread', icon: SpellCheck, label: 'Proofread', desc: 'Fix grammar & typos', color: 'text-red-500', cost: 'proofread' },
      { id: 'enhance', icon: Sparkles, label: 'Enhance', desc: 'Improve writing', color: 'text-cyan-500', cost: 'enhance' },
      { id: 'onepage', icon: FileText, label: '1-Page Wizard', desc: 'Condense resume', color: 'text-amber-500', cost: 'one-page' },
      { id: 'humanizer', icon: Shield, label: 'Humanize', desc: 'AI detection fix', color: 'text-violet-500', cost: 'detect-humanize' },
    ],
  },
  {
    title: 'Job Analysis',
    description: 'Match & compare against jobs',
    tools: [
      { id: 'job-match', icon: Target, label: 'Job Match', desc: 'ATS compatibility score', color: 'text-green-500', cost: 'score' },
      { id: 'ab-compare', icon: GitCompareArrows, label: 'A/B Compare', desc: 'Score two resumes', color: 'text-indigo-500', cost: 'score' },
      { id: 'recruiter', icon: UserCheck, label: 'Recruiter Sim', desc: 'Simulate review', color: 'text-rose-500', cost: 'recruiter-sim' },
    ],
  },
  {
    title: 'Career Growth',
    description: 'Plan your future',
    tools: [
      { id: 'interview', icon: Mic, label: 'Interview Prep', desc: 'Practice Q&A', color: 'text-orange-500', cost: 'interview', navigate: '/interview' },
      { id: 'career', icon: TrendingUp, label: 'Career Plan', desc: 'Path advisor', color: 'text-emerald-500', cost: 'career-assessment', navigate: '/career' },
      { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', desc: 'Profile optimizer', color: 'text-blue-500', cost: 'linkedin' },
      { id: 'company-briefing', icon: Building2, label: 'Briefing', desc: 'Company research', color: 'text-teal-500', cost: 'company_briefing' },
    ],
  },
  {
    title: 'Documents',
    description: 'Generate professional letters',
    tools: [
      { id: 'cover-letters', icon: FileSignature, label: 'Cover Letters', desc: 'AI-generated letters', color: 'text-sky-500', cost: 'cover-letter', navigate: '/cover-letters' },
      { id: 'resignation-letters', icon: FileOutput, label: 'Resignation', desc: 'Leave professionally', color: 'text-pink-500', cost: 'cover-letter', navigate: '/resignation-letters' },
    ],
  },
];

export default function AIStudioPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentResumeId = useResumeStore(s => s.currentResumeId);
  const { data: resumeData } = useResume(currentResumeId);
  const hasSeenAIStudioTour = useSettingsStore(s => s.hasSeenAIStudioTour);
  const setHasSeenAIStudioTour = useSettingsStore(s => s.setHasSeenAIStudioTour);
  const isFirstVisit = !hasSeenAIStudioTour;

  // Cycling placeholder
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDER_EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Sheet states
  const [showChat, setShowChat] = useState(false);
  const [showTailor, setShowTailor] = useState(false);
  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showRecruiterSim, setShowRecruiterSim] = useState(false);
  const [showAIDetector, setShowAIDetector] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [showOnePage, setShowOnePage] = useState(false);
  const [showCareerPath, setShowCareerPath] = useState(false);
  const [showProofread, setShowProofread] = useState(false);
  const [showEnhance, setShowEnhance] = useState(false);
  const [showABCompare, setShowABCompare] = useState(false);
  const [showCompanyBriefing, setShowCompanyBriefing] = useState(false);
  const [stickyInput, setStickyInput] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkHandled = useRef(false);

  // Deep-link: open tool from ?tool= query param (e.g. from Cmd+K)
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const tool = searchParams.get('tool');
    if (!tool) return;
    deepLinkHandled.current = true;
    const toolMap: Record<string, () => void> = {
      'tailor': () => setShowTailor(true),
      'job-match': () => setShowJobSheet(true),
      'ab-compare': () => setShowABCompare(true),
      'proofread': () => setShowProofread(true),
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
    };
    toolMap[tool]?.();
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, navigate]);

  const handleStickySubmit = useCallback(() => {
    if (!stickyInput.trim()) return;
    haptics.light();
    if (!user) {
      setShowChat(true);
      setStickyInput('');
      return;
    }
    if (!currentResumeId) {
      toast.info('Select a resume first to chat with Wise AI');
      return;
    }
    setShowChat(true);
    setStickyInput('');
  }, [stickyInput, user, currentResumeId]);

  const requireResume = useCallback((action: () => void) => {
    if (!currentResumeId) {
      toast.info('Create or select a resume first', {
        action: {
          label: 'Create',
          onClick: () => navigate('/dashboard?action=create'),
        },
      });
      return;
    }
    haptics.medium();
    action();
  }, [currentResumeId, navigate]);

  const handleToolAction = useCallback((tool: ToolEntry) => {
    // Navigation tools don't need a resume
    if (tool.navigate) {
      haptics.medium();
      navigate(tool.navigate);
      return;
    }
    // Sheet tools require a resume
    const action = () => {
      switch (tool.id) {
        case 'tailor': setShowTailor(true); break;
        case 'proofread': setShowProofread(true); break;
        case 'enhance': setShowEnhance(true); break;
        case 'onepage': setShowOnePage(true); break;
        case 'humanizer': setShowAIDetector(true); break;
        case 'job-match': setShowJobSheet(true); break;
        case 'ab-compare': setShowABCompare(true); break;
        case 'recruiter': setShowRecruiterSim(true); break;
        case 'linkedin': setShowLinkedIn(true); break;
        case 'company-briefing': setShowCompanyBriefing(true); break;
        case 'career': setShowCareerPath(true); break;
      }
    };
    requireResume(action);
  }, [navigate, requireResume]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-[180px] sm:pb-20 lg:pb-6 pt-safe">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3 sm:pt-6 sm:pb-4"
      >
        <h1 className="text-fluid-xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-gradient-x">
          AI Studio
        </h1>
        <div className="flex items-center justify-between mt-2">
          <AIEngineBadge showSettingsLink />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><AICreditsIndicator /></div>
              </TooltipTrigger>
              <TooltipContent>AI Credits Remaining</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>

      {/* Resume Context Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="px-4 pb-4"
      >
        {currentResumeId && resumeData ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-surface border border-border/50">
            <FileSearch className="w-4 h-4 text-primary shrink-0" />
            <span className="text-[15px] sm:text-sm flex-1 break-words leading-snug" title={resumeData.title}>
              Working on: <span className="font-medium">{resumeData.title}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 min-h-[44px] text-xs text-primary"
              onClick={() => navigate('/dashboard')}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 justify-start gap-2"
              onClick={() => navigate('/dashboard')}
            >
              <FileSearch className="w-4 h-4" />
              Select a resume
            </Button>
            <Button
              className="shrink-0 gradient-primary"
              onClick={() => navigate('/dashboard?action=create')}
            >
              Create
            </Button>
          </div>
        )}
      </motion.div>

      {/* Wise AI Chat Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 pb-4"
      >
        <button
          onClick={() => {
            haptics.light();
            if (!user) {
              setShowChat(true);
              return;
            }
            if (!currentResumeId) {
              toast.info('Select a resume first to chat with Wise AI');
              return;
            }
            setShowChat(true);
          }}
          className={cn(
            'w-full p-4 rounded-2xl glass-elevated border border-primary/20 hover:border-primary/40 active:scale-[0.98] transition-all touch-manipulation relative overflow-hidden',
            isFirstVisit && 'ring-2 ring-primary/40 animate-pulse'
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-semibold text-sm">Wise AI Chat</p>
              <p className="text-xs text-muted-foreground truncate">{PLACEHOLDER_EXAMPLES[placeholderIdx]}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {SUGGESTIONS.slice(0, 3).map(s => (
              <span
                key={s}
                className="text-sm px-3 py-1.5 min-h-[44px] flex items-center justify-center sm:justify-start rounded-full bg-primary/5 border border-primary/10 text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </button>
      </motion.div>

      {/* All Tools - Flat Grid by Category */}
      {toolCategories.map((category, catIdx) => (
        <motion.div
          key={category.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + catIdx * 0.05 }}
          className="px-4 pb-4"
        >
          <div className="mb-2 px-1">
            <h2 className="text-base sm:text-sm font-semibold">{category.title}</h2>
            <p className="text-xs text-muted-foreground">{category.description}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {category.tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => handleToolAction(tool)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl glass-surface border border-border/30 hover:border-primary/20 active:scale-95 transition-all touch-manipulation min-h-[100px] relative"
              >
                <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                  <tool.icon className={cn('w-6 h-6', tool.color)} />
                </div>
                <div className="text-center">
                  <span className="text-sm sm:text-xs font-medium block">{tool.label}</span>
                  <span className="text-xs sm:text-[10px] text-muted-foreground leading-tight block">{tool.desc}</span>
                  <AICostBadge operation={tool.cost} className="mt-1" />
                </div>
                {tool.navigate && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50 absolute top-2 right-2" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Pro Tip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-4 pb-6"
      >
        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Pro tip:</span> Paste a job URL or description to get a personalized match score and tailoring suggestions.
          </p>
        </div>
      </motion.div>

      {/* Sticky Mobile Chat Input */}
      <div className="fixed bottom-[68px] left-0 right-0 z-40 md:hidden bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.2)] px-4 py-2 pb-safe">
        <form
          onSubmit={(e) => { e.preventDefault(); handleStickySubmit(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={stickyInput}
            onChange={(e) => setStickyInput(e.target.value)}
            placeholder={PLACEHOLDER_EXAMPLES[placeholderIdx]}
            className="flex-1 h-12 text-base rounded-full glass-input px-4 py-3 placeholder:text-muted-foreground/60 focus:outline-none touch-manipulation"
          />
          <button
            type="submit"
            disabled={!stickyInput.trim()}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full gradient-primary flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all touch-manipulation"
          >
            <Send className="w-5 h-5 text-primary-foreground" />
          </button>
        </form>
      </div>

      {/* Sheets */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          {showChat && <AgenticChatSheet open={showChat} onOpenChange={setShowChat} />}
          {showTailor && <TailorSheet open={showTailor} onOpenChange={setShowTailor} />}
          {showJobSheet && <JobAnalysisSheet open={showJobSheet} onOpenChange={setShowJobSheet} />}
          {showRecruiterSim && <RecruiterSimSheet open={showRecruiterSim} onOpenChange={setShowRecruiterSim} />}
          {showAIDetector && <AIDetectorSheet open={showAIDetector} onOpenChange={setShowAIDetector} />}
          {showLinkedIn && <LinkedInOptimizerSheet open={showLinkedIn} onOpenChange={setShowLinkedIn} />}
          {showOnePage && <OnePageWizardSheet open={showOnePage} onOpenChange={setShowOnePage} />}
          {showCareerPath && <CareerPathSheet open={showCareerPath} onOpenChange={setShowCareerPath} />}
          {showProofread && <ProofreadSheet open={showProofread} onOpenChange={setShowProofread} issues={[]} score={null} isChecking={false} onFix={() => {}} onIgnore={() => {}} onFixAll={() => {}} onCheckNow={() => {}} autoProofread={false} />}
          {showEnhance && <AIEnhanceSheet open={showEnhance} onOpenChange={setShowEnhance} />}
          {showABCompare && <ResumeABCompareSheet open={showABCompare} onOpenChange={setShowABCompare} />}
          {showCompanyBriefing && <CompanyBriefingSheet open={showCompanyBriefing} onOpenChange={setShowCompanyBriefing} jobDescription="" resumeData={resumeData ? { summary: resumeData.summary ?? undefined, experience: (resumeData.experience as any) ?? undefined, skills: (resumeData.skills as any) ?? undefined } : undefined} />}
        </Suspense>
      </ErrorBoundary>

      {/* Onboarding Tour */}
      {isFirstVisit && (
        <AIStudioTourModal onDismiss={() => setHasSeenAIStudioTour(true)} />
      )}
    </div>
  );
}
