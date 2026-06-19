import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { ArrowRight, Clock, FileSearch, Lightbulb, Sparkles, X, Send } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { createRouteOverlayOpenChange } from "@/hooks/useRouteOverlaySync";
import {
  aiStudioPrimaryWorkflows,
  aiStudioSecondaryWorkflows,
  getAiStudioToolById,
  getAiStudioToolByPath,
  getAiStudioToolPath,
  type AiStudioToolEntry,
  type AiStudioWorkflowEntry,
} from "@/lib/aiStudioTools";
import { AIStudioSkeleton } from "@/components/layout/PageSkeletons";

const AI_STUDIO_BASE_PATH = "/ai-studio";

const TailorSheet = lazyWithRetry(() => import("@/components/editor/TailorSheet").then((m) => ({ default: m.TailorSheet })));
const RecruiterSimSheet = lazyWithRetry(() => import("@/components/editor/ai/RecruiterSimSheet").then((m) => ({ default: m.RecruiterSimSheet })));
const AIDetectorSheet = lazyWithRetry(() => import("@/components/editor/ai/AIDetectorSheet").then((m) => ({ default: m.AIDetectorSheet })));
const LinkedInOptimizerSheet = lazyWithRetry(() => import("@/components/editor/ai/LinkedInOptimizerSheet").then((m) => ({ default: m.LinkedInOptimizerSheet })));
const OnePageWizardSheet = lazyWithRetry(() => import("@/components/editor/ai/SmartFitWizardSheet").then((m) => ({ default: m.SmartFitWizardSheet })));
const AgenticChatSheet = lazyWithRetry(() => import("@/components/editor/AgenticChatSheet").then((m) => ({ default: m.AgenticChatSheet })));
const AIEnhanceSheet = lazyWithRetry(() => import("@/components/editor/ai/AIEnhanceSheet").then((m) => ({ default: m.AIEnhanceSheet })));
const ResumeABCompareSheet = lazyWithRetry(() => import("@/components/ai-studio/ResumeABCompareSheet"));
const SkillsGapSheet = lazyWithRetry(() => import("@/components/ai-studio/SkillsGapSheet"));

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
  const [showSkillsGap, setShowSkillsGap] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [showStudioTour, setShowStudioTour] = useState(false);

  useEffect(() => {
    if (!hasSeenAIStudioTour && isPro && !planLoading) {
      setShowStudioTour(true);
    }
  }, [hasSeenAIStudioTour, isPro, planLoading]);

  const [searchParams] = useSearchParams();
  const activatedToolRef = useRef<string | null>(null);
  const [chatInitialMessage, setChatInitialMessage] = useState("");

  const [showResumePicker, setShowResumePicker] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const { data: allResumes } = useResumes({ select: (data) => data.slice(0, 5) });

  const dismissToolRoute = useCallback(() => {
    activatedToolRef.current = null;
  }, []);

  const closeAllToolSheets = useCallback(() => {
    setShowChat(false);
    setShowTailor(false);
    setShowRecruiterSim(false);
    setShowAIDetector(false);
    setShowLinkedIn(false);
    setShowOnePage(false);
    setShowEnhance(false);
    setShowABCompare(false);
    setShowCompanyBriefing(false);
    setShowSkillsGap(false);
    setChatInitialMessage("");
  }, []);

  const bindToolSheetOpenChange = useCallback(
    (toolId: string, setOpen: (open: boolean) => void, onClose?: () => void) =>
      createRouteOverlayOpenChange(setOpen, navigate, {
        activeRouteKey: toolParam,
        overlayRouteKey: toolId,
        basePath: AI_STUDIO_BASE_PATH,
        onRouteDismiss: () => {
          dismissToolRoute();
          onClose?.();
        },
      }),
    [dismissToolRoute, navigate, toolParam],
  );

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
      "skills-gap": () => setShowSkillsGap(true),
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
    if (!toolParam) {
      activatedToolRef.current = null;
      closeAllToolSheets();

      const queryTool = searchParams.get("tool");
      if (queryTool) {
        navigate(`${AI_STUDIO_BASE_PATH}/${queryTool}`, { replace: true });
      }
      return;
    }

    if (activatedToolRef.current === toolParam) return;

    closeAllToolSheets();
    activatedToolRef.current = toolParam;
    openToolById(toolParam);
  }, [closeAllToolSheets, navigate, openToolById, searchParams, toolParam]);

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
      navigate(`${AI_STUDIO_BASE_PATH}/${tool.id}`);
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

  if (planLoading) return <AIStudioSkeleton />;

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
    const isPrimary = !compact;
    const backingTools = workflow.backingTools
      .map((toolId) => getAiStudioToolById(toolId))
      .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool && tool.visibility !== "hidden" && tool.visibility !== "excluded"))
      .slice(0, compact ? 1 : 2);

    return (
      <article
        key={workflow.id}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card/85 backdrop-blur-sm",
          "transition-colors duration-200 hover:border-primary/25 hover:bg-card",
          isPrimary ? "border-primary/25 shadow-soft-sm" : "border-border/60",
          compact ? "p-3" : "p-3.5 sm:p-4",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl border border-border/50",
              isPrimary ? "bg-primary/10" : "bg-muted/25",
              compact ? "h-9 w-9" : "h-10 w-10",
            )}
          >
            <Icon className={cn(compact ? "h-4 w-4" : "h-[18px] w-[18px]", isPrimary ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className={cn("font-semibold leading-snug tracking-tight text-foreground", compact ? "text-sm" : "text-base")}>
                {workflow.title}
              </h2>
              {primaryTool ? <AICostBadge operation={primaryTool.cost} className="shrink-0 scale-90 origin-top-right" /> : null}
            </div>
            <p
              className={cn(
                "mt-1.5 line-clamp-2 text-pretty text-muted-foreground",
                compact ? "text-xs leading-5" : "text-[13px] leading-5",
              )}
            >
              {workflow.description}
            </p>
          </div>
        </div>

        {backingTools.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {backingTools.map((tool) => (
              <span
                key={`${workflow.id}-${tool.id}`}
                className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tool.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className={cn("mt-auto flex flex-wrap gap-2", compact ? "pt-3" : "pt-3.5")}>
          <Button
            size="sm"
            className={cn(
              "min-h-9 rounded-xl px-3 gradient-primary shadow-none",
              workflow.secondaryActions.length === 0 ? "w-full" : "flex-1",
            )}
            onClick={() => handleWorkflowAction(workflow.primaryAction.toolId)}
          >
            <span className="truncate">{workflow.primaryAction.label}</span>
            <ArrowRight className="ml-1 h-3.5 w-3.5 shrink-0" />
          </Button>
          {workflow.secondaryActions.map((action) => (
            <Button
              key={`${workflow.id}-${action.toolId}`}
              variant="outline"
              size="sm"
              className="min-h-9 rounded-xl border border-border/60 bg-transparent px-3 hover:bg-muted/30"
              onClick={() => handleWorkflowAction(action.toolId)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </article>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto dashboard-workspace-os-bg pb-28 sm:pb-20 lg:pb-8">
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

          <div className="sticky top-0 z-30 pb-4 pt-1 -mx-1 px-1 bg-background/80 backdrop-blur-md lg:static lg:bg-transparent lg:backdrop-blur-none">
            <form
              className="flex gap-2 items-center rounded-2xl border border-border/70 bg-card/90 p-2 shadow-soft-sm"
              onSubmit={(e) => {
                e.preventDefault();
                const message = composerText.trim();
                if (!message) return;
                setComposerText("");
                openChatWithMessage(message);
              }}
            >
              <Input
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder={PLACEHOLDER_EXAMPLES[placeholderIdx]}
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 min-h-[44px]"
                aria-label="Ask Wise AI"
              />
              <Button type="submit" size="sm" className="min-h-[44px] min-w-[44px] px-3 rounded-xl shrink-0" aria-label="Send message">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>

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
                    <tool.icon className={cn("w-4 h-4", "text-primary")} />
                    <span className="text-sm font-medium whitespace-nowrap">{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pb-3 pt-1">
            <div className="px-1 lg:flex lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Primary workflows</h2>
                <p className="mt-1 text-sm text-muted-foreground">Start with the main outcomes most people need from Wise AI.</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground lg:mt-0 lg:max-w-xs lg:text-right">Built to feel like one workspace, not a long list of isolated tools.</p>
            </div>
          </div>
          <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-3">
            {aiStudioPrimaryWorkflows.map((workflow) => renderWorkflowCard(workflow))}
          </div>

          <div className="pb-3">
            <div className="px-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Secondary tools</h2>
              <p className="mt-1 text-sm text-muted-foreground">Supporting workflows that stay available without crowding the main grid.</p>
            </div>
          </div>
          <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-3">
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
              onOpenChange={bindToolSheetOpenChange("chat", setShowChat, () => setChatInitialMessage(""))}
              initialMessage={chatInitialMessage}
            />
          )}
          {showTailor && <TailorSheet open={showTailor} onOpenChange={bindToolSheetOpenChange("tailor", setShowTailor)} />}
          {showRecruiterSim && (
            <RecruiterSimSheet open={showRecruiterSim} onOpenChange={bindToolSheetOpenChange("recruiter", setShowRecruiterSim)} />
          )}
          {showAIDetector && (
            <AIDetectorSheet open={showAIDetector} onOpenChange={bindToolSheetOpenChange("humanizer", setShowAIDetector)} />
          )}
          {showLinkedIn && (
            <LinkedInOptimizerSheet open={showLinkedIn} onOpenChange={bindToolSheetOpenChange("linkedin", setShowLinkedIn)} />
          )}
          {showOnePage && (
            <OnePageWizardSheet open={showOnePage} onOpenChange={bindToolSheetOpenChange("onepage", setShowOnePage)} />
          )}
          {showEnhance && <AIEnhanceSheet open={showEnhance} onOpenChange={bindToolSheetOpenChange("enhance", setShowEnhance)} />}
          {showABCompare && (
            <ResumeABCompareSheet open={showABCompare} onOpenChange={bindToolSheetOpenChange("ab-compare", setShowABCompare)} />
          )}
          {showCompanyBriefing && (
            <CompanyBriefingSheet
              open={showCompanyBriefing}
              onOpenChange={bindToolSheetOpenChange("company-briefing", setShowCompanyBriefing)}
              jobDescription=""
              resumeData={
                resumeData
                  ? {
                      summary: resumeData.summary ?? undefined,
                      experience: resumeData.experience ?? undefined,
                      skills: resumeData.skills ?? undefined,
                    }
                  : undefined
              }
            />
          )}
          {showSkillsGap && (
            <SkillsGapSheet open={showSkillsGap} onOpenChange={bindToolSheetOpenChange("skills-gap", setShowSkillsGap)} />
          )}
        </Suspense>
      </ErrorBoundary>

      <Dialog open={showStudioTour} onOpenChange={(open) => {
        setShowStudioTour(open);
        if (!open) setHasSeenAIStudioTour(true);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Welcome to Wise AI Workspace</DialogTitle>
            <DialogDescription>
              Use the prompt bar to ask Wise AI anything, or pick a workflow card to tailor your resume, prep for interviews, and more.
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-full"
            onClick={() => {
              setHasSeenAIStudioTour(true);
              setShowStudioTour(false);
            }}
          >
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
