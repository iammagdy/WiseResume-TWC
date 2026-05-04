import type { ResumeData } from '@/types/resume';

/**
 * Escapes all LaTeX special characters in a plain string.
 * Characters: # $ % & _ { } ~ ^ \
 */
function esc(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/[#$%&_{}]/g, (c) => `\\${c}`);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return esc(date);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Generates a complete, compilable LaTeX document from ResumeData.
 * Compatible with Overleaf and pdflatex using only standard packages:
 * geometry, hyperref, enumitem, parskip.
 */
export function generateLatex(resume: ResumeData): string {
  const { contactInfo: c, summary, experience, education, skills, certifications,
          awards, projects, publications, volunteering, languages } = resume;

  const lines: string[] = [];

  // ─── Preamble ───────────────────────────────────────────────────────────────
  lines.push(
    '\\documentclass[11pt,letterpaper]{article}',
    '\\usepackage[margin=0.8in]{geometry}',
    '\\usepackage{hyperref}',
    '\\usepackage{enumitem}',
    '\\usepackage{parskip}',
    '\\usepackage[T1]{fontenc}',
    '\\usepackage[utf8]{inputenc}',
    '',
    '\\hypersetup{',
    '  colorlinks=true,',
    '  urlcolor=blue,',
    '  linkcolor=black',
    '}',
    '',
    '\\setlist[itemize]{noitemsep, topsep=2pt, leftmargin=*}',
    '\\pagestyle{empty}',
    '',
    '\\begin{document}',
    '',
  );

  // ─── Header ─────────────────────────────────────────────────────────────────
  lines.push(`{\\LARGE \\textbf{${esc(c.fullName)}}}`);
  lines.push('\\\\[4pt]');

  const contactParts: string[] = [];
  if (c.email)     contactParts.push(`\\href{mailto:${c.email}}{${esc(c.email)}}`);
  if (c.phone)     contactParts.push(esc(c.phone));
  if (c.location)  contactParts.push(esc(c.location));
  if (c.linkedin)  contactParts.push(`\\href{${c.linkedin}}{LinkedIn}`);
  if (c.github)    contactParts.push(`\\href{${c.github}}{GitHub}`);
  if (c.portfolio) contactParts.push(`\\href{${c.portfolio}}{Portfolio}`);
  lines.push(contactParts.join(' $\\cdot$ '));
  lines.push('\\\\');
  lines.push('\\rule{\\linewidth}{0.4pt}');
  lines.push('');

  // ─── Summary ────────────────────────────────────────────────────────────────
  if (summary?.trim()) {
    lines.push('\\section*{Professional Summary}');
    lines.push(esc(summary));
    lines.push('');
  }

  // ─── Experience ─────────────────────────────────────────────────────────────
  if (experience?.length) {
    lines.push('\\section*{Experience}');
    for (const exp of experience) {
      const start = formatDate(exp.startDate);
      const end = exp.current ? 'Present' : formatDate(exp.endDate);
      lines.push(
        `\\textbf{${esc(exp.position)}} --- \\textit{${esc(exp.company)}}` +
        (exp.account ? ` (${esc(exp.account)})` : '') +
        ` \\hfill ${start} -- ${end}`,
      );
      lines.push('\\\\[-4pt]');

      const bullets: string[] = [];
      if (exp.description?.trim()) bullets.push(esc(exp.description));
      if (exp.achievements?.length) bullets.push(...exp.achievements.map(esc));

      if (bullets.length) {
        lines.push('\\begin{itemize}');
        for (const b of bullets) {
          lines.push(`  \\item ${b}`);
        }
        lines.push('\\end{itemize}');
      }
      lines.push('');
    }
  }

  // ─── Education ──────────────────────────────────────────────────────────────
  if (education?.length) {
    lines.push('\\section*{Education}');
    for (const edu of education) {
      const start = formatDate(edu.startDate);
      const end = formatDate(edu.endDate);
      const degree = [esc(edu.degree), esc(edu.field)].filter(Boolean).join(' in ');
      lines.push(
        `\\textbf{${degree}} --- \\textit{${esc(edu.institution)}} \\hfill ${start} -- ${end}`,
      );
      if (edu.gpa) lines.push(`\\\\ GPA: ${esc(edu.gpa)}`);
      if (edu.description?.trim()) lines.push(`\\\\ ${esc(edu.description)}`);
      lines.push('');
    }
  }

  // ─── Skills ─────────────────────────────────────────────────────────────────
  if (skills?.length) {
    lines.push('\\section*{Skills}');
    lines.push(skills.map(esc).join(', '));
    lines.push('');
  }

  // ─── Certifications ─────────────────────────────────────────────────────────
  if (certifications?.length) {
    lines.push('\\section*{Certifications}');
    lines.push('\\begin{itemize}');
    for (const cert of certifications) {
      const date = formatDate(cert.date);
      lines.push(`  \\item \\textbf{${esc(cert.name)}} --- ${esc(cert.issuer)}${date ? `, ${date}` : ''}`);
    }
    lines.push('\\end{itemize}');
    lines.push('');
  }

  // ─── Projects ───────────────────────────────────────────────────────────────
  if (projects?.length) {
    lines.push('\\section*{Projects}');
    for (const proj of projects) {
      const start = formatDate(proj.startDate);
      const end = formatDate(proj.endDate);
      lines.push(
        `\\textbf{${esc(proj.name)}}` +
        (proj.role ? ` --- \\textit{${esc(proj.role)}}` : '') +
        (start ? ` \\hfill ${start}${end ? ` -- ${end}` : ''}` : ''),
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
    lines.push('\\section*{Publications}');
    lines.push('\\begin{itemize}');
    for (const pub of publications) {
      const date = formatDate(pub.date);
      let entry = `\\textbf{${esc(pub.title)}}. ${esc(pub.publisher)}${date ? `, ${date}` : ''}.`;
      if (pub.coAuthors) entry += ` Co-authors: ${esc(pub.coAuthors)}.`;
      if (pub.url) entry += ` \\href{${pub.url}}{Link}.`;
      lines.push(`  \\item ${entry}`);
    }
    lines.push('\\end{itemize}');
    lines.push('');
  }

  // ─── Volunteering ───────────────────────────────────────────────────────────
  if (volunteering?.length) {
    lines.push('\\section*{Volunteering}');
    for (const vol of volunteering) {
      const start = formatDate(vol.startDate);
      const end = formatDate(vol.endDate);
      lines.push(
        `\\textbf{${esc(vol.role)}} --- \\textit{${esc(vol.organization)}} \\hfill ${start} -- ${end}`,
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
    lines.push('\\section*{Awards}');
    lines.push('\\begin{itemize}');
    for (const award of awards) {
      const date = formatDate(award.date);
      lines.push(`  \\item \\textbf{${esc(award.title)}} --- ${esc(award.issuer)}${date ? `, ${date}` : ''}`);
      if (award.description?.trim()) lines.push(`  \\\\ ${esc(award.description)}`);
    }
    lines.push('\\end{itemize}');
    lines.push('');
  }

  // ─── Languages ──────────────────────────────────────────────────────────────
  if (languages?.length) {
    lines.push('\\section*{Languages}');
    lines.push(
      languages.map(l => `${esc(l.name)} (${esc(l.proficiency)})`).join(', '),
    );
    lines.push('');
  }

  lines.push('\\end{document}');
  return lines.join('\n');
}
