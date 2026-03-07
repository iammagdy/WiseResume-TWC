import { ArrowLeft, MessageSquare, LayoutGrid, Palette, PanelLeftClose, PanelLeft, Clock, Undo2, Redo2 } from 'lucide-react';
import { OfflineIndicator } from '@/components/editor/OfflineIndicator';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';

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
}: EditorHeaderProps) {
  return (
    <header className="editor-header shrink-0 sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe transition-all duration-200">
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
            className="flex items-center gap-1 min-w-0 max-w-[40vw] sm:max-w-[55vw] cursor-pointer hover:text-primary/80 transition-colors active:scale-95 touch-manipulation"
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
            <span className="text-[9px] font-medium leading-none">{showPreview ? 'Hide' : 'Live'}</span>
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
        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={() => { haptics.light(); onTemplateBtnSeen(); onChangeTemplate(); }}
            className="relative rounded-full min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 bg-muted hover:bg-muted/80 touch-manipulation"
            aria-label="Change template"
          >
            {!templateBtnSeen && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-[ping_1.5s_ease-out_3]" />}
            <LayoutGrid className={`w-5 h-5 ${templateBtnSeen ? 'text-muted-foreground' : 'text-primary'}`} />
            <span className={`text-[9px] font-medium leading-none ${templateBtnSeen ? 'text-muted-foreground' : 'text-primary'}`}>Template</span>
          </button>
          <button
            onClick={() => { haptics.light(); onOpenChat(); }}
            className="rounded-full min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 bg-primary/10 hover:bg-primary/15 touch-manipulation"
            aria-label="Open Wise AI Chat"
          >
            <span className="relative">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
            </span>
            <span className="text-[9px] font-medium leading-none text-primary">Chat</span>
          </button>
        </div>
      </div>
    </header>
  );
}
