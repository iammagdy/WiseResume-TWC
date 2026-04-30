import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON, toUserError, sanitizeInputText } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { logger } from "../_shared/logger.ts";

const __ROUTE_URL = selectProviderForTool('parse-job-url');
const __ROUTE_TEXT = selectProviderForTool('parse-job-text');
const __ROUTE_LINKEDIN = selectProviderForTool('parse-linkedin');
const logUrl = logger('parse-job-url');
const logText = logger('parse-job-text');
const logLinkedin = logger('parse-linkedin');

const MAX_PROFILE_TEXT_SIZE = 200 * 1024;

// ============= SECURITY: Domain Whitelist (from parse-job-url) =============
const ALLOWED_DOMAINS = new Set([
  'linkedin.com', 'www.linkedin.com', 'indeed.com', 'www.indeed.com',
  'glassdoor.com', 'www.glassdoor.com', 'dice.com', 'www.dice.com',
  'monster.com', 'www.monster.com', 'careerbuilder.com', 'www.careerbuilder.com',
  'ziprecruiter.com', 'www.ziprecruiter.com', 'simplyhired.com', 'www.simplyhired.com',
  'reed.co.uk', 'www.reed.co.uk', 'seek.com.au', 'www.seek.com.au',
  'naukri.com', 'www.naukri.com', 'bayt.com', 'www.bayt.com',
  'remote.co', 'weworkremotely.com', 'flexjobs.com', 'www.flexjobs.com',
  'greenhouse.io', 'boards.greenhouse.io', 'lever.co', 'jobs.lever.co',
  'workable.com', 'ashbyhq.com', 'jobs.ashbyhq.com', 'smartrecruiters.com',
  'recruitee.com', 'breezy.hr', 'workday.com', 'myworkdayjobs.com',
  'wellfound.com', 'angel.co', 'himalayas.app', 'remotive.com',
  'arc.dev', 'ycombinator.com', 'workatastartup.com',
]);

function isPrivateIP(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0 && b === 0 && c === 0 && d === 0) return true;
  }
  if (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80')) return true;
  return false;
}

function validateJobUrl(urlString: string): { valid: boolean; errorCode?: string; error?: string; url?: URL } {
  if (urlString.length > 2000) return { valid: false, error: 'URL is too long (max 2000 characters)' };
  let parsedUrl: URL;
  try { parsedUrl = new URL(urlString); } catch { return { valid: false, error: 'Invalid URL format' }; }
  if (parsedUrl.protocol !== 'https:') return { valid: false, error: 'Only HTTPS URLs are allowed' };
  const hostname = parsedUrl.hostname.toLowerCase();
  if (isPrivateIP(hostname)) return { valid: false, error: 'Access to internal/private addresses is not allowed' };
  const domainParts = hostname.split('.');
  const baseDomain = domainParts.slice(-2).join('.');
  const fullDomain = hostname;
  const isAllowed =
    ALLOWED_DOMAINS.has(fullDomain) ||
    ALLOWED_DOMAINS.has(baseDomain) ||
    Array.from(ALLOWED_DOMAINS).some(allowed => fullDomain.endsWith('.' + allowed) || fullDomain === allowed);
  const ATS_SUBDOMAINS = ['greenhouse.io', 'lever.co', 'workable.com', 'ashbyhq.com', 'smartrecruiters.com'];
  const isAllowedAtsSub = ATS_SUBDOMAINS.some(d => hostname.endsWith('.' + d) || hostname === d);
  if (!isAllowed && !isAllowedAtsSub) {
    return {
      valid: false,
      errorCode: 'DOMAIN_NOT_ALLOWED',
      error: `We can't fetch job listings from "${hostname}" directly. ` +
        'Please copy the job description text and paste it using the "Paste job description" option instead.',
    };
  }
  return { valid: true, url: parsedUrl };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const action = body.action as string | undefined;

  if (!action) {
    return new Response(
      JSON.stringify({ error: 'action is required: url | text | linkedin' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── ACTION: url ───────────────────────────────────────────────────────────
  if (action === 'url') {
    try {
      let userId: string;
      try {
        const auth = await requireAuth(req);
        userId = auth.userId;
      } catch (authErr) {
        return authErrorResponse(authErr, req.headers.get('origin'));
      }
      console.log('Authenticated user:', userId);

      const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'parse_job' });
      if (!rateCheck.allowed) {
        return new Response(
          JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { url } = body;
      if (!url || typeof url !== 'string') {
        return new Response(
          JSON.stringify({ error: 'URL is required and must be a string' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const validation = validateJobUrl(url.trim());
      if (!validation.valid || !validation.url) {
        console.log('URL validation failed:', validation.error, 'URL:', url.substring(0, 100));
        return new Response(
          JSON.stringify({
            error: (validation as any).errorCode ?? 'INVALID_URL',
            message: validation.error,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const creditCheck = await checkAndDeductCredit(userId);
      if (!creditCheck.hasCredits) {
        return new Response(
          JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or add your own API key.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      console.log("Fetching job posting from validated URL:", validation.url.hostname);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const pageResponse = await fetch(validation.url.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          signal: controller.signal,
          redirect: 'follow',
        });

        clearTimeout(timeoutId);

        if (!pageResponse.ok) throw new Error(`Failed to fetch page: ${pageResponse.status}`);

        const contentLength = pageResponse.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) throw new Error('Response too large');

        const html = await pageResponse.text();
        if (html.length > 5 * 1024 * 1024) throw new Error('Response too large');

        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 20000);

        console.log("Using ENHANCED AI to extract comprehensive job intelligence...");

        const systemPrompt = `You are an expert job market analyst. Extract COMPREHENSIVE job posting information including hidden signals about company culture, realistic salary expectations, and requirement priorities.\n\nReturn ONLY valid JSON with no markdown or code blocks.`;

        const userPrompt = `Extract the job posting details from this page content:\n\n${sanitizeInputText(textContent, 60000)}\n\nReturn JSON with this comprehensive format:\n{\n  "title": "<job title>",\n  "company": "<company name>",\n  "description": "<full job description including ALL requirements, responsibilities, qualifications - be very comprehensive>",\n  "experienceLevel": "<entry | mid | senior | executive - based on years required and responsibilities>",\n  "salaryRange": {\n    "min": <number or null if not found>,\n    "max": <number or null if not found>,\n    "currency": "<USD, EUR, etc.>"\n  },\n  "workMode": "<remote | hybrid | onsite | unknown>",\n  "mustHaveSkills": ["<required/must-have skills>"],\n  "niceToHaveSkills": ["<preferred/nice-to-have skills>"],\n  "yearsExperience": "<extracted years requirement like '3-5 years' or null>",\n  "companyCultureSignals": ["<culture indicators from language like 'fast-paced', 'collaborative', 'startup', 'enterprise'>"],\n  "benefits": ["<listed benefits if any>"],\n  "applicationDeadline": "<deadline if mentioned or null>",\n  "redFlags": ["<any concerning patterns like unrealistic requirements for level, many required skills, etc.>"]\n}\n\nIf you can't find certain fields, make reasonable guesses based on context. The description should be detailed and include all requirements and qualifications mentioned.`;

        let aiContent: string;
        let aiProviderUsed: string | undefined;
        try {
          const aiResponse = await callAI({
            model: __ROUTE_URL.model, wiseresumeSubProvider: __ROUTE_URL.provider,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            userId: userId,
          });
          aiContent = aiResponse.content || '';
          aiProviderUsed = aiResponse.providerUsed;
        } catch (aiErr: unknown) {
          if (isAIError(aiErr)) {
            await refundCredit(userId, creditCheck, 1);
            return new Response(
              JSON.stringify({ error: aiErr.message }),
              { status: aiErr.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          await refundCredit(userId, creditCheck, 1);
          throw aiErr;
        }

        if (!aiContent) throw new Error("No content in AI response");

        let result = parseAIJSON<Record<string, unknown>>(aiContent);
        if (!result) {
          console.error("Failed to parse:", aiContent.slice(0, 500));
          await refundCredit(userId, creditCheck, 1);
          return new Response(
            JSON.stringify({ error: "Failed to parse job posting" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        result = {
          ...result,
          title: result.title || 'Position',
          company: result.company || 'Company',
          description: result.description || '',
          experienceLevel: result.experienceLevel || 'mid',
          salaryRange: result.salaryRange || null,
          workMode: result.workMode || 'unknown',
          mustHaveSkills: result.mustHaveSkills || [],
          niceToHaveSkills: result.niceToHaveSkills || [],
          yearsExperience: result.yearsExperience || null,
          companyCultureSignals: result.companyCultureSignals || [],
          benefits: result.benefits || [],
          applicationDeadline: result.applicationDeadline || null,
          redFlags: result.redFlags || [],
        };

        console.log("Successfully parsed job posting with enhanced intelligence:", result.title);
        await recordUsage(userId, 'parse_job', { provider: aiProviderUsed || 'unknown' });

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          await refundCredit(userId, creditCheck, 1);
          return new Response(
            JSON.stringify({ error: 'Request timed out. The job posting site took too long to respond.' }),
            { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        await refundCredit(userId, creditCheck, 1);
        throw fetchError;
      }
    } catch (error) {
      logUrl.error("Unhandled error", error);
      const userError = toUserError(error);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: userError.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // ── ACTION: text ──────────────────────────────────────────────────────────
  if (action === 'text') {
    try {
      let userId: string;
      try {
        const auth = await requireAuth(req);
        userId = auth.userId;
      } catch (authErr) {
        return authErrorResponse(authErr, req.headers.get('origin'));
      }

      const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'parse_job_text' });
      if (!rateCheck.allowed) {
        return new Response(
          JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { text } = body;
      if (!text || typeof text !== 'string' || text.trim().length < 20) {
        return new Response(
          JSON.stringify({ error: 'Job description text must be at least 20 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const trimmedText = text.trim().slice(0, 20000);

      const systemPrompt = `You are an expert job market analyst. Extract structured job posting information from raw text. Return ONLY valid JSON with no markdown or code blocks.`;

      const userPrompt = `Extract job posting details from this text:\n\n${sanitizeInputText(trimmedText, 25000)}\n\nReturn JSON:\n{\n  "title": "<job title>",\n  "company": "<company name>",\n  "description": "<the full job description text>",\n  "experienceLevel": "<entry | mid | senior | executive>",\n  "salaryRange": { "min": <number or null>, "max": <number or null>, "currency": "<USD etc.>" },\n  "workMode": "<remote | hybrid | onsite | unknown>",\n  "mustHaveSkills": ["<required skills>"],\n  "niceToHaveSkills": ["<preferred skills>"],\n  "yearsExperience": "<years requirement or null>",\n  "companyCultureSignals": ["<culture indicators>"],\n  "benefits": ["<benefits>"],\n  "applicationDeadline": "<deadline or null>",\n  "redFlags": ["<concerning patterns>"]\n}\n\nIf you can't find certain fields, use null or empty arrays. Always extract title and company.`;

      let aiContent: string;
      let aiProviderUsed: string | undefined;

      const creditCheck = await checkAndDeductCredit(userId);
      if (!creditCheck.hasCredits) {
        return new Response(
          JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or add your own API key.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      try {
        const aiResponse = await callAI({
          model: __ROUTE_TEXT.model, wiseresumeSubProvider: __ROUTE_TEXT.provider,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          userId,
        });
        aiContent = aiResponse.content || '';
        aiProviderUsed = aiResponse.providerUsed;
      } catch (aiErr: unknown) {
        if (isAIError(aiErr)) {
          await refundCredit(userId, creditCheck, 1);
          return new Response(
            JSON.stringify({ error: aiErr.message }),
            { status: aiErr.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        await refundCredit(userId, creditCheck, 1);
        throw aiErr;
      }

      let result = parseAIJSON<Record<string, unknown>>(aiContent);
      if (!result) {
        await refundCredit(userId, creditCheck, 1);
        return new Response(
          JSON.stringify({ error: "Failed to parse job description" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      result = {
        ...result,
        title: result.title || 'Position',
        company: result.company || 'Unknown Company',
        description: result.description || trimmedText,
        experienceLevel: result.experienceLevel || 'mid',
        salaryRange: result.salaryRange || null,
        workMode: result.workMode || 'unknown',
        mustHaveSkills: result.mustHaveSkills || [],
        niceToHaveSkills: result.niceToHaveSkills || [],
        yearsExperience: result.yearsExperience || null,
        companyCultureSignals: result.companyCultureSignals || [],
        benefits: result.benefits || [],
        applicationDeadline: result.applicationDeadline || null,
        redFlags: result.redFlags || [],
      };

      await recordUsage(userId, 'parse_job_text', { provider: aiProviderUsed || 'unknown' });

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (error) {
      logText.error("Unhandled error", error);
      const userError = toUserError(error);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: userError.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // ── ACTION: linkedin ──────────────────────────────────────────────────────
  if (action === 'linkedin') {
    try {
      const { userId } = await requireAuth(req);

      const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'parse_linkedin' });
      if (!rateCheck.allowed) {
        return new Response(
          JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { profileText, platform = 'linkedin' } = body as { profileText?: string; platform?: string };

      if (!profileText || typeof profileText !== "string") {
        return new Response(
          JSON.stringify({ error: "Profile text is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (profileText.length > MAX_PROFILE_TEXT_SIZE) {
        return new Response(
          JSON.stringify({ error: `Profile text too large. Maximum ${MAX_PROFILE_TEXT_SIZE / 1024}KB.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const platformHints: Record<string, string> = {
        linkedin: "The input is from a LinkedIn profile. LinkedIn uses sections like 'About', 'Experience', 'Education', 'Skills', 'Licenses & Certifications', 'Volunteer Experience', 'Languages', 'Projects'.",
        indeed: "The input is from an Indeed resume profile. Indeed uses sections like 'Summary', 'Work Experience', 'Education', 'Skills', 'Certifications'. Date formats may vary.",
        xing: "The input is from a Xing profile (European professional network). Xing uses sections like 'About me', 'Experience', 'Education', 'Qualifications', 'Languages'. May include German or European formatting.",
        wellfound: "The input is from a Wellfound (AngelList) profile used for startup job seekers. Focus on 'Bio', 'Experience', 'Education', 'Skills'. May include startup-specific roles.",
        generic: "The input is from a general professional profile or resume. The input may be informal, conversational, or even bullet-point notes — not a polished profile. Extract whatever career data is present. Never invent data that is not stated.",
      };
      const platformHint = platformHints[platform as string] || platformHints.generic;

      const systemPrompt = `You are an expert at extracting structured resume data from professional profile text.\n\n${platformHint}\n\nIMPORTANT: If the input is ONLY a URL, return EMPTY arrays and null summary. Do NOT make up data.\nOnly extract data explicitly present in the text. Never fabricate data.\n\nExtract: Summary/About, Experience, Education, Skills. For dates, use "Jan 2020" or "2020". Mark current positions.\n\nFor the experience section: if a person held multiple roles at the same company (progressive promotion, e.g., "Software Engineer → Senior Engineer → Staff Engineer at Google"), return EACH role as a SEPARATE experience entry with the SAME company name. Do not merge multiple roles into one entry.\n\nExtract certifications from the "Licenses & Certifications" section, volunteering from the "Volunteer Experience" section, languages from the "Languages" section, and projects from the "Projects" section. If any of these sections are not present in the provided text, return an empty array for that field.`;

      const creditCheck = await checkAndDeductCredit(userId);
      if (!creditCheck.hasCredits) {
        return new Response(
          JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or use your own API key.' }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      let aiResponse;
      try {
        aiResponse = await callAI({
          model: __ROUTE_LINKEDIN.model, wiseresumeSubProvider: __ROUTE_LINKEDIN.provider,
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
      logLinkedin.error("Unhandled error", error);
      const { status, error: code, message } = toUserError(error);
      return new Response(
        JSON.stringify({ error: code, message }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  return new Response(
    JSON.stringify({ error: `Unknown action: ${action}. Valid values: url | text | linkedin` }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
