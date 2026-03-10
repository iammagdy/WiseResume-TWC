import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

// ============= SECURITY: Domain Whitelist =============
const ALLOWED_DOMAINS = new Set([
  'linkedin.com',
  'www.linkedin.com',
  'indeed.com',
  'www.indeed.com',
  'glassdoor.com',
  'www.glassdoor.com',
  'dice.com',
  'www.dice.com',
  'monster.com',
  'www.monster.com',
  'careerbuilder.com',
  'www.careerbuilder.com',
  'ziprecruiter.com',
  'www.ziprecruiter.com',
  'lever.co',
  'jobs.lever.co',
  'greenhouse.io',
  'boards.greenhouse.io',
  'workday.com',
  'myworkdayjobs.com',
  'jobs.ashbyhq.com',
  'angel.co',
  'wellfound.com',
  'simplyhired.com',
  'www.simplyhired.com',
  'reed.co.uk',
  'www.reed.co.uk',
  'seek.com.au',
  'www.seek.com.au',
  'naukri.com',
  'www.naukri.com',
  'bayt.com',
  'www.bayt.com',
  'remoteco.com',
  'remote.co',
  'weworkremotely.com',
  'flexjobs.com',
  'www.flexjobs.com',
]);

// ============= SECURITY: Private IP Range Detection =============
function isPrivateIP(hostname: string): boolean {
  // Check for localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }
  
  // Check for private IPv4 ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 127.0.0.0/8 (loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (link-local / AWS metadata)
    if (a === 169 && b === 254) return true;
    // 0.0.0.0
    if (a === 0 && b === 0 && c === 0 && d === 0) return true;
  }
  
  // Check for IPv6 private ranges
  if (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80')) {
    return true;
  }
  
  return false;
}

// ============= SECURITY: URL Validation =============
function validateJobUrl(urlString: string): { valid: boolean; error?: string; url?: URL } {
  // Length check
  if (urlString.length > 2000) {
    return { valid: false, error: 'URL is too long (max 2000 characters)' };
  }
  
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  // Scheme validation - HTTPS only
  if (parsedUrl.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS URLs are allowed' };
  }
  
  // Extract domain
  const hostname = parsedUrl.hostname.toLowerCase();
  
  // Private IP check
  if (isPrivateIP(hostname)) {
    return { valid: false, error: 'Access to internal/private addresses is not allowed' };
  }
  
  // Domain whitelist check
  const domainParts = hostname.split('.');
  const baseDomain = domainParts.slice(-2).join('.');
  const fullDomain = hostname;
  
  // Check if domain or subdomain is in whitelist
  const isAllowed = ALLOWED_DOMAINS.has(fullDomain) || 
                    ALLOWED_DOMAINS.has(baseDomain) ||
                    // Allow subdomains of whitelisted domains
                    Array.from(ALLOWED_DOMAINS).some(allowed => 
                      fullDomain.endsWith('.' + allowed) || fullDomain === allowed
                    );
  
  if (!isAllowed) {
    return { 
      valid: false, 
      error: `Domain "${hostname}" is not in the allowed list. Supported job sites: LinkedIn, Indeed, Glassdoor, Dice, Monster, CareerBuilder, ZipRecruiter, Lever, Greenhouse, Workday, AngelList/Wellfound, SimplyHired, Reed, Seek, Naukri, Bayt, Remote.co, WeWorkRemotely, FlexJobs` 
    };
  }
  
  return { valid: true, url: parsedUrl };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication check
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
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log('Authenticated user:', userId);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'parse_job' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();
    
    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= SECURITY: Validate URL =============
    const validation = validateJobUrl(url.trim());
    if (!validation.valid || !validation.url) {
      console.log('URL validation failed:', validation.error, 'URL:', url.substring(0, 100));
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Fetching job posting from validated URL:", validation.url.hostname);

    // Fetch with timeout and redirect limits
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const pageResponse = await fetch(validation.url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
        redirect: 'follow', // Deno handles this safely
      });

      clearTimeout(timeoutId);

      if (!pageResponse.ok) {
        throw new Error(`Failed to fetch page: ${pageResponse.status}`);
      }

      // ============= SECURITY: Response size limit =============
      const contentLength = pageResponse.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Response too large');
      }

      const html = await pageResponse.text();
      
      // Additional size check after reading
      if (html.length > 5 * 1024 * 1024) {
        throw new Error('Response too large');
      }
      
      // Extract text content from HTML (basic extraction)
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 20000); // Limit for AI processing

      console.log("Using ENHANCED AI to extract comprehensive job intelligence...");

      const systemPrompt = `You are an expert job market analyst. Extract COMPREHENSIVE job posting information including hidden signals about company culture, realistic salary expectations, and requirement priorities.

Return ONLY valid JSON with no markdown or code blocks.`;

      const userPrompt = `Extract the job posting details from this page content:

${textContent}

Return JSON with this comprehensive format:
{
  "title": "<job title>",
  "company": "<company name>",
  "description": "<full job description including ALL requirements, responsibilities, qualifications - be very comprehensive>",
  "experienceLevel": "<entry | mid | senior | executive - based on years required and responsibilities>",
  "salaryRange": {
    "min": <number or null if not found>,
    "max": <number or null if not found>,
    "currency": "<USD, EUR, etc.>"
  },
  "workMode": "<remote | hybrid | onsite | unknown>",
  "mustHaveSkills": ["<required/must-have skills>"],
  "niceToHaveSkills": ["<preferred/nice-to-have skills>"],
  "yearsExperience": "<extracted years requirement like '3-5 years' or null>",
  "companyCultureSignals": ["<culture indicators from language like 'fast-paced', 'collaborative', 'startup', 'enterprise'>"],
  "benefits": ["<listed benefits if any>"],
  "applicationDeadline": "<deadline if mentioned or null>",
  "redFlags": ["<any concerning patterns like unrealistic requirements for level, many required skills, etc.>"]
}

If you can't find certain fields, make reasonable guesses based on context. The description should be detailed and include all requirements and qualifications mentioned.`;

      let aiContent: string;
      let aiProviderUsed: string | undefined;
      try {
        const aiResponse = await callAI({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          userId: user.id,
        });
        aiContent = aiResponse.content || '';
        aiProviderUsed = aiResponse.providerUsed;
      } catch (aiErr: unknown) {
        if (isAIError(aiErr)) {
          return new Response(
            JSON.stringify({ error: aiErr.message }),
            { status: aiErr.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw aiErr;
      }

      if (!aiContent) {
        throw new Error("No content in AI response");
      }

      // Parse the JSON
      let result = parseAIJSON<Record<string, unknown>>(aiContent);
      if (!result) {
        console.error("Failed to parse:", aiContent.slice(0, 500));
        return new Response(
          JSON.stringify({ error: "Failed to parse job posting" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Ensure all fields have defaults
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Request timed out. The job posting site took too long to respond.' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    }

  } catch (error) {
    console.error("parse-job-url error:", error);
    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
