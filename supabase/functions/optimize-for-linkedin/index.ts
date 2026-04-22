import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON, toUserError, sanitizeInputText } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('optimize-for-linkedin');
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('optimize-for-linkedin');


// Extend the global scope with the Deno namespace for type checking
declare global {
  interface ImportMeta {
    env: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }
}

interface ResumeData {
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary: string;
  experience: {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    achievements: string[];
  }[];
  education: {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }[];
  skills: (string | { name?: string })[];
}

interface LinkedInOptimizeRequest {
  resume: ResumeData;
  targetRole?: string;
  region?: 'global' | 'gcc' | 'emea' | 'apac' | 'americas';
}

/** Safely extract skills as a comma-separated string */
function safeSkillsString(skills: unknown): string {
  if (!Array.isArray(skills)) return 'Not listed';
  return skills.map(s => typeof s === 'string' ? s : (s as any)?.name || String(s)).join(', ') || 'Not listed';
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  try {
    const { userId, client } = await requireAuth(req);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'linkedin_opt' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'linkedin_opt', 10, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resume, targetRole, region = 'global' }: LinkedInOptimizeRequest = await req.json();

    if (!resume) {
      return new Response(
        JSON.stringify({ error: 'Resume data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const regionContext: Record<string, string> = {
      global: 'Use internationally recognized terminology and avoid region-specific idioms.',
      gcc: 'Consider Gulf Cooperation Council business culture. Emphasize stability, respect for hierarchy, and relationship building.',
      emea: 'Balance European formality with Middle Eastern relationship focus. Highlight international experience.',
      apac: 'Consider Asia-Pacific business values: collective achievement, continuous learning, and respect for experience.',
      americas: 'Use direct, achievement-focused language common in North and South American business culture.',
    };

    const resumeContext = sanitizeInputText(`
Name: ${resume.contactInfo.fullName}
Current/Recent Role: ${resume.experience?.[0]?.position || 'Not specified'} at ${resume.experience?.[0]?.company || 'Not specified'}
Summary: ${resume.summary || 'Not provided'}
Skills: ${safeSkillsString(resume.skills)}
Experience Highlights: ${resume.experience?.slice(0, 3).map(e => `${e.position} at ${e.company}`).join('; ') || 'Not listed'}
Education: ${resume.education?.[0]?.degree} in ${resume.education?.[0]?.field} from ${resume.education?.[0]?.institution || 'Not listed'}
${targetRole ? `Target Role: ${targetRole}` : ''}
`, 5000);

    const prompt = `You are a LinkedIn optimization expert who helps professionals create compelling profiles.

${regionContext[region]}

Based on this resume data:
${resumeContext}

Generate a comprehensive LinkedIn optimization package.`;


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
        model: __ROUTE.model,
        wiseresumeSubProvider: __ROUTE.provider,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        userId,
        tools: [{
        type: 'function',
        function: {
          name: 'generate_linkedin_package',
          description: 'Generate a structured LinkedIn optimization package',
          parameters: {
            type: 'object',
            properties: {
              headlines: { type: 'array', items: { type: 'string' }, description: '5 compelling LinkedIn headline options, 120 chars max each' },
              aboutSections: {
                type: 'object',
                properties: {
                  short: { type: 'string', description: '150 word about section' },
                  medium: { type: 'string', description: '300 word about section' },
                  long: { type: 'string', description: '500 word about section' },
                },
                required: ['short', 'medium', 'long'],
                additionalProperties: false,
              },
              experienceRewrites: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    original: { type: 'string' },
                    linkedin: { type: 'string' },
                    position: { type: 'string' },
                    company: { type: 'string' },
                  },
                  required: ['original', 'linkedin', 'position', 'company'],
                  additionalProperties: false,
                },
              },
              suggestedSkills: { type: 'array', items: { type: 'string' }, description: '15-20 skills' },
              keywords: { type: 'array', items: { type: 'string' }, description: '10-15 keywords' },
              tips: { type: 'array', items: { type: 'string' }, description: '3-5 tips' },
            },
            required: ['headlines', 'aboutSections', 'experienceRewrites', 'suggestedSkills', 'keywords', 'tips'],
            additionalProperties: false,
          },
        },
      }],
        toolChoice: { type: 'function', function: { name: 'generate_linkedin_package' } },
      });
    } catch (aiErr) {
      await refundCredit(userId, creditCheck, 1);
      throw aiErr;
    }

    let result: any = null;
    if (aiResponse.toolCalls?.length) {
      try { result = JSON.parse(aiResponse.toolCalls[0].function.arguments); } catch { /* fall through */ }
    }
    if (!result && aiResponse.content) {
      result = parseAIJSON(aiResponse.content);
    }
    if (!result) {
      await refundCredit(userId, creditCheck, 1);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await recordUsage(userId, 'linkedin_opt', { provider: aiResponse.providerUsed || 'unknown' });


    return new Response(
      JSON.stringify({ success: true, ...result }),
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
