import { useState } from 'react';
import { ArrowLeft, MessageSquare, LayoutGrid, Palette, PanelLeftClose, PanelLeft, Clock, Undo2, Redo2, Download, Loader2, Cloud, CloudOff, Check, Save, BarChart3, ChevronDown } from 'lucide-react';
import { OfflineIndicator } from '@/components/editor/OfflineIndicator';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ATSScoreBreakdown } from '@/components/dashboard/ATSScoreBreakdown';
import type { ResumeHealthScore } from '@/hooks/useResumeScore';

export interface EditorHeaderProps {
  resumeTitle: string | undefined;
  isSyncing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string;
  redoDescription: string;
  isAuthenticated: boolean;
  currentResumeId: string | null;
  showPreview: boolean;
  templateBtnSeen: boolean;
  isQuickDownloading?: boolean;
  overallScore: number;
  steps: Array<{ id: string; label: string }>;
  sectionStatus: Record<string, boolean>;
  localHealthScore: ResumeHealthScore | null;
  isSaving: boolean;
  showSavedCheck: boolean;
  hasUnsavedChanges: boolean;
  isOnline: boolean;
  pendingCountForResume: number;
  onSave: () => void;
  onImproveSection: () => void;
  onBack: () => void;
  onTitleClick: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onVersionHistory: () => void;
  onChangeTemplate: () => void;
  onCustomize: () => void;
  onTogglePreview: () => void;
  onOpenChat: () => void;
  onTemplateBtnSeen: () => void;
  onDownload: () => void;
}

function getProgressColor(progress: number): string {
  if (progress >= 100) return 'hsl(var(--success))';
  if (progress >= 67) return 'hsl(140, 70%, 45%)';
  if (progress >= 34) return 'hsl(40, 90%, 50%)';
  return 'hsl(0, 80%, 55%)';
}

function ProgressChip({
  overallScore,
  steps,
  sectionStatus,
  localHealthScore,
  isSaving,
  showSavedCheck,
  hasUnsavedChanges,
  isOnline,
  pendingCountForResume,
  isAuthenticated,
  currentResumeId,
  onSave,
  onImproveSection,
}: {
  overallScore: number;
  steps: Array<{ id: string; label: string }>;
  sectionStatus: Record<string, boolean>;
  localHealthScore: ResumeHealthScore | null;
  isSaving: boolean;
  showSavedCheck: boolean;
  hasUnsavedChanges: boolean;
  isOnline: boolean;
  pendingCountForResume: number;
  isAuthenticated: boolean;
  currentResumeId: string | null;
  onSave: () => void;
  onImproveSection: () => void;
}) {
  const [open, setOpen] = useState(false);
  const color = getProgressColor(overallScore);
  const completedSections = steps.filter(s => s.id !== 'more' && sectionStatus[s.id]).length;
  const totalSections = steps.filter(s => s.id !== 'more').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted active:scale-95 transition-all touch-manipulation min-h-[36px]"
          aria-label="Resume completion progress"
        >
          {/* Mini pill bar */}
          <div className="w-12 h-1.5 rounded-full bg-secondary/40 overflow-hidden hidden sm:block">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, overallScore))}%`, background: color }}
            />
          </div>
          <span
            className="text-xs font-bold whitespace-nowrap transition-colors duration-500"
            style={{ color }}
          >
            {overallScore}%
          </span>
          {/* Persistent save-state glyph */}
          {isAuthenticated && currentResumeId && (
            !isOnline ? (
              <CloudOff className="w-3 h-3 text-warning shrink-0" />
            ) : isSaving ? (
              <Cloud className="w-3 h-3 shrink-0 animate-pulse text-muted-foreground" />
            ) : showSavedCheck ? (
              <Check className="w-3 h-3 shrink-0 text-success" />
            ) : hasUnsavedChanges ? (
              <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block animate-pulse shrink-0" />
            ) : (
              <Cloud className="w-3 h-3 shrink-0 opacity-30 text-muted-foreground" />
            )
          )}
          <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform duration-200 shrink-0', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-80 p-0 overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Resume Progress</span>
            </div>
            <span className="text-sm font-bold" style={{ color }}>{overallScore}%</span>
          </div>
          {/* Full progress bar */}
          <div className="h-2 rounded-full bg-secondary/30 overflow-hidden" role="progressbar" aria-valuenow={overallScore} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, overallScore))}%`, background: color, boxShadow: `0 0 8px ${color}` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            {completedSections}/{totalSections} sections complete
          </div>
        </div>

        {/* Save status */}
        {(isAuthenticated && currentResumeId) && (
          <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {!isOnline ? (
                <>
                  <CloudOff className="w-3 h-3 text-warning" />
                  <span className="text-warning">Offline</span>
                </>
              ) : isSaving ? (
                <>
                  <Cloud className="w-3 h-3 animate-pulse" />
                  <span>Saving…</span>
                </>
              ) : showSavedCheck ? (
                <>
                  <Check className="w-3 h-3 text-success" style={{ animation: 'save-check-pop 0.3s ease-out' }} />
                  <span className="text-success">Saved</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block animate-pulse" />
                  <span className="text-warning">Unsaved changes</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3 opacity-40" />
                  <span>Auto-saved</span>
                </>
              )}
            </div>
            {(hasUnsavedChanges || pendingCountForResume > 0) && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSave}
                disabled={isSaving || !isOnline}
                className="h-7 px-2.5 text-[11px] gap-1 rounded-md border-warning/40 text-warning hover:bg-warning/10 hover:border-warning/60"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save
              </Button>
            )}
          </div>
        )}

        {/* ATS Breakdown */}
        {localHealthScore && (
          <div className="px-4 py-3 max-h-64 overflow-y-auto">
            <ATSScoreBreakdown
              healthScore={localHealthScore}
              compact
              defaultOpen
              onImprove={() => { setOpen(false); onImproveSection(); }}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}


export function EditorHeader({
  resumeTitle,
  isSyncing,
  canUndo,
  canRedo,
  undoDescription,
  redoDescription,
  isAuthenticated,
  currentResumeId,
  showPreview,
  templateBtnSeen,
  isQuickDownloading = false,
  overallScore,
  steps,
  sectionStatus,
  localHealthScore,
  isSaving,
  showSavedCheck,
  hasUnsavedChanges,
  isOnline,
  pendingCountForResume,
  onSave,
  onImproveSection,
  onBack,
  onTitleClick,
  onUndo,
  onRedo,
  onVersionHistory,
  onChangeTemplate,
  onCustomize,
  onTogglePreview,
  onOpenChat,
  onTemplateBtnSeen,
  onDownload,
}: EditorHeaderProps) {
  return (
    <header className="editor-header shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 pt-safe transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            className="flex items-center gap-1 min-w-0 max-w-[40vw] sm:max-w-[50vw] cursor-pointer hover:text-primary/80 transition-colors active:scale-95 touch-manipulation"
            title={resumeTitle || 'Edit Resume'}
            onClick={onTitleClick}
            aria-label="Switch resume"
          >
            <span className="text-h3 truncate">
              {resumeTitle || 'Edit Resume'}
            </span>
          </button>
          <OfflineIndicator isSyncing={isSyncing} />
          {/* Undo/Redo buttons */}
          <div className="hidden sm:flex items-center gap-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={cn(
                'p-2 rounded-lg transition-all touch-manipulation active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center',
                canUndo ? 'hover:bg-muted text-foreground' : 'text-muted-foreground/30 cursor-not-allowed'
              )}
              aria-label={canUndo ? `Undo: ${undoDescription}` : 'Nothing to undo'}
              title={canUndo ? `Undo: ${undoDescription}` : 'Nothing to undo'}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={cn(
                'p-2 rounded-lg transition-all touch-manipulation active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center',
                canRedo ? 'hover:bg-muted text-foreground' : 'text-muted-foreground/30 cursor-not-allowed'
              )}
              aria-label={canRedo ? `Redo: ${redoDescription}` : 'Nothing to redo'}
              title={canRedo ? `Redo: ${redoDescription}` : 'Nothing to redo'}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          {isAuthenticated && currentResumeId && (
            <button
              onClick={onVersionHistory}
              className="keyboard-hide p-2 rounded-lg hover:bg-muted active:scale-95 transition-all touch-manipulation hidden sm:inline-flex min-w-[44px] min-h-[44px] items-center justify-center"
              aria-label="Version history"
            >
              <Clock className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {/* Compact progress chip — always visible */}
          <ProgressChip
            overallScore={overallScore}
            steps={steps}
            sectionStatus={sectionStatus}
            localHealthScore={localHealthScore}
            isSaving={isSaving}
            showSavedCheck={showSavedCheck}
            hasUnsavedChanges={hasUnsavedChanges}
            isOnline={isOnline}
            pendingCountForResume={pendingCountForResume}
            isAuthenticated={isAuthenticated}
            currentResumeId={currentResumeId}
            onSave={onSave}
            onImproveSection={onImproveSection}
          />
        </div>
        {/* Desktop buttons - hidden on mobile */}
        <div className="hidden md:flex items-center gap-1.5">
          {/* Template gallery shortcut */}
          <button
            onClick={() => { onChangeTemplate(); haptics.light(); }}
            className="keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 hover:bg-muted text-muted-foreground"
            aria-label="Open template gallery"
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[9px] font-medium leading-none">Template</span>
          </button>
          {/* Design shortcut */}
          <button
            onClick={() => { onCustomize(); haptics.light(); }}
            className="keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 hover:bg-muted text-muted-foreground"
            aria-label="Open design customization"
          >
            <Palette className="w-5 h-5" />
            <span className="text-[9px] font-medium leading-none">Design</span>
          </button>
          {/* Live Preview Toggle */}
          <button
            onClick={() => { onTogglePreview(); haptics.light(); }}
            className={cn(
              'keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95',
              showPreview ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground'
            )}
            aria-label={showPreview ? 'Hide live preview' : 'Show live preview'}
          >
            {showPreview ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            <span className="text-[9px] font-medium leading-none">{showPreview ? 'Hide' : 'Show'}</span>
          </button>
          {/* Download shortcut */}
          <button
            onClick={() => { onDownload(); haptics.light(); }}
            disabled={isQuickDownloading}
            className="keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 hover:bg-muted text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Download resume as PDF"
          >
            {isQuickDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span className="text-[9px] font-medium leading-none">Download</span>
          </button>
          <button
            onClick={onOpenChat}
            className="keyboard-hide relative rounded-full transition-all touch-manipulation min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 -mr-2 bg-primary/10 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.5)] hover:bg-primary/15 active:scale-95"
            aria-label="Open Wise AI Chat"
          >
            <span className="relative">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
            </span>
            <span className="text-[9px] font-medium leading-none text-primary">Wise AI</span>
          </button>
        </div>
        {/* Mobile-only: consolidated tools trigger */}
        <div className="flex items-center gap-0.5 md:hidden">
          <button
            onClick={() => { haptics.light(); onTemplateBtnSeen(); onChangeTemplate(); }}
            className="relative rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center active:scale-95 bg-muted hover:bg-muted/80 touch-manipulation"
            aria-label="Change template"
          >
            {!templateBtnSeen && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-[ping_1.5s_ease-out_3]" />}
            <LayoutGrid className={`w-5 h-5 ${templateBtnSeen ? 'text-muted-foreground' : 'text-primary'}`} />
          </button>
          {/* Mobile download button */}
          <button
            onClick={() => { haptics.light(); onDownload(); }}
            disabled={isQuickDownloading}
            className="rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center active:scale-95 bg-muted hover:bg-muted/80 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Download resume as PDF"
          >
            {isQuickDownloading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Download className="w-5 h-5 text-muted-foreground" />}
          </button>
          <button
            onClick={() => { haptics.light(); onOpenChat(); }}
            className="rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center active:scale-95 bg-primary/10 hover:bg-primary/15 touch-manipulation"
            aria-label="Open Wise AI Chat"
          >
            <span className="relative">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
