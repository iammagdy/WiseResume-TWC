import { useState } from 'react';
import { FileText, Link, Type, MessageSquare } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { haptics } from '@/lib/haptics';
import { shareAsPDF, shareAsLink, shareAsText } from '@/lib/shareUtils';
// pdfGenerator is dynamically imported in handleSharePDF to reduce initial bundle
import type { ResumeData, TemplateId, SectionId } from '@/types/resume';
import { cn } from '@/lib/utils';
import { useShareComments } from '@/hooks/useShareComments';
import { ShareFeedbackSheet } from './ShareFeedbackSheet';

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: ResumeData;
  templateId: TemplateId;
  templateName: string;
  resumeRef: React.RefObject<HTMLDivElement>;
  manualBreakSections?: SectionId[];
  shareId?: string;
}

export function ShareSheet({
  open,
  onOpenChange,
  resume,
  templateId,
  templateName,
  resumeRef,
  manualBreakSections,
  shareId,
}: ShareSheetProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const { data: comments = [] } = useShareComments(shareId || null);
  const unresolvedCount = comments.filter(c => !c.is_resolved).length;

  const handleSharePDF = async () => {
    haptics.medium();
    setIsGeneratingPDF(true);
    try {
      const { generatePDF } = await import('@/lib/pdfGenerator');
      const pdfBlob = await generatePDF(resume, templateId, resumeRef.current, manualBreakSections, { showPageNumbers: true });
      const fileName = `${resume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Resume'}_Resume.pdf`;
      const shared = await shareAsPDF(pdfBlob, fileName);
      if (shared) {
        haptics.success();
        onOpenChange(false);
      }
    } catch {
      haptics.error();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShareLink = async () => {
    haptics.medium();
    if (resume.id) {
      await shareAsLink(resume.id);
      haptics.success();
      onOpenChange(false);
    }
  };

  const handleShareText = async () => {
    haptics.medium();
    await shareAsText(resume);
    haptics.success();
    onOpenChange(false);
  };

  const actions = [
    {
      icon: FileText,
      title: 'Share as PDF',
      subtitle: 'Opens your device\'s share menu',
      onClick: handleSharePDF,
      loading: isGeneratingPDF,
    },
    {
      icon: Link,
      title: 'Share Link',
      subtitle: 'Copy link or share via apps',
      onClick: handleShareLink,
      disabled: !resume.id,
    },
    {
      icon: Type,
      title: 'Share as Text',
      subtitle: 'Copy resume summary to clipboard',
      onClick: handleShareText,
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>Share Resume</SheetTitle>
            <SheetDescription className="sr-only">Choose how to share your resume</SheetDescription>
          </SheetHeader>

          {/* Resume info card */}
          <div className="flex items-center gap-3 p-3 rounded-xl glass-surface mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {resume.contactInfo.fullName || 'Untitled Resume'}
              </p>
              <Badge variant="secondary" className="text-[10px] mt-0.5">{templateName}</Badge>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            {actions.map((action) => (
              <button
                key={action.title}
                onClick={action.onClick}
                disabled={action.loading || action.disabled}
                className={cn(
                  'w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all touch-manipulation',
                  'glass-surface hover:bg-muted/50 active:scale-[0.98]',
                  'disabled:opacity-50 disabled:pointer-events-none',
                  'min-h-[52px]'
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {action.loading ? (
                    <MiniSpinner size={20} />
                  ) : (
                    <action.icon className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                </div>
              </button>
            ))}

            {/* View Feedback button (only if share has comments) */}
            {shareId && (
              <button
                onClick={() => { haptics.light(); setShowFeedback(true); onOpenChange(false); }}
                className={cn(
                  'w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all touch-manipulation',
                  'glass-surface hover:bg-muted/50 active:scale-[0.98]',
                  'min-h-[52px]'
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">View Feedback</p>
                  <p className="text-xs text-muted-foreground">See comments from reviewers</p>
                </div>
                {unresolvedCount > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{unresolvedCount}</Badge>
                )}
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {shareId && (
        <ShareFeedbackSheet
          open={showFeedback}
          onOpenChange={setShowFeedback}
          shareId={shareId}
        />
      )}
    </>
  );
}
