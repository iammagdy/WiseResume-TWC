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
    }
  }

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
  const text = generatePlainText(resume);
  await navigator.clipboard.writeText(text);
  toast.success('Resume text copied to clipboard');
}

/** Generates a full plain-text representation of the resume for .txt export */
export function generatePlainText(resume: ResumeData): string {
  const lines: string[] = [];
  const { contactInfo } = resume;

  // Header
  if (contactInfo.fullName) lines.push(contactInfo.fullName.toUpperCase());
  const contactParts = [contactInfo.email, contactInfo.phone, contactInfo.location, contactInfo.linkedin, contactInfo.portfolio].filter(Boolean);
  if (contactParts.length) lines.push(contactParts.join(' | '));
  lines.push('');

  // Summary
  if (resume.summary) {
    lines.push('PROFESSIONAL SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(resume.summary);
    lines.push('');
  }

  // Experience
  if (resume.experience?.length) {
    lines.push('WORK EXPERIENCE');
    lines.push('-'.repeat(40));
    for (const exp of resume.experience) {
      lines.push(`${exp.position} | ${exp.company}`);
      lines.push(`${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`);
      if (exp.description) lines.push(exp.description);
      for (const a of exp.achievements || []) {
        lines.push(`  • ${a}`);
      }
      lines.push('');
    }
  }

  // Education
  if (resume.education?.length) {
    lines.push('EDUCATION');
    lines.push('-'.repeat(40));
    for (const edu of resume.education) {
      lines.push(`${edu.degree} in ${edu.field} | ${edu.institution}`);
      lines.push(`${edu.startDate} - ${edu.endDate}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`);
      lines.push('');
    }
  }

  // Skills
  if (resume.skills?.length) {
    lines.push('SKILLS');
    lines.push('-'.repeat(40));
    lines.push(resume.skills.join(', '));
    lines.push('');
  }

  // Certifications
  if (resume.certifications?.length) {
    lines.push('CERTIFICATIONS');
    lines.push('-'.repeat(40));
    for (const cert of resume.certifications) {
      lines.push(`${cert.name} - ${cert.issuer} (${cert.date})`);
    }
    lines.push('');
  }

  // Projects
  if (resume.projects?.length) {
    lines.push('PROJECTS');
    lines.push('-'.repeat(40));
    for (const proj of resume.projects) {
      lines.push(`${proj.name} | ${proj.role}`);
      if (proj.description) lines.push(proj.description);
      if (proj.technologies?.length) lines.push(`Technologies: ${proj.technologies.join(', ')}`);
      lines.push('');
    }
  }

  // Awards
  if (resume.awards?.length) {
    lines.push('AWARDS');
    lines.push('-'.repeat(40));
    for (const award of resume.awards) {
      lines.push(`${award.title} - ${award.issuer} (${award.date})`);
      if (award.description) lines.push(award.description);
    }
    lines.push('');
  }

  // Languages
  if (resume.languages?.length) {
    lines.push('LANGUAGES');
    lines.push('-'.repeat(40));
    lines.push(resume.languages.map(l => `${l.name} (${l.proficiency})`).join(', '));
    lines.push('');
  }

  // Volunteering
  if (resume.volunteering?.length) {
    lines.push('VOLUNTEERING');
    lines.push('-'.repeat(40));
    for (const vol of resume.volunteering) {
      lines.push(`${vol.role} | ${vol.organization}`);
      lines.push(`${vol.startDate} - ${vol.endDate || 'Present'}`);
      if (vol.description) lines.push(vol.description);
      lines.push('');
    }
  }

  // Publications
  if (resume.publications?.length) {
    lines.push('PUBLICATIONS');
    lines.push('-'.repeat(40));
    for (const pub of resume.publications) {
      lines.push(`${pub.title} - ${pub.publisher} (${pub.date})`);
      if (pub.url) lines.push(pub.url);
    }
    lines.push('');
  }

  // Hobbies
  if (resume.hobbies?.length) {
    lines.push('HOBBIES & INTERESTS');
    lines.push('-'.repeat(40));
    lines.push(resume.hobbies.join(', '));
    lines.push('');
  }

  // References
  if (resume.references?.length) {
    lines.push('REFERENCES');
    lines.push('-'.repeat(40));
    for (const ref of resume.references) {
      lines.push(`${ref.name} - ${ref.title}, ${ref.company}`);
      const contact = [ref.email, ref.phone].filter(Boolean).join(' | ');
      if (contact) lines.push(contact);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Generates LinkedIn-ready text sections with character counts */
export function generateLinkedInFormat(resume: ResumeData): {
  about: string;
  experience: string;
  education: string;
  skills: string;
} {
  // About (LinkedIn limit: ~2600 chars)
  const aboutParts = [resume.summary || ''];
  if (resume.skills?.length) {
    aboutParts.push('');
    aboutParts.push('Key Skills: ' + resume.skills.slice(0, 10).join(' • '));
  }
  const about = aboutParts.join('\n');

  // Experience
  const expLines: string[] = [];
  for (const exp of resume.experience || []) {
    expLines.push(`${exp.position} at ${exp.company}`);
    expLines.push(`${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`);
    if (exp.description) expLines.push(exp.description);
    for (const a of exp.achievements || []) {
      expLines.push(`• ${a}`);
    }
    expLines.push('');
  }

  // Education
  const eduLines: string[] = [];
  for (const edu of resume.education || []) {
    eduLines.push(`${edu.degree} in ${edu.field}`);
    eduLines.push(edu.institution);
    eduLines.push(`${edu.startDate} - ${edu.endDate}`);
    eduLines.push('');
  }

  // Skills
  const skills = (resume.skills || []).join(' • ');

  return {
    about,
    experience: expLines.join('\n'),
    education: eduLines.join('\n'),
    skills,
  };
}
