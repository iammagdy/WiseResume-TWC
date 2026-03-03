import { PDFPage, PDFFont, rgb } from 'pdf-lib';
import type { ResumeData } from '@/types/resume';

/**
 * Extracts all text content from ResumeData in reading order,
 * then renders it as an invisible (transparent) text layer on a PDF page.
 * This enables Ctrl+F, copy-paste, and ATS parsing while preserving
 * the visual image layer on top.
 */

/** Flatten all resume text into a single ordered string array. */
export function extractResumeText(resume: ResumeData): string[] {
  const lines: string[] = [];

  // Contact / Header
  if (resume.contactInfo.fullName) lines.push(resume.contactInfo.fullName);
  const contactParts = [
    resume.contactInfo.email,
    resume.contactInfo.email2,
    resume.contactInfo.phone,
    resume.contactInfo.location,
    resume.contactInfo.linkedin,
    resume.contactInfo.github,
    resume.contactInfo.portfolio,
  ].filter(Boolean) as string[];
  if (contactParts.length) lines.push(contactParts.join(' | '));

  // Summary
  if (resume.summary) {
    lines.push('Summary');
    lines.push(resume.summary);
  }

  // Experience
  if (resume.experience?.length) {
    lines.push('Experience');
    for (const exp of resume.experience) {
      lines.push(`${exp.position} at ${exp.company}`);
      if (exp.account) lines.push(`Account: ${exp.account}`);
      const dates = [exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' – ');
      if (dates) lines.push(dates);
      if (exp.description) lines.push(exp.description);
      exp.achievements?.forEach(a => { if (a) lines.push(a); });
      exp.responsibilities?.forEach(r => { if (r) lines.push(r); });
    }
  }

  // Education
  if (resume.education?.length) {
    lines.push('Education');
    for (const edu of resume.education) {
      lines.push(`${edu.degree} in ${edu.field}`);
      lines.push(edu.institution);
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' – ');
      if (dates) lines.push(dates);
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
      if (edu.description) lines.push(edu.description);
    }
  }

  // Skills
  if (resume.skills?.length) {
    lines.push('Skills');
    lines.push(resume.skills.join(', '));
  }

  // Certifications
  if (resume.certifications?.length) {
    lines.push('Certifications');
    for (const cert of resume.certifications) {
      lines.push(`${cert.name} – ${cert.issuer}`);
      if (cert.date) lines.push(cert.date);
      if (cert.credentialId) lines.push(`Credential: ${cert.credentialId}`);
    }
  }

  // Awards
  if (resume.awards?.length) {
    lines.push('Awards');
    for (const award of resume.awards) {
      lines.push(`${award.title} – ${award.issuer}`);
      if (award.date) lines.push(award.date);
      if (award.description) lines.push(award.description);
    }
  }

  // Projects
  if (resume.projects?.length) {
    lines.push('Projects');
    for (const proj of resume.projects) {
      lines.push(proj.name);
      if (proj.role) lines.push(proj.role);
      if (proj.technologies?.length) lines.push(proj.technologies.join(', '));
      if (proj.description) lines.push(proj.description);
      if (proj.url) lines.push(proj.url);
    }
  }

  // Publications
  if (resume.publications?.length) {
    lines.push('Publications');
    for (const pub of resume.publications) {
      lines.push(`${pub.title} – ${pub.publisher}`);
      if (pub.date) lines.push(pub.date);
      if (pub.coAuthors) lines.push(pub.coAuthors);
      if (pub.description) lines.push(pub.description);
    }
  }

  // Volunteering
  if (resume.volunteering?.length) {
    lines.push('Volunteering');
    for (const vol of resume.volunteering) {
      lines.push(`${vol.role} at ${vol.organization}`);
      const dates = [vol.startDate, vol.endDate].filter(Boolean).join(' – ');
      if (dates) lines.push(dates);
      if (vol.description) lines.push(vol.description);
    }
  }

  // Languages
  if (resume.languages?.length) {
    lines.push('Languages');
    lines.push(resume.languages.map(l => `${l.name} (${l.proficiency})`).join(', '));
  }

  // Hobbies
  const visibleHobbies = resume.hobbies?.filter(h => h.visible);
  if (visibleHobbies?.length) {
    lines.push('Hobbies');
    lines.push(visibleHobbies.map(h => h.name).join(', '));
  }

  // References
  if (resume.references?.length) {
    lines.push('References');
    for (const ref of resume.references) {
      if (ref.availableOnRequest) {
        lines.push('Available on request');
      } else {
        lines.push(`${ref.name}, ${ref.title} at ${ref.company}`);
        const contact = [ref.email, ref.phone].filter(Boolean).join(' | ');
        if (contact) lines.push(contact);
      }
    }
  }

  return lines;
}

/**
 * Renders an invisible text layer on a PDF page.
 * Text is drawn with opacity 0 (fully transparent) so it's
 * selectable and searchable but doesn't affect the visual appearance.
 */
export function renderTextLayer(
  page: PDFPage,
  font: PDFFont,
  textLines: string[],
  pageWidth: number,
  pageHeight: number
): void {
  const fontSize = 4; // Small but reliably indexed by PDF readers and ATS
  const lineHeight = 5;
  const margin = 10;
  const maxWidth = pageWidth - margin * 2;

  // Word-wrap each line to fit within page width
  const wrappedLines: string[] = [];
  for (const line of textLines) {
    if (!line.trim()) continue;
    const words = line.split(/\s+/);
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      try {
        if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
          wrappedLines.push(current);
          current = word;
        } else {
          current = test;
        }
      } catch {
        // If font can't measure (special chars), just append
        current = test;
      }
    }
    if (current) wrappedLines.push(current);
  }

  let y = pageHeight - margin;
  // Use fully transparent color
  const transparentColor = rgb(0, 0, 0);

  for (const line of wrappedLines) {
    if (y < margin) break; // Stop if we run out of page space

    try {
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: transparentColor,
        opacity: 0.01, // Nearly invisible – but indexed by ATS and Ctrl+F
      });
    } catch {
      // Skip lines with characters the font can't encode
    }

    y -= lineHeight;
  }
}
