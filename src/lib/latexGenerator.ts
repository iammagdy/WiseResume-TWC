import type { ResumeData } from '@/types/resume';
import { formatDateRangeDisplay } from '@/lib/dateUtils';
import { getDocumentLocale } from '@/i18n/resumeLocale';
import { formatDocumentDate, type SupportedLocale } from '@/i18n/core';
import { getSectionLabel } from '@/lib/sectionLabels';

/**
 * Escapes all LaTeX special characters in a plain string in a single pass,
 * so inserted control sequences are never corrupted by subsequent replacements.
 * Characters handled: \ # $ % & _ { } ~ ^
 */
function esc(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[\\#$%&_{}\^~]/g, (c) => {
    switch (c) {
      case '\\': return '\\textbackslash{}';
      case '^':  return '\\textasciicircum{}';
      case '~':  return '\\textasciitilde{}';
      default:   return `\\${c}`;
    }
  });
}

/**
 * Percent-encodes characters that would break LaTeX \href argument parsing
 * while leaving already-encoded sequences untouched.
 * Only the characters `#`, `%` (when not already an escape), `{`, `}`, `\`
 * and unbalanced `^`/`~` need escaping inside href argument braces.
 * Using encodeURI handles the common cases reliably.
 */
function escUrl(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return encodeURI(decodeURI(url));
  } catch {
    return url.replace(/[%{}\\]/g, (c) => encodeURIComponent(c));
  }
}

function formatDate(date: string | null | undefined, locale: SupportedLocale): string {
  if (!date) return '';
  if (locale === 'ar') return esc(formatDocumentDate(date, locale));
  const d = new Date(date);
  if (isNaN(d.getTime())) return esc(date);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Generates a complete, compilable LaTeX document from ResumeData.
 * Compatible with Overleaf and pdflatex.
 * Only uses packages: geometry, hyperref (beyond the base article class).
 */
export function generateLatex(resume: ResumeData): string {
  const { contactInfo: c, summary, experience, education, skills, certifications,
          awards, projects, publications, volunteering, languages, hobbies, references } = resume;

  const lines: string[] = [];
  const locale = getDocumentLocale(resume);
  const isArabic = locale === 'ar';
  const pagePaper = resume.customization?.pageFormat === 'a4' ? 'a4paper' : 'letterpaper';
  const heading = (sectionId: string) => getSectionLabel(sectionId, locale);

  // ─── Preamble (only article + geometry + hyperref) ───────────────────────
  lines.push(
    `\\documentclass[11pt,${pagePaper}]{article}`,
    '\\usepackage[margin=0.8in]{geometry}',
    ...(isArabic ? [
      '\\usepackage{fontspec}',
      '\\usepackage{polyglossia}',
      '\\setmainlanguage{arabic}',
      '\\setotherlanguage{english}',
      '\\setmainfont{Noto Sans Arabic}',
      '\\newfontfamily\\arabicfont[Script=Arabic]{Noto Sans Arabic}',
    ] : []),
    '\\usepackage{hyperref}',
    '',
    '\\hypersetup{colorlinks=true, urlcolor=blue, linkcolor=black}',
    '',
    '\\pagestyle{empty}',
    '',
    '\\begin{document}',
    '',
  );

  // ─── Header ─────────────────────────────────────────────────────────────────
  lines.push(`{\\LARGE \\textbf{${esc(c.fullName)}}}`);
  lines.push('\\\\[4pt]');

  const contactParts: string[] = [];
  if (c.email)     contactParts.push(`\\href{mailto:${escUrl(c.email)}}{${esc(c.email)}}`);
  if (c.phone)     contactParts.push(esc(c.phone));
  if (c.location)  contactParts.push(esc(c.location));
  if (c.linkedin)  contactParts.push(`\\href{${escUrl(c.linkedin)}}{LinkedIn}`);
  if (c.github)    contactParts.push(`\\href{${escUrl(c.github)}}{GitHub}`);
  if (c.portfolio) contactParts.push(`\\href{${escUrl(c.portfolio)}}{Portfolio}`);
  if (contactParts.length) {
    lines.push(contactParts.join(' $\\cdot$ '));
    lines.push('\\\\');
  }
  lines.push('\\rule{\\linewidth}{0.4pt}');
  lines.push('');

  // ─── Summary ────────────────────────────────────────────────────────────────
  if (summary?.trim()) {
    lines.push(`\\section*{${heading('summary')}}`);
    lines.push(esc(summary));
    lines.push('');
  }

  // ─── Experience ─────────────────────────────────────────────────────────────
  if (experience?.length) {
    lines.push(`\\section*{${heading('experience')}}`);
    for (const exp of experience) {
      const start = formatDate(exp.startDate, locale);
      const end = exp.current ? (isArabic ? 'حتى الآن' : 'Present') : formatDate(exp.endDate, locale);
      lines.push(
        `\\textbf{${esc(exp.position)}} --- \\textit{${esc(exp.company)}}` +
        (exp.account ? ` (${esc(exp.account)})` : '') +
        ` \\hfill ${start}${end ? ` -- ${end}` : ''}`,
      );
      lines.push('\\\\[-4pt]');

      const bullets: string[] = [];
      if (exp.description?.trim()) bullets.push(esc(exp.description));
      if (exp.achievements?.length) bullets.push(...exp.achievements.map(esc));

      if (bullets.length) {
        lines.push('\\begin{itemize}');
        for (const b of bullets) lines.push(`  \\item ${b}`);
        lines.push('\\end{itemize}');
      }
      lines.push('');
    }
  }

  // ─── Education ──────────────────────────────────────────────────────────────
  if (education?.length) {
    lines.push(`\\section*{${heading('education')}}`);
    for (const edu of education) {
      const eduRange = isArabic
        ? [formatDocumentDate(edu.startDate, locale), formatDocumentDate(edu.endDate, locale)].filter(Boolean).join(' - ')
        : formatDateRangeDisplay(edu.startDate, edu.endDate, edu.endDate === 'Present') ?? '';
      const degree = [esc(edu.degree), esc(edu.field)].filter(Boolean).join(' in ');
      lines.push(
        `\\textbf{${degree}} --- \\textit{${esc(edu.institution)}}${eduRange ? ` \\hfill ${esc(eduRange)}` : ''}`,
      );
      if (edu.gpa) lines.push(`\\\\ GPA: ${esc(edu.gpa)}`);
      if (edu.description?.trim()) lines.push(`\\\\ ${esc(edu.description)}`);
      lines.push('');
    }
  }

  // ─── Skills ─────────────────────────────────────────────────────────────────
  if (skills?.length) {
    lines.push(`\\section*{${heading('skills')}}`);
    lines.push(skills.map(esc).join(', '));
    lines.push('');
  }

  // ─── Certifications ─────────────────────────────────────────────────────────
  if (certifications?.length) {
    lines.push(`\\section*{${heading('certifications')}}`);
    lines.push('\\begin{itemize}');
    for (const cert of certifications) {
      const date = formatDate(cert.date, locale);
      lines.push(`  \\item \\textbf{${esc(cert.name)}} --- ${esc(cert.issuer)}${date ? `, ${date}` : ''}`);
    }
    lines.push('\\end{itemize}');
    lines.push('');
  }

  // ─── Projects ───────────────────────────────────────────────────────────────
  if (projects?.length) {
    lines.push(`\\section*{${heading('projects')}}`);
    for (const proj of projects) {
      const projRange =
        formatDateRangeDisplay(
          proj.startDate,
          proj.endDate,
          !!proj.current || proj.endDate === 'Present',
        ) ?? '';
      lines.push(
        `\\textbf{${esc(proj.name)}}` +
        (proj.role ? ` --- \\textit{${esc(proj.role)}}` : '') +
        (projRange ? ` \\hfill ${esc(projRange)}` : ''),
      );
      if (proj.technologies?.length) {
        lines.push(`\\\\ \\textit{Technologies:} ${proj.technologies.map(esc).join(', ')}`);
      }
      if (proj.description?.trim()) {
        lines.push('\\begin{itemize}');
        lines.push(`  \\item ${esc(proj.description)}`);
        lines.push('\\end{itemize}');
      }
      lines.push('');
    }
  }

  // ─── Publications ───────────────────────────────────────────────────────────
  if (publications?.length) {
    lines.push(`\\section*{${heading('publications')}}`);
    lines.push('\\begin{itemize}');
    for (const pub of publications) {
      const date = formatDate(pub.date, locale);
      let entry = `\\textbf{${esc(pub.title)}}. ${esc(pub.publisher)}${date ? `, ${date}` : ''}.`;
      if (pub.coAuthors) entry += ` Co-authors: ${esc(pub.coAuthors)}.`;
      if (pub.url) entry += ` \\href{${escUrl(pub.url)}}{Link}.`;
      lines.push(`  \\item ${entry}`);
    }
    lines.push('\\end{itemize}');
    lines.push('');
  }

  // ─── Volunteering ───────────────────────────────────────────────────────────
  if (volunteering?.length) {
    lines.push(`\\section*{${heading('volunteering')}}`);
    for (const vol of volunteering) {
      const volRange =
        formatDateRangeDisplay(
          vol.startDate,
          vol.endDate,
          !!vol.current || vol.endDate === 'Present',
        ) ?? '';
      lines.push(
        `\\textbf{${esc(vol.role)}} --- \\textit{${esc(vol.organization)}}${volRange ? ` \\hfill ${esc(volRange)}` : ''}`,
      );
      if (vol.description?.trim()) {
        lines.push('\\begin{itemize}');
        lines.push(`  \\item ${esc(vol.description)}`);
        lines.push('\\end{itemize}');
      }
      lines.push('');
    }
  }

  // ─── Awards ─────────────────────────────────────────────────────────────────
  if (awards?.length) {
    lines.push(`\\section*{${heading('awards')}}`);
    lines.push('\\begin{itemize}');
    for (const award of awards) {
      const date = formatDate(award.date, locale);
      lines.push(`  \\item \\textbf{${esc(award.title)}} --- ${esc(award.issuer)}${date ? `, ${date}` : ''}`);
      if (award.description?.trim()) lines.push(`    \\\\ ${esc(award.description)}`);
    }
    lines.push('\\end{itemize}');
    lines.push('');
  }

  // ─── Languages ──────────────────────────────────────────────────────────────
  if (languages?.length) {
    lines.push(`\\section*{${heading('languages')}}`);
    lines.push(languages.map(l => `${esc(l.name)} (${esc(l.proficiency)})`).join(', '));
    lines.push('');
  }

  // ─── Hobbies ────────────────────────────────────────────────────────────────
  const visibleHobbies = hobbies?.filter(h => h.visible !== false);
  if (visibleHobbies?.length) {
    lines.push(`\\section*{${isArabic ? getSectionLabel('hobbies', locale) : 'Interests'}}`);
    lines.push(visibleHobbies.map(h => esc(h.name)).join(', '));
    lines.push('');
  }

  // ─── References ─────────────────────────────────────────────────────────────
  if (references?.length) {
    lines.push(`\\section*{${heading('references')}}`);
    const allOnRequest = references.every(r => r.availableOnRequest);
    if (allOnRequest) {
      lines.push(isArabic ? 'متاحة عند الطلب.' : 'Available upon request.');
    } else {
      lines.push('\\begin{itemize}');
      for (const ref of references) {
        if (ref.availableOnRequest) {
          lines.push(`  \\item \\textbf{${esc(ref.name)}} --- ${isArabic ? 'متاحة عند الطلب' : 'Available upon request'}`);
        } else {
          const detail = [esc(ref.title), esc(ref.company)].filter(Boolean).join(', ');
          const contact = [ref.email && `\\href{mailto:${escUrl(ref.email)}}{${esc(ref.email)}}`, esc(ref.phone)].filter(Boolean).join(', ');
          lines.push(`  \\item \\textbf{${esc(ref.name)}}${detail ? ` --- ${detail}` : ''}${contact ? `. ${contact}` : ''}`);
        }
      }
      lines.push('\\end{itemize}');
    }
    lines.push('');
  }

  lines.push('\\end{document}');
  return lines.join('\n');
}
