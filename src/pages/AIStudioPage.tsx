import { useState, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  Target,
  SpellCheck,
  Lightbulb,
  Palette,
  TrendingUp,
  Mic,
  Shield,
  Linkedin,
  FileText,
  UserCheck,
  FileSearch,
  ChevronDown,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { AIEngineBadge } from '@/components/editor/ai/AIEngineBadge';
import { AICreditsIndicator } from '@/components/editor/ai/AICreditsIndicator';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useResumeStore } from '@/store/resumeStore';
import { useResume } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Lazy-loaded sheets
const TailorSheet = lazy(() => import('@/components/editor/TailorSheet').then(m => ({ default: m.TailorSheet })));
const JobAnalysisSheet = lazy(() => import('@/components/editor/JobAnalysisSheet').then(m => ({ default: m.JobAnalysisSheet })));
const RecruiterSimSheet = lazy(() => import('@/components/editor/ai/RecruiterSimSheet').then(m => ({ default: m.RecruiterSimSheet })));
const AIDetectorSheet = lazy(() => import('@/components/editor/ai/AIDetectorSheet').then(m => ({ default: m.AIDetectorSheet })));
const LinkedInOptimizerSheet = lazy(() => import('@/components/editor/ai/LinkedInOptimizerSheet').then(m => ({ default: m.LinkedInOptimizerSheet })));
const OnePageWizardSheet = lazy(() => import('@/components/editor/ai/OnePageWizardSheet').then(m => ({ default: m.OnePageWizardSheet })));
const AgenticChatSheet = lazy(() => import('@/components/editor/AgenticChatSheet').then(m => ({ default: m.AgenticChatSheet })));
const CareerPathSheet = lazy(() => import('@/components/editor/CareerPathSheet').then(m => ({ default: m.CareerPathSheet })));
const ContentLibrarySheet = lazy(() => import('@/components/editor/ContentLibrarySheet').then(m => ({ default: m.ContentLibrarySheet })));
const CustomizeSheet = lazy(() => import('@/components/editor/CustomizeSheet').then(m => ({ default: m.CustomizeSheet })));
const ProofreadSheet = lazy(() => import('@/components/editor/ProofreadSheet').then(m => ({ default: m.ProofreadSheet })));
const AIEnhanceSheet = lazy(() => import('@/components/editor/ai/AIEnhanceSheet').then(m => ({ default: m.AIEnhanceSheet })));

const SUGGESTIONS = [
  'Write a summary for a software engineer',
  'Add metrics to my achievements',
  'Proofread my resume',
  'Add skills for a React developer',
  'What can I improve?',
];

const secondaryTools = [
  { id: 'proofread', icon: SpellCheck, label: 'Proofread', desc: 'Fix grammar & typos', color: 'text-red-500' },
  { id: 'ideas', icon: Lightbulb, label: 'Ideas', desc: 'Content suggestions', color: 'text-yellow-500' },
  { id: 'customize', icon: Palette, label: 'Customize', desc: 'Design & layout', color: 'text-pink-500' },
  { id: 'enhance', icon: Sparkles, label: 'Enhance', desc: 'Improve writing', color: 'text-cyan-500' },
  { id: 'interview', icon: Mic, label: 'Interview', desc: 'Practice Q&A', color: 'text-orange-500' },
  { id: 'career', icon: TrendingUp, label: 'Career', desc: 'Path advisor', color: 'text-emerald-500' },
  { id: 'humanizer', icon: Shield, label: 'Humanize', desc: 'AI detection fix', color: 'text-violet-500' },
  { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', desc: 'Profile optimizer', color: 'text-blue-500' },
  { id: 'onepage', icon: FileText, label: '1-Page', desc: 'Condense resume', color: 'text-amber-500' },
  { id: 'recruiter', icon: UserCheck, label: 'Recruiter', desc: 'Simulate review', color: 'text-rose-500' },
];

export default function AIStudioPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentResumeId = useResumeStore(s => s.currentResumeId);
  const { data: resumeData } = useResume(currentResumeId);

  // Sheet states
  const [showChat, setShowChat] = useState(false);
  const [showTailor, setShowTailor] = useState(false);
  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showRecruiterSim, setShowRecruiterSim] = useState(false);
  const [showAIDetector, setShowAIDetector] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [showOnePage, setShowOnePage] = useState(false);
  const [showCareerPath, setShowCareerPath] = useState(false);
  const [showContentLibrary, setShowContentLibrary] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showProofread, setShowProofread] = useState(false);
  const [showEnhance, setShowEnhance] = useState(false);
  const [moreToolsOpen, setMoreToolsOpen] = useState(true);

  const requireResume = useCallback((action: () => void) => {
    if (!currentResumeId) {
      toast.info('Create or select a resume first');
      return;
    }
    haptics.medium();
    action();
  }, [currentResumeId]);

  const handleSecondaryAction = useCallback((id: string) => {
    const action = () => {
      switch (id) {
        case 'proofread': setShowProofread(true); break;
        case 'ideas': setShowContentLibrary(true); break;
        case 'customize': setShowCustomize(true); break;
        case 'enhance': setShowEnhance(true); break;
        case 'interview': navigate('/interview'); break;
        case 'career': setShowCareerPath(true); break;
        case 'humanizer': setShowAIDetector(true); break;
        case 'linkedin': setShowLinkedIn(true); break;
        case 'onepage': setShowOnePage(true); break;
        case 'recruiter': setShowRecruiterSim(true); break;
      }
    };
    if (id === 'interview') {
      haptics.medium();
      navigate('/interview');
      return;
    }
    requireResume(action);
  }, [navigate, requireResume]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-20 pt-safe">
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
            <span className="text-[15px] sm:text-sm truncate flex-1">
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
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate('/dashboard')}
          >
            <FileSearch className="w-4 h-4" />
            Select or create a resume to get started
          </Button>
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
          className="w-full p-4 rounded-2xl glass-elevated border border-primary/20 hover:border-primary/40 active:scale-[0.98] transition-all touch-manipulation"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Wise AI Chat</p>
              <p className="text-xs text-muted-foreground">Edit your resume by chatting</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.slice(0, 3).map(s => (
              <span
                key={s}
                className="text-sm px-3 py-1.5 min-h-[36px] flex items-center rounded-full bg-primary/5 border border-primary/10 text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </button>
      </motion.div>

      {/* Featured Tools */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="px-4 pb-4 space-y-3"
      >
        <h2 className="text-sm font-semibold text-muted-foreground px-1">Featured Tools</h2>
        <button
          onClick={() => requireResume(() => setShowTailor(true))}
          className="w-full p-4 rounded-2xl glass-elevated border border-border/50 hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation flex items-center gap-4 min-h-[100px] sm:min-h-[72px]"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Wand2 className="w-7 h-7 text-primary" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="font-semibold text-base sm:text-sm">Smart Tailor</p>
            <p className="text-sm sm:text-xs text-muted-foreground">Adapt your resume to any job description</p>
          </div>
        </button>
        <button
          onClick={() => requireResume(() => setShowJobSheet(true))}
          className="w-full p-4 rounded-2xl glass-elevated border border-border/50 hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation flex items-center gap-4 min-h-[100px] sm:min-h-[72px]"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Target className="w-7 h-7 text-primary" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="font-semibold text-base sm:text-sm">Job Match Analysis</p>
            <p className="text-sm sm:text-xs text-muted-foreground">Check ATS compatibility and match score</p>
          </div>
        </button>
      </motion.div>

      {/* More AI Tools */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 pb-4"
      >
        <Collapsible open={moreToolsOpen} onOpenChange={setMoreToolsOpen}>
          <CollapsibleTrigger asChild>
            <button
              className="w-full flex items-center justify-between py-2 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
              onClick={() => haptics.light()}
            >
              <span className="font-semibold">More AI Tools</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground/70">({secondaryTools.length} tools)</span>
                <div
                  className="transition-transform duration-200"
                  style={{ transform: moreToolsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
              {secondaryTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => handleSecondaryAction(tool.id)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl glass-surface border border-border/30 hover:border-primary/20 active:scale-95 transition-all touch-manipulation min-h-[100px]"
                >
                  <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                    <tool.icon className={cn('w-6 h-6', tool.color)} />
                  </div>
                  <div className="text-center">
                    <span className="text-sm sm:text-xs font-medium block">{tool.label}</span>
                    <span className="text-xs sm:text-[10px] text-muted-foreground leading-tight block">{tool.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* Pro Tip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="px-4 pb-6"
      >
        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Pro tip:</span> Paste a job URL or description to get a personalized match score and tailoring suggestions.
          </p>
        </div>
      </motion.div>

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
          {showContentLibrary && <ContentLibrarySheet open={showContentLibrary} onOpenChange={setShowContentLibrary} onInsert={() => {}} />}
          {showCustomize && <CustomizeSheet open={showCustomize} onOpenChange={setShowCustomize} onApply={() => {}} />}
          {showProofread && <ProofreadSheet open={showProofread} onOpenChange={setShowProofread} issues={[]} score={null} isChecking={false} onFix={() => {}} onIgnore={() => {}} onFixAll={() => {}} onCheckNow={() => {}} autoProofread={false} />}
          {showEnhance && <AIEnhanceSheet open={showEnhance} onOpenChange={setShowEnhance} />}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
