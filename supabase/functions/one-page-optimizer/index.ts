import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, parseAIJSON, toUserError, sanitizeInputText } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { requireAuth } from "../_shared/authMiddleware.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('one-page-optimizer');


interface ResumeData {
  contactInfo: { fullName: string; email: string; phone: string; location: string; linkedin?: string; portfolio?: string };
  summary: string;
  experience: { id: string; company: string; position: string; startDate: string; endDate: string; current: boolean; description: string; achievements: string[] }[];
  education: { id: string; institution: string; degree: string; field: string; startDate: string; endDate: string; gpa?: string }[];
  skills: string[];
  certifications?: { id: string; name: string; issuer: string; date: string }[];
}

interface OnePageRequest {
  resume: ResumeData;
  targetRole?: string;
  yearsOfExperience?: number;
  preserveRecent?: number;
  /** Caller-measured page count from the rendered template (DOM-accurate). */
  currentPagesMeasured?: number;
  /** Selected template id — used only as context for the prompt. */
  templateId?: string;
  /** When true, instructs the AI to be more aggressive (caller already tried levers). */
  tighten?: boolean;
}

interface OnePageReduction {
  section: string;
  original: string;
  condensed: string;
  wordsRemoved: number;
  strategy: string;
}
interface OnePageRemovedItem {
  section: string;
  item: string;
  reason: string;
}
interface OnePageCondensedExperience {
  id: string;
  description: string;
  achievements: string[];
}
interface OnePageResult {
  currentEstimatedPages: number;
  optimizedEstimatedPages: number;
  reductions: OnePageReduction[];
  removedItems: OnePageRemovedItem[];
  condensedSummary?: string;
  condensedExperience: OnePageCondensedExperience[];
  layoutSuggestions: string[];
  overallStrategy: string;
}

const MAX_PAYLOAD_SIZE = 100000;

const safeSkillsString = (skills: unknown): string => {
  if (!Array.isArray(skills)) return '';
  return skills.map((s: unknown) => (typeof s === 'string' ? s : (s as { name?: string })?.name || '')).filter(Boolean).join(', ');
};

function estimatePageCount(resume: ResumeData): number {
  let charCount = 0;
  charCount += Object.values(resume.contactInfo).filter(Boolean).join(' ').length;
  charCount += resume.summary?.length || 0;
  resume.experience?.forEach(exp => {
    charCount += exp.position.length + exp.company.length + 50;
    charCount += exp.description?.length || 0;
    exp.achievements?.forEach(a => charCount += a.length + 5);
  });
  resume.education?.forEach(edu => {
    charCount += edu.degree.length + edu.field.length + edu.institution.length + 50;
  });
  charCount += safeSkillsString(resume.skills).length;
  resume.certifications?.forEach(cert => {
    charCount += cert.name.length + cert.issuer.length + 30;
  });
  return Math.ceil(charCount / 3000);
}

/**
 * Strict schema check. Returns a typed validation result so the caller can
 * refund the user's credit and emit a typed error code instead of merging
 * garbage from a flaky AI provider into the resume.
 */
function validateOnePageSchema(raw: unknown): { ok: true; value: OnePageResult } | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'response is not an object' };
  const r = raw as Record<string, unknown>;

  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const str = (v: unknown) => typeof v === 'string';

  if (!num(r.currentEstimatedPages)) return { ok: false, reason: 'currentEstimatedPages missing or non-numeric' };
  if (!num(r.optimizedEstimatedPages)) return { ok: false, reason: 'optimizedEstimatedPages missing or non-numeric' };
  if (!str(r.overallStrategy)) return { ok: false, reason: 'overallStrategy missing' };

  const arrays: Array<keyof OnePageResult> = ['reductions', 'removedItems', 'condensedExperience', 'layoutSuggestions'];
  for (const key of arrays) {
    if (!Array.isArray(r[key])) return { ok: false, reason: `${key} must be an array` };
  }

  // condensedExperience must each have id + description + achievements[]
  for (const ce of r.condensedExperience as unknown[]) {
    if (!ce || typeof ce !== 'object') return { ok: false, reason: 'condensedExperience entry not an object' };
    const c = ce as Record<string, unknown>;
    if (!str(c.id)) return { ok: false, reason: 'condensedExperience entry missing id' };
    if (!str(c.description)) return { ok: false, reason: 'condensedExperience entry missing description' };
    if (!Array.isArray(c.achievements)) return { ok: false, reason: 'condensedExperience entry missing achievements[]' };
  }

  return { ok: true, value: r as unknown as OnePageResult };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const t0 = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  try {
    const { userId } = await requireAuth(req);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'one_page' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'one_page', 10, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bodyText = await req.text();
    if (bodyText.length > MAX_PAYLOAD_SIZE) {
      return new Response(
        JSON.stringify({ error: `Payload must be under ${MAX_PAYLOAD_SIZE} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      resume,
      targetRole,
      yearsOfExperience,
      preserveRecent = 2,
      currentPagesMeasured,
      templateId,
      tighten = false,
    }: OnePageRequest = JSON.parse(bodyText);

    if (!resume) {
      return new Response(
        JSON.stringify({ error: 'Resume data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prefer the caller-measured (DOM-rendered) page count when supplied — it
    // reflects the actual template + customization, not a char-count heuristic.
    const heuristicPages = estimatePageCount(resume);
    const currentPages = (typeof currentPagesMeasured === 'number' && currentPagesMeasured > 0)
      ? Math.round(currentPagesMeasured)
      : heuristicPages;

    if (currentPages <= 1 && !tighten) {
      return new Response(
        JSON.stringify({
          success: true,
          currentEstimatedPages: 1,
          optimizedEstimatedPages: 1,
          reductions: [],
          removedItems: [],
          condensedExperience: resume.experience.map(e => ({ id: e.id, description: e.description, achievements: e.achievements })),
          layoutSuggestions: ['Your resume is already one page!'],
          overallStrategy: 'Your resume fits on one page. No major reductions needed.',
          context: { templateId: templateId ?? null, targetRole: targetRole ?? null, yearsOfExperience: yearsOfExperience ?? null, currentPagesMeasured: currentPagesMeasured ?? null },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumeJson = JSON.stringify(resume, null, 2);

    const aggressiveLine = tighten
      ? `\nThe user has already tried lighter layout adjustments — be MORE aggressive: cut at least 25% of words from older roles, drop the lowest-impact bullet from each, and prefer one-line achievements.`
      : '';

    const prompt = `You are a resume optimization expert. Condense this ${currentPages}-page resume to one page.

${sanitizeInputText(resumeJson, 15000)}

${targetRole ? `Target role: ${sanitizeInputText(targetRole, 200)}` : ''}
${yearsOfExperience ? `Years of experience: ${yearsOfExperience}` : ''}
${templateId ? `Active template: ${sanitizeInputText(templateId, 60)}` : ''}
Preserve the most recent ${preserveRecent} jobs in full detail.${aggressiveLine}

Return ONLY a JSON object with this EXACT structure (no markdown, no code fences):
{
  "currentEstimatedPages": ${currentPages},
  "optimizedEstimatedPages": 1,
  "reductions": [{ "section": "Experience|Summary|Skills|etc", "original": "original text snippet", "condensed": "condensed version", "wordsRemoved": 12, "strategy": "why this was condensed" }],
  "removedItems": [{ "section": "Experience|Education|Skills|etc", "item": "name or description of what was removed", "reason": "why it was removed" }],
  "condensedSummary": "new condensed summary text",
  "condensedExperience": [{ "id": "original experience id", "description": "condensed description", "achievements": ["condensed achievement 1"] }],
  "layoutSuggestions": ["tip 1", "tip 2"],
  "overallStrategy": "brief explanation of the overall condensing approach"
}`;


    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    let aiResponse;
    try {
      aiResponse = await callAI({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        userId,
      });
    } catch (aiErr) {
      await refundCredit(userId, creditCheck, 1);
      throw aiErr;
    }

    const parsed = parseAIJSON(aiResponse.content || '{}');

    if (!parsed) {
      await refundCredit(userId, creditCheck, 1);
      log.warn('AI returned unparseable JSON', { userId, provider: aiResponse.providerUsed, contentPreview: (aiResponse.content || '').slice(0, 200) });
      return new Response(
        JSON.stringify({ error: 'AI response was not valid JSON. Please retry.', code: 'invalid_ai_response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = validateOnePageSchema(parsed);
    if (!validation.ok) {
      await refundCredit(userId, creditCheck, 1);
      log.warn('AI response failed schema validation — credit refunded', {
        userId,
        provider: aiResponse.providerUsed,
        reason: validation.reason,
        keys: Object.keys((parsed ?? {}) as Record<string, unknown>),
      });
      return new Response(
        JSON.stringify({
          error: 'AI returned an incomplete optimization plan. Your credit was refunded — please retry.',
          code: 'invalid_ai_response',
          reason: validation.reason,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await recordUsage(userId, 'one_page', { provider: aiResponse.providerUsed || 'unknown' });

    const elapsedMs = Date.now() - t0;
    log.info('one_page success', {
      userId,
      provider: aiResponse.providerUsed,
      currentPages,
      heuristicPages,
      currentPagesMeasured: currentPagesMeasured ?? null,
      tighten,
      elapsedMs,
      templateId: templateId ?? null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...validation.value,
        // Always echo back the page count we used so the client can show an honest badge
        currentEstimatedPages: currentPages,
        provider: aiResponse.providerUsed || null,
        context: {
          templateId: templateId ?? null,
          targetRole: targetRole ?? null,
          yearsOfExperience: yearsOfExperience ?? null,
          currentPagesMeasured: currentPagesMeasured ?? null,
          tighten,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    log.error('Unhandled error', error);
    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
