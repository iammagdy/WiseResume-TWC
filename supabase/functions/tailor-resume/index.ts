import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, parseAIJSONWithRetry, sanitizeInputText, toUserError } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('tailor-resume');
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { getProfileContext } from "../_shared/profileContext.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('tailor-resume');


/** Safely extract skills as a comma-separated string */
function safeSkillsString(skills: unknown): string {
  if (!Array.isArray(skills)) return 'Not provided';
  return skills.map(s => typeof s === 'string' ? s : (s as any)?.name || String(s)).join(', ') || 'Not provided';
}

// ============= SECURITY: Input validation limits =============
const MAX_RESUME_SIZE = 100 * 1024; // 100KB
const MAX_JOB_DESCRIPTION_SIZE = 50 * 1024; // 50KB

/**
 * Selects the AI model based on tailoring intensity.
 * Aggressive uses a premium model; light/moderate use the free model for cost control.
 */
function selectModelForIntensity(intensity: string): string {
  if (intensity === 'aggressive') {
    return 'google/gemini-flash-1.5';
  }
  return 'meta-llama/llama-3.3-70b-instruct:free';
}

/**
 * Stage 1: Fast job analysis sub-call.
 * Extracts job metadata and must-have keywords from the job description.
 * Runs first and returns quickly (~2-4s), feeding signals into Stage 2.
 */
async function runStage1JobAnalysis(
  jobDescription: string,
  userId: string,
): Promise<{
  title: string;
  company: string;
  experienceLevel: string;
  workMode: string;
  salaryRange: { min: number | null; max: number | null; currency: string };
  mustHaveKeywords: string[];
  niceToHaveKeywords: string[];
  companyCultureSignals: string[];
  redFlags: string[];
  industryDetected: string;
}> {
  const systemPrompt = `You are an expert job description analyst. Extract structured information from job descriptions quickly and accurately. Return ONLY valid JSON with no markdown or code blocks.`;

  const userPrompt = `Analyze this job description and extract key information:

${jobDescription}

Return this exact JSON:
{
  "title": "<job title>",
  "company": "<company name or 'Unknown'>",
  "experienceLevel": "<entry | mid | senior | executive>",
  "workMode": "<remote | hybrid | onsite | unknown>",
  "salaryRange": { "min": <number or null>, "max": <number or null>, "currency": "USD" },
  "mustHaveKeywords": ["<required skill/keyword that must appear in resume>", "..."],
  "niceToHaveKeywords": ["<preferred keyword>", "..."],
  "companyCultureSignals": ["<culture indicator from job language>", "..."],
  "redFlags": ["<any unrealistic requirements or concerns>"],
  "industryDetected": "<Tech | Finance | Healthcare | Marketing | Operations | Other>"
}

For mustHaveKeywords: include 10-20 specific, searchable terms (technologies, methodologies, role-specific skills) that are clearly required. Focus on concrete, matchable keywords not vague phrases.`;

  try {
    const response = await callAIWithRetry({
      model: __ROUTE.model, wiseresumeSubProvider: __ROUTE.provider,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      maxTokens: 2000,
      userId,
    });

    if (!response.content) throw new Error('No content from Stage 1 AI');

    const parsed = await parseAIJSONWithRetry<Record<string, unknown>>(response.content, {
      model: __ROUTE.model, wiseresumeSubProvider: __ROUTE.provider,
      userId,
    });

    if (!parsed) throw new Error('Failed to parse Stage 1 result');

    return {
      title: (parsed.title as string) || 'Position',
      company: (parsed.company as string) || 'Company',
      experienceLevel: (parsed.experienceLevel as string) || 'mid',
      workMode: (parsed.workMode as string) || 'unknown',
      salaryRange: (parsed.salaryRange as any) || { min: null, max: null, currency: 'USD' },
      mustHaveKeywords: Array.isArray(parsed.mustHaveKeywords) ? (parsed.mustHaveKeywords as string[]) : [],
      niceToHaveKeywords: Array.isArray(parsed.niceToHaveKeywords) ? (parsed.niceToHaveKeywords as string[]) : [],
      companyCultureSignals: Array.isArray(parsed.companyCultureSignals) ? (parsed.companyCultureSignals as string[]) : [],
      redFlags: Array.isArray(parsed.redFlags) ? (parsed.redFlags as string[]) : [],
      industryDetected: (parsed.industryDetected as string) || 'General',
    };
  } catch (err) {
    console.warn('[tailor] Stage 1 analysis failed, using defaults:', err instanceof Error ? err.message : err);
    return {
      title: 'Position',
      company: 'Company',
      experienceLevel: 'mid',
      workMode: 'unknown',
      salaryRange: { min: null, max: null, currency: 'USD' },
      mustHaveKeywords: [],
      niceToHaveKeywords: [],
      companyCultureSignals: [],
      redFlags: [],
      industryDetected: 'General',
    };
  }
}

/**
 * Light stemming: strips common English suffixes to normalize variants.
 * e.g. "managing" → "manag", "managed" → "manag", "kubernetes" → "kubernetes"
 * This avoids false positives from substring matching (e.g., "java" inside "javascript").
 */
function stem(word: string): string {
  const w = word.toLowerCase().trim();
  // Strip possessives
  let s = w.replace(/'s$/, '');
  // Strip common suffixes in order of length (longest first)
  const suffixes = ['ations', 'ation', 'ments', 'ment', 'ities', 'ity', 'ness',
    'ings', 'ing', 'tion', 'ions', 'ion', 'ers', 'er', 'ies', 'es', 's', 'ed', 'ly'];
  for (const suffix of suffixes) {
    if (s.length > suffix.length + 3 && s.endsWith(suffix)) {
      s = s.slice(0, s.length - suffix.length);
      break;
    }
  }
  return s;
}

/**
 * Tokenize text into normalized word tokens for keyword matching.
 * Splits on non-alphanumeric characters, lowercases all tokens.
 */
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 0);
}

/**
 * Counts how many times a keyword (which may be a phrase) appears in tokenized text.
 * Uses word-boundary matching on tokens to prevent substring false positives.
 * For single-word keywords: matches stemmed token.
 * For multi-word phrases: looks for all tokens appearing consecutively (sliding window).
 */
function countKeywordInTokens(keyword: string, textTokens: string[]): number {
  const kwTokens = tokenize(keyword);
  if (kwTokens.length === 0) return 0;

  if (kwTokens.length === 1) {
    // Single word — match stemmed form
    const stemmedKw = stem(kwTokens[0]);
    return textTokens.filter(t => stem(t) === stemmedKw).length;
  }

  // Multi-word phrase — look for consecutive token sequence (stemmed)
  const stemmedKwTokens = kwTokens.map(stem);
  let count = 0;
  for (let i = 0; i <= textTokens.length - stemmedKwTokens.length; i++) {
    let match = true;
    for (let j = 0; j < stemmedKwTokens.length; j++) {
      if (stem(textTokens[i + j]) !== stemmedKwTokens[j]) {
        match = false;
        break;
      }
    }
    if (match) count++;
  }
  return count;
}

/**
 * Deterministic ATS keyword scoring.
 * Uses word-boundary token matching with light stemming to prevent false positives
 * (e.g., "java" will NOT match inside "javascript").
 * Returns real counted scores — not AI estimates.
 */
function computeAtsKeywordScores(
  keywords: string[],
  originalResumeText: string,
  tailoredResumeText: string,
): {
  originalKeywordDensity: number;
  optimizedKeywordDensity: number;
  matchedKeywords: Array<{ keyword: string; originalCount: number; tailoredCount: number }>;
  unmatchedKeywords: string[];
} {
  if (!keywords.length) {
    return {
      originalKeywordDensity: 0,
      optimizedKeywordDensity: 0,
      matchedKeywords: [],
      unmatchedKeywords: [],
    };
  }

  const origTokens = tokenize(originalResumeText);
  const tailoredTokens = tokenize(tailoredResumeText);

  const matchedKeywords: Array<{ keyword: string; originalCount: number; tailoredCount: number }> = [];
  const unmatchedKeywords: string[] = [];
  let originalMatchedCount = 0;

  for (const keyword of keywords) {
    if (!keyword.trim()) continue;

    const origCount = countKeywordInTokens(keyword, origTokens);
    const tailoredCount = countKeywordInTokens(keyword, tailoredTokens);

    if (origCount > 0) originalMatchedCount++;

    if (tailoredCount > 0) {
      matchedKeywords.push({ keyword, originalCount: origCount, tailoredCount });
    } else {
      unmatchedKeywords.push(keyword);
    }
  }

  const totalKeywords = keywords.filter(k => k.trim()).length;
  const originalKeywordDensity = totalKeywords > 0
    ? Math.round((originalMatchedCount / totalKeywords) * 100)
    : 0;
  const optimizedKeywordDensity = totalKeywords > 0
    ? Math.round((matchedKeywords.length / totalKeywords) * 100)
    : 0;

  return {
    originalKeywordDensity,
    optimizedKeywordDensity,
    matchedKeywords,
    unmatchedKeywords,
  };
}

/**
 * Extracts a flat text representation of the resume for keyword counting.
 */
function resumeToText(resume: any): string {
  const parts: string[] = [];
  if (resume.summary) parts.push(resume.summary);
  if (Array.isArray(resume.skills)) {
    parts.push(resume.skills.map((s: any) => typeof s === 'string' ? s : s?.name || '').join(' '));
  }
  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience) {
      if (exp.description) parts.push(exp.description);
      if (exp.position) parts.push(exp.position);
      if (Array.isArray(exp.achievements)) parts.push(exp.achievements.join(' '));
    }
  }
  if (Array.isArray(resume.education)) {
    for (const edu of resume.education) {
      const eduParts = [edu.degree, edu.field, edu.institution].filter(Boolean);
      if (eduParts.length > 0) parts.push(eduParts.join(' '));
    }
  }
  if (Array.isArray(resume.projects)) {
    for (const proj of resume.projects) {
      if (proj.description) parts.push(proj.description);
      if (Array.isArray(proj.technologies)) parts.push(proj.technologies.join(' '));
    }
  }
  if (Array.isArray(resume.certifications)) {
    for (const cert of resume.certifications) {
      if (cert.name) parts.push(cert.name);
    }
  }
  return parts.join(' ');
}

// ============= INTENSITY-BASED PROMPT MODIFIERS =============
const intensityInstructions: Record<string, string> = {
  light: `
## INTENSITY: LIGHT
- Make MINIMAL changes. Only adjust keywords and phrasing to better match the job description.
- Preserve the candidate's original voice and writing style as much as possible.
- Focus on keyword insertion, not rewriting.
- Do NOT change sentence structure unless absolutely necessary.
- Keep achievement bullets mostly intact, only adding relevant keywords.`,
  moderate: `
## INTENSITY: MODERATE (Standard)
- Balance between preserving the candidate's voice and optimizing for the job.
- Rewrite bullets to be stronger but maintain the original meaning.
- Add metrics where they naturally fit.
- Optimize keyword placement throughout.`,
  aggressive: `
## INTENSITY: AGGRESSIVE
- Maximize ATS compatibility above all else.
- Rewrite EXTENSIVELY using exact job description terminology.
- Transform EVERY bullet point into a powerful, metrics-driven achievement.
- Restructure descriptions to front-load the most relevant keywords.
- Use the strongest possible action verbs.
- Ensure maximum keyword density without obvious stuffing.
- Position every piece of experience to directly map to job requirements.`,
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  // Parse query params early for stage-mode detection
  const url = new URL(req.url);
  const stageMode = url.searchParams.get('stage'); // '1' returns only Stage 1 results

  try {
    // requireAuth() verifies JWT signature via jose.jwtVerify — see _shared/authMiddleware.ts
    let userId: string;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
    } catch (authErr) {
      return authErrorResponse(authErr, req.headers.get('origin'));
    }
    console.log('Authenticated user:', userId);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'tailor' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= CREDIT CHECK: Validate before spending AI tokens =============

    // Fetch profile context for personalized AI prompts
    const profileCtx = await getProfileContext(userId);

    const body = await req.json();
    const resume = body.resume;
    const rawJobDescription = body.jobDescription;
    const tailorIntensity = body.intensity || 'moderate';
    
    // ============= SECURITY: Input validation =============
    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required and must be an object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rawJobDescription || typeof rawJobDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Job description is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and truncate job description to prevent token overflow
    const jobDescription = sanitizeInputText(rawJobDescription, 15_000);
    if (jobDescription.length < rawJobDescription.length) {
      console.log(`[tailor] Job description truncated from ${rawJobDescription.length} to ${jobDescription.length} chars`);
    }

    const resumeStr = JSON.stringify(resume);
    if (resumeStr.length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: `Resume data is too large. Maximum size is ${MAX_RESUME_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (jobDescription.length > MAX_JOB_DESCRIPTION_SIZE) {
      return new Response(
        JSON.stringify({ error: `Job description is too large. Maximum size is ${MAX_JOB_DESCRIPTION_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Credit deduction: after all input validation, right before the AI pipeline starts.
    const creditCheck = await checkAndDeductCredit(userId, 2);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= STAGE 1: Fast job analysis =============
    console.log('[tailor] Stage 1: Analyzing job description...');
    const jobAnalysis = await runStage1JobAnalysis(jobDescription, userId);
    console.log('[tailor] Stage 1 complete. Industry:', jobAnalysis.industryDetected, 'Keywords:', jobAnalysis.mustHaveKeywords.length);

    // Compute Stage 1 gap score deterministically (original resume vs extracted keywords)
    const originalResumeTextForGap = resumeToText(resume);
    const stage1GapScores = computeAtsKeywordScores(
      jobAnalysis.mustHaveKeywords,
      originalResumeTextForGap,
      originalResumeTextForGap, // both same — only originalKeywordDensity matters here
    );
    const stage1GapScore = stage1GapScores.originalKeywordDensity;
    console.log(`[tailor] Stage 1 gap score: ${stage1GapScore}% (${jobAnalysis.mustHaveKeywords.length} keywords)`);

    // Stage 1 early-return mode: ?stage=1 returns job metadata + gap score quickly
    // This allows frontend to display initial insights while Stage 2 runs separately.
    if (stageMode === '1') {
      console.log('[tailor] Returning Stage 1 results early (stage=1 mode)');
      return new Response(
        JSON.stringify({
          _stage: 1,
          jobParsed: {
            title: jobAnalysis.title,
            company: jobAnalysis.company,
            keyRequirements: jobAnalysis.mustHaveKeywords.slice(0, 8),
            niceToHaves: jobAnalysis.niceToHaveKeywords.slice(0, 5),
          },
          jobIntelligence: {
            experienceLevel: jobAnalysis.experienceLevel,
            salaryRange: jobAnalysis.salaryRange,
            workMode: jobAnalysis.workMode,
            mustHaveSkills: jobAnalysis.mustHaveKeywords,
            niceToHaveSkills: jobAnalysis.niceToHaveKeywords,
            companyCultureSignals: jobAnalysis.companyCultureSignals,
            redFlags: jobAnalysis.redFlags,
            industryDetected: jobAnalysis.industryDetected,
          },
          atsAnalysis: {
            originalKeywordDensity: stage1GapScore,
            criticalKeywords: jobAnalysis.mustHaveKeywords,
            matchedKeywords: stage1GapScores.matchedKeywords,
            unmatchedKeywords: stage1GapScores.unmatchedKeywords,
          },
          gapScore: stage1GapScore,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select model based on intensity
    const selectedModel = __ROUTE.model;
    void selectModelForIntensity;
    void tailorIntensity;
    console.log(`[tailor] Stage 2: Using model ${selectedModel} for intensity=${tailorIntensity}`);

    const profilePreamble = profileCtx.contextString
      ? `## CANDIDATE PROFILE\n${profileCtx.contextString} Use this context to calibrate the tone, seniority expectations, and industry-specific language throughout all tailoring decisions.\n\n`
      : '';

    // Stage 1 signals injected into Stage 2 prompt
    const jobSignalsPreamble = jobAnalysis.mustHaveKeywords.length > 0
      ? `## PRE-ANALYZED JOB SIGNALS (from fast job analysis)
Industry: ${jobAnalysis.industryDetected}
Experience Level: ${jobAnalysis.experienceLevel}
Must-Have Keywords: ${jobAnalysis.mustHaveKeywords.join(', ')}
Nice-to-Have Keywords: ${jobAnalysis.niceToHaveKeywords.slice(0, 10).join(', ')}

These keywords MUST appear naturally in the tailored resume where authentic.\n\n`
      : '';

    // Industry-specific bullet transformation examples
    const industryExamples: Record<string, string> = {
      Tech: `
### TECH INDUSTRY BULLET EXAMPLES
BEFORE: "Worked on backend systems"
AFTER: "Architected and deployed microservices handling 2M+ daily API requests using Node.js and Kubernetes, reducing latency by 45%"

BEFORE: "Fixed bugs in the codebase"
AFTER: "Resolved 150+ critical defects across 3 product lines using systematic debugging and root-cause analysis, decreasing production incidents by 60%"`,
      Finance: `
### FINANCE INDUSTRY BULLET EXAMPLES
BEFORE: "Worked on financial models"
AFTER: "Built DCF and LBO models for 12 M&A transactions totaling $4.2B in deal value, supporting board-level investment decisions"

BEFORE: "Helped with compliance"
AFTER: "Drove SOX compliance initiative across 5 business units, eliminating 23 control gaps and achieving zero audit findings for 2 consecutive years"`,
      Healthcare: `
### HEALTHCARE INDUSTRY BULLET EXAMPLES
BEFORE: "Worked with patients"
AFTER: "Delivered patient-centered care for 40+ daily patients in a high-acuity ICU environment, maintaining 97% patient satisfaction scores"

BEFORE: "Managed medical records"
AFTER: "Implemented HIPAA-compliant EHR workflow for 8-provider practice, reducing documentation time by 30% and eliminating compliance gaps"`,
      Marketing: `
### MARKETING INDUSTRY BULLET EXAMPLES
BEFORE: "Ran marketing campaigns"
AFTER: "Orchestrated integrated digital campaigns across 6 channels generating $3.2M in pipeline, achieving 4.8x ROAS and 28% below target CAC"

BEFORE: "Created content"
AFTER: "Produced 40+ SEO-optimized long-form articles ranking in top 3 positions for 15 high-intent keywords, driving 180K organic monthly visits"`,
      Operations: `
### OPERATIONS INDUSTRY BULLET EXAMPLES
BEFORE: "Managed team operations"
AFTER: "Led cross-functional team of 12 to streamline 8 core business processes, cutting cycle time by 35% and saving $1.2M annually"

BEFORE: "Improved processes"
AFTER: "Implemented Lean Six Sigma framework across 3 facilities, eliminating 7 process bottlenecks and improving throughput by 42%"`,
    };

    const industrySpecificExamples = industryExamples[jobAnalysis.industryDetected] || `
### GENERAL BULLET TRANSFORMATION EXAMPLES
BEFORE: "Worked on frontend development"
AFTER: "Architected and shipped 15+ React components serving 50K+ daily users, reducing page load time by 40%"

BEFORE: "Helped with team projects"
AFTER: "Collaborated with cross-functional team of 8 engineers to deliver $2M product launch, completing 2 weeks ahead of schedule"

BEFORE: "Responsible for customer service"
AFTER: "Resolved 200+ customer inquiries weekly with 98% satisfaction rating, reducing escalations by 35%"`;

    const systemPrompt = `You are a LEGENDARY resume writer, career strategist, and ATS optimization expert with 20+ years of experience helping candidates land jobs at top companies.

${profilePreamble}${jobSignalsPreamble}${intensityInstructions[tailorIntensity] || intensityInstructions.moderate}

## YOUR MISSION
Transform this resume into a PERFECT match for the target job while maintaining complete authenticity.

## PROCESSING ORDER (IMPORTANT)
1. ANALYZE: Review job requirements and pre-analyzed signals
2. DETECT: Confirm industry, experience level, terminology patterns
3. STRATEGIZE: Plan positioning for maximum impact
4. REWRITE SKILLS & SUMMARY: Update with job-aligned language
5. REWRITE EDUCATION & CERTIFICATIONS: Highlight relevance
6. REWRITE EXPERIENCE (LAST - most complex): Transform achievements with metrics
7. GENERATE ANALYSIS FIELDS: keyChanges, missingSkills, scores

## CRITICAL RULES
1. NEVER fabricate experience, skills, or metrics - only reframe existing content
2. Transform weak bullet points into POWERFUL achievement statements with metrics
3. If metrics aren't available, use strong qualitative indicators
4. Match exact terminology from the job description and pre-analyzed keywords
5. Use industry-specific power verbs (led, architected, spearheaded, orchestrated)
6. Every bullet should follow: ACTION VERB + WHAT + RESULT/IMPACT
7. Weave critical keywords naturally - no stuffing
8. Score honestly - don't inflate scores to please

## BULLET TRANSFORMATION INSTRUCTIONS
${industrySpecificExamples}

Return ONLY valid JSON with no markdown or code blocks.`;

    const userPrompt = `## RESUME TO TAILOR

Name: ${resume.contactInfo?.fullName || 'Not provided'}
Email: ${resume.contactInfo?.email || ''}
Phone: ${resume.contactInfo?.phone || ''}
Location: ${resume.contactInfo?.location || ''}
LinkedIn: ${resume.contactInfo?.linkedin || ''}
Portfolio: ${resume.contactInfo?.portfolio || ''}

CURRENT SUMMARY:
${resume.summary || 'Not provided'}

CURRENT SKILLS:
${safeSkillsString(resume.skills)}

EXPERIENCE:
${resume.experience?.map((e: any) => `
[ID: ${e.id}] ${e.position} at ${e.company}
Duration: ${e.startDate} - ${e.current ? 'Present' : e.endDate}
Description: ${e.description}
Achievements:
${e.achievements?.map((a: string, i: number) => `  ${i + 1}. ${a}`).join('\n') || '  None listed'}
`).join('\n') || 'Not provided'}

EDUCATION:
${resume.education?.map((e: any) => `
- ${e.degree} in ${e.field} from ${e.institution} (${e.startDate} - ${e.endDate})${e.gpa ? `, GPA: ${e.gpa}` : ''}
`).join('\n') || 'Not provided'}

PROJECTS:
${resume.projects?.map((p: any) => `
- ${p.name} (${p.role}): ${p.description}
  Technologies: ${p.technologies?.join(', ') || 'N/A'}
`).join('\n') || 'Not provided'}

CERTIFICATIONS:
${resume.certifications?.map((c: any) => `
- ${c.name} by ${c.issuer} (${c.date})
`).join('\n') || 'Not provided'}

AWARDS:
${resume.awards?.map((a: any) => `
- [ID: ${a.id}] ${a.title} from ${a.issuer} (${a.date})${a.description ? `: ${a.description}` : ''}
`).join('\n') || 'Not provided'}

---

## TARGET JOB DESCRIPTION
${jobDescription}

---

## REQUIRED OUTPUT (JSON)

Analyze deeply, then return this exact JSON structure:

{
  "summary": "<POWERFUL 3-4 sentence summary that hooks the reader and positions candidate perfectly for this specific role>",
  
  "skills": ["<skill1 - prioritized by job relevance>", "<skill2>", "..."],
  
  "experience": [
    {
      "id": "<keep original id>",
      "company": "<company name>",
      "position": "<position - align terminology with job if appropriate>",
      "startDate": "<keep original>",
      "endDate": "<keep original>",
      "current": <keep original boolean>,
      "description": "<ENHANCED description with relevant keywords>",
      "achievements": ["<TRANSFORMED achievement with metrics/impact>", "..."]
    }
  ],
  
  "education": [
    {
      "id": "<keep original id>",
      "institution": "<institution>",
      "degree": "<degree>",
      "field": "<field - highlight relevant coursework/specializations>",
      "startDate": "<keep original>",
      "endDate": "<keep original>",
      "gpa": "<keep if exists>"
    }
  ],
  
  "keyChanges": [
    {
      "section": "<summary | skills | experience | education | projects | certifications>",
      "description": "<specific improvement made>",
      "type": "<keyword_added | bullet_transformed | metric_added | reordered>",
      "impact": "<high | medium | low>"
    }
  ],
  
  "projects": [
    {
      "id": "<keep original id>",
      "name": "<project name>",
      "role": "<role - align with job terminology>",
      "startDate": "<keep original>",
      "endDate": "<keep original>",
      "technologies": ["<tech1>", "..."],
      "description": "<ENHANCED description with relevant keywords>"
    }
  ],
  
  "certifications": [
    {
      "id": "<keep original id>",
      "name": "<certification name - emphasize relevance>",
      "issuer": "<issuer>",
      "date": "<date>"
    }
  ],
  
  "awards": [
    {
      "id": "<keep original id>",
      "title": "<award title>",
      "issuer": "<issuer>",
      "date": "<date>",
      "description": "<enhanced description highlighting job relevance>"
    }
  ],
  
  "sectionScores": {
    "summary": { "before": <0-100>, "after": <0-100> },
    "skills": { "before": <0-100>, "after": <0-100> },
    "experience": { "before": <0-100>, "after": <0-100> },
    "education": { "before": <0-100>, "after": <0-100> },
    "projects": { "before": <0-100>, "after": <0-100> },
    "certifications": { "before": <0-100>, "after": <0-100> },
    "awards": { "before": <0-100>, "after": <0-100> }
  },
  
  "overallScore": { "before": <0-100>, "after": <0-100> },
  
  "missingSkills": [
    { 
      "skill": "<skill from job description NOT on resume>", 
      "reason": "<why this skill matters for the role>", 
      "frequency": <times mentioned in job>, 
      "action": "add",
      "type": "<hard | soft>"
    }
  ],
  
  "boostableSkills": [
    { 
      "skill": "<skill already on resume but underemphasized>", 
      "reason": "<how to better leverage this>", 
      "frequency": 1, 
      "action": "boost" 
    }
  ],
  
  "bulletTransformations": [
    {
      "experienceId": "<experience id>",
      "bulletIndex": <0-based index>,
      "originalBullet": "<original text>",
      "enhancedBullet": "<transformed text with metrics>",
      "improvement": "<what was improved>",
      "metricsAdded": <true if metrics were added>
    }
  ]
}`;

    console.log("[tailor] Stage 2: Calling AI for resume tailoring...");

    let aiResponse;
    try {
      aiResponse = await callAIWithRetry({
        model: selectedModel,
        wiseresumeSubProvider: __ROUTE.provider,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        maxTokens: 16000,
        userId,
      });
    } catch (aiErr) {
      await refundCredit(userId, creditCheck, 2);
      throw aiErr;
    }

    const content = aiResponse.content;

    if (!content) {
      await refundCredit(userId, creditCheck, 2);
      throw new Error("No content in AI response");
    }

    console.log("[tailor] Stage 2 AI response received, parsing...");

    const parsedResult = await parseAIJSONWithRetry<Record<string, unknown>>(content, {
      model: selectedModel,
      userId,
    });

    if (!parsedResult) {
      console.error("Failed to parse AI response:", content.slice(0, 500));
      await refundCredit(userId, creditCheck, 2);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= STAGE 3: Interview prep & strengths analysis (focused sub-prompt) =============
    console.log("[tailor] Stage 3: Generating interview prep and strengths analysis...");
    let interviewTalkingPoints: any[] = [];
    let strengthsAnalysis: any[] = [];

    try {
      const stage3SystemPrompt = `You are a career coach specializing in interview preparation. Analyze the resume and job description to generate targeted interview talking points and a strengths analysis. Return ONLY valid JSON.`;
      const tailoredSummary = (parsedResult.summary as string) || '';
      const tailoredExperience = JSON.stringify(parsedResult.experience || []).slice(0, 3000);

      const stage3UserPrompt = `Given this tailored resume and job description, generate interview preparation content.

TAILORED SUMMARY: ${tailoredSummary}

KEY EXPERIENCE (abbreviated): ${tailoredExperience}

JOB DESCRIPTION (abbreviated): ${jobDescription.slice(0, 2000)}

Return this exact JSON:
{
  "interviewTalkingPoints": [
    {
      "question": "<likely interview question based on job requirements>",
      "suggestedAnswer": "<how to answer using the tailored resume content>",
      "relatedExperience": "<which experience to reference>"
    }
  ],
  "strengthsAnalysis": [
    {
      "strength": "<candidate's competitive advantage>",
      "percentile": <estimated percentile vs typical applicants 0-100>,
      "recommendation": "<how to leverage this strength>"
    }
  ]
}

Generate 3-5 talking points and 3 strengths. Be specific to this candidate and role.`;

      const stage3Response = await callAIWithRetry({
        model: __ROUTE.model, wiseresumeSubProvider: __ROUTE.provider,
        messages: [
          { role: 'system', content: stage3SystemPrompt },
          { role: 'user', content: stage3UserPrompt },
        ],
        temperature: 0.4,
        maxTokens: 3000,
        userId,
      });

      if (stage3Response.content) {
        const stage3Parsed = await parseAIJSONWithRetry<Record<string, unknown>>(stage3Response.content, {
          model: __ROUTE.model, wiseresumeSubProvider: __ROUTE.provider,
          userId,
        });
        if (stage3Parsed) {
          interviewTalkingPoints = Array.isArray(stage3Parsed.interviewTalkingPoints)
            ? (stage3Parsed.interviewTalkingPoints as any[])
            : [];
          strengthsAnalysis = Array.isArray(stage3Parsed.strengthsAnalysis)
            ? (stage3Parsed.strengthsAnalysis as any[])
            : [];
        }
      }
    } catch (stage3Err) {
      console.warn('[tailor] Stage 3 failed (non-critical):', stage3Err instanceof Error ? stage3Err.message : stage3Err);
    }

    // ============= Deterministic ATS keyword scoring =============
    // Reuse originalResumeTextForGap computed during Stage 1 gap score computation
    const tailoredResumeObj = {
      summary: parsedResult.summary,
      skills: parsedResult.skills,
      experience: parsedResult.experience,
      projects: parsedResult.projects,
      certifications: parsedResult.certifications,
    };
    const tailoredResumeText = resumeToText(tailoredResumeObj);

    const atsScores = computeAtsKeywordScores(
      jobAnalysis.mustHaveKeywords,
      originalResumeTextForGap,
      tailoredResumeText,
    );
    console.log(`[tailor] ATS scores computed: original=${atsScores.originalKeywordDensity}%, optimized=${atsScores.optimizedKeywordDensity}%`);

    // Ensure all required fields have defaults with enhanced structure
    const tailoredResult = {
      ...parsedResult,
      sectionScores: parsedResult.sectionScores || null,
      overallScore: parsedResult.overallScore || null,
      missingSkills: (parsedResult.missingSkills as any[] || []).map((s: any) => ({
        ...s,
        type: s.type || 'hard',
      })),
      boostableSkills: parsedResult.boostableSkills || [],
      keyChanges: (parsedResult.keyChanges as any[] || []).map((kc: any) => {
        if (typeof kc === 'string') {
          return { section: 'experience', description: kc, type: 'bullet_transformed', impact: 'medium' };
        }
        return {
          section: kc.section || 'experience',
          description: kc.description || kc.change || String(kc),
          type: kc.type || 'bullet_transformed',
          impact: kc.impact || 'medium',
        };
      }),
      jobParsed: {
        title: jobAnalysis.title,
        company: jobAnalysis.company,
        keyRequirements: jobAnalysis.mustHaveKeywords.slice(0, 8),
        niceToHaves: jobAnalysis.niceToHaveKeywords.slice(0, 5),
      },
      projects: parsedResult.projects || [],
      certifications: parsedResult.certifications || [],
      awards: parsedResult.awards || [],
      jobIntelligence: {
        experienceLevel: jobAnalysis.experienceLevel,
        salaryRange: jobAnalysis.salaryRange,
        workMode: jobAnalysis.workMode,
        mustHaveSkills: jobAnalysis.mustHaveKeywords,
        niceToHaveSkills: jobAnalysis.niceToHaveKeywords,
        companyCultureSignals: jobAnalysis.companyCultureSignals,
        redFlags: jobAnalysis.redFlags,
        industryDetected: jobAnalysis.industryDetected,
      },
      atsAnalysis: {
        originalKeywordDensity: atsScores.originalKeywordDensity,
        optimizedKeywordDensity: atsScores.optimizedKeywordDensity,
        criticalKeywords: jobAnalysis.mustHaveKeywords,
        matchedKeywords: atsScores.matchedKeywords,
        unmatchedKeywords: atsScores.unmatchedKeywords,
        stuffingWarnings: [],
      },
      bulletTransformations: parsedResult.bulletTransformations || [],
      interviewTalkingPoints,
      strengthsAnalysis,
    };

    console.log("Successfully tailored resume with multi-stage pipeline");

    await recordUsage(userId, 'tailor', { provider: aiResponse.providerUsed || 'unknown' });

    const svcClient = getServiceClient();

    // Fire-and-forget usage event insert
    try {
      svcClient.from('usage_events').insert({
        user_id: userId,
        event_type: 'ai.tailor_resume',
        metadata: { model: aiResponse.providerUsed || 'unknown', intensity: tailorIntensity },
      }).then(() => {});
    } catch { /* non-critical */ }

    return new Response(
      JSON.stringify({ ...tailoredResult, _providerUsed: aiResponse.providerUsed || 'unknown' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log.error("Unhandled error", error);

    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...getCorsHeaders(req.headers.get('origin')), "Content-Type": "application/json" } }
    );
  }
});
