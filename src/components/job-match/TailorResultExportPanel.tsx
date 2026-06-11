import { ChevronDown, Download, Edit3, ExternalLink, FileText, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { templates } from '@/lib/templateData';
import type { TemplateId } from '@/types/resume';
import { cn } from '@/lib/utils';

const QUICK_TEMPLATES: TemplateId[] = ['modern', 'classic', 'minimal', 'professional'];

interface TailorResultExportPanelProps {
  selectedTemplate: TemplateId;
  onTemplateChange: (id: TemplateId) => void;
  onDesignedPdf: () => void;
  onAtsPdf: () => void;
  onDocx: () => void;
  onPreview: () => void;
  onEditor: () => void;
  onCoverLetter: () => void;
  resumeTitle?: string;
  hasCoverLetter?: boolean;
  onDownloadCoverLetter?: () => void;
  onDownloadBoth?: () => void;
  coverLetterBusy?: boolean;
}

export function TailorResultExportPanel({
  selectedTemplate,
  onTemplateChange,
  onDesignedPdf,
  onAtsPdf,
  onDocx,
  onPreview,
  onEditor,
  onCoverLetter,
  resumeTitle,
  hasCoverLetter = false,
  onDownloadCoverLetter,
  onDownloadBoth,
  coverLetterBusy = false,
}: TailorResultExportPanelProps) {
  const selectedName = templates.find((t) => t.id === selectedTemplate)?.name ?? 'Modern';

  return (
    <aside className="jmw-export-panel">
      <div className="jmw-export-panel__head">
        <p className="jmw-export-panel__title">Export</p>
        {resumeTitle && (
          <p className="jmw-export-panel__subtitle truncate">{resumeTitle}</p>
        )}
      </div>

      <div className="jmw-export-panel__template">
        <span className="jmw-export-panel__label">Template</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between h-9 text-sm font-medium">
              {selectedName}
              <ChevronDown className="w-4 h-4 opacity-60" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto w-[var(--radix-dropdown-menu-trigger-width)]">
            {templates.map((tpl) => (
              <DropdownMenuItem
                key={tpl.id}
                onClick={() => onTemplateChange(tpl.id as TemplateId)}
                className={cn(selectedTemplate === tpl.id && 'bg-primary/10 text-primary')}
              >
                {tpl.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="jmw-export-panel__quick-tpls" role="group" aria-label="Quick template picks">
          {QUICK_TEMPLATES.map((id) => {
            const name = templates.find((t) => t.id === id)?.name ?? id;
            return (
              <button
                key={id}
                type="button"
                className={cn('jmw-export-panel__tpl-pill', selectedTemplate === id && 'jmw-export-panel__tpl-pill--active')}
                onClick={() => onTemplateChange(id)}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <Button className="w-full h-10" onClick={onDesignedPdf}>
        <Download className="w-4 h-4 mr-2" aria-hidden />
        Download CV PDF
      </Button>

      {hasCoverLetter && onDownloadCoverLetter && (
        <>
          <Button
            variant="outline"
            className="w-full h-10"
            onClick={onDownloadCoverLetter}
            disabled={coverLetterBusy}
          >
            <Mail className="w-4 h-4 mr-2" aria-hidden />
            {coverLetterBusy ? 'Preparing…' : 'Download cover letter PDF'}
          </Button>
          {onDownloadBoth && (
            <Button variant="secondary" className="w-full h-10" onClick={onDownloadBoth}>
              <Download className="w-4 h-4 mr-2" aria-hidden />
              Download both
            </Button>
          )}
        </>
      )}

      <div className="jmw-export-panel__secondary">
        <button type="button" className="jmw-export-panel__alt-btn" onClick={onAtsPdf}>
          <FileText className="w-4 h-4" aria-hidden />
          ATS PDF
        </button>
        <button type="button" className="jmw-export-panel__alt-btn" onClick={onDocx}>
          <FileText className="w-4 h-4" aria-hidden />
          Word
        </button>
      </div>

      <button type="button" className="jmw-export-panel__link" onClick={onPreview}>
        <ExternalLink className="w-3.5 h-3.5" aria-hidden />
        Full preview &amp; share
      </button>

      <div className="jmw-export-panel__divider" />

      <button type="button" className="jmw-export-panel__link" onClick={onEditor}>
        <Edit3 className="w-3.5 h-3.5" aria-hidden />
        Open in editor
      </button>
      <button type="button" className="jmw-export-panel__link" onClick={onCoverLetter}>
        <Mail className="w-3.5 h-3.5" aria-hidden />
        {hasCoverLetter ? 'Regenerate cover letter' : 'Create cover letter'}
      </button>
    </aside>
  );
}
