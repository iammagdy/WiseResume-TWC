import { downloadFile } from '@/lib/downloadUtils';
import { toast } from 'sonner';
import type { ResumeData } from '@/types/resume';

export async function shareAsPDF(blob: Blob, fileName: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName.replace('.pdf', '') });
      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return false;
      // Fall through to download
    }
  }

  // Fallback: download
  const result = await downloadFile({ blob, fileName });
  if (result.success) toast.success('PDF downloaded');
  return result.success;
}

export function generateShareableUrl(resumeId: string): string {
  return `${window.location.origin}/preview?shared=${resumeId}`;
}

export async function shareAsLink(resumeId: string): Promise<void> {
  const url = generateShareableUrl(resumeId);

  if (navigator.share) {
    try {
      await navigator.share({ title: 'My Resume', url });
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }

  await navigator.clipboard.writeText(url);
  toast.success('Link copied to clipboard');
}

export async function shareAsText(resume: ResumeData): Promise<void> {
  const lines = [
    resume.contactInfo.fullName,
    resume.contactInfo.email,
    resume.contactInfo.phone,
    resume.contactInfo.location,
    resume.contactInfo.linkedin,
    '',
    resume.summary,
  ].filter((l) => l !== undefined && l !== null && l !== '');

  const text = lines.join('\n');
  await navigator.clipboard.writeText(text);
  toast.success('Resume text copied to clipboard');
}
