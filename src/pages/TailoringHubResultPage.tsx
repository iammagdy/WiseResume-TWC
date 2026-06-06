import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Download,
  Edit3,
  FileText,
  Mail,
  Briefcase,
  Share2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useResumes, dbToResumeData, type DatabaseResume } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { useShallow } from 'zustand/react/shallow';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useQuery } from '@tanstack/react-query';
import { templates } from '@/lib/templateData';
import { TemplateId } from '@/types/resume';
import { cn } from '@/lib/utils';
import '@/components/job-match/job-match-workspace.css';

const TemplateThumbnail = lazy(() =>
  import('@/components/editor/TemplateThumbnail').then((m) => ({ default: m.TemplateThumbnail })),
);

const ATS_TEMPLATES: TemplateId[] = ['modern', 'classic', 'minimal', 'professional', 'compact', 'clean'];

type ExportFormat = 'editor' | 'cover-letter' | 'track' | 'share';

interface ResultState {
  jobTitle?: string;
  company?: string;
  jobUrl?: string | null;
  scoreBeforeAfter?: { before: number; after: number };
  appliedSections?: string[];
  intensity?: string;
}

export default function JobMatchResultPage() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: allResumes, isLoading } = useResumes();
  const {
    setCurrentResumeId,
    setCurrentResume,
    setSelectedTemplate: setSelectedTemplateStore,
    tailorHistory,
  } = useResumeStore(
    useShallow((s) => ({
      setCurrentResumeId: s.setCurrentResumeId,
      setCurrentResume: s.setCurrentResume,
      setSelectedTemplate: s.setSelectedTemplate,
      tailorHistory: s.tailorHistory,
    })),
  );

  const dbResume = useMemo(
    () => allResumes?.find((r: DatabaseResume) => r.$id === resumeId) ?? null,
    [allResumes, resumeId],
  );
  const resume = useMemo(
    () => (dbResume ? dbToResumeData(dbResume) : null),
    [dbResume],
  );

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(
    () => (dbResume?.template as TemplateId) ?? 'modern',
  );
  const hasUserPickedRef = useRef(false);
  const handlePickTemplate = useCallback((id: TemplateId) => {
    hasUserPickedRef.current = true;
    setSelectedTemplate(id);
  }, []);

  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const visibleTemplates = useMemo(() => {
    if (showAllTemplates) return templates;
    const base = templates.slice(0, 4);
    if (!base.some((t) => t.id === selectedTemplate)) {
      const sel = templates.find((t) => t.id === selectedTemplate);
      if (sel) return [...base, sel];
    }
    return base;
  }, [showAllTemplates, selectedTemplate]);

  // Issue 2: Sync selectedTemplate from dbResume after async load (runs only before user picks)
  useEffect(() => {
    if (!dbResume?.template) return;
    if (hasUserPickedRef.current) return;
    const tpl = dbResume.template as TemplateId;
    if (!templates.some((t) => t.id === tpl)) return;
    setSelectedTemplate(tpl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbResume?.template]);

  // E-7: Result enrichment — nav state → Zustand fallback → Appwrite fallback
  const resultState: ResultState = useMemo(() => {
    if (location.state?.jobTitle) return location.state as ResultState;
    const entry = tailorHistory.find((h) => h.tailoredResumeId === resumeId);
    if (entry) {
      return {
        jobTitle: entry.jobTitle,
        company: entry.company,
        jobUrl: entry.jobUrl,
        scoreBeforeAfter: entry.scoreBeforeAfter,
        appliedSections: entry.appliedSections,
      };
    }
    return {};
  }, [location.state, tailorHistory, resumeId]);

  const needsAppwriteLookup = !resultState.jobTitle && !!resumeId;

  // E-7: Appwrite fallback (3rd tier) — only runs when nav state + Zustand both lack data
  const { data: appwriteEntry } = useQuery({
    queryKey: ['tailor-history-by-resume', resumeId],
    queryFn: async () => {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.tailor_history, [
        Query.equal('tailored_resume_id', [resumeId!]),
        Query.limit(1),
      ]);
      return res.documents[0] ?? null;
    },
    enabled: needsAppwriteLookup,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const effectiveState: ResultState = useMemo(() => {
    if (resultState.jobTitle) return resultState;
    if (appwriteEntry) {
      return {
        jobTitle: appwriteEntry.job_title as string | undefined,
        company: appwriteEntry.company as string | undefined,
        jobUrl: appwriteEntry.job_url as string | undefined,
        scoreBeforeAfter: (appwriteEntry.score_before != null && appwriteEntry.score_after != null)
          ? { before: appwriteEntry.score_before as number, after: appwriteEntry.score_after as number }
          : undefined,
        appliedSections: (() => {
          try {
            return appwriteEntry.applied_sections
              ? (JSON.parse(appwriteEntry.applied_sections as string) as string[])
              : undefined;
          } catch {
            console.warn('[TailoringHub] applied_sections parse failed');
            return undefined;
          }
        })(),
      };
    }
    return resultState;
  }, [resultState, appwriteEntry]);

  // E-3: Save selected template to Appwrite resume doc (best-effort) + Zustand, then navigate or open new tab
  const navigateWithTemplate = (path: string, newTab = false) => {
    if (!resumeId) return;
    // Only update Zustand resume state for same-tab navigation (e.g., opening editor).
    // New-tab exports use ?id= URL params and don't need Zustand — skipping here
    // avoids overwriting currentResumeId with the tailored CV ID, which would cause
    // the workspace to show the tailored copy instead of the source resume on return.
    if (!newTab) {
      setCurrentResumeId(resumeId);
      if (resume) setCurrentResume(resume);
    }
    setSelectedTemplateStore(selectedTemplate);
    // Best-effort Appwrite template save — fire-and-forget
    databases.updateDocument(DATABASE_ID, COLLECTIONS.resumes, resumeId, {
      template: selectedTemplate,
    }).catch(() => {});
    if (newTab) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
  };

  // E-2: Per-format export handlers — open in new tab so user stays on result page
  const handleDesignedPDF = () => navigateWithTemplate(`/preview?id=${resumeId}&action=download`, true);
  const handleAtsPDF = () => navigateWithTemplate(`/preview?id=${resumeId}&action=ats-pdf`, true);
  const handleDocx = () => navigateWithTemplate(`/preview?id=${resumeId}&action=docx`, true);

  const handleOpenEditor = () => {
    if (!resumeId) return;
    setCurrentResumeId(resumeId);
    if (resume) setCurrentResume(resume);
    navigate(`/editor?id=${resumeId}`);
  };

  const handleAction = (action: ExportFormat) => {
    if (!resumeId) return;
    switch (action) {
      case 'editor': handleOpenEditor(); break;
      case 'cover-letter': navigate(`/cover-letter?resumeId=${resumeId}`); break;
      case 'track': navigate(`/applications?new=1&resumeId=${resumeId}`); break;
      case 'share': navigate(`/preview?id=${resumeId}&share=1`); break;
    }
  };

  const scoreDelta = effectiveState.scoreBeforeAfter
    ? Math.max(0, effectiveState.scoreBeforeAfter.after - effectiveState.scoreBeforeAfter.before)
    : 0;

  return (
    <div className="jmw-result-page">
      {/* Header */}
      <div className="jmw-header">
        <div className="jmw-header__glow" aria-hidden />
        <div className="jmw-header__inner">
          <button
            type="button"
            onClick={() => navigate('/tailoring-hub')}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
            aria-label="Back to Tailoring Hub"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-none">
                Tailored CV Ready
              </p>
              <h1 className="text-sm font-bold text-foreground leading-snug truncate">
                {isLoading ? 'Loading…' : dbResume?.title ?? 'Tailored CV'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="jmw-result-body">
        <div className="jmw-result-content">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">Loading your tailored CV…</p>
            </div>
          ) : !resume ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">Resume not found.</p>
              <Button variant="outline" onClick={() => navigate('/tailoring-hub')}>
                Back to Tailoring Hub
              </Button>
            </div>
          ) : (
            <>
              {/* E-9: 2-col layout — main column */}
              <div className="jmw-result-content__main">
                {/* ── E-7: Job context + score card ── */}
                {(effectiveState.jobTitle || effectiveState.scoreBeforeAfter) && (
                  <div className="rounded-xl border border-border/60 bg-card/85 overflow-hidden">
                    {effectiveState.jobTitle && (
                      <div className="flex items-start gap-3 px-4 py-3 border-b border-border/40">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                          <Briefcase className="w-4 h-4 text-primary" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {effectiveState.jobTitle}
                          </p>
                          {effectiveState.company && (
                            <p className="text-xs text-muted-foreground">{effectiveState.company}</p>
                          )}
                        </div>
                        {effectiveState.jobUrl && (
                          <a
                            href={effectiveState.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
                            aria-label="Open original job posting"
                          >
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                          </a>
                        )}
                      </div>
                    )}
                    {effectiveState.scoreBeforeAfter && (
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
                        <div className="flex flex-col items-center min-w-[3rem]">
                          <span className="text-xl font-bold tabular-nums text-muted-foreground">
                            {effectiveState.scoreBeforeAfter.before}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Before</span>
                        </div>
                        <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden />
                        <div className="flex flex-col items-center min-w-[3rem]">
                          <span className={cn('text-xl font-bold tabular-nums',
                            effectiveState.scoreBeforeAfter.after >= 70 ? 'text-emerald-500' :
                            effectiveState.scoreBeforeAfter.after >= 40 ? 'text-amber-500' :
                            'text-rose-500',
                          )}>
                            {effectiveState.scoreBeforeAfter.after}
                          </span>
                          <span className="text-[10px] text-muted-foreground">After</span>
                        </div>
                        {scoreDelta > 0 && (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 ml-auto">
                            +{scoreDelta} pts
                          </span>
                        )}
                      </div>
                    )}
                    {effectiveState.appliedSections && effectiveState.appliedSections.length > 0 && (
                      <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                        {effectiveState.appliedSections.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/8 text-primary/80 border border-primary/20 capitalize"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Template carousel ── */}
                <div className="jmw-dl-preview">
                  <div className="px-3.5 pt-3 pb-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Choose template
                    </p>
                  </div>
                  <div className="jmw-template-carousel" role="listbox" aria-label="Template options">
                    {visibleTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        role="option"
                        aria-selected={selectedTemplate === tpl.id}
                        className="jmw-template-thumb flex flex-col"
                        data-active={selectedTemplate === tpl.id ? 'true' : 'false'}
                        onClick={() => handlePickTemplate(tpl.id as TemplateId)}
                      >
                        <div className="w-full" style={{ aspectRatio: '8.5 / 11' }}>
                          <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
                            <TemplateThumbnail templateId={tpl.id as TemplateId} resume={resume} />
                          </Suspense>
                        </div>
                        <p className={cn(
                          'text-[10px] font-medium text-center py-1.5 px-1 truncate w-full',
                          selectedTemplate === tpl.id ? 'text-primary' : 'text-muted-foreground',
                        )}>
                          {tpl.name}
                        </p>
                      </button>
                    ))}
                  </div>
                  {!showAllTemplates && templates.length > visibleTemplates.length && (
                    <div className="px-3.5 pb-1">
                      <button
                        type="button"
                        onClick={() => setShowAllTemplates(true)}
                        className="text-xs text-primary/80 hover:text-primary transition-colors"
                      >
                        +{templates.length - visibleTemplates.length} more templates
                      </button>
                    </div>
                  )}
                  {ATS_TEMPLATES.includes(selectedTemplate) && (
                    <div className="px-3.5 pb-3">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ATS-optimised template
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* E-9: 2-col layout — sidebar column */}
              <div className="jmw-result-content__sidebar">
                {/* ── Download Studio header ── */}
                <div className="jmw-dl-header">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/12 border border-emerald-500/20 shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-500" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground">Download Studio</p>
                    <p className="text-sm font-bold text-foreground leading-snug truncate mt-0.5">
                      {dbResume?.title ?? 'Tailored CV'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pick a template and export
                    </p>
                  </div>
                </div>

                {/* ── E-2: Export format picker ── */}
                <div className="jmw-dl-format-card">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Export format
                  </p>
                  <div className="jmw-dl-format-grid">
                    <button
                      type="button"
                      className="jmw-dl-format-btn"
                      onClick={handleDesignedPDF}
                      aria-label="Open Designed PDF in preview"
                    >
                      <Download className="w-5 h-5 text-primary" aria-hidden />
                      <span>Designed PDF</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Full design</span>
                    </button>
                    <button
                      type="button"
                      className="jmw-dl-format-btn"
                      onClick={handleAtsPDF}
                      aria-label="Download ATS PDF"
                    >
                      <FileText className="w-5 h-5 text-blue-500" aria-hidden />
                      <span>ATS PDF</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Plain &amp; clean</span>
                    </button>
                    <button
                      type="button"
                      className="jmw-dl-format-btn"
                      onClick={handleDocx}
                      aria-label="Download Word DOCX"
                    >
                      <FileText className="w-5 h-5 text-indigo-500" aria-hidden />
                      <span>Word DOCX</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Editable</span>
                    </button>
                  </div>
                </div>

                {/* ── Secondary actions ── */}
                <div className="rounded-xl border border-border/60 bg-card/85 overflow-hidden">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1.5">
                    Next steps
                  </p>
                  {[
                    { icon: Edit3, label: 'Open Full Editor', sub: 'Tweak any section manually', action: 'editor' as ExportFormat },
                    { icon: Mail, label: 'Create Cover Letter', sub: 'AI-written for this role', action: 'cover-letter' as ExportFormat },
                    { icon: Briefcase, label: 'Track Application', sub: 'Add to your pipeline', action: 'track' as ExportFormat },
                    { icon: Share2, label: 'Share Resume', sub: 'Get a shareable link', action: 'share' as ExportFormat },
                  ].map(({ icon: Icon, label, sub, action }) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleAction(action)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-t border-border/40 first:border-t-0 text-left min-h-[52px] touch-manipulation"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground leading-snug">{label}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                    </button>
                  ))}
                </div>

                {/* Spacer for sticky footer */}
                <div className="h-4" aria-hidden />
              </div>
            </>
          )}
        </div>
      </div>

      {/* E-10: Sticky download footer — plain button instead of double-styled Button */}
      {resume && (
        <div className="jmw-dl-footer">
          <button
            type="button"
            className="jmw-cta-primary"
            onClick={() => navigateWithTemplate(`/preview?id=${resumeId}`)}
          >
            <ExternalLink className="w-4 h-4" aria-hidden />
            Open Preview Sheet
          </button>
        </div>
      )}
    </div>
  );
}
