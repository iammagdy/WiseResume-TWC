import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";

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
}

const MAX_PAYLOAD_SIZE = 100000;

const safeSkillsString = (skills: any[] | undefined | null): string =>
  (skills || []).map((s: any) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean).join(', ');

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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 10, windowSeconds: 60, actionType: 'one_page' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
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

    const { resume, targetRole, yearsOfExperience, preserveRecent = 2 }: OnePageRequest = JSON.parse(bodyText);

    if (!resume) {
      return new Response(
        JSON.stringify({ error: 'Resume data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentPages = estimatePageCount(resume);
    
    if (currentPages <= 1) {
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
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumeJson = JSON.stringify(resume, null, 2);

    const prompt = `You are a resume optimization expert. Condense this ${currentPages}-page resume to one page.

${resumeJson}

${targetRole ? `Target role: ${targetRole}` : ''}
${yearsOfExperience ? `Years of experience: ${yearsOfExperience}` : ''}
Preserve the most recent ${preserveRecent} jobs in full detail.

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

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      userId: user.id,
    });

    const result = parseAIJSON(aiResponse.content || '{}');

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await recordUsage(user.id, 'one_page', { provider: aiResponse.providerUsed || 'unknown' });

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('One-page optimizer error:', error);
    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
