import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, parseAIJSONWithRetry } from "../_shared/aiClient.ts";
import { logger } from "../_shared/logger.ts";
import { wrapHandler } from "../_shared/fnLogger.ts";

const log = logger('generate-fix-suggestions');

const VALID_TYPES = new Set(['add_skill', 'improve_bullet', 'enhance_summary']);
const VALID_SECTIONS = new Set(['skills', 'experience', 'summary']);
const GENERIC_PHRASES = [
  'responsible for', 'worked on', 'helped with',
  'assisted in', 'participated in', 'contributed to',
];
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to',
  'for','of','with','by','from','as','is','was','are','were','be','been','that',
]);

function tokenize(s: string): string[] {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function isBulletRelevant(original: string, improved: string): boolean {
  const origTokens = tokenize(original);
  if (origTokens.length === 0) return true;
  const improvedSet = new Set(tokenize(improved));
  const overlap = origTokens.filter(w => improvedSet.has(w)).length;
  return overlap >= 2 || overlap / origTokens.length >= 0.25;
}

Deno.serve(wrapHandler('generate-fix-suggestions', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let userId: string;
  try {
    const auth = await requireAuth(req);
    userId = auth.userId;
  } catch (authErr) {
    return authErrorResponse(authErr, req.headers.get('origin'));
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { finalResume, jobDescription, missing_keywords, issues } = body;

  if (!finalResume || typeof finalResume !== 'object' || Array.isArray(finalResume)) {
    return new Response(
      JSON.stringify({ error: 'finalResume is required and must be an object' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (typeof jobDescription !== 'string') {
    return new Response(
      JSON.stringify({ error: 'jobDescription is required and must be a string' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (!Array.isArray(missing_keywords) || !Array.isArray(issues)) {
    return new Response(
      JSON.stringify({ error: 'missing_keywords and issues must be arrays' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const resume = finalResume as Record<string, unknown>;

  const resumeSkills: string[] = Array.isArray(resume.skills)
    ? (resume.skills as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  const resumeSummary: string = typeof resume.summary === 'string' ? resume.summary : '';

  const resumeExperience: Array<Record<string, unknown>> = Array.isArray(resume.experience)
    ? (resume.experience as unknown[]).filter(
        (e): e is Record<string, unknown> => typeof e === 'object' && e !== null && !Array.isArray(e),
      )
    : [];

  const missingKws: string[] = (missing_keywords as unknown[]).filter(
    (k): k is string => typeof k === 'string',
  );
  const issuesList: string[] = (issues as unknown[]).filter(
    (i): i is string => typeof i === 'string',
  );

  try {
    const expSnippet = resumeExperience.slice(0, 3).map(exp => {
      const id = typeof exp.id === 'string' ? exp.id : 'unknown';
      const achievements: string[] = Array.isArray(exp.achievements)
        ? (exp.achievements as unknown[]).filter((a): a is string => typeof a === 'string')
        : [];
      return achievements.map((a, idx) => `[${id}] ${idx}: ${a}`).join('\n');
    }).filter(Boolean).join('\n');

    const systemPrompt = `You are an atomic resume improvement generator.

Rules (follow exactly):
- Return a JSON array of up to 5 fix suggestion objects. No prose, no markdown fences, no explanation outside the JSON.
- Each object must have: type, section, after, reason. target_id and before are optional.
- type must be one of: add_skill, improve_bullet, enhance_summary
- section must be one of: skills, experience, summary
- add_skill: "after" must be a skill token that appears LITERALLY in the job description AND is not already in the resume skills list.
- improve_bullet: "target_id" must be exactly "<experienceId>-<bulletIndex>" using IDs from the provided experience list. "after" must be ≤ 160 chars, start with an action verb. Do not fabricate context not implied by the job description.
- enhance_summary: "after" must be ≤ 400 chars and naturally incorporate at least one missing keyword.
- reason: one sentence explaining what gap this fixes.
- If no high-quality suggestions can be made, return [].
- Return ONLY a valid JSON array.`;

    const userPrompt = `MISSING KEYWORDS: ${missingKws.join(', ') || 'none'}
ISSUES: ${issuesList.join(' | ') || 'none'}

JOB DESCRIPTION (excerpt):
${jobDescription.slice(0, 2000)}

CURRENT SUMMARY: ${resumeSummary.slice(0, 400)}
CURRENT SKILLS: ${resumeSkills.join(', ') || 'none'}

EXPERIENCE BULLETS (format: [experienceId] bulletIndex: text):
${expSnippet || 'none'}`;

    const aiResponse = await callAIWithRetry({
      featureName: 'tailor-resume',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      maxTokens: 800,
      userId,
      jsonMode: true,
    });

    if (!aiResponse.content) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const parsed = await parseAIJSONWithRetry<unknown[]>(aiResponse.content, { userId });
    if (!Array.isArray(parsed)) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const cleaned = parsed.filter((item): item is Record<string, unknown> => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
      const obj = item as Record<string, unknown>;

      // 1. Structural validation
      if (!VALID_TYPES.has(String(obj.type))) return false;
      if (!VALID_SECTIONS.has(String(obj.section))) return false;
      if (typeof obj.after !== 'string' || !obj.after) return false;

      // 2. Length guard
      if (obj.after.trim().length < 10) return false;

      // 3. Generic-phrase guard
      const afterLower = obj.after.toLowerCase();
      if (GENERIC_PHRASES.some(phrase => afterLower.includes(phrase))) return false;

      // 4. Bullet context validation
      if (obj.type === 'improve_bullet') {
        const targetId = typeof obj.target_id === 'string' ? obj.target_id : '';
        const dashIdx = targetId.lastIndexOf('-');
        if (dashIdx === -1) return false;
        const experienceId = targetId.slice(0, dashIdx);
        const bulletIndex = parseInt(targetId.slice(dashIdx + 1), 10);
        if (!experienceId || isNaN(bulletIndex)) return false;
        const exp = resumeExperience.find(e => e.id === experienceId);
        if (!exp) return false;
        const achievements: string[] = Array.isArray(exp.achievements)
          ? (exp.achievements as unknown[]).filter((a): a is string => typeof a === 'string')
          : [];
        if (bulletIndex < 0 || bulletIndex >= achievements.length) return false;
        if (!isBulletRelevant(achievements[bulletIndex], obj.after as string)) return false;
      }

      return true;
    });

    const result = cleaned.slice(0, 5);
    log.info('suggestions generated', { count: result.length, userId });
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    log.info('suggestion generation failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response(
      JSON.stringify([]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));
