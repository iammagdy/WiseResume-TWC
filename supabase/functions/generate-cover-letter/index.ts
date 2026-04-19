import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, isAIError, sanitizeInputText, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { insertCoverLetter } from "../_shared/letterPersistence.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('generate-cover-letter');


const safeSkillsString = (skills: any[] | undefined): string =>
  (skills || []).map((s: any) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean).join(', ');

const MAX_RESUME_SIZE = 100 * 1024;
const MAX_JOB_DESCRIPTION_SIZE = 50 * 1024;
const VALID_TONES = ['professional', 'enthusiastic', 'conversational'];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  try {
    const { userId, client } = await requireAuth(req);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'cover_letter' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'cover_letter', 10, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reqBody = await req.json();
    const resume = reqBody.resume;
    const rawJobDescription = reqBody.jobDescription;
    const tone = reqBody.tone || 'professional';
    const jobTitle: string | undefined = reqBody.jobTitle;
    const companyName: string | undefined = reqBody.company;
    const templateStyle: string | undefined = reqBody.templateStyle;
    const resumeId: string | undefined = reqBody.resumeId;
    const titleOverride: string | undefined = reqBody.title;

    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rawJobDescription || typeof rawJobDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Job description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and truncate job description
    const jobDescription = sanitizeInputText(rawJobDescription, 15_000);

    if (JSON.stringify(resume).length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Resume data too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (jobDescription.length > MAX_JOB_DESCRIPTION_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Job description too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validTone = VALID_TONES.includes(tone) ? tone : 'professional';

    const toneDescriptions: Record<string, string> = {
      professional: 'formal, polished, and business-appropriate',
      enthusiastic: 'energetic, passionate, and showing genuine excitement',
      conversational: 'friendly, approachable, and natural-sounding',
    };

    const systemPrompt = `You are a professional cover letter writer with deep knowledge of ATS systems and modern hiring practices. You write cover letters that pass Workday, Taleo, and Greenhouse ATS parsing while compelling human recruiters to schedule interviews.

## STRUCTURE — every letter must follow this 3-paragraph framework:
1. OPENING (50-70 words): A strong hook that names the specific role, echoes 3-5 exact keywords from the job description, and immediately positions the candidate as a match — NOT a generic "I am applying for..." opener.
2. BODY (120-150 words): 1-2 concrete achievements from the candidate's actual resume, tied directly to the job's key requirements. Weave 3-5 additional exact keywords from the job description naturally — ATS systems scan cover letters too. Use the ACTION VERB + WHAT + RESULT format for any achievement mentioned.
3. CLOSING (50-70 words): Echo 3-5 exact keywords from the job description to reinforce ATS relevance, then deliver a confident, specific call to action. Reference something concrete about the company or role to show genuine interest. End with a clear next-step request.

## TONE: ${toneDescriptions[validTone]}

## CRITICAL RULES:
- The letter header MUST include the candidate's actual name, email, and phone exactly as provided. If any contact field is missing, omit that line entirely — do NOT use placeholders.
- Do NOT use generic openers: "I am writing to apply", "I am excited to apply", "Please find attached" — these are ATS and recruiter red flags.
- Do NOT use placeholder brackets like [Your Name] or [Company Name]. Use the actual values provided.
- Do NOT invent achievements, metrics, or experiences not present in the candidate's resume.
- Mirror exact terminology from the job description — if the JD says "cross-functional collaboration", use that phrase, not "teamwork".
- Recruiters spend 7 seconds on a cover letter — every sentence must earn its place. Follow the paragraph word counts above strictly.`;

    const userPrompt = `Write a cover letter using the framework in your instructions.

## CANDIDATE DETAILS
Name: ${resume.contactInfo?.fullName || 'Candidate'}
Phone: ${resume.contactInfo?.phone || ''}
Email: ${resume.contactInfo?.email || ''}
LinkedIn: ${resume.contactInfo?.linkedin || ''}

Use these ACTUAL contact details in the header. Do NOT use placeholder brackets.

Current Role: ${resume.experience?.[0]?.position || 'Professional'} at ${resume.experience?.[0]?.company || 'Previous Company'}
Professional Summary: ${resume.summary || 'Experienced professional'}
Key Skills: ${safeSkillsString(resume.skills?.slice(0, 10)) || 'Various skills'}

Recent Experience & Achievements:
${resume.experience?.slice(0, 2).map((e: any) => `- ${e.position} at ${e.company}\n  ${e.achievements?.slice(0, 3).join('; ') || e.description || ''}`).join('\n') || 'Professional experience'}

Education: ${resume.education?.[0]?.degree || ''} in ${resume.education?.[0]?.field || ''} from ${resume.education?.[0]?.institution || ''}

## TARGET JOB DESCRIPTION
${jobDescription}

## YOUR TASK
1. Identify the 5 most critical keywords and phrases from the job description above
2. Weave those exact keywords naturally into the cover letter — especially in the opening and body paragraphs
3. Select the 1-2 strongest achievements from the candidate's experience that directly match the job requirements
4. Write the letter following the 3-paragraph structure from your instructions
5. Use the ${validTone} tone throughout
6. Include a professional header with the candidate's actual contact details`;


    const creditCheck = await checkAndDeductCredit(userId, 2);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    let aiResponse;
    try {
      aiResponse = await callAIWithRetry({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        userId,
      });
    } catch (aiErr) {
      await refundCredit(userId, creditCheck, 2);
      throw aiErr;
    }

    const coverLetter = aiResponse.content;
    if (!coverLetter) throw new Error("No content in AI response");

    await recordUsage(userId, 'cover_letter', { provider: aiResponse.providerUsed || 'unknown' });

    // Persist generated letter so users can revisit it from history.
    // Persistence is a hard requirement for the task — if the row can't be
    // saved, surface a clear error rather than silently returning text the
    // user will lose on refresh.
    let savedId: string;
    try {
      savedId = await insertCoverLetter(getServiceClient(), {
        userId,
        content: coverLetter,
        jobTitle,
        company: companyName,
        tone,
        templateStyle,
        resumeId,
        jobDescription,
        title: titleOverride,
        modelUsed: aiResponse.providerUsed,
      });
    } catch (persistErr) {
      log.error('Failed to persist cover letter', persistErr);
      return new Response(
        JSON.stringify({
          error: 'persist_failed',
          message: 'Generated the letter but failed to save it. Please try again.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        id: savedId,
        coverLetter,
        content: coverLetter,
        _providerUsed: aiResponse.providerUsed || 'unknown',
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log.error("Unhandled error", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
