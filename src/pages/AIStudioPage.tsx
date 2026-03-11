import { useState, useEffect, useRef, lazy, Suspense, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  ScanLine } from
'lucide-react';
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
'What can I improve?'];


const PLACEHOLDER_EXAMPLES = [
'Ask AI to edit your resume...',
'Try: "Write a summary for a PM"',
'Try: "Add metrics to my bullets"'];


const PRO_TIPS = [
'Paste a job URL or description to get a personalized match score and tailoring suggestions.',
'Use Smart Tailor before applying — it adapts your resume keywords to match the job description.',
'The A/B Compare tool lets you score two versions of your resume side-by-side.'];


const FEATURED_TOOL_IDS = new Set(['tailor', 'job-match', 'enhance']);

const RECENT_TOOLS_KEY = 'wr-recent-ai-tools';
const TIP_DISMISSED_KEY = 'wr-ai-tip-dismissed';

function getRecentToolIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_TOOLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {return [];}
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

const toolCategories: {title: string;description: string;tools: ToolEntry[];}[] = [
{
  title: 'Resume Tools',
  description: 'Optimize & improve your resume',
  tools: [
  { id: 'tailor', icon: Wand2, label: 'Smart Tailor', desc: 'Adapt to job descriptions', color: 'text-primary', cost: 'tailor' },
  { id: 'enhance', icon: Sparkles, label: 'Enhance', desc: 'Improve writing', color: 'text-cyan-500', cost: 'enhance' },
  { id: 'onepage', icon: FileText, label: '1-Page Wizard', desc: 'Condense resume', color: 'text-amber-500', cost: 'one-page' },
  { id: 'humanizer', icon: Shield, label: 'Humanize', desc: 'AI detection fix', color: 'text-violet-500', cost: 'detect-humanize' }]

},
{
  title: 'Job Analysis',
  description: 'Match & compare against jobs',
  tools: [
  { id: 'job-match', icon: Target, label: 'Job Match', desc: 'ATS compatibility score', color: 'text-green-500', cost: 'score' },
  { id: 'ab-compare', icon: GitCompareArrows, label: 'A/B Compare', desc: 'Score two resumes', color: 'text-indigo-500', cost: 'score' },
  { id: 'recruiter', icon: UserCheck, label: 'Recruiter Sim', desc: 'Simulate review', color: 'text-rose-500', cost: 'recruiter-sim' }]

},
{
  title: 'Career Growth',
  description: 'Plan your future',
  tools: [
  { id: 'interview', icon: Mic, label: 'Interview Prep', desc: 'Practice Q&A', color: 'text-orange-500', cost: 'interview', navigate: '/interview' },
  { id: 'career', icon: TrendingUp, label: 'Career Plan', desc: 'Path advisor', color: 'text-emerald-500', cost: 'career-assessment', navigate: '/career' },
  { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', desc: 'Profile optimizer', color: 'text-blue-500', cost: 'linkedin' },
  { id: 'company-briefing', icon: Building2, label: 'Briefing', desc: 'Company research', color: 'text-teal-500', cost: 'company_briefing' }]

},
{
  title: 'Documents',
  description: 'Generate professional letters',
  tools: [
  { id: 'cover-letters', icon: FileSignature, label: 'Cover Letters', desc: 'AI-generated letters', color: 'text-sky-500', cost: 'cover-letter', navigate: '/cover-letters' },
  { id: 'resignation-letters', icon: FileOutput, label: 'Resignation', desc: 'Leave professionally', color: 'text-pink-500', cost: 'cover-letter', navigate: '/resignation-letters' }]

},
{
  title: 'QR Tools',
  description: 'Generate & scan QR codes',
  tools: [
  { id: 'qr-code', icon: QrCode, label: 'QR Generator', desc: 'Custom QR codes', color: 'text-primary', cost: 'free', navigate: '/qr-code' },
  { id: 'qr-batch', icon: Layers, label: 'Batch QR', desc: 'Bulk CSV → ZIP', color: 'text-amber-500', cost: 'free', navigate: '/qr-batch' },
  { id: 'qr-scan', icon: ScanLine, label: 'QR Scanner', desc: 'Decode from image', color: 'text-emerald-500', cost: 'free', navigate: '/qr-scan' }]

}];


// Flat lookup for recent tools
const allTools = toolCategories.flatMap((c) => c.tools);

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
    const start = () => {interval = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length), 3000);};
    const stop = () => {if (interval) {clearInterval(interval);interval = null;}};
    const onVisChange = () => {document.visibilityState === 'visible' ? start() : stop();};
    start();
    document.addEventListener('visibilitychange', onVisChange);
    return () => {stop();document.removeEventListener('visibilitychange', onVisChange);};
  }, []);

  // Recent tools
  const [recentIds, setRecentIds] = useState(getRecentToolIds);
  const recentTools = useMemo(() => recentIds.map((id) => allTools.find((t) => t.id === id)).filter(Boolean) as ToolEntry[], [recentIds]);

  // Dismissible pro tip
  const [tipDismissed, setTipDismissed] = useState(() => localStorage.getItem(TIP_DISMISSED_KEY) === '1');
  const tipIdx = useMemo(() => new Date().getDate() % PRO_TIPS.length, []);

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
  const [stickyInput, setStickyInput] = useState('');
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
      'resignation-letters': () => navigate('/resignation-letters')
    };
    toolMap[tool]?.();
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, navigate]);

  const openChatWithMessage = useCallback((msg: string) => {
    haptics.light();
    if (!user) {setShowChat(true);return;}
    if (!currentResumeId) {toast.info('Select a resume first to chat with Wise AI');return;}
    setStickyInput(msg);
    setShowChat(true);
  }, [user, currentResumeId]);

  const handleStickySubmit = useCallback(() => {
    if (!stickyInput.trim()) return;
    haptics.light();
    if (!user) {setShowChat(true);setStickyInput('');return;}
    if (!currentResumeId) {toast.info('Select a resume first to chat with Wise AI');return;}
    setShowChat(true);
    setStickyInput('');
  }, [stickyInput, user, currentResumeId]);

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
    // Track recent usage
    saveRecentToolId(tool.id);
    setRecentIds(getRecentToolIds());

    if (tool.navigate) {haptics.medium();navigate(tool.navigate);return;}
    const action = () => {
      switch (tool.id) {
        case 'tailor':setShowTailor(true);break;
        case 'enhance':setShowEnhance(true);break;
        case 'onepage':setShowOnePage(true);break;
        case 'humanizer':setShowAIDetector(true);break;
        case 'job-match':setShowJobSheet(true);break;
        case 'ab-compare':setShowABCompare(true);break;
        case 'recruiter':setShowRecruiterSim(true);break;
        case 'linkedin':setShowLinkedIn(true);break;
        case 'company-briefing':setShowCompanyBriefing(true);break;
        case 'career':setShowCareerPath(true);break;
      }
    };
    requireResume(action);
  }, [navigate, requireResume]);

  const dismissTip = useCallback(() => {
    setTipDismissed(true);
    localStorage.setItem(TIP_DISMISSED_KEY, '1');
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-28 sm:pb-20 lg:pb-6 pt-safe">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3 sm:pt-6 sm:pb-4">
        
        <h1 className="text-fluid-xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-gradient-x ml-[120px] pt-0 pb-0">
          Wise AI Studio
        </h1>
        <div className="flex items-center justify-between mt-2">
          <AIEngineBadge showSettingsLink />
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
      </motion.div>

      {/* Resume Context Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="px-4 pb-[5px] pt-[5px]">
        
        {currentResumeId && resumeData ?
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-surface border border-border/50">
            <FileSearch className="w-4 h-4 text-primary shrink-0" />
            <span className="text-[15px] sm:text-sm flex-1 break-words leading-snug" title={resumeData.title}>
              Working on: <span className="font-medium">{resumeData.title}</span>
            </span>
            <Button variant="ghost" size="sm" className="shrink-0 min-h-[44px] text-xs text-primary" onClick={() => {
            if (allResumes && allResumes.length > 0) {
              pendingActionRef.current = null;
              setShowResumePicker(true);
            } else {
              navigate('/dashboard');
            }
          }}>
              Change
            </Button>
          </div> :

        <div className="flex gap-2">
            <Button variant="outline" className="flex-1 justify-start gap-2" onClick={() => {
            if (allResumes && allResumes.length > 0) {
              pendingActionRef.current = null;
              setShowResumePicker(true);
            } else {
              navigate('/dashboard');
            }
          }}>
              <FileSearch className="w-4 h-4" />
              Select a resume
            </Button>
            <Button className="shrink-0 gradient-primary" onClick={() => navigate('/dashboard?action=create')}>
              Create
            </Button>
          </div>
        }
      </motion.div>

      {/* Wise AI Chat Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 pl-[16px] pb-[5px] pt-[5px]">
        
        <div
          onClick={() => {
            haptics.light();
            if (!user) {setShowChat(true);return;}
            if (!currentResumeId) {toast.info('Select a resume first to chat with Wise AI');return;}
            setShowChat(true);
          }}
          className={cn("w-full p-4 rounded-2xl glass-elevated border border-primary/20 hover:border-primary/40 active:scale-[0.98] transition-all touch-manipulation relative overflow-hidden cursor-pointer pb-0 pt-[8px]",

          isFirstVisit && 'ring-2 ring-primary/40 animate-[pulse_1.5s_ease-in-out_3]'
          )}>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-semibold text-sm">Need help tailoring, analyzing, or planning? Wise AI can do it all - tap Ask to chat now.

              </p>
              <p className="text-muted-foreground truncate mt-[5px] mb-0 pt-0 text-sm">{PLACEHOLDER_EXAMPLES[placeholderIdx]}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button key={s} className="px-3 py-1.5 text-xs rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted transition-colors truncate">
                {s}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Recent Tools */}
      {recentTools.length > 0 &&
      <div className="px-4 pb-4">
          <div className="mb-2 px-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">Recent</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {recentTools.map((tool) =>
          <button
            key={tool.id}
            onClick={() => handleToolAction(tool)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass-surface border border-border/30 hover:border-primary/20 active:scale-95 transition-all touch-manipulation shrink-0">
            
                <tool.icon className={cn('w-4 h-4', tool.color)} />
                <span className="text-sm font-medium whitespace-nowrap">{tool.label}</span>
              </button>
          )}
          </div>
        </div>
      }

      {/* Recommended for You */}
      {(() => {
        // Compute recommended tools based on user state
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
              {recommended.map((tool) =>
              <button
                key={tool.id}
                onClick={() => handleToolAction(tool)}
                className="gap-2.5 px-4 py-3 rounded-xl border border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06] active:scale-95 transition-all touch-manipulation shrink-0 min-h-[56px] pl-[5px] pt-[5px] pb-[5px] flex items-center justify-center pr-[16px]">
                
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <tool.icon className={cn('w-4.5 h-4.5', tool.color)} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium block">{tool.label}</span>
                    <span className="text-[11px] text-muted-foreground">{tool.desc}</span>
                  </div>
                </button>
              )}
            </div>
          </div>);

      })()}

      {/* All Tools - Flat Grid by Category (no individual entrance anims) */}
      {toolCategories.map((category) =>
      <div key={category.title} className="px-4 pb-4">
          <div className="mb-2 px-1">
            <h2 className="text-base sm:text-sm font-semibold">{category.title}</h2>
            <p className="text-xs text-muted-foreground">{category.description}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {category.tools.map((tool) => {
            const isFeatured = FEATURED_TOOL_IDS.has(tool.id);
            return (
              <button
                key={tool.id}
                onClick={() => handleToolAction(tool)}
                className={cn("p-3 glass-surface border active:scale-95 transition-all touch-manipulation min-h-[100px] relative pl-[5px] pt-[5px] pb-[5px] pr-[5px] ml-[9px] mt-0 mr-[9px] mb-0 flex-col flex items-center justify-center gap-0 text-center rounded-3xl",

                isFeatured ?
                'border-primary/20 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]' :
                'border-border/30 hover:border-primary/20'
                )}>
                
                  {isFeatured &&
                <Badge variant="secondary" className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0 h-4 font-medium">
                      Popular
                    </Badge>
                }
                  <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                    <tool.icon className={cn('w-6 h-6', tool.color)} />
                  </div>
                  <div className="text-center">
                    <span className="text-sm sm:text-xs font-medium block">{tool.label}</span>
                    <span className="text-xs sm:text-[10px] text-muted-foreground leading-tight block">{tool.desc}</span>
                    <AICostBadge operation={tool.cost} className="mt-1" />
                  </div>
                  {tool.navigate &&
                <ArrowRight className="w-3 h-3 text-muted-foreground/50 absolute top-2 right-2" />
                }
                </button>);

          })}
          </div>
        </div>
      )}

      {/* Pro Tip - dismissible & rotating */}
      {!tipDismissed &&
      <div className="px-4 pb-6">
          <div className="items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 relative flex flex-row pt-0 pb-0 mt-0 mb-[20px]">
            <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground pr-6">
              <span className="text-foreground font-medium">Pro tip:</span> {PRO_TIPS[tipIdx]}
            </p>
            <button
            onClick={dismissTip}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors touch-manipulation"
            aria-label="Dismiss tip">
            
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      }

      {/* Sticky Mobile Chat Input */}
      



















      

      {/* Resume Picker Sheet */}
      {showResumePicker &&
      <Sheet open={showResumePicker} onOpenChange={(open) => {if (!open) {setShowResumePicker(false);pendingActionRef.current = null;}}}>
          <SheetContent side="bottom" className="max-h-[60dvh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Which resume do you want to use?</SheetTitle>
            </SheetHeader>
            <div className="space-y-2 py-3">
              {allResumes?.map((r) =>
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
              className="w-full text-left px-4 py-3 rounded-xl border border-border/50 hover:bg-muted/60 transition-colors">
              
                  <p className="font-medium text-sm truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {r.target_job_title || 'No target role'}
                  </p>
                </button>
            )}
            </div>
            <Button variant="outline" className="w-full" onClick={() => {setShowResumePicker(false);navigate('/dashboard');}}>
              View All Resumes
            </Button>
          </SheetContent>
        </Sheet>
      }

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
          {showEnhance && <AIEnhanceSheet open={showEnhance} onOpenChange={setShowEnhance} />}
          {showABCompare && <ResumeABCompareSheet open={showABCompare} onOpenChange={setShowABCompare} />}
          {showCompanyBriefing && <CompanyBriefingSheet open={showCompanyBriefing} onOpenChange={setShowCompanyBriefing} jobDescription="" resumeData={resumeData ? { summary: resumeData.summary ?? undefined, experience: resumeData.experience as any ?? undefined, skills: resumeData.skills as any ?? undefined } : undefined} />}
        </Suspense>
      </ErrorBoundary>

      {/* Onboarding Tour — auto-dismiss inline banner */}
      {isFirstVisit &&
      <div className="fixed bottom-24 sm:bottom-20 left-4 right-4 z-40 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-surface border border-primary/20 shadow-lg">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-foreground flex-1">Welcome to <span className="font-semibold">AI Studio</span> — tap any tool to supercharge your resume.</p>
            <Button size="sm" variant="ghost" className="shrink-0 min-h-[44px] text-xs" onClick={() => setHasSeenAIStudioTour(true)}>Got it</Button>
          </div>
        </div>
      }
    </div>);

}