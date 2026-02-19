import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function styleToBg(style: string): string {
  switch (style) {
    case 'bold-dark': return '#0a0a1f';
    case 'glass-pro': return '#0d1117';
    case 'classic-clean': return '#f8faff';
    default: return '#0a0a14'; // minimal
  }
}

function styleToFg(style: string): string {
  return style === 'classic-clean' ? '#111827' : '#f0f0ff';
}

function styleToMuted(style: string): string {
  return style === 'classic-clean' ? '#6b7280' : '#9ca3af';
}

function styleToCardBg(style: string, accent: string): string {
  if (style === 'classic-clean') return '#e8ecf4';
  return accent + '22'; // low opacity accent
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 2);
}

// ── Per-theme decoration layer ──────────────────────────────────────────────
function styleToDecoLayer(style: string, accent: string): string {
  switch (style) {
    case 'bold-dark':
      return `
  <defs>
    <linearGradient id="boldStripe" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="${accent}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.05"/>
    </linearGradient>
    <radialGradient id="glow1" cx="12%" cy="18%" r="45%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="88%" cy="82%" r="35%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#glow1)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>
  <rect x="0" y="0" width="1200" height="220" fill="url(#boldStripe)"/>
  <rect x="0" y="0" width="1200" height="8" fill="${accent}"/>
  <polygon points="1200,630 900,630 1200,380" fill="${accent}" fill-opacity="0.06"/>`;

    case 'glass-pro':
      return `
  <defs>
    <radialGradient id="glassGlow1" cx="20%" cy="10%" r="50%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glassGlow2" cx="80%" cy="90%" r="40%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#glassGlow1)"/>
  <rect width="1200" height="630" fill="url(#glassGlow2)"/>
  <rect x="0" y="0" width="1200" height="5" fill="${accent}"/>
  <rect x="48" y="100" width="1104" height="440" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <rect x="48" y="100" width="1104" height="1" fill="rgba(255,255,255,0.2)"/>`;

    case 'classic-clean':
      return `
  <defs>
    <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="12" cy="12" r="1" fill="#e5e7eb"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect x="0" y="0" width="6" height="630" fill="${accent}"/>
  <rect x="0" y="0" width="1200" height="200" fill="${accent}" fill-opacity="0.04"/>`;

    default: // minimal
      return `
  <defs>
    <radialGradient id="glow1" cx="12%" cy="18%" r="45%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="88%" cy="82%" r="35%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#glow1)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>
  <rect x="0" y="0" width="1200" height="5" fill="${accent}"/>`;
  }
}

// ── Skill pill builder ───────────────────────────────────────────────────────
function buildSkillPills(
  skills: string[],
  style: string,
  accent: string,
  fg: string,
): string {
  const top3 = skills.slice(0, 3);
  const pillH = 42;
  const pillPadX = 20;
  const fontSize = 22;
  const pillY = 460;
  const rx = 21;

  // Per-theme pill appearance
  let pillFill: string;
  let pillStroke: string;
  let textColor: string;

  if (style === 'classic-clean') {
    pillFill = '#ffffff';
    pillStroke = accent;
    textColor = accent;
  } else if (style === 'bold-dark') {
    pillFill = accent;
    pillStroke = accent;
    textColor = '#ffffff';
  } else if (style === 'glass-pro') {
    pillFill = 'rgba(255,255,255,0.12)';
    pillStroke = 'rgba(255,255,255,0.35)';
    textColor = '#ffffff';
  } else {
    // minimal — accent-tinted
    pillFill = accent + '28';
    pillStroke = accent + '66';
    textColor = accent;
  }

  const parts: string[] = [];
  let x = 72;
  for (const skill of top3) {
    const charWidth = fontSize * 0.55;
    const pillW = Math.round(skill.length * charWidth + pillPadX * 2);
    const textY = pillY + pillH / 2 + fontSize * 0.36;
    parts.push(`
    <rect x="${x}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${rx}" fill="${pillFill}" stroke="${pillStroke}" stroke-width="1.5"/>
    <text x="${x + pillW / 2}" y="${textY}" font-family="system-ui,sans-serif" font-size="${fontSize}" fill="${textColor}" text-anchor="middle" font-weight="700">${escapeXml(skill)}</text>`);
    x += pillW + 16;
  }
  return parts.join('');
}

function buildSVG(data: {
  name: string;
  role: string;
  location: string | null;
  bio: string | null;
  skills: string[];
  accent: string;
  style: string;
  openToWork: boolean;
  username: string;
}): string {
  const { name, role, location, bio, skills, accent, style, openToWork, username } = data;
  const bg = styleToBg(style);
  const fg = styleToFg(style);
  const muted = styleToMuted(style);
  const monogram = name?.charAt(0)?.toUpperCase() || '?';
  const isLight = style === 'classic-clean';

  const displayName = truncate(name, 32);
  const displayRole = truncate(role, 48);
  const bioLines = bio ? wrapText(truncate(bio, 120), 60) : [];

  const dividerColor = isLight ? '#d1d5db' : accent + '44';

  // Wordmark badge
  const wordmarkBg = isLight ? accent : 'rgba(255,255,255,0.10)';
  const wordmarkFg = isLight ? '#ffffff' : accent;

  const decoLayer = styleToDecoLayer(style, accent);
  const skillPillsSVG = buildSkillPills(skills, style, accent, fg);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <clipPath id="avatarClip">
      <circle cx="132" cy="180" r="68"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="${bg}"/>

  <!-- Per-theme decoration -->
  ${decoLayer}

  <!-- Wordmark badge (top-right) -->
  <rect x="980" y="28" width="192" height="38" rx="19" fill="${wordmarkBg}"/>
  <text x="1076" y="52" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="${wordmarkFg}" text-anchor="middle">✦ WiseResume</text>

  <!-- Avatar monogram circle -->
  <circle cx="132" cy="180" r="68" fill="${accent}22" stroke="${accent}" stroke-width="2.5"/>
  <text x="132" y="200" font-family="system-ui,sans-serif" font-size="64" font-weight="800" fill="${accent}" text-anchor="middle">${escapeXml(monogram)}</text>

  <!-- Name -->
  <text x="232" y="148" font-family="system-ui,sans-serif" font-size="52" font-weight="800" fill="${fg}" dominant-baseline="auto">${escapeXml(displayName)}</text>

  <!-- Role -->
  <text x="232" y="198" font-family="system-ui,sans-serif" font-size="26" font-weight="400" fill="${muted}">${escapeXml(displayRole)}</text>

  <!-- Location -->
  ${location ? `<text x="232" y="234" font-family="system-ui,sans-serif" font-size="22" fill="${muted}">📍 ${escapeXml(truncate(location, 40))}</text>` : ''}

  <!-- Open to Work badge -->
  ${openToWork ? `
  <rect x="232" y="${location ? 252 : 242}" width="172" height="30" rx="15" fill="${accent}22" stroke="${accent}" stroke-width="1.5"/>
  <text x="318" y="${location ? 271 : 261}" font-family="system-ui,sans-serif" font-size="16" fill="${accent}" text-anchor="middle" font-weight="600">✦ Open to Work</text>
  ` : ''}

  <!-- Divider 1 -->
  <rect x="72" y="320" width="1056" height="1.5" fill="${dividerColor}"/>

  <!-- TOP SKILLS label -->
  <text x="72" y="350" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="${muted}" letter-spacing="3">TOP SKILLS</text>

  <!-- Bio lines -->
  ${bioLines.length > 0 ? bioLines.map((line, i) => `
  <text x="72" y="${390 + i * 32}" font-family="system-ui,sans-serif" font-size="21" fill="${muted}">${escapeXml(line)}</text>`).join('') : ''}

  <!-- Skill pills (top 3, enlarged) -->
  ${skillPillsSVG}

  <!-- Divider 2 -->
  <rect x="72" y="520" width="1056" height="1.5" fill="${dividerColor}"/>

  <!-- Bottom URL -->
  <text x="72" y="578" font-family="system-ui,sans-serif" font-size="20" fill="${muted}" font-weight="500">wiseresume.app/p/${escapeXml(username)}</text>
  <text x="1128" y="578" font-family="system-ui,sans-serif" font-size="18" fill="${muted}" text-anchor="end">Made with ✦ WiseResume</text>
</svg>`;
}

function buildFallbackSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="20%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0a14"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="1200" height="5" fill="#7c3aed"/>
  <text x="600" y="260" font-family="system-ui,sans-serif" font-size="72" font-weight="800" fill="#f0f0ff" text-anchor="middle">✦ WiseResume</text>
  <text x="600" y="340" font-family="system-ui,sans-serif" font-size="28" fill="#9ca3af" text-anchor="middle">Build your professional portfolio</text>
  <text x="600" y="400" font-family="system-ui,sans-serif" font-size="22" fill="#7c3aed" text-anchor="middle">wiseresume.app</text>
</svg>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username')?.toLowerCase();

    if (!username) {
      // Return fallback branded image
      const svg = buildFallbackSVG();
      return new Response(svg, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.rpc('get_public_portfolio', {
      p_username: username,
    });

    if (error || !data) {
      const svg = buildFallbackSVG();
      return new Response(svg, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    const raw = data as Record<string, unknown>;
    const profile = (raw.profile || {}) as Record<string, unknown>;
    const resume = (raw.resume || {}) as Record<string, unknown>;

    const skills = (resume.skills as string[]) || [];
    const name = (profile.fullName as string) || username;
    const role = (profile.jobTitle as string) || 'Professional';
    const location = (profile.location as string) || null;
    const bio = (profile.portfolioBio as string) || null;
    const accent = (profile.portfolioAccentColor as string) || '#7c3aed';
    const style = (profile.portfolioStyle as string) || 'minimal';
    const openToWork = (profile.openToWork as boolean) || false;

    const svg = buildSVG({ name, role, location, bio, skills, accent, style, openToWork, username });

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('og-image error:', err);
    const svg = buildFallbackSVG();
    return new Response(svg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }
});
