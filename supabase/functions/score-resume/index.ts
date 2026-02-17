import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, isAIError, parseAIJSON } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_RESUME_SIZE = 100 * 1024;

// ── Deterministic Scoring Functions (zero variance) ──────────────────

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

  // Check for inconsistent date formats
  const uniqueFormats = new Set(dateFormats.filter(f => f !== 'unknown'));
  if (uniqueFormats.size > 1) score -= 15;

  // Missing dates on experience
  score -= Math.min(missingDateCount * 10, 30);

  // Empty descriptions on experience
  score -= Math.min(emptyDescCount * 15, 30);

  // Check for bullet characters in descriptions (sign of poor parsing)
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

// ── Helper: clamp AI score ───────────────────────────────────────────

function clamp(val: unknown, min: number, max: number): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (isNaN(n)) return 50; // fallback
  return Math.max(min, Math.min(max, Math.round(n)));
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

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 30, windowSeconds: 60, actionType: 'score' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resume, background } = await req.json();

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

    // ── Step 1: Compute 4 deterministic scores ───────────────────────
    const contactCompleteness = scoreContactCompleteness(resume.contactInfo || {});
    const sectionStructure = scoreSectionStructure(resume);
    const parsability = scoreParsability(resume);
    const lengthDensity = scoreLengthDensity(resume);

    // ── Step 2: Prepare text for AI (only what AI needs) ─────────────
    const skills = Array.isArray(resume.skills)
      ? resume.skills.map((s: unknown) => typeof s === 'string' ? s : (s as Record<string, string>)?.name || String(s)).join(', ')
      : 'Not provided';

    const experience = resume.experience?.map((e: Record<string, unknown>) =>
      `${e.position || 'Untitled'} at ${e.company || 'Unknown'} (${e.startDate || '?'} - ${e.endDate || 'Present'}):\n${e.description || ''}\nAchievements: ${Array.isArray(e.achievements) ? e.achievements.join('; ') : 'None'}`
    ).join('\n\n') || 'Not provided';

    const education = resume.education?.map((e: Record<string, unknown>) =>
      `${e.degree || ''} in ${e.field || ''} from ${e.institution || 'Unknown'}`
    ).join('\n') || 'Not provided';

    // ── Step 3: AI evaluates ONLY 2 subjective pillars ───────────────
    const systemPrompt = `You are an ATS keyword and content quality evaluator. You ONLY assess two things:
1. Keyword Optimization: How well the resume uses industry-relevant keywords, tools, technologies, and certifications.
2. Content Quality: How well the resume uses action verbs, quantified achievements, and result-oriented bullet points.

IMPORTANT: Respond ONLY with valid JSON, no markdown or code blocks.
Be strict, consistent, and fair.`;

    const userPrompt = `Evaluate this resume on exactly 2 pillars. Score each 0-100.

Summary: ${resume.summary || 'Not provided'}

Skills: ${skills}

Experience:
${experience}

Education:
${education}

### Keyword Optimization (0-100)
- 0-25: Almost no relevant keywords; generic language only
- 26-50: Some relevant keywords but major gaps
- 51-75: Good keyword coverage; most important skills mentioned
- 76-100: Excellent keyword density; comprehensive industry terms naturally woven throughout

### Content Quality (0-100)
- 0-25: No action verbs; purely descriptive; no measurable outcomes
- 26-50: Some action verbs but mostly passive voice; few metrics
- 51-75: Good action verbs; some quantified results
- 76-100: Strong action verbs throughout; rich quantified achievements

Return JSON:
{
  "keywordOptimization": <0-100>,
  "contentQuality": <0-100>,
  "topStrength": "<one short sentence about the strongest aspect>",
  "topImprovement": "<one short actionable sentence about the biggest improvement opportunity>"
}`;

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      userId: user.id,
    });

    const content = aiResponse.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const aiResult = parseAIJSON(content);
    if (!aiResult || typeof aiResult.keywordOptimization === 'undefined') {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI scoring response. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 4: Clamp AI scores and compute weighted overall ─────────
    const keywordOptimization = clamp(aiResult.keywordOptimization, 0, 100);
    const contentQuality = clamp(aiResult.contentQuality, 0, 100);

    const overallScore = Math.round(
      keywordOptimization * 0.35 +
      contentQuality * 0.25 +
      sectionStructure * 0.15 +
      parsability * 0.10 +
      contactCompleteness * 0.10 +
      lengthDensity * 0.05
    );

    const result = {
      overallScore,
      categories: {
        keywordOptimization,
        contentQuality,
        sectionStructure,
        parsability,
        contactCompleteness,
        lengthDensity,
      },
      topStrength: aiResult.topStrength || 'Resume has been evaluated.',
      topImprovement: aiResult.topImprovement || 'Consider adding more quantified achievements.',
    };

    // Record usage
    if (background) {
      await recordUsage(user.id, 'score', { background: true });
    } else {
      await recordUsage(user.id, 'score');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("score-resume error:", error);

    if (isAIError(error)) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
