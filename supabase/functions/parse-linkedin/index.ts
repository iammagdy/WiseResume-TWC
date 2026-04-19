import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, toUserError, sanitizeInputText, parseAIJSON } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('parse-linkedin');


const MAX_PROFILE_TEXT_SIZE = 200 * 1024;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, client } = await requireAuth(req);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'parse_linkedin' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { profileText, platform = 'linkedin' } = body;

    if (!profileText || typeof profileText !== "string") {
      return new Response(
        JSON.stringify({ error: "Profile text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profileText.length > MAX_PROFILE_TEXT_SIZE) {
      return new Response(
        JSON.stringify({ error: `Profile text too large. Maximum ${MAX_PROFILE_TEXT_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedText = profileText.trim();
    const isUrlOnly = /^https?:\/\/(www\.)?(linkedin|indeed|xing|wellfound)\.com/i.test(trimmedText) && 
                      trimmedText.split('\n').length <= 3 && 
                      trimmedText.length < 500;

    if (isUrlOnly) {
      const platformName = (platform === 'indeed' ? 'Indeed' : platform === 'xing' ? 'Xing' : platform === 'wellfound' ? 'Wellfound' : 'LinkedIn');
      return new Response(
        JSON.stringify({
          error: 'URL_ONLY_REJECTED',
          message:
            `We can't fetch ${platformName} profiles directly due to access restrictions. ` +
            `To import your ${platformName} data: open your profile in a browser, ` +
            "press Ctrl+A (or Cmd+A on Mac) to select all text on the page, copy it, " +
            "and paste the full text into this field.",
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const platformHints: Record<string, string> = {
      linkedin: "The input is from a LinkedIn profile. LinkedIn uses sections like 'About', 'Experience', 'Education', 'Skills', 'Licenses & Certifications', 'Volunteer Experience', 'Languages', 'Projects'.",
      indeed: "The input is from an Indeed resume profile. Indeed uses sections like 'Summary', 'Work Experience', 'Education', 'Skills', 'Certifications'. Date formats may vary.",
      xing: "The input is from a Xing profile (European professional network). Xing uses sections like 'About me', 'Experience', 'Education', 'Qualifications', 'Languages'. May include German or European formatting.",
      wellfound: "The input is from a Wellfound (AngelList) profile used for startup job seekers. Focus on 'Bio', 'Experience', 'Education', 'Skills'. May include startup-specific roles.",
      generic: "The input is from a general professional profile or resume. The input may be informal, conversational, or even bullet-point notes — not a polished profile. Extract whatever career data is present. Never invent data that is not stated.",
    };
    const platformHint = platformHints[platform] || platformHints.generic;

    const systemPrompt = `You are an expert at extracting structured resume data from professional profile text.

${platformHint}

IMPORTANT: If the input is ONLY a URL, return EMPTY arrays and null summary. Do NOT make up data.
Only extract data explicitly present in the text. Never fabricate data.

Extract: Summary/About, Experience, Education, Skills. For dates, use "Jan 2020" or "2020". Mark current positions.

For the experience section: if a person held multiple roles at the same company (progressive promotion, e.g., "Software Engineer → Senior Engineer → Staff Engineer at Google"), return EACH role as a SEPARATE experience entry with the SAME company name. Do not merge multiple roles into one entry.

Extract certifications from the "Licenses & Certifications" section, volunteering from the "Volunteer Experience" section, languages from the "Languages" section, and projects from the "Projects" section. If any of these sections are not present in the provided text, return an empty array for that field.`;


    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or use your own API key.' }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    let aiResponse;
    try {
      aiResponse = await callAI({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract structured data from this ${platform} profile:\n\n${sanitizeInputText(profileText, 30000)}` },
        ],
        tools: [
        {
          type: "function",
          function: {
            name: "extract_linkedin_data",
            description: "Extract structured data from LinkedIn profile text",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "About/summary section" },
                experience: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      company: { type: "string" },
                      location: { type: "string" },
                      startDate: { type: "string" },
                      endDate: { type: "string" },
                      description: { type: "string" },
                      current: { type: "boolean" },
                    },
                    required: ["title", "company", "startDate", "endDate", "description", "current"],
                  },
                },
                education: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      institution: { type: "string" },
                      degree: { type: "string" },
                      field: { type: "string" },
                      startYear: { type: "string" },
                      endYear: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["institution", "degree"],
                  },
                },
                skills: { type: "array", items: { type: "string" } },
                certifications: {
                  type: 'array',
                  description: 'Certifications and licenses from the "Licenses & Certifications" section',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Name of the certification' },
                      organization: { type: 'string', description: 'Issuing organization' },
                      date: { type: 'string', description: 'Issue date e.g. "Mar 2023"' },
                    },
                    required: ['name'],
                  },
                },
                volunteering: {
                  type: 'array',
                  description: 'Volunteer experience entries',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', description: 'Volunteer role or title' },
                      organization: { type: 'string', description: 'Organization name' },
                      startDate: { type: 'string' },
                      endDate: { type: 'string' },
                      description: { type: 'string' },
                    },
                    required: ['role', 'organization'],
                  },
                },
                languages: {
                  type: 'array',
                  description: 'Languages listed in the Languages section',
                  items: {
                    type: 'object',
                    properties: {
                      language: { type: 'string', description: 'Language name' },
                      proficiency: { type: 'string', description: 'Proficiency level e.g. Native, Fluent, Professional, Elementary' },
                    },
                    required: ['language'],
                  },
                },
                projects: {
                  type: 'array',
                  description: 'Projects listed on the profile',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Project name' },
                      description: { type: 'string' },
                      url: { type: 'string', description: 'Project URL if listed' },
                    },
                    required: ['name'],
                  },
                },
              },
              required: ["summary", "experience", "education", "skills"],
            },
          },
        },
      ],
        toolChoice: { type: "function", function: { name: "extract_linkedin_data" } },
        userId,
      });
    } catch (aiErr) {
      await refundCredit(userId, creditCheck, 1);
      throw aiErr;
    }

    const toolCall = aiResponse.toolCalls?.[0];
    let extractedData: any = null;
    if (toolCall?.function?.arguments) {
      try { extractedData = JSON.parse(toolCall.function.arguments); } catch {}
    }
    if (!extractedData && aiResponse.content) {
      extractedData = parseAIJSON(aiResponse.content);
    }
    if (!extractedData) {
      await refundCredit(userId, creditCheck, 1);
      throw new Error("No structured data returned from AI");
    }

    await recordUsage(userId, 'parse_linkedin', { provider: aiResponse.providerUsed || 'unknown' });

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log.error("Unhandled error", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
