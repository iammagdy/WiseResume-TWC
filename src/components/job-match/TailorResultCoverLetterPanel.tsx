import { useState } from 'react';
import { Download, Edit3, FileText, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { CoverLetterPreview } from '@/components/cover-letter/CoverLetterPreview';
import type { CoverLetterRecord } from '@/hooks/useCoverLetters';
import type { TemplateStyle } from '@/lib/coverLetterPdfGenerator';
import { toast } from 'sonner';

interface TailorResultCoverLetterPanelProps {
  coverLetter: CoverLetterRecord;
  onEdit: () => void;
}

export function TailorResultCoverLetterPanel({
  coverLetter,
  onEdit,
}: TailorResultCoverLetterPanelProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const { downloadCoverLetterPDF } = await import('@/lib/coverLetterPdfGenerator');
      await downloadCoverLetterPDF({
        job_title: coverLetter.job_title || 'Cover Letter',
        company: coverLetter.company,
        content: coverLetter.content,
        title: coverLetter.title,
        tone: coverLetter.tone ?? undefined,
        template_style: (coverLetter.template_style as TemplateStyle | null) ?? undefined,
      });
      toast.success('Cover letter PDF downloaded');
    } catch {
      toast.error('Failed to download cover letter PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="jmw-result-cover-letter" aria-label="Linked cover letter">
      <div className="jmw-result-cover-letter__head">
        <div className="jmw-result-cover-letter__title-row">
          <Mail className="w-4 h-4 text-primary shrink-0" aria-hidden />
          <div className="min-w-0">
            <h2 className="jmw-result-cover-letter__title">Cover letter</h2>
            <p className="jmw-result-cover-letter__subtitle truncate">
              {coverLetter.job_title}
              {coverLetter.company ? ` · ${coverLetter.company}` : ''}
            </p>
          </div>
        </div>
        <div className="jmw-result-cover-letter__actions">
          <Button variant="outline" size="sm" className="h-8" onClick={onEdit}>
            <Edit3 className="w-3.5 h-3.5 mr-1.5" aria-hidden />
            Edit
          </Button>
          <Button size="sm" className="h-8" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <MiniSpinner size={14} />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" aria-hidden />
            )}
            PDF
          </Button>
        </div>
      </div>

      <div className="jmw-result-cover-letter__preview">
        <CoverLetterPreview
          templateStyle={(coverLetter.template_style as TemplateStyle) || 'professional'}
          title={coverLetter.job_title || 'Cover Letter'}
          company={coverLetter.company}
          content={coverLetter.content}
        />
      </div>

      <p className="jmw-result-cover-letter__hint">
        <FileText className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" aria-hidden />
        Linked to this tailored CV for the same application.
      </p>
    </section>
  );
}
