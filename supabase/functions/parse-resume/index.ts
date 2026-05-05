import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, toUserError, sanitizeInputText, parseAIJSON } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('parse-resume');
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { localParseResume } from "./localParser.ts";
import { requireAuth, tryAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { logger } from "../_shared/logger.ts";
import { wrapHandler } from "../_shared/fnLogger.ts";
const log = logger('parse-resume');


const MAX_TEXT_LENGTH = 100 * 1024;

const parseResumeTool = {
  type: "function" as const,
  function: {
    name: "parse_resume",
    description: "Parse resume text into structured data",
    parameters: {
      type: "object",
      properties: {
        contactInfo: {
          type: "object",
          properties: {
            fullName: { type: "string" },
            email: { type: "string", description: "Email address containing @ symbol, or empty string if not found" },
            phone: { type: "string", description: "Phone number with digits, or empty string if not found" },
            location: { type: "string", description: "Geographic location (city/state/country), NOT skills or technologies. Empty string if not found" },
            linkedin: { type: "string" },
            portfolio: { type: "string" },
          },
          required: ["fullName"],
        },
        summary: { type: "string" },
        experience: {
          type: "array",
          items: {
            type: "object",
            properties: {
              company: { type: "string" },
              position: { type: "string" },
              startDate: { type: "string" },
              endDate: { type: "string" },
              current: { type: "boolean" },
              description: { type: "string" },
              achievements: { type: "array", items: { type: "string" } },
              responsibilities: { type: "array", items: { type: "string" } },
              isProject: { type: "boolean" },
            },
            required: ["company", "position", "startDate", "endDate", "current", "description", "achievements", "isProject"],
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
              startDate: { type: "string" },
              endDate: { type: "string" },
              gpa: { type: "string" },
            },
            required: ["institution", "degree", "field", "startDate", "endDate"],
          },
        },
        skills: { type: "array", items: { type: "string" } },
        certifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              issuer: { type: "string" },
              date: { type: "string" },
              expiryDate: { type: "string" },
              credentialId: { type: "string" },
            },
            required: ["name", "issuer", "date"],
          },
        },
        awards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              issuer: { type: "string" },
              date: { type: "string" },
              description: { type: "string" },
            },
            required: ["title", "issuer", "date"],
          },
        },
        publications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              publisher: { type: "string" },
              date: { type: "string" },
              url: { type: "string" },
              description: { type: "string" },
            },
            required: ["title", "publisher", "date"],
          },
        },
        volunteering: {
          type: "array",
          items: {
            type: "object",
            properties: {
              organization: { type: "string" },
              role: { type: "string" },
              startDate: { type: "string" },
              endDate: { type: "string" },
              current: { type: "boolean" },
              description: { type: "string" },
            },
            required: ["organization", "role", "startDate", "endDate", "current"],
          },
        },
        hobbies: { type: "array", items: { type: "string" } },
        languages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              language: { type: "string", description: "Language name (e.g. English, Spanish, Arabic)" },
              proficiency: { type: "string", description: "Proficiency level: native, fluent, professional, basic" },
            },
            required: ["language", "proficiency"],
          },
        },
        references: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              title: { type: "string" },
              company: { type: "string" },
              contact: { type: "string", description: "Email or phone of reference" },
            },
            required: ["name"],
          },
        },
        projects: {
          type: "array",
          description: "Dedicated projects section entries (not work experience). Only use when the resume has a Projects section or clearly personal/academic projects separate from paid work.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              technologies: { type: "array", items: { type: "string" }, description: "Tech stack used" },
              url: { type: "string", description: "Live URL or demo link" },
              startDate: { type: "string" },
              endDate: { type: "string" },
            },
            required: ["name", "description"],
          },
        },
      },
      required: [
        "contactInfo", "summary", "experience", "education",
        "skills", "certifications", "awards", "publications", "volunteering", "hobbies",
        "languages", "references", "projects",
      ],
    },
  },
};

const systemPrompt = `You are an expert resume parser. Extract ALL structured information from resume text.

=== CRITICAL RULES ===
1. Process ALL content from the entire text. Do NOT stop after the first page.
2. Extract 100% of text in work experience. Do NOT summarize.
3. Copy each bullet point EXACTLY as written. Never combine or condense.
4. Extract EVERYTHING - all jobs, education, projects, skills, certifications, awards, publications, volunteering, hobbies, languages, references.
5. Empty fields: use "" for strings, [] for arrays, false for booleans.
6. Dates: Accept ANY format. Current roles: endDate="Present", current=true.
7. Skills: Parse as individual items.
8. Projects (top-level field): Extract entries from a dedicated "Projects" section into the projects[] array with name, description, technologies[], url, startDate, endDate. Do NOT put these in experience[]. If no Projects section exists, return projects=[].
9. Experience isProject flag: For entries that remain in experience[], set isProject=true ONLY if the entry is clearly a personal/academic project mixed inside the Experience section. Otherwise ALWAYS set isProject=false.
10. Awards / Publications / Volunteering / Hobbies: Extract them into their own arrays even if they appear as bullets inside another section.
11. Languages: Extract into languages[] with language name and proficiency (native/fluent/professional/basic).
12. References: Extract into references[] with name, title, company, contact if a References section exists.

=== CONTACT INFO RULES ===
- email: MUST contain "@" and a domain. If no email found, return "".
- phone: MUST be digits with optional separators (+, -, spaces, parens). If no phone found, return "".
- location: MUST be a geographic place (city, state, country). NEVER put skills, technologies, or programming languages here. If no location found, return "".
  - VALID locations: "New York, NY", "London, UK", "Cairo, Egypt", "Remote"
  - INVALID locations: "Python", "JavaScript", "React" -- these are SKILLS, not locations.
- linkedin: Full LinkedIn URL or profile path. Do NOT include "https://" prefix here; that will be added in post-processing.
- portfolio: Website URL for portfolio or personal site. Do NOT include "https://" prefix if already missing; that will be normalized.

=== SKILLS RULES ===
- Programming languages (Python, JavaScript, Java, C++, etc.) are ALWAYS skills.
- Frameworks and tools (React, Django, Docker, AWS, etc.) are ALWAYS skills.
- NEVER place technology names in contactInfo.location or contactInfo.fullName.

=== NAME DETECTION ===
- The name is usually on the VERY FIRST LINE
- Supported scripts: Latin, Arabic, Hebrew, Cyrillic, Devanagari (Hindi), CJK (Chinese/Japanese/Korean), Hangul (Korean)
- Never use emails, phone numbers, URLs, or section headers as names
- If unsure, set fullName to ""`;

const retryPrompt = `You are an expert resume parser doing a SECOND PASS. The first extraction missed some fields.
Focus on finding these missing fields in the text. Extract ONLY the fields that were missed.
Be more aggressive in your extraction - look for implicit information, infer from context.
Return empty strings/arrays only if truly not present in the text.

=== CRITICAL RULES (apply on retry too) ===
1. Process ALL content from the entire text. Do NOT stop after the first page.
2. Extract 100% of text in work experience. Do NOT summarize.
3. Empty fields: use "" for strings, [] for arrays, false for booleans.
4. Dates: Accept ANY format. Current roles: endDate="Present", current=true.
5. Projects (top-level field): Entries from a dedicated "Projects" section go into projects[] array. Do NOT put these in experience[].
6. Languages: Extract into languages[] with language name and proficiency.
7. References: Extract into references[] if a References section exists.

=== CONTACT INFO RULES ===
- email: MUST contain "@" and a domain. If no email found, return "".
- phone: MUST be digits with optional separators. If no phone found, return "".
- location: MUST be a geographic place. NEVER put skills or technologies here.
- VALID locations: "New York, NY", "London, UK", "Cairo, Egypt", "Remote"
- INVALID locations: "Python", "JavaScript", "React" -- these are SKILLS, not locations.

=== SKILLS RULES ===
- Programming languages and frameworks are ALWAYS skills.
- NEVER place technology names in contactInfo.location or contactInfo.fullName.

=== NAME DETECTION ===
- The name is usually on the VERY FIRST LINE
- Never use emails, phone numbers, URLs, or section headers as names
- If unsure, set fullName to ""`;

/**
 * Assess text quality to decide if AI cleaning is needed.
 */
function assessTextQuality(text: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 1.0;

  const cleaned = text.replace(/\s+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Word count
  if (wordCount < 30) { score -= 0.4; issues.push('very_short'); }
  else if (wordCount < 80) { score -= 0.2; issues.push('short'); }

  // Email presence
  if (!/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cleaned)) {
    score -= 0.1; issues.push('no_email');
  }

  // Phone presence
  if (!/(\+?\d[\d\s\-()]{6,})/.test(cleaned)) {
    score -= 0.05; issues.push('no_phone');
  }

  // Section keyword density
  const keywords = ['experience', 'education', 'skills', 'work', 'university', 'degree', 'summary', 'objective', 'certifications', 'projects'];
  const keywordCount = keywords.filter(k => cleaned.toLowerCase().includes(k)).length;
  if (keywordCount < 2) { score -= 0.2; issues.push('low_keyword_density'); }

  // Gibberish ratio
  const alphaRatio = cleaned.replace(/[^a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF]/g, '').length / Math.max(cleaned.length, 1);
  if (alphaRatio < 0.5) { score -= 0.3; issues.push('high_gibberish'); }

  // Average word length
  const avgLen = words.reduce((s, w) => s + w.length, 0) / Math.max(words.length, 1);
  if (avgLen < 2.5 || avgLen > 15) { score -= 0.15; issues.push('unusual_word_lengths'); }

  return { score: Math.max(0, Math.min(1, score)), issues };
}

/**
 * AI-powered text cleaning for low-quality extractions.
 * Uses a lightweight model to fix OCR artifacts and broken formatting.
 */
async function cleanTextWithAI(text: string, userId: string): Promise<string> {
  try {
    console.log('🧹 Running AI text cleaning on low-quality extraction...');
    const response = await callAI({
      model: __ROUTE.model, wiseresumeSubProvider: __ROUTE.provider,
      messages: [
        {
          role: 'system',
          content: `You are a text reconstruction expert. The following text was extracted from a resume PDF but has quality issues (OCR artifacts, concatenated words, broken formatting). 
Reconstruct it into clean, readable text while preserving ALL original content. Do NOT add, remove, or change any information. Only fix:
- Concatenated words (e.g. "SoftwareEngineer" → "Software Engineer")
- OCR artifacts and garbled characters
- Broken line wraps and formatting
- Missing spaces between words
Return ONLY the cleaned text, nothing else.`,
        },
        { role: 'user', content: sanitizeInputText(text, 100000) },
      ],
      userId,
      timeout: 15000,
    });
    
    if (response.content && response.content.length > text.length * 0.5) {
      console.log('🧹 AI text cleaning successful');
      return response.content;
    }
    return text;
  } catch (error) {
    console.warn('AI text cleaning failed, using original text:', error);
    return text;
  }
}

/**
 * Compute per-field confidence scores after parsing.
 */
function computeFieldConfidence(data: any): { completeness: number; fieldConfidence: Record<string, number> } {
  const fc: Record<string, number> = {};

  // Name
  const name = data.contactInfo?.fullName?.trim() || '';
  fc.name = name.length >= 2 && name.split(/\s+/).length >= 1 ? 1.0 : name.length > 0 ? 0.5 : 0;

  // Email
  const email = data.contactInfo?.email?.trim() || '';
  fc.email = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) ? 1.0 : email.includes('@') ? 0.5 : 0;

  // Phone
  const phone = data.contactInfo?.phone?.trim() || '';
  fc.phone = phone.replace(/\D/g, '').length >= 7 ? 1.0 : phone.length > 0 ? 0.3 : 0;

  // Experience
  const expCount = data.experience?.length || 0;
  fc.experience = expCount >= 2 ? 1.0 : expCount === 1 ? 0.7 : 0;

  // Education
  const eduCount = data.education?.length || 0;
  fc.education = eduCount >= 1 ? 1.0 : 0;

  // Skills
  const skillCount = data.skills?.length || 0;
  fc.skills = skillCount >= 5 ? 1.0 : skillCount >= 2 ? 0.7 : skillCount > 0 ? 0.3 : 0;

  // Summary
  fc.summary = (data.summary?.trim()?.length || 0) > 20 ? 1.0 : data.summary?.trim() ? 0.5 : 0;

  // Certifications
  const certCount = data.certifications?.length || 0;
  fc.certifications = certCount >= 1 ? 1.0 : 0;

  // Awards
  const awardCount = data.awards?.length || 0;
  fc.awards = awardCount >= 1 ? 1.0 : 0;

  // Volunteering
  const volCount = data.volunteering?.length || 0;
  fc.volunteering = volCount >= 1 ? 1.0 : 0;

  // Weighted completeness — certifications/awards/volunteering each contribute a small bonus
  // so rich resumes with these sections don't score artificially low and trigger needless retries
  const weights = { name: 14, email: 9, phone: 5, summary: 14, experience: 23, education: 14, skills: 10, certifications: 3, awards: 2, volunteering: 2 };
  let completeness = 0;
  for (const [key, weight] of Object.entries(weights)) {
    completeness += (fc[key] || 0) * weight;
  }

  return { completeness: Math.round(completeness), fieldConfidence: fc };
}

Deno.serve(wrapHandler("parse-resume", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 2 * 1024 * 1024);
  if (sizeError) return sizeError;

  const auth = await tryAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let creditCheck: Awaited<ReturnType<typeof checkAndDeductCredit>> | undefined;
  let _refundUserId: string | undefined;

  try {
    // Auth already verified by tryAuth above (returned 401 Response on failure).
    const { userId } = auth;
    _refundUserId = userId;

    // Rate limiting — when blocked, surface a structured error body and
    // a standard `Retry-After` HTTP header so clients (and the UI) can
    // present a clear "wait N seconds and try again" message instead of
    // an opaque 429.
    const rateCheck = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'parse_resume' });
    if (!rateCheck.allowed) {
      const retryAfter = rateCheck.retryAfterSeconds ?? 30;
      return new Response(
        JSON.stringify({
          error: 'RATE_LIMITED',
          message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'parse_resume', 10, 60);
    if (!serverRateCheck.allowed) {
      const retryAfter = serverRateCheck.retryAfterSeconds ?? 30;
      return new Response(
        JSON.stringify({
          error: 'RATE_LIMITED',
          message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    // Log AI configuration for debugging
    console.log('🔑 AI configuration:', {
      hasOpenRouterKey: !!Deno.env.get('OPENROUTER_API_KEY'),
      hasGroqKey: !!Deno.env.get('GROQ_API_KEY'),
      hasGeminiKey: !!Deno.env.get('GEMINI_API_KEY'),
      userId: userId.slice(0, 8),
    });

    const ALLOWED_FILE_TYPES = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html',
    ]);

    const body = await req.json();
    const { text, fileType } = body as { text?: unknown; fileType?: unknown };

    // Server-side file type validation: fileType is REQUIRED and must be in the
    // allow-list. Omitting fileType is not permitted — this prevents callers from
    // bypassing MIME enforcement by simply omitting the field.
    if (!fileType || typeof fileType !== 'string' || !ALLOWED_FILE_TYPES.has(fileType.toLowerCase())) {
      return new Response(
        JSON.stringify({
          error: fileType
            ? `Unsupported file type: "${fileType}". Accepted types: PDF, Word (.doc/.docx), plain text, HTML.`
            : 'fileType is required. Accepted types: PDF, Word (.doc/.docx), plain text, HTML.',
        }),
        { status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "text" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reject suspiciously short text — it can't contain a real resume.
    // This protects against iOS clients that extract empty/near-empty text
    // and send it to the AI, wasting credits and returning confusing results.
    const MIN_RESUME_TEXT = 50;
    if (text.trim().length < MIN_RESUME_TEXT) {
      return new Response(
        JSON.stringify({
          error: "We couldn't read your file. The document appears to have no readable text. Try a different format or take a photo of your CV.",
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Resume text too large. Maximum ${MAX_TEXT_LENGTH / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side content validation: ensure the submitted text is plausible
    // human-readable resume content, not binary data or injected scripts.
    // Note: this endpoint receives pre-extracted text, not raw file bytes.
    // Magic byte detection below guards against raw binary being passed as text.

    // 1. Reject HTML script tags. This endpoint receives pre-extracted plain
    //    text — a <script> tag in a resume indicates either an injection attempt
    //    or a malformed extraction. The "javascript:" URI scheme is NOT blocked
    //    here because it is a common skill-line substring ("JavaScript: 3 years")
    //    and the extracted text is never rendered as HTML, removing any XSS risk.
    if (/<script[\s>]/i.test(text)) {
      return new Response(
        JSON.stringify({ error: 'Invalid resume content: script content is not permitted.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Reject binary file headers passed as text — these appear when a file is
    //    sent without prior text extraction. Checks known magic byte sequences
    //    that would survive UTF-8 encoding of the binary file prefix:
    //      %PDF- : PDF files
    //      PK\x03\x04 : ZIP containers (DOCX, XLSX, etc.)
    //      \xD0\xCF\x11\xE0 : Compound Document (legacy DOC, XLS)
    //      \x7FELF : ELF executable
    //      MZ : DOS/PE executable
    if (
      text.startsWith('%PDF-') ||
      text.startsWith('PK\x03\x04') ||
      text.startsWith('\xD0\xCF\x11\xE0') ||
      text.startsWith('\x7FELF') ||
      text.startsWith('MZ')
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid resume content: raw binary file data detected. Please extract and paste plain text.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Reject submissions that appear to be raw base64-encoded binary data.
    //    Heuristic: a base64 blob has very long token runs with no whitespace.
    const hasBase64Blob = text.split(/\s+/).some(
      (token) => token.length > 500 && /^[A-Za-z0-9+/=]{200,}$/.test(token)
    );
    if (hasBase64Blob) {
      return new Response(
        JSON.stringify({ error: 'Invalid resume content: binary or encoded file data is not accepted. Please paste plain text.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Reject content that is overwhelmingly non-printable (>25% non-ASCII/non-printable).
    const nonPrintable = (text.match(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g) || []).length;
    if (nonPrintable / text.length > 0.25) {
      return new Response(
        JSON.stringify({ error: 'Invalid resume content: too many non-printable characters. Please paste plain text.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Credit deduction: after all input validation, right before AI call.
    // requireAuth ensures userId is always a verified, authenticated user.
    creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or use your own API key.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Phase 3: Assess text quality and optionally clean with AI
    const quality = assessTextQuality(text);
    console.log(`📊 Text quality: score=${quality.score.toFixed(2)}, issues=[${quality.issues.join(', ')}]`);

    let processedText = text;
    if (quality.score < 0.6 && quality.issues.some(i => ['high_gibberish', 'unusual_word_lengths', 'very_short'].includes(i))) {
      try {
        processedText = await cleanTextWithAI(text, userId);
      } catch (cleanErr) {
        console.warn('[parse-resume] Text cleaning pre-pass failed — continuing with raw text:', cleanErr);
        processedText = text;
      }
    }

    // Pass 1: Main structured extraction
    let parsedResume: any = null;
    let parseStatus: 'success' | 'partial' | 'failed' = 'success';
    let fallbackMode = false;

    try {
      const aiResponse = await callAI({
        model: __ROUTE.model, wiseresumeSubProvider: __ROUTE.provider,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse the following resume text:\n\n${sanitizeInputText(processedText, 100000)}` },
        ],
        tools: [parseResumeTool],
        toolChoice: { type: 'function', function: { name: 'parse_resume' } },
        userId,
      });

      const toolCall = aiResponse.toolCalls?.[0];
      let parsedFromTool: any = null;
      if (toolCall?.function?.name === 'parse_resume' && toolCall.function.arguments) {
        try { parsedFromTool = JSON.parse(toolCall.function.arguments); } catch {}
      }
      if (!parsedFromTool && aiResponse.content) {
        parsedFromTool = parseAIJSON(aiResponse.content);
      }
      if (!parsedFromTool) {
        // Throw so the catch block can engage the localParseResume fallback
        const unexpectedErr: any = new Error('AI returned unexpected response format');
        unexpectedErr.status = 503;
        throw unexpectedErr;
      }

      parsedResume = parsedFromTool;

      // Phase 4: Check completeness and retry if needed
      const firstPassConfidence = computeFieldConfidence(parsedResume);
      console.log(`📊 Pass 1 completeness: ${firstPassConfidence.completeness}%`);

      if (firstPassConfidence.completeness < 40) {
        console.log('🔄 Low completeness, attempting pass 2...');
        try {
          // Build a focused retry prompt listing missing fields
          const missingFields = Object.entries(firstPassConfidence.fieldConfidence)
            .filter(([_, score]) => score < 0.5)
            .map(([field]) => field);

          const retryResponse = await callAI({
            model: __ROUTE.model, wiseresumeSubProvider: __ROUTE.provider,
            messages: [
              { role: 'system', content: retryPrompt },
              {
                role: 'user',
                content: `The first extraction missed these fields: ${missingFields.join(', ')}.\n\nPlease re-extract from this resume text:\n\n${sanitizeInputText(processedText, 100000)}`,
              },
            ],
            tools: [parseResumeTool],
            toolChoice: { type: 'function', function: { name: 'parse_resume' } },
            userId,
          });

          const retryCall = retryResponse.toolCalls?.[0];
          let retryData: any = null;
          if (retryCall?.function?.name === 'parse_resume' && retryCall.function.arguments) {
            try { retryData = JSON.parse(retryCall.function.arguments); } catch {}
          }
          if (!retryData && retryResponse.content) {
            retryData = parseAIJSON(retryResponse.content);
          }
          if (retryData) {
            // Merge: prefer pass 2 values for missing fields only
            parsedResume = mergeParseResults(parsedResume, retryData, firstPassConfidence.fieldConfidence);
            console.log('✅ Pass 2 merge complete');
          }
        } catch (retryError) {
          console.warn('Pass 2 failed, using pass 1 results:', retryError);
        }
      }

      // Post-processing validation: fix misclassified fields
      parsedResume = validateAndFixFields(parsedResume);

    const generateId = () => crypto.randomUUID();

    // Validate name — only reject truly invalid patterns, trust AI for everything else
    let fullName = parsedResume.contactInfo.fullName?.trim() || '';
    const invalidNamePatterns = /^(contact|summary|profile|resume|cv|about|personal|objective|experience|education|skills|hire me|get in touch|references|certifications?|projects?|awards?|publications?|volunteering|hobbies|languages?|interests?)/i;
    const looksLikeEmail = fullName.includes('@');
    const looksLikeUrl = /https?:|www\.|\.com|\.linkedin/i.test(fullName);
    const looksLikePhone = /^\+?\d[\d\s\-()]{6,}$/.test(fullName);
    const isEmptyOrJunk = fullName.length < 2 || /^[^a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u05D0-\u05FF]+$/.test(fullName);

    if (invalidNamePatterns.test(fullName) || looksLikeEmail || looksLikeUrl || looksLikePhone || isEmptyOrJunk) {
      const firstLines = processedText.split('\n').filter((l: string) => l.trim()).slice(0, 8);
      const nameCandidate = firstLines.find((line: string) => {
        const t = line.trim();
        if (t.length < 2 || t.length > 60) return false;
        if (t.includes('@') || /https?:|www\./i.test(t)) return false;
        if (/^\+?\d[\d\s\-()]{6,}$/.test(t)) return false;
        if (invalidNamePatterns.test(t)) return false;
        const words = t.split(/\s+/);
        return words.length >= 1 && words.length <= 5 &&
          /^[A-Za-z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u05D0-\u05FF\s.\-']+$/.test(t);
      });
      fullName = nameCandidate?.trim() || '';
    }

    // Normalize phone number
    let phone = parsedResume.contactInfo.phone?.trim() || '';
    if (phone) {
      const digitsOnly = phone.replace(/[^\d+]/g, '');
      if (digitsOnly.length >= 10 && !/[\s\-()]/.test(phone)) {
        if (digitsOnly.startsWith('+')) {
          const cc = digitsOnly.match(/^(\+\d{1,4})(\d+)$/);
          if (cc) {
            const rest = cc[2];
            phone = cc[1] + ' ' + rest.replace(/(\d{3,4})(?=\d)/g, '$1 ');
          }
        } else if (digitsOnly.length > 12) {
          phone = '+' + digitsOnly.slice(0, 2) + ' ' + digitsOnly.slice(2).replace(/(\d{3,4})(?=\d)/g, '$1 ');
        } else {
          phone = digitsOnly.replace(/(\d{3,4})(?=\d)/g, '$1 ');
        }
      }
      phone = phone.trim();
    }

    const resumeData = {
      contactInfo: {
        fullName,
        email: parsedResume.contactInfo.email || '',
        phone,
        location: parsedResume.contactInfo.location || '',
        linkedin: parsedResume.contactInfo.linkedin || undefined,
        portfolio: parsedResume.contactInfo.portfolio || undefined,
      },
      summary: parsedResume.summary || '',
      experience: (parsedResume.experience || []).map((exp: any) => ({
        id: generateId(),
        company: exp.company || '',
        position: exp.position || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        current: exp.current || false,
        description: exp.description || '',
        achievements: exp.achievements || [],
        responsibilities: exp.responsibilities || [],
        isProject: exp.isProject === true,
      })),
      education: (parsedResume.education || []).map((edu: any) => ({
        id: generateId(),
        institution: edu.institution || '',
        degree: edu.degree || '',
        field: edu.field || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        gpa: edu.gpa || undefined,
      })),
      skills: parsedResume.skills || [],
      certifications: (parsedResume.certifications || []).map((cert: any) => ({
        id: generateId(),
        name: cert.name || '',
        issuer: cert.issuer || '',
        date: cert.date || '',
        expiryDate: cert.expiryDate || undefined,
        credentialId: cert.credentialId || undefined,
      })),
      awards: (parsedResume.awards || []).map((award: any) => ({
        id: generateId(),
        title: award.title || '',
        issuer: award.issuer || '',
        date: award.date || '',
        description: award.description || '',
      })),
      publications: (parsedResume.publications || []).map((pub: any) => ({
        id: generateId(),
        title: pub.title || '',
        publisher: pub.publisher || '',
        date: pub.date || '',
        url: pub.url || undefined,
        description: pub.description || '',
      })),
      volunteering: (parsedResume.volunteering || []).map((vol: any) => ({
        id: generateId(),
        organization: vol.organization || '',
        role: vol.role || '',
        startDate: vol.startDate || '',
        endDate: vol.endDate || '',
        current: vol.current || false,
        description: vol.description || '',
      })),
      hobbies: parsedResume.hobbies || [],
      languages: (parsedResume.languages || []).map((lang: any) => ({
        id: generateId(),
        // AI schema uses 'language' as the field name; our ResumeData type uses 'name'
        name: lang.language || lang.name || '',
        proficiency: lang.proficiency || 'professional',
      })),
      references: (parsedResume.references || []).map((ref: any) => ({
        id: generateId(),
        name: ref.name || '',
        title: ref.title || '',
        company: ref.company || '',
        // AI schema uses 'contact' — map to email/phone as appropriate
        email: ref.email || (ref.contact?.includes('@') ? ref.contact : ''),
        phone: ref.phone || (ref.contact && !ref.contact.includes('@') ? ref.contact : ''),
        relationship: ref.relationship || '',
      })),
      projects: (() => {
        // Start with dedicated top-level projects from AI
        const topLevelProjects = (parsedResume.projects || []).map((proj: any) => ({
          id: generateId(),
          name: proj.name || '',
          role: proj.role || '',
          startDate: proj.startDate || '',
          endDate: proj.endDate || '',
          technologies: proj.technologies || [],
          description: proj.description || '',
          url: proj.url || undefined,
          githubUrl: proj.githubUrl || undefined,
        }));

        // Also include any experience entries flagged as isProject (legacy support)
        const projectsFromExp = (parsedResume.experience || [])
          .filter((exp: any) => exp.isProject === true)
          .map((exp: any) => ({
            id: generateId(),
            name: exp.company || exp.position || 'Untitled Project',
            role: exp.position || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            technologies: [],
            description: [exp.description || '', ...(exp.achievements || [])].filter(Boolean).join('\n').slice(0, 1000),
            url: undefined,
            githubUrl: undefined,
          }));

        // Merge: top-level projects first, then legacy isProject entries
        // Dedupe by normalized name + startDate to avoid semantic duplicates
        const seenProjectKeys = new Set<string>();
        return [...topLevelProjects, ...projectsFromExp].filter(p => {
          const key = (p.name || '').toLowerCase().trim() + '|' + (p.startDate || '').trim();
          if (seenProjectKeys.has(key)) return false;
          seenProjectKeys.add(key);
          return true;
        });
      })(),
    };

    // Final confidence scoring
    const finalConfidence = computeFieldConfidence(resumeData);

    console.log(
      `parse-resume: Extracted ${resumeData.experience.length} experiences, ` +
      `${resumeData.education.length} education, ${resumeData.skills.length} skills, ` +
      `${resumeData.awards.length} awards, ${resumeData.publications.length} publications, ` +
      `${resumeData.volunteering.length} volunteering. Completeness: ${finalConfidence.completeness}%`
    );

    // Only record usage for local users (cross-project users have ext: prefix or are anonymous)
    if (userId !== 'anonymous' && !userId.startsWith('ext:')) {
      try { await recordUsage(userId, 'parse_resume', { provider: aiResponse.providerUsed || 'unknown' }); } catch (e) { console.warn('recordUsage skipped:', e); }
    }

    return new Response(JSON.stringify({
      ...resumeData,
      parseStatus,
      fallbackMode,
      _meta: {
        completeness: finalConfidence.completeness,
        fieldConfidence: finalConfidence.fieldConfidence,
        textQuality: quality.score,
        aiCleaned: processedText !== text,
        multiPass: firstPassConfidence.completeness < 40,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    } catch (err: any) {
      const httpStatus = err?.status ?? err?.statusCode ?? 0;

      if (httpStatus === 429) {
        // Rate limited by the upstream AI provider — refund credit, propagate
        // the upstream `Retry-After` if we got one, and tell the client to
        // retry.
        await refundCredit(userId, creditCheck, 1);
        const upstreamRetryAfter = Number(
          err?.headers?.get?.('retry-after') ?? err?.retryAfter ?? 0,
        );
        const retryAfter = Number.isFinite(upstreamRetryAfter) && upstreamRetryAfter > 0
          ? Math.min(upstreamRetryAfter, 300)
          : 30;
        return new Response(
          JSON.stringify({
            error: 'RATE_LIMITED',
            message: `AI service is temporarily busy. Please wait ${retryAfter} seconds and try again.`,
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          }
        );
      }

      if (httpStatus === 503 || httpStatus === 500 || httpStatus === 0 ||
          httpStatus === 401 || httpStatus === 403 || httpStatus === 404) {
        // AI failed — refund credit and fall back to local parser
        await refundCredit(userId, creditCheck, 1);
        console.warn('[parse-resume] Gemini unavailable (status:', httpStatus, '), falling back to local regex parser');
        const fallbackResume = localParseResume(processedText);
        parseStatus = 'partial';
        fallbackMode = true;

        const fallbackGenerateId = () => crypto.randomUUID();
        const fallbackResumeData = {
          contactInfo: {
            fullName: fallbackResume.contactInfo.fullName,
            email: fallbackResume.contactInfo.email,
            phone: fallbackResume.contactInfo.phone,
            location: fallbackResume.contactInfo.location,
            linkedin: fallbackResume.contactInfo.linkedin || undefined,
            portfolio: undefined,
          },
          summary: fallbackResume.summary,
          experience: (fallbackResume.experience || []).map((exp: any) => ({
            id: fallbackGenerateId(),
            company: exp.company || '',
            position: exp.position || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            current: exp.current || false,
            description: exp.description || '',
            achievements: exp.achievements || [],
            responsibilities: [],
            isProject: false,
          })),
          education: (fallbackResume.education || []).map((edu: any) => ({
            id: fallbackGenerateId(),
            institution: edu.institution || '',
            degree: edu.degree || '',
            field: edu.field || '',
            startDate: edu.startDate || '',
            endDate: edu.endDate || '',
            gpa: undefined,
          })),
          skills: fallbackResume.skills || [],
          certifications: (fallbackResume.certifications || []).map((cert: any) => ({
            id: fallbackGenerateId(),
            name: cert.name || '',
            issuer: cert.issuer || '',
            date: cert.date || '',
            expiryDate: undefined,
            credentialId: undefined,
          })),
          awards: (fallbackResume.awards || []).map((a: any) => ({
            id: fallbackGenerateId(),
            title: a.title || '',
            issuer: a.issuer || '',
            date: a.date || '',
          })),
          projects: (fallbackResume.projects || []).map((p: any) => ({
            id: fallbackGenerateId(),
            name: p.name || '',
            role: p.role || '',
            startDate: p.startDate || '',
            endDate: p.endDate || '',
            technologies: p.technologies || [],
            description: p.description || '',
            url: p.url || undefined,
            githubUrl: p.githubUrl || undefined,
          })),
          volunteering: (fallbackResume.volunteering || []).map((v: any) => ({
            id: fallbackGenerateId(),
            organization: v.organization || '',
            role: v.role || '',
          })),
          languages: (fallbackResume.languages || []).map((l: any) => ({
            id: fallbackGenerateId(),
            name: l.name || '',
            proficiency: l.proficiency || 'professional',
          })),
          publications: [],
          hobbies: [],
          references: [],
        };

        return new Response(JSON.stringify({
          ...fallbackResumeData,
          parseStatus,
          fallbackMode,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Unknown error — propagate
        throw err;
      }
    }
  } catch (error) {
    if (creditCheck && _refundUserId) await refundCredit(_refundUserId, creditCheck, 1);
    log.error('Unhandled error', error);
    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

/**
 * Validate and fix misclassified fields (e.g. skills in location).
 */
function validateAndFixFields(data: any): any {
  const SKILL_PATTERN = /^(python|javascript|typescript|java|c\+\+|c#|ruby|go|rust|swift|kotlin|php|r|scala|perl|html|css|sql|sq|react|angular|vue|node|django|flask|spring|express|docker|kubernetes|aws|azure|gcp|git|linux|mongodb|postgresql|mysql|redis|terraform|jenkins|graphql|rest|api|apis|agile|scrum|jira|figma|tableau|power\s*bi|excel|machine\s*learning|ai|ml|data\s*science|deep\s*learning|nlp|tensorflow|pytorch|numpy|pandas|nosql|sass|less|ci|cd|\.net|c)$/i;

  const skills: string[] = [...(data.skills || [])];

  // Location: split by comma/semicolon and check each part individually
  const location = data.contactInfo?.location?.trim() || '';
  if (location) {
    const locationParts = location.split(/[,;]/).map((p: string) => p.trim()).filter(Boolean);
    const skillParts: string[] = [];
    const geoParts: string[] = [];

    for (const part of locationParts) {
      if (SKILL_PATTERN.test(part)) {
        skillParts.push(part);
      } else {
        geoParts.push(part);
      }
    }

    if (skillParts.length > 0) {
      console.log(`⚠️ Location "${location}" contains skills [${skillParts.join(', ')}], moving to skills array`);
      skills.push(...skillParts);
      data.contactInfo.location = geoParts.join(', ');
    }
  }

  // Email: must contain @
  const email = data.contactInfo?.email?.trim() || '';
  if (email && !email.includes('@')) {
    console.log(`⚠️ Email "${email}" invalid (no @), clearing`);
    data.contactInfo.email = '';
  }

  // Phone: must have at least 7 digits
  const phone = data.contactInfo?.phone?.trim() || '';
  if (phone && phone.replace(/\D/g, '').length < 7) {
    console.log(`⚠️ Phone "${phone}" too short, clearing`);
    data.contactInfo.phone = '';
  }

  // Deduplicate skills (case-insensitive — keep first occurrence)
  const seenSkills = new Set<string>();
  data.skills = skills
    .map(s => s.trim())
    .filter(s => {
      if (!s) return false;
      const lower = s.toLowerCase();
      if (seenSkills.has(lower)) return false;
      seenSkills.add(lower);
      return true;
    });

  // Normalize LinkedIn URL — ensure https:// prefix
  const linkedin = data.contactInfo?.linkedin?.trim() || '';
  if (linkedin && !/^https?:\/\//i.test(linkedin)) {
    data.contactInfo.linkedin = 'https://' + linkedin.replace(/^\/\//, '');
  }

  // Normalize portfolio URL — ensure https:// prefix
  const portfolio = data.contactInfo?.portfolio?.trim() || '';
  if (portfolio && !/^https?:\/\//i.test(portfolio)) {
    data.contactInfo.portfolio = 'https://' + portfolio.replace(/^\/\//, '');
  }

  return data;
}

/**
 * Merge results from two parse passes, preferring pass 2 for missing fields.
 */
function mergeParseResults(pass1: any, pass2: any, pass1Confidence: Record<string, number>): any {
  const merged = { ...pass1 };

  // Contact info: use pass2 if pass1 was empty
  if (pass1Confidence.name < 0.5 && pass2.contactInfo?.fullName?.trim()) {
    merged.contactInfo = { ...merged.contactInfo, fullName: pass2.contactInfo.fullName };
  }
  if (pass1Confidence.email < 0.5 && pass2.contactInfo?.email?.trim()) {
    merged.contactInfo = { ...merged.contactInfo, email: pass2.contactInfo.email };
  }
  if (pass1Confidence.phone < 0.5 && pass2.contactInfo?.phone?.trim()) {
    merged.contactInfo = { ...merged.contactInfo, phone: pass2.contactInfo.phone };
  }

  // Summary: use pass2 if pass1 was empty
  if (pass1Confidence.summary < 0.5 && pass2.summary?.trim()) {
    merged.summary = pass2.summary;
  }

  // Arrays: use pass2 if pass1 was empty, never merge arrays (risk of duplicates)
  if (pass1Confidence.experience < 0.5 && pass2.experience?.length > 0) {
    merged.experience = pass2.experience;
  }
  if (pass1Confidence.education < 0.5 && pass2.education?.length > 0) {
    merged.education = pass2.education;
  }
  if (pass1Confidence.skills < 0.5 && pass2.skills?.length > 0) {
    merged.skills = pass2.skills;
  }
  if ((!merged.certifications || merged.certifications.length === 0) && pass2.certifications?.length > 0) {
    merged.certifications = pass2.certifications;
  }
  if ((!merged.awards || merged.awards.length === 0) && pass2.awards?.length > 0) {
    merged.awards = pass2.awards;
  }
  if ((!merged.publications || merged.publications.length === 0) && pass2.publications?.length > 0) {
    merged.publications = pass2.publications;
  }
  if ((!merged.volunteering || merged.volunteering.length === 0) && pass2.volunteering?.length > 0) {
    merged.volunteering = pass2.volunteering;
  }
  if ((!merged.hobbies || merged.hobbies.length === 0) && pass2.hobbies?.length > 0) {
    merged.hobbies = pass2.hobbies;
  }
  if ((!merged.projects || merged.projects.length === 0) && pass2.projects?.length > 0) {
    merged.projects = pass2.projects;
  }
  if ((!merged.languages || merged.languages.length === 0) && pass2.languages?.length > 0) {
    merged.languages = pass2.languages;
  }
  if ((!merged.references || merged.references.length === 0) && pass2.references?.length > 0) {
    merged.references = pass2.references;
  }

  return merged;
}
