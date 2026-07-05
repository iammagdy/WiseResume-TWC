import type { PublicProfile, PublicResume } from '@/hooks/usePublicPortfolio';
import { getPortfolioDisplayUrl } from '@/lib/portfolioUrl';
import { getThemeById } from '@/lib/portfolioThemes';
import { safeHref } from '@/lib/urlUtils';

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '';
  if (val.toLowerCase() === 'present' || val.toLowerCase() === 'now') return 'Present';
  try {
    return new Date(val).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return val;
  }
}

function dateRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = formatDate(start);
  const e = formatDate(end) || 'Present';
  if (!s) return '';
  return `${s} – ${e}`;
}

/**
 * Accepts only valid CSS hex colors (#RGB, #RRGGBB, #RRGGBBAA) and named safe
 * colors. Rejects anything that could break out of a style context.
 */
function safeCssColor(value: string | null | undefined, fallback = '#e84545'): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed;
  }
  if (/^rgba?\(/i.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function generatePortfolioPrintHTML(
  profile: PublicProfile,
  resume: PublicResume,
): string {
  const name = esc(profile.fullName || 'Portfolio');
  const jobTitle = esc(profile.jobTitle || '');
  const location = esc(profile.location || '');
  const bio = esc(profile.portfolioBio || profile.portfolioSummary || '');
  const accent = safeCssColor(profile.portfolioAccentColor, '#e84545');
  const theme = getThemeById(profile.portfolioStyle || profile.theme || 'minimal');
  const bg = safeCssColor(theme?.colors.bg, '#0a0a14');
  const fg = safeCssColor(theme?.colors.fg, '#f5f5ff');
  const muted = theme?.colors.muted || '#9ca3af';
  const card = theme?.colors.card || 'rgba(255,255,255,0.05)';
  const border = theme?.colors.border || 'rgba(255,255,255,0.08)';
  const headingFont = theme?.typography.headingFont || 'Inter, system-ui, sans-serif';
  const bodyFont = theme?.typography.bodyFont || 'Inter, system-ui, sans-serif';
  const initials = (profile.fullName || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const experience = (resume.experience || []).filter(
    e => e.position?.trim() || e.company?.trim(),
  );
  const education = (resume.education || []).filter(
    e => e.institution?.trim() || e.degree?.trim(),
  );
  const skills = resume.skills || [];
  const projects = resume.projects || [];
  const certifications = resume.certifications || [];
  const portfolioCerts = profile.portfolioCertifications || [];

  function section(title: string, content: string): string {
    if (!content.trim()) return '';
    return `
      <div class="section">
        <h2 class="section-title">${esc(title)}</h2>
        <div class="section-divider"></div>
        ${content}
      </div>`;
  }

  // Only emit links whose scheme is safe (http/https/mailto/tel). safeHref
  // returns undefined for javascript:/data:/etc., in which case we render the
  // value as plain text instead of an unsafe anchor in the exported HTML.
  const linkedinHref = safeHref(profile.linkedinUrl);
  const githubHref = safeHref(profile.githubUrl);
  const websiteHref = safeHref(profile.websiteUrl);

  const contactParts: string[] = [];
  if (location) contactParts.push(`<span>📍 ${location}</span>`);
  if (linkedinHref) contactParts.push(`<a href="${esc(linkedinHref)}">${esc(linkedinHref.replace(/^https?:\/\/(www\.)?/, ''))}</a>`);
  if (githubHref) contactParts.push(`<a href="${esc(githubHref)}">${esc(githubHref.replace(/^https?:\/\/(www\.)?/, ''))}</a>`);
  if (websiteHref) contactParts.push(`<a href="${esc(websiteHref)}">${esc(websiteHref.replace(/^https?:\/\/(www\.)?/, ''))}</a>`);

  const expHtml = experience.map(e => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-title">${esc(e.position || '')}</div>
          <div class="entry-sub">${esc(e.company || '')}${e.location ? ` · ${esc(e.location)}` : ''}</div>
        </div>
        <div class="entry-date">${dateRange(e.startDate, e.endDate)}</div>
      </div>
      ${e.description ? `<p class="entry-body">${esc(e.description).replace(/\n/g, '<br>')}</p>` : ''}
    </div>`).join('');

  const eduHtml = education.map(e => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-title">${esc(e.degree || '')}${e.fieldOfStudy ? ` in ${esc(e.fieldOfStudy)}` : ''}</div>
          <div class="entry-sub">${esc(e.institution || '')}</div>
        </div>
        <div class="entry-date">${dateRange(e.startDate, e.endDate)}</div>
      </div>
    </div>`).join('');

  const skillsHtml = skills.length > 0
    ? `<div class="skills-grid">${skills.map(s => `<span class="skill-pill">${esc(typeof s === 'string' ? s : (s as { name: string }).name)}</span>`).join('')}</div>`
    : '';

  const projectsHtml = projects.slice(0, 6).map(p => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-title">${esc(p.title || p.name || '')}</div>
        ${(() => { const u = safeHref((p as { url?: string }).url); return u ? `<a class="entry-link" href="${esc(u)}">${esc(u)}</a>` : ''; })()}
      </div>
      ${p.description ? `<p class="entry-body">${esc(p.description)}</p>` : ''}
    </div>`).join('');

  const allCerts = [
    ...portfolioCerts.map(c => ({ name: c.name, issuer: c.issuer, date: c.date, url: c.credentialUrl })),
    ...certifications.map(c => ({ name: c.name, issuer: c.issuer || c.organization || '', date: c.date || '', url: (c as { url?: string }).url || '' })),
  ];
  const certsHtml = allCerts.slice(0, 12).map(c => `
    <div class="cert-item">
      <span class="cert-name">${esc(c.name)}</span>
      ${c.issuer ? `<span class="cert-issuer"> · ${esc(c.issuer)}</span>` : ''}
      ${c.date ? `<span class="cert-date"> · ${formatDate(c.date)}</span>` : ''}
    </div>`).join('');

  const caseStudiesHtml = (profile.caseStudies || []).slice(0, 4).map(cs => `
    <div class="entry">
      <div class="entry-title">${esc(cs.title)}</div>
      ${cs.challenge ? `<p class="entry-body"><strong>Challenge:</strong> ${esc(cs.challenge)}</p>` : ''}
      ${cs.outcome ? `<p class="entry-body"><strong>Outcome:</strong> ${esc(cs.outcome)}</p>` : ''}
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name} — Portfolio</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${bodyFont};
      font-size: 11pt;
      line-height: 1.55;
      color: ${fg};
      background: ${bg};
      padding: 0;
    }
    a { color: ${accent}; text-decoration: none; }
    h1 {
      font-family: ${headingFont};
      font-size: 28pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
      color: ${fg};
    }
    h2.section-title {
      font-family: ${headingFont};
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: ${accent};
      margin-bottom: 6px;
    }
    .page { max-width: 760px; margin: 0 auto; padding: 36px 40px; }
    .header {
      margin-bottom: 24px;
      padding: 24px;
      border-radius: 20px;
      background: ${card};
      border: 1px solid ${border};
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 18px;
      align-items: center;
    }
    .avatar {
      width: 72px;
      height: 72px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ${headingFont};
      font-size: 22pt;
      font-weight: 800;
      color: #fff;
      background: linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 55%, #ffffff));
      border: 2px solid color-mix(in srgb, ${accent} 35%, transparent);
    }
    .header .job-title { font-size: 14pt; color: ${muted}; margin-bottom: 8px; }
    .contact-row {
      display: flex; flex-wrap: wrap; gap: 8px 16px;
      font-size: 9pt; color: ${muted}; margin-top: 6px;
    }
    .contact-row a { color: ${fg}; }
    .section-divider {
      height: 1.5px;
      background: color-mix(in srgb, ${accent} 35%, transparent);
      margin-bottom: 12px;
    }
    .section { margin-bottom: 22px; page-break-inside: avoid; }
    .bio {
      font-size: 10.5pt;
      color: color-mix(in srgb, ${fg} 88%, ${muted});
      margin-bottom: 22px;
      line-height: 1.65;
      padding: 16px 18px;
      border-radius: 16px;
      background: ${card};
      border: 1px solid ${border};
    }
    .entry {
      margin-bottom: 14px;
      page-break-inside: avoid;
      padding: 14px 16px;
      border-radius: 14px;
      background: ${card};
      border: 1px solid ${border};
    }
    .entry-header {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    }
    .entry-title { font-weight: 700; font-size: 11pt; color: ${fg}; }
    .entry-sub { font-size: 10pt; color: ${muted}; margin-top: 1px; }
    .entry-date { font-size: 9.5pt; color: ${muted}; white-space: nowrap; flex-shrink: 0; }
    .entry-body { font-size: 10pt; color: color-mix(in srgb, ${fg} 85%, ${muted}); margin-top: 5px; }
    .entry-link { font-size: 8.5pt; color: ${muted}; word-break: break-all; }
    .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-pill {
      font-size: 9pt; padding: 4px 12px; border-radius: 999px;
      border: 1px solid color-mix(in srgb, ${accent} 45%, transparent);
      color: ${accent};
      background: color-mix(in srgb, ${accent} 12%, transparent);
    }
    .cert-item {
      font-size: 10pt;
      padding: 8px 0;
      border-bottom: 1px solid ${border};
    }
    .cert-name { font-weight: 600; color: ${fg}; }
    .cert-issuer { color: ${muted}; }
    .cert-date { color: ${muted}; }
    .footer {
      margin-top: 32px; padding-top: 10px; border-top: 1px solid ${border};
      font-size: 8.5pt; color: ${muted}; text-align: center;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 12px 20px; }
      .section, .entry, .header, .bio { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="avatar">${esc(initials)}</div>
      <div>
        <h1>${name}</h1>
        ${jobTitle ? `<div class="job-title">${jobTitle}</div>` : ''}
        <div class="contact-row">${contactParts.join('')}</div>
      </div>
    </div>

    ${bio ? `<p class="bio">${bio.replace(/\n/g, '<br>')}</p>` : ''}

    ${section('Experience', expHtml)}
    ${section('Education', eduHtml)}
    ${section('Skills', skillsHtml)}
    ${section('Projects', projectsHtml)}
    ${section('Case Studies', caseStudiesHtml)}
    ${section('Certifications', certsHtml)}

    <div class="footer">Generated from WiseResume · ${esc(profile.username ? getPortfolioDisplayUrl(profile.username) : 'wiseresume.app')}</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 600);
    };
  <\/script>
</body>
</html>`;
}
