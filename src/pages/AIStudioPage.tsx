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
          "group relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(32,32,39,0.98),rgba(21,21,27,0.98))] shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition-all duration-200 hover:border-primary/25 hover:shadow-[0_30px_90px_rgba(0,0,0,0.36)]",
          compact ? "p-4" : "p-4"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_left,rgba(190,24,93,0.12),transparent_56%)] opacity-80" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/6 bg-white/[0.04] shadow-inner shadow-black/20">
                <Icon className={cn("h-4.5 w-4.5", workflow.color)} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
                    {compact ? "Support flow" : "Core workflow"}
                  </span>
                </div>
                <h2 className={cn("mt-2.5 font-semibold tracking-tight text-foreground", compact ? "text-[1.08rem]" : "text-[1.18rem]")}>
                  {workflow.title}
                </h2>
              </div>
            </div>
            {primaryTool ? <AICostBadge operation={primaryTool.cost} className="shrink-0 bg-white/[0.03]" /> : null}
          </div>
          <p className={cn("mt-3.5 max-w-[42ch] text-pretty text-muted-foreground", compact ? "text-[13px] leading-6" : "text-sm leading-6")}>
            {workflow.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {workflow.backingTools
              .map((toolId) => getAiStudioToolById(toolId))
              .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool && tool.visibility !== "hidden" && tool.visibility !== "excluded"))
              .slice(0, compact ? 2 : 3)
              .map((tool) => {
              return (
                <span
                  key={`${workflow.id}-${tool.id}`}
                  className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {tool.label}
                </span>
              );
            })}
          </div>

          <div className="mt-auto pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                className="min-h-[40px] rounded-2xl px-4 gradient-primary shadow-[0_18px_40px_rgba(190,24,93,0.24)]"
                onClick={() => handleWorkflowAction(workflow.primaryAction.toolId)}
              >
                {workflow.primaryAction.label}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              {workflow.secondaryActions.map((action) => (
                <Button
                  key={`${workflow.id}-${action.toolId}`}
                  variant="outline"
                  className="min-h-[40px] rounded-2xl border-white/12 bg-white/[0.02] px-4 hover:bg-white/[0.05]"
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
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(190,24,93,0.12),transparent_28%),linear-gradient(180deg,rgba(12,12,15,1),rgba(11,11,14,1))] pb-28 sm:pb-20 lg:pb-8">
      <header className="lg:hidden shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-page-title">Wise AI Workspace</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1380px] flex-1 flex-col px-4 py-2 sm:px-5 lg:px-8">
        <div className="pb-6">
          {currentResumeId && resumeData ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
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

          {recentTools.length > 0 && (
            <div className="pb-5">
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

          <div className="pb-4 pt-1">
            <div className="px-1 lg:flex lg:items-end lg:justify-between">
              <div>
                <h2 className="text-[1.5rem] font-semibold tracking-tight text-foreground">Primary workflows</h2>
                <p className="mt-1 text-sm text-muted-foreground">Start with the main outcomes most people need from Wise AI.</p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground lg:mt-0">Built to feel like one workspace, not a long list of isolated tools.</p>
            </div>
          </div>
          <div className="grid gap-5 pb-8 lg:grid-cols-2">
            {aiStudioPrimaryWorkflows.map((workflow) => renderWorkflowCard(workflow))}
          </div>

          <div className="pb-4">
            <div className="px-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Secondary tools</h2>
              <p className="mt-1 text-sm text-muted-foreground">Useful supporting workflows that stay available without crowding the main workspace.</p>
            </div>
          </div>
          <div className="grid gap-5 pb-8 md:grid-cols-2">
            {aiStudioSecondaryWorkflows.map((workflow) => renderWorkflowCard(workflow, true))}
          </div>

          {!tipDismissed && (
            <div className="pb-8">
              <div className="relative flex items-start gap-2 rounded-2xl border border-primary/10 bg-primary/5 p-4">
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
        </div>
      </div>

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
