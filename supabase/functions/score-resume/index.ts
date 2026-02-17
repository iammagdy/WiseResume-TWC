import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_RESUME_SIZE = 100 * 1024;

// ── Action Verbs List ────────────────────────────────────────────────

const ACTION_VERBS = new Set([
  'led', 'managed', 'developed', 'created', 'implemented', 'designed', 'built',
  'achieved', 'increased', 'decreased', 'reduced', 'improved', 'launched',
  'delivered', 'coordinated', 'supervised', 'trained', 'mentored', 'analyzed',
  'resolved', 'negotiated', 'streamlined', 'optimized', 'automated',
  'spearheaded', 'pioneered', 'established', 'maintained', 'organized',
  'executed', 'collaborated', 'facilitated', 'generated', 'secured',
  'transformed', 'oversaw', 'directed', 'administered', 'initiated',
  'consolidated', 'restructured', 'revamped', 'formulated', 'architected',
  'engineered', 'deployed', 'integrated', 'migrated', 'monitored',
  'evaluated', 'assessed', 'researched', 'presented', 'published',
  'authored', 'documented', 'configured', 'troubleshot', 'debugged',
  'accelerated', 'influenced', 'orchestrated', 'modernized', 'scaled',
]);

// ── Deterministic Scoring Functions ──────────────────────────────────

function scoreContactCompleteness(contact: Record<string, string | undefined>): number {
  let score = 0;
  if (contact?.fullName?.trim()) score += 20;
  if (contact?.email?.trim()) score += 20;
  if (contact?.phone?.trim()) score += 20;
  if (contact?.location?.trim()) score += 20;
  if (contact?.linkedin?.trim() || contact?.portfolio?.trim() || contact?.website?.trim()) score += 20;
  return score;
}

function scoreSectionStructure(resume: Record<string, unknown>): number {
  let score = 0;
  if (typeof resume.summary === 'string' && resume.summary.trim().length > 0) score += 20;
  if (Array.isArray(resume.experience) && resume.experience.length > 0) score += 25;
  if (Array.isArray(resume.education) && resume.education.length > 0) score += 20;
  if (Array.isArray(resume.skills) && resume.skills.length > 0) score += 20;

  const hasOptional =
    (Array.isArray(resume.certifications) && resume.certifications.length > 0) ||
    (Array.isArray(resume.projects) && resume.projects.length > 0) ||
    (Array.isArray(resume.awards) && resume.awards.length > 0) ||
    (Array.isArray(resume.volunteering) && resume.volunteering.length > 0) ||
    (Array.isArray(resume.languages) && resume.languages.length > 0);
  if (hasOptional) score += 15;

  return Math.min(score, 100);
}

function scoreParsability(resume: Record<string, unknown>): number {
  let score = 100;

  const dateFormats: string[] = [];
  const dateRegexes = [
    { pattern: /^\d{4}-\d{2}(-\d{2})?$/, label: 'ISO' },
    { pattern: /^\d{2}\/\d{4}$/, label: 'MM/YYYY' },
    { pattern: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}$/i, label: 'Month YYYY' },
    { pattern: /^\d{4}$/, label: 'YYYY' },
  ];

  function classifyDate(d: string): string {
    if (!d || d === 'Present' || d === 'present' || d === 'Current') return 'special';
    for (const r of dateRegexes) {
      if (r.pattern.test(d.trim())) return r.label;
    }
    return 'unknown';
  }

  const experiences = Array.isArray(resume.experience) ? resume.experience as Record<string, unknown>[] : [];
  const educations = Array.isArray(resume.education) ? resume.education as Record<string, unknown>[] : [];

  let missingDateCount = 0;
  let emptyDescCount = 0;

  for (const e of experiences) {
    const sd = classifyDate(String(e.startDate || ''));
    const ed = classifyDate(String(e.endDate || ''));
    if (sd !== 'special') dateFormats.push(sd);
    if (ed !== 'special') dateFormats.push(ed);

    if (!e.startDate || String(e.startDate).trim() === '') missingDateCount++;

    const desc = String(e.description || '').trim();
    const achievements = Array.isArray(e.achievements) ? e.achievements : [];
    const responsibilities = Array.isArray(e.responsibilities) ? e.responsibilities : [];
    if (desc === '' && achievements.length === 0 && responsibilities.length === 0) emptyDescCount++;
  }

  for (const e of educations) {
    const sd = classifyDate(String(e.startDate || ''));
    const ed = classifyDate(String(e.endDate || ''));
    if (sd !== 'special') dateFormats.push(sd);
    if (ed !== 'special') dateFormats.push(ed);
  }

  const uniqueFormats = new Set(dateFormats.filter(f => f !== 'unknown'));
  if (uniqueFormats.size > 1) score -= 15;
  score -= Math.min(missingDateCount * 10, 30);
  score -= Math.min(emptyDescCount * 15, 30);

  for (const e of experiences) {
    const desc = String(e.description || '');
    if (/[•●■◦▪➤►→]/.test(desc)) {
      score -= 10;
      break;
    }
  }

  return Math.max(score, 0);
}

function scoreLengthDensity(resume: Record<string, unknown>): number {
  const experiences = Array.isArray(resume.experience) ? resume.experience as Record<string, unknown>[] : [];
  const skills = Array.isArray(resume.skills) ? resume.skills : [];

  let totalBullets = 0;
  for (const e of experiences) {
    const achievements = Array.isArray(e.achievements) ? e.achievements.length : 0;
    const responsibilities = Array.isArray(e.responsibilities) ? e.responsibilities.length : 0;
    totalBullets += achievements + responsibilities;
  }

  let score: number;
  if (totalBullets === 0) score = 10;
  else if (totalBullets <= 3) score = 30;
  else if (totalBullets <= 8) score = 50;
  else if (totalBullets <= 15) score = 75;
  else score = 100;

  if (skills.length < 3) score -= 20;
  if (experiences.length < 1) score -= 30;

  return Math.max(Math.min(score, 100), 0);
}

// ── NEW: Deterministic Keyword Optimization ──────────────────────────

function scoreKeywordOptimization(resume: Record<string, unknown>): number {
  const skillsArr = Array.isArray(resume.skills) ? resume.skills : [];

  // Extract skill names as lowercase
  const skillNames: string[] = skillsArr.map((s: unknown) => {
    if (typeof s === 'string') return s.toLowerCase().trim();
    if (s && typeof s === 'object' && 'name' in (s as Record<string, unknown>)) {
      return String((s as Record<string, string>).name || '').toLowerCase().trim();
    }
    return String(s).toLowerCase().trim();
  }).filter(Boolean);

  if (skillNames.length === 0) return 0;

  // Build a text blob from summary + experience descriptions/achievements/responsibilities
  const textParts: string[] = [];
  if (typeof resume.summary === 'string') textParts.push(resume.summary);

  const experiences = Array.isArray(resume.experience) ? resume.experience as Record<string, unknown>[] : [];
  for (const e of experiences) {
    if (e.description) textParts.push(String(e.description));
    if (e.position) textParts.push(String(e.position));
    if (Array.isArray(e.achievements)) {
      for (const a of e.achievements) textParts.push(String(a));
    }
    if (Array.isArray(e.responsibilities)) {
      for (const r of e.responsibilities) textParts.push(String(r));
    }
  }

  const textBlob = textParts.join(' ').toLowerCase();

  // Count how many skills are echoed in the text
  let echoedCount = 0;
  for (const skill of skillNames) {
    if (skill.length >= 2 && textBlob.includes(skill)) {
      echoedCount++;
    }
  }

  const echoRatio = echoedCount / skillNames.length;

  let score: number;
  if (echoRatio === 0) score = 25;
  else if (echoRatio <= 0.3) score = 40;
  else if (echoRatio <= 0.6) score = 60;
  else if (echoRatio <= 0.8) score = 80;
  else score = 95;

  // Bonus for having many unique skills
  if (skillNames.length >= 8) score = Math.min(score + 5, 100);

  return score;
}

// ── NEW: Deterministic Content Quality ───────────────────────────────

function scoreContentQuality(resume: Record<string, unknown>): number {
  const experiences = Array.isArray(resume.experience) ? resume.experience as Record<string, unknown>[] : [];

  // Collect all bullets
  const bullets: string[] = [];
  let hasOnlyParagraphs = true;

  for (const e of experiences) {
    if (Array.isArray(e.achievements)) {
      for (const a of e.achievements) {
        bullets.push(String(a).trim());
        hasOnlyParagraphs = false;
      }
    }
    if (Array.isArray(e.responsibilities)) {
      for (const r of e.responsibilities) {
        bullets.push(String(r).trim());
        hasOnlyParagraphs = false;
      }
    }
  }

  if (bullets.length === 0) {
    // Check if there are paragraph descriptions at least
    let hasDesc = false;
    for (const e of experiences) {
      if (e.description && String(e.description).trim().length > 0) hasDesc = true;
    }
    return hasDesc ? 15 : 5;
  }

  // Count action verb usage
  let actionVerbCount = 0;
  let quantifiedCount = 0;

  for (const bullet of bullets) {
    // Check first word for action verb
    const firstWord = bullet.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (firstWord && ACTION_VERBS.has(firstWord)) {
      actionVerbCount++;
    }

    // Check for quantified achievements (numbers, %, $)
    if (/\d/.test(bullet) || /[%$€£]/.test(bullet)) {
      quantifiedCount++;
    }
  }

  const actionVerbRatio = actionVerbCount / bullets.length;
  const quantifiedRatio = quantifiedCount / bullets.length;

  let score = Math.round(actionVerbRatio * 50 + quantifiedRatio * 50);

  // If all descriptions are just paragraphs with no bullets, cap at 40
  if (hasOnlyParagraphs) {
    score = Math.min(score, 40);
  }

  return Math.max(Math.min(score, 100), 0);
}

// ── Deterministic Feedback Generation ────────────────────────────────

function generateFeedback(categories: Record<string, number>): { topStrength: string; topImprovement: string } {
  const feedbackMap: Record<string, { strength: string; improvement: string }> = {
    keywordOptimization: {
      strength: 'Skills are well-echoed throughout experience descriptions.',
      improvement: 'Mention your listed skills within your experience bullets to improve keyword matching.',
    },
    contentQuality: {
      strength: 'Strong use of action verbs and quantified achievements.',
      improvement: 'Start bullets with action verbs and add numbers/metrics to quantify your impact.',
    },
    sectionStructure: {
      strength: 'Resume includes all essential sections.',
      improvement: 'Add missing sections like Summary, Skills, or Education to strengthen structure.',
    },
    parsability: {
      strength: 'Dates and formatting are consistent and ATS-friendly.',
      improvement: 'Use consistent date formats and ensure all experience entries have descriptions.',
    },
    contactCompleteness: {
      strength: 'Contact information is complete with all key details.',
      improvement: 'Add missing contact details like phone, email, or LinkedIn profile.',
    },
    lengthDensity: {
      strength: 'Good density of bullet points across experience entries.',
      improvement: 'Add more achievement bullets to your experience entries for better depth.',
    },
  };

  let bestKey = 'sectionStructure';
  let worstKey = 'sectionStructure';
  let bestScore = -1;
  let worstScore = 101;

  for (const [key, val] of Object.entries(categories)) {
    if (val > bestScore) { bestScore = val; bestKey = key; }
    if (val < worstScore) { worstScore = val; worstKey = key; }
  }

  return {
    topStrength: feedbackMap[bestKey]?.strength || 'Resume has been evaluated.',
    topImprovement: feedbackMap[worstKey]?.improvement || 'Consider adding more quantified achievements.',
  };
}

// ── Main Handler ─────────────────────────────────────────────────────

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 60, windowSeconds: 60, actionType: 'score' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resume } = await req.json();

    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumeStr = JSON.stringify(resume);
    if (resumeStr.length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Resume data too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Compute ALL 6 deterministic scores ───────────────────────────
    const contactCompleteness = scoreContactCompleteness(resume.contactInfo || {});
    const sectionStructure = scoreSectionStructure(resume);
    const parsability = scoreParsability(resume);
    const lengthDensity = scoreLengthDensity(resume);
    const keywordOptimization = scoreKeywordOptimization(resume);
    const contentQuality = scoreContentQuality(resume);

    const overallScore = Math.round(
      keywordOptimization * 0.35 +
      contentQuality * 0.25 +
      sectionStructure * 0.15 +
      parsability * 0.10 +
      contactCompleteness * 0.10 +
      lengthDensity * 0.05
    );

    const categories = {
      keywordOptimization,
      contentQuality,
      sectionStructure,
      parsability,
      contactCompleteness,
      lengthDensity,
    };

    const { topStrength, topImprovement } = generateFeedback(categories);

    const result = {
      overallScore,
      categories,
      topStrength,
      topImprovement,
    };

    await recordUsage(user.id, 'score');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("score-resume error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
