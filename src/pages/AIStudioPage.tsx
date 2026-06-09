import { useState, useEffect, useRef, lazy, Suspense, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { ArrowRight, Clock, FileSearch, Lightbulb, Sparkles, X } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { ResumePickerSheet } from "@/components/shared/ResumePickerSheet";
import { useResumeStore } from "@/store/resumeStore";
import { useResume, useResumes, dbToResumeData } from "@/hooks/useResumes";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { UpgradeWall } from "@/components/plan/UpgradeWall";
import { useSettingsStore } from "@/store/settingsStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { CompanyBriefingSheet } from "@/components/interview/CompanyBriefingSheet";
import { AICostBadge } from "@/components/ai/AICostBadge";
import { SalaryNegotiationSheet } from "@/components/ai-studio/SalaryNegotiationSheet";
import { JobRejectionSheet } from "@/components/ai-studio/JobRejectionSheet";
import { ReferenceLetterSheet } from "@/components/ai-studio/ReferenceLetterSheet";
import { PersonalBrandingSheet } from "@/components/ai-studio/PersonalBrandingSheet";
import { ColdEmailSheet } from "@/components/ai-studio/ColdEmailSheet";
import { SkillsGapSheet } from "@/components/ai-studio/SkillsGapSheet";
import { PortfolioBioSheet } from "@/components/ai-studio/PortfolioBioSheet";
import {
  aiStudioPrimaryWorkflows,
  aiStudioSecondaryWorkflows,
  getAiStudioToolById,
  getAiStudioToolByPath,
  getAiStudioToolPath,
  type AiStudioToolEntry,
  type AiStudioWorkflowEntry,
} from "@/lib/aiStudioTools";

const TailorSheet = lazy(() => import("@/components/editor/TailorSheet").then((m) => ({ default: m.TailorSheet })));
const RecruiterSimSheet = lazy(() => import("@/components/editor/ai/RecruiterSimSheet").then((m) => ({ default: m.RecruiterSimSheet })));
const AIDetectorSheet = lazy(() => import("@/components/editor/ai/AIDetectorSheet").then((m) => ({ default: m.AIDetectorSheet })));
const LinkedInOptimizerSheet = lazy(() => import("@/components/editor/ai/LinkedInOptimizerSheet").then((m) => ({ default: m.LinkedInOptimizerSheet })));
const OnePageWizardSheet = lazy(() => import("@/components/editor/ai/SmartFitWizardSheet").then((m) => ({ default: m.SmartFitWizardSheet })));
const AgenticChatSheet = lazy(() => import("@/components/editor/AgenticChatSheet").then((m) => ({ default: m.AgenticChatSheet })));
const AIEnhanceSheet = lazy(() => import("@/components/editor/ai/AIEnhanceSheet").then((m) => ({ default: m.AIEnhanceSheet })));
const ResumeABCompareSheet = lazy(() => import("@/components/ai-studio/ResumeABCompareSheet"));

const RECENT_TOOLS_KEY = "wr-recent-ai-tools";
const TIP_DISMISSED_KEY = "wr-ai-tip-dismissed";

const WORKSPACE_PROMPTS = [
  "What should I improve before I apply?",
  "Tailor this resume for a product manager role",
  "Help me prepare for tomorrow's interview",
  "Research this company before I speak with them",
];

const PLACEHOLDER_EXAMPLES = [
  "Ask Wise AI to improve your resume for a specific role...",
  'Try: "Tailor my resume for a growth marketing job"',
  'Try: "Give me interview stories for this company"',
];

const PRO_TIPS = [
  "Start with the job-tailoring workflow when you already have a role in mind. It keeps your resume, fit, and follow-up steps together.",
  "Use the resume-improvement workflow first when you want stronger wording before you tailor anything.",
  "Research the company before interview practice so your answers sound more specific and informed.",
];

function getRecentToolPaths(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_TOOLS_KEY);
    if (!raw) return [];
    const parsed: string[] = JSON.parse(raw);
    return parsed.map((entry) => {
      if (entry.startsWith("/")) return entry;
      const tool = getAiStudioToolById(entry);
      return tool ? getAiStudioToolPath(tool) : `/ai-studio/${entry}`;
    });
  } catch {
    return [];
  }
}

function saveRecentToolPath(tool: AiStudioToolEntry) {
  const path = getAiStudioToolPath(tool);
  const recent = getRecentToolPaths().filter((entry) => entry !== path);
  recent.unshift(path);
  localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(recent.slice(0, 3)));
}

export default function AIStudioPage() {
  const navigate = useNavigate();
  const { tool: toolParam } = useParams<{ tool?: string }>();
  const { user } = useAuth();
  const { isPro, isLoading: planLoading } = usePlan();
  const currentResumeId = useResumeStore((s) => s.currentResumeId);
  const { data: resumeData } = useResume(currentResumeId);
  const hasSeenAIStudioTour = useSettingsStore((s) => s.hasSeenAIStudioTour);
  const setHasSeenAIStudioTour = useSettingsStore((s) => s.setHasSeenAIStudioTour);
  const isFirstVisit = !hasSeenAIStudioTour;

  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      interval = setInterval(() => {
        setPlaceholderIdx((index) => (index + 1) % PLACEHOLDER_EXAMPLES.length);
      }, 3000);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const [recentPaths, setRecentPaths] = useState(getRecentToolPaths);
  const recentTools = useMemo(
    () => recentPaths.map((path) => getAiStudioToolByPath(path)).filter(Boolean) as AiStudioToolEntry[],
    [recentPaths]
  );

  const [tipDismissed, setTipDismissed] = useState(() => localStorage.getItem(TIP_DISMISSED_KEY) === "1");
  const tipIdx = useMemo(() => new Date().getDate() % PRO_TIPS.length, []);

  const [showChat, setShowChat] = useState(false);
  const [showTailor, setShowTailor] = useState(false);
  const [showRecruiterSim, setShowRecruiterSim] = useState(false);
  const [showAIDetector, setShowAIDetector] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [showOnePage, setShowOnePage] = useState(false);
  const [showEnhance, setShowEnhance] = useState(false);
  const [showABCompare, setShowABCompare] = useState(false);
  const [showCompanyBriefing, setShowCompanyBriefing] = useState(false);
  const [showSalaryNegotiation, setShowSalaryNegotiation] = useState(false);
  const [showJobRejection, setShowJobRejection] = useState(false);
  const [showReferenceLetter, setShowReferenceLetter] = useState(false);
  const [showPersonalBranding, setShowPersonalBranding] = useState(false);
  const [showColdEmail, setShowColdEmail] = useState(false);
  const [showSkillsGap, setShowSkillsGap] = useState(false);
  const [showPortfolioBio, setShowPortfolioBio] = useState(false);

  const [searchParams] = useSearchParams();
  const activatedToolRef = useRef<string | null>(null);
  const [chatInitialMessage, setChatInitialMessage] = useState("");

  const [showResumePicker, setShowResumePicker] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const { data: allResumes } = useResumes({ select: (data) => data.slice(0, 5) });

  const openToolById = useCallback((toolId: string) => {
    const toolMap: Record<string, () => void> = {
      tailor: () => setShowTailor(true),
      "job-match": () => navigate("/tailoring-hub"),
      "ab-compare": () => setShowABCompare(true),
      enhance: () => setShowEnhance(true),
      humanizer: () => setShowAIDetector(true),
      linkedin: () => setShowLinkedIn(true),
      onepage: () => setShowOnePage(true),
      recruiter: () => setShowRecruiterSim(true),
      interview: () => navigate("/interview"),
      career: () => navigate("/career"),
      chat: () => setShowChat(true),
      "company-briefing": () => setShowCompanyBriefing(true),
      "cover-letters": () => navigate("/cover-letters"),
      "resignation-letters": () => navigate("/resignation-letters"),
      "salary-negotiation": () => setShowSalaryNegotiation(true),
      "job-rejection": () => setShowJobRejection(true),
      "reference-letter": () => setShowReferenceLetter(true),
      "personal-branding": () => setShowPersonalBranding(true),
      "cold-email": () => setShowColdEmail(true),
      "skills-gap": () => setShowSkillsGap(true),
      "portfolio-bio": () => setShowPortfolioBio(true),
      customize: () => {
        if (!currentResumeId) {
          toast.info("Select a resume first to customize design", {
            action: { label: "Dashboard", onClick: () => navigate("/dashboard") },
          });
          return;
        }
        navigate(`/editor?id=${currentResumeId}&panel=customize`);
      },
      ideas: () => {
        if (!currentResumeId) {
          toast.info("Select a resume first for content ideas", {
            action: { label: "Dashboard", onClick: () => navigate("/dashboard") },
          });
          return;
        }
        navigate(`/editor?id=${currentResumeId}&panel=content-library`);
      },
    };

    const handler = toolMap[toolId];
    if (handler) {
      handler();
      return;
    }

    toast.info("This tool is not available right now.");
  }, [currentResumeId, navigate]);

  useEffect(() => {
    if (toolParam) {
      if (activatedToolRef.current === toolParam) return;
      activatedToolRef.current = toolParam;
      openToolById(toolParam);
      return;
    }

    activatedToolRef.current = null;

    const queryTool = searchParams.get("tool");
    if (queryTool) {
      navigate(`/ai-studio/${queryTool}`, { replace: true });
    }
  }, [navigate, openToolById, searchParams, toolParam]);

  const openChatWithMessage = useCallback((message: string) => {
    haptics.light();
    if (!user) {
      setShowChat(true);
      return;
    }
    if (!currentResumeId) {
      toast.info("Select a resume first to chat with Wise AI");
      return;
    }
    setChatInitialMessage(message);
    setShowChat(true);
  }, [currentResumeId, user]);

  const requireResume = useCallback((action: () => void) => {
    if (!currentResumeId) {
      if (allResumes && allResumes.length > 0) {
        pendingActionRef.current = action;
        setShowResumePicker(true);
      } else {
        toast.info("Create a resume first to use this tool", {
          action: { label: "Create", onClick: () => navigate("/dashboard?action=create") },
        });
      }
      return;
    }

    haptics.medium();
    action();
  }, [allResumes, currentResumeId, navigate]);

  const handleToolAction = useCallback((tool: AiStudioToolEntry) => {
    saveRecentToolPath(tool);
    setRecentPaths(getRecentToolPaths());

    if (tool.navigate) {
      haptics.medium();
      navigate(tool.navigate);
      return;
    }

    if (tool.id === "company-briefing") {
      haptics.medium();
      navigate("/ai-studio/company-briefing");
      return;
    }

    const action = () => {
      haptics.medium();
      navigate(`/ai-studio/${tool.id}`);
    };

    requireResume(action);
  }, [navigate, requireResume]);

  const handleWorkflowAction = useCallback((toolId: string) => {
    const tool = getAiStudioToolById(toolId);
    if (!tool) {
      openToolById(toolId);
      return;
    }
    handleToolAction(tool);
  }, [handleToolAction, openToolById]);

  const dismissTip = useCallback(() => {
    setTipDismissed(true);
    localStorage.setItem(TIP_DISMISSED_KEY, "1");
  }, []);

  if (planLoading) return null;

  if (!isPro) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <UpgradeWall
          requiredPlan="pro"
          featureName="Wise AI"
          description="Unlock the full Wise AI workspace for resume improvement, tailoring, interview prep, and career documents."
          features={[
            "Tailor for a Job with the Tailoring Hub",
            "Interview Prep and Company Briefing",
            "Cover Letters and LinkedIn optimization",
            "Career planning and writing support",
            "Wise AI Chat across your resume workflow",
          ]}
        />
      </div>
    );
  }

  const renderWorkflowCard = (workflow: AiStudioWorkflowEntry, compact = false) => {
    const Icon = workflow.icon;
    const primaryTool = getAiStudioToolById(workflow.primaryAction.toolId);
    return (
      <div
        key={workflow.id}
        className={cn(
          "rounded-3xl border border-border bg-card shadow-soft-sm",
          compact ? "p-4" : "p-5"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
            <Icon className={cn("h-5 w-5", workflow.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={cn("font-semibold", compact ? "text-base" : "text-lg")}>{workflow.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{workflow.description}</p>
              </div>
              {primaryTool ? <AICostBadge operation={primaryTool.cost} className="shrink-0" /> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="gradient-primary"
                onClick={() => handleWorkflowAction(workflow.primaryAction.toolId)}
              >
                {workflow.primaryAction.label}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              {workflow.secondaryActions.map((action) => (
                <Button
                  key={`${workflow.id}-${action.toolId}`}
                  variant="outline"
                  onClick={() => handleWorkflowAction(action.toolId)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-28 sm:pb-20 lg:pb-6">
      <header className="lg:hidden shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-page-title">Wise AI Workspace</h1>
          </div>
        </div>
      </header>

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
                  navigate("/dashboard");
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
                  navigate("/dashboard");
                }
              }}
            >
              <FileSearch className="w-4 h-4" />
              Select a resume
            </Button>
            <Button className="shrink-0 gradient-primary" onClick={() => navigate("/dashboard?action=create")}>
              Create
            </Button>
          </div>
        )}
      </div>

      {isFirstVisit && (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-soft">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-sm leading-5 text-foreground">
              Welcome to <span className="font-semibold">Wise AI</span>. Start with a workflow and keep your resume, job prep, and outreach in one place.
            </p>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              aria-label="Dismiss Wise AI welcome"
              onClick={() => setHasSeenAIStudioTour?.(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        <div
          onClick={() => {
            haptics.light();
            if (!user) {
              setShowChat(true);
              return;
            }
            if (!currentResumeId) {
              toast.info("Select a resume first to chat with Wise AI");
              return;
            }
            setShowChat(true);
          }}
          className={cn(
            "w-full rounded-3xl border border-primary/20 bg-card p-5 shadow-soft transition-all cursor-pointer hover:border-primary/40 active:scale-[0.98]",
            isFirstVisit && "ring-2 ring-primary/40 animate-[pulse_1.5s_ease-in-out_3]"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full gradient-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Wise AI Chat</p>
              <h2 className="text-lg font-semibold leading-tight">Your resume and job search workspace</h2>
              <p className="mt-1 text-sm text-muted-foreground">{PLACEHOLDER_EXAMPLES[placeholderIdx]}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {WORKSPACE_PROMPTS.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                onClick={(event) => {
                  event.stopPropagation();
                  openChatWithMessage(prompt);
                }}
                className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

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
                <tool.icon className={cn("w-4 h-4", tool.color)} />
                <span className="text-sm font-medium whitespace-nowrap">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-3">
        <div className="px-1">
          <h2 className="text-lg font-semibold">Primary workflows</h2>
          <p className="text-sm text-muted-foreground">Start with the main outcomes most people need from Wise AI.</p>
        </div>
      </div>
      <div className="grid gap-4 px-4 pb-5 lg:grid-cols-2">
        {aiStudioPrimaryWorkflows.map((workflow) => renderWorkflowCard(workflow))}
      </div>

      <div className="px-4 pb-3">
        <div className="px-1">
          <h2 className="text-base font-semibold">Secondary tools</h2>
          <p className="text-sm text-muted-foreground">Useful supporting workflows that stay available without crowding the main workspace.</p>
        </div>
      </div>
      <div className="grid gap-4 px-4 pb-6 md:grid-cols-2">
        {aiStudioSecondaryWorkflows.map((workflow) => renderWorkflowCard(workflow, true))}
      </div>

      {!tipDismissed && (
        <div className="px-4 pb-6">
          <div className="relative flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 p-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="pr-6 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Workspace tip:</span> {PRO_TIPS[tipIdx]}
            </p>
            <button
              onClick={dismissTip}
              className="absolute right-2 top-2 rounded-full p-1 transition-colors hover:bg-muted/50"
              aria-label="Dismiss tip"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      <ResumePickerSheet
        open={showResumePicker}
        onOpenChange={(open) => {
          if (!open) {
            setShowResumePicker(false);
            pendingActionRef.current = null;
          }
        }}
        resumes={allResumes ?? []}
        currentResumeId={currentResumeId}
        title="Which resume should power this tool?"
        description="Wise AI will read and update the resume you pick. Choose the version that fits this job or task."
        onSelect={(resume) => {
          const setId = useResumeStore.getState().setCurrentResumeId;
          const setResume = useResumeStore.getState().setCurrentResume;
          setId(resume.$id);
          setResume(dbToResumeData(resume));
          setShowResumePicker(false);
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          if (action) setTimeout(action, 100);
        }}
        onViewAll={() => {
          setShowResumePicker(false);
          pendingActionRef.current = null;
          navigate("/dashboard");
        }}
        onCreateNew={() => {
          setShowResumePicker(false);
          pendingActionRef.current = null;
          navigate("/dashboard?action=create");
        }}
      />

      <ErrorBoundary>
        <Suspense fallback={null}>
          {showChat && (
            <AgenticChatSheet
              open={showChat}
              onOpenChange={(open) => {
                setShowChat(open);
                if (!open) setChatInitialMessage("");
              }}
              initialMessage={chatInitialMessage}
            />
          )}
          {showTailor && <TailorSheet open={showTailor} onOpenChange={setShowTailor} />}
          {showRecruiterSim && <RecruiterSimSheet open={showRecruiterSim} onOpenChange={setShowRecruiterSim} />}
          {showAIDetector && <AIDetectorSheet open={showAIDetector} onOpenChange={setShowAIDetector} />}
          {showLinkedIn && <LinkedInOptimizerSheet open={showLinkedIn} onOpenChange={setShowLinkedIn} />}
          {showOnePage && <OnePageWizardSheet open={showOnePage} onOpenChange={setShowOnePage} />}
          {showEnhance && <AIEnhanceSheet open={showEnhance} onOpenChange={setShowEnhance} />}
          {showABCompare && <ResumeABCompareSheet open={showABCompare} onOpenChange={setShowABCompare} />}
          {showCompanyBriefing && (
            <CompanyBriefingSheet
              open={showCompanyBriefing}
              onOpenChange={setShowCompanyBriefing}
              jobDescription=""
              resumeData={
                resumeData
                  ? {
                      summary: resumeData.summary ?? undefined,
                      experience: (resumeData.experience as any) ?? undefined,
                      skills: (resumeData.skills as any) ?? undefined,
                    }
                  : undefined
              }
            />
          )}
        </Suspense>
      </ErrorBoundary>

      {showSalaryNegotiation && <SalaryNegotiationSheet open={showSalaryNegotiation} onOpenChange={setShowSalaryNegotiation} />}
      {showJobRejection && <JobRejectionSheet open={showJobRejection} onOpenChange={setShowJobRejection} />}
      {showReferenceLetter && <ReferenceLetterSheet open={showReferenceLetter} onOpenChange={setShowReferenceLetter} />}
      {showPersonalBranding && <PersonalBrandingSheet open={showPersonalBranding} onOpenChange={setShowPersonalBranding} />}
      {showColdEmail && <ColdEmailSheet open={showColdEmail} onOpenChange={setShowColdEmail} />}
      {showSkillsGap && <SkillsGapSheet open={showSkillsGap} onOpenChange={setShowSkillsGap} />}
      {showPortfolioBio && <PortfolioBioSheet open={showPortfolioBio} onOpenChange={setShowPortfolioBio} />}
    </div>
  );
}
