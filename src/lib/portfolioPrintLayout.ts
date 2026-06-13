import type { PublicProfile, PublicResume } from '@/hooks/usePublicPortfolio';

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
  return fallback;
}

export function generatePortfolioPrintHTML(
  profile: PublicProfile,
  resume: PublicResume,
): string {
  const name = esc(profile.fullName || 'Portfolio');
  const jobTitle = esc(profile.jobTitle || '');
  const location = esc(profile.location || '');
  const email = esc(profile.contactEmail || '');
  const linkedin = esc(profile.linkedinUrl || '');
  const github = esc(profile.githubUrl || '');
  const website = esc(profile.websiteUrl || '');
  const bio = esc(profile.portfolioBio || profile.portfolioSummary || '');
  const accent = safeCssColor(profile.portfolioAccentColor, '#e84545');

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

  const contactParts: string[] = [];
  if (location) contactParts.push(`<span>📍 ${location}</span>`);
  if (email) contactParts.push(`<a href="mailto:${email}">${email}</a>`);
  if (linkedin) contactParts.push(`<a href="${linkedin}">${linkedin.replace(/^https?:\/\/(www\.)?/, '')}</a>`);
  if (github) contactParts.push(`<a href="${github}">${github.replace(/^https?:\/\/(www\.)?/, '')}</a>`);
  if (website) contactParts.push(`<a href="${website}">${website.replace(/^https?:\/\/(www\.)?/, '')}</a>`);

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
        ${(p as { url?: string }).url ? `<a class="entry-link" href="${esc((p as { url?: string }).url)}">${esc((p as { url?: string }).url)}</a>` : ''}
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
      font-family: Georgia, "Times New Roman", serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #111827;
      background: #fff;
      padding: 0;
    }
    a { color: ${accent}; text-decoration: none; }
    h1 { font-size: 26pt; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
    h2.section-title {
      font-size: 9pt; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: ${accent};
      margin-bottom: 6px;
    }
    .page { max-width: 700px; margin: 0 auto; padding: 32px 40px; }
    .header { margin-bottom: 20px; }
    .header .job-title { font-size: 14pt; color: #374151; margin-bottom: 8px; }
    .contact-row {
      display: flex; flex-wrap: wrap; gap: 8px 16px;
      font-size: 9pt; color: #6b7280; margin-top: 6px;
    }
    .contact-row a { color: #374151; }
    .section-divider {
      height: 1.5px; background: ${accent}44;
      margin-bottom: 12px;
    }
    .section { margin-bottom: 22px; page-break-inside: avoid; }
    .bio { font-size: 10.5pt; color: #374151; margin-bottom: 22px; line-height: 1.65; }
    .entry { margin-bottom: 14px; page-break-inside: avoid; }
    .entry-header {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    }
    .entry-title { font-weight: 700; font-size: 11pt; }
    .entry-sub { font-size: 10pt; color: #6b7280; margin-top: 1px; }
    .entry-date { font-size: 9.5pt; color: #9ca3af; white-space: nowrap; flex-shrink: 0; }
    .entry-body { font-size: 10pt; color: #374151; margin-top: 5px; }
    .entry-link { font-size: 8.5pt; color: #9ca3af; word-break: break-all; }
    .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-pill {
      font-size: 9pt; padding: 2px 10px; border-radius: 999px;
      border: 1px solid ${accent}55; color: ${accent};
      background: ${accent}10;
    }
    .cert-item { font-size: 10pt; padding: 3px 0; border-bottom: 1px solid #f3f4f6; }
    .cert-name { font-weight: 600; }
    .cert-issuer { color: #6b7280; }
    .cert-date { color: #9ca3af; }
    .footer {
      margin-top: 32px; padding-top: 10px; border-top: 1px solid #e5e7eb;
      font-size: 8.5pt; color: #9ca3af; text-align: center;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 12px 20px; }
      .section { page-break-inside: avoid; }
      .entry { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>${name}</h1>
      ${jobTitle ? `<div class="job-title">${jobTitle}</div>` : ''}
      <div class="contact-row">${contactParts.join('')}</div>
    </div>

    ${bio ? `<p class="bio">${bio.replace(/\n/g, '<br>')}</p>` : ''}

    ${section('Experience', expHtml)}
    ${section('Education', eduHtml)}
    ${section('Skills', skillsHtml)}
    ${section('Projects', projectsHtml)}
    ${section('Case Studies', caseStudiesHtml)}
    ${section('Certifications', certsHtml)}

    <div class="footer">Generated from WiseResume · wiseresume.app/p/${esc(profile.username)}</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 600);
    };
  <\/script>
</body>
</html>`;
}
