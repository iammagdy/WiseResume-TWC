import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

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
      },
      required: [
        "contactInfo", "summary", "experience", "education",
        "skills", "certifications", "awards", "publications", "volunteering", "hobbies",
      ],
    },
  },
};

const systemPrompt = `You are an expert resume parser. Extract ALL structured information from resume text.

=== CRITICAL RULES ===
1. Process ALL content from the entire text. Do NOT stop after the first page.
2. Extract 100% of text in work experience. Do NOT summarize.
3. Copy each bullet point EXACTLY as written. Never combine or condense.
4. Extract EVERYTHING - all jobs, education, projects, skills, certifications, awards, publications, volunteering, hobbies.
5. Empty fields: use "" for strings, [] for arrays, false for booleans.
6. Dates: Accept ANY format. Current roles: endDate="Present", current=true.
7. Skills: Parse as individual items. Include languages with proficiency.
8. Projects: If a section is labelled "Projects" or an entry is clearly a personal/academic project (not a paid job), set isProject=true. Otherwise ALWAYS set isProject=false. NEVER omit isProject.
9. Awards / Publications / Volunteering / Hobbies: Extract them into their own arrays even if they appear as bullets inside another section.

=== CONTACT INFO RULES ===
- email: MUST contain "@" and a domain. If no email found, return "".
- phone: MUST be digits with optional separators (+, -, spaces, parens). If no phone found, return "".
- location: MUST be a geographic place (city, state, country). NEVER put skills, technologies, or programming languages here. If no location found, return "".
  - VALID locations: "New York, NY", "London, UK", "Cairo, Egypt", "Remote"
  - INVALID locations: "Python", "JavaScript", "React" -- these are SKILLS, not locations.

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
Return empty strings/arrays only if truly not present in the text.`;

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
      model: 'google/gemini-2.5-flash-lite',
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
        { role: 'user', content: text },
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

  // Weighted completeness
  const weights = { name: 15, email: 10, phone: 5, summary: 15, experience: 25, education: 15, skills: 10 };
  let completeness = 0;
  for (const [key, weight] of Object.entries(weights)) {
    completeness += (fc[key] || 0) * weight;
  }

  return { completeness: Math.round(completeness), fieldConfidence: fc };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 10, windowSeconds: 60, actionType: 'parse_resume' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log AI configuration for debugging
    const EMERGENT_KEY = Deno.env.get('EMERGENT_LLM_KEY');
    const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
    console.log('🔑 AI configuration:', {
      hasEmergentKey: !!EMERGENT_KEY,
      hasGeminiKey: !!GEMINI_KEY,
      userId: user.id.slice(0, 8),
    });

    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "text" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Resume text too large. Maximum ${MAX_TEXT_LENGTH / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Phase 3: Assess text quality and optionally clean with AI
    const quality = assessTextQuality(text);
    console.log(`📊 Text quality: score=${quality.score.toFixed(2)}, issues=[${quality.issues.join(', ')}]`);

    let processedText = text;
    if (quality.score < 0.6 && quality.issues.some(i => ['high_gibberish', 'unusual_word_lengths', 'very_short'].includes(i))) {
      processedText = await cleanTextWithAI(text, user.id);
    }

    // Pass 1: Main structured extraction
    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse the following resume text:\n\n${processedText}` },
      ],
      tools: [parseResumeTool],
      toolChoice: { type: 'function', function: { name: 'parse_resume' } },
      userId: user.id,
    });

    const toolCall = aiResponse.toolCalls?.[0];
    if (!toolCall || toolCall.function.name !== 'parse_resume') {
      return new Response(
        JSON.stringify({ error: 'AI returned unexpected response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedData = JSON.parse(toolCall.function.arguments);

    // Phase 4: Check completeness and retry if needed
    const firstPassConfidence = computeFieldConfidence(parsedData);
    console.log(`📊 Pass 1 completeness: ${firstPassConfidence.completeness}%`);

    if (firstPassConfidence.completeness < 40) {
      console.log('🔄 Low completeness, attempting pass 2...');
      try {
        // Build a focused retry prompt listing missing fields
        const missingFields = Object.entries(firstPassConfidence.fieldConfidence)
          .filter(([_, score]) => score < 0.5)
          .map(([field]) => field);

        const retryResponse = await callAI({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: retryPrompt },
            {
              role: 'user',
              content: `The first extraction missed these fields: ${missingFields.join(', ')}.\n\nPlease re-extract from this resume text:\n\n${processedText}`,
            },
          ],
          tools: [parseResumeTool],
          toolChoice: { type: 'function', function: { name: 'parse_resume' } },
          userId: user.id,
        });

        const retryCall = retryResponse.toolCalls?.[0];
        if (retryCall?.function.name === 'parse_resume') {
          const retryData = JSON.parse(retryCall.function.arguments);
          // Merge: prefer pass 2 values for missing fields only
          parsedData = mergeParseResults(parsedData, retryData, firstPassConfidence.fieldConfidence);
          console.log('✅ Pass 2 merge complete');
        }
      } catch (retryError) {
        console.warn('Pass 2 failed, using pass 1 results:', retryError);
      }
    }

    // Post-processing validation: fix misclassified fields
    parsedData = validateAndFixFields(parsedData);

    const generateId = () => crypto.randomUUID();

    // Validate name — only reject truly invalid patterns, trust AI for everything else
    let fullName = parsedData.contactInfo.fullName?.trim() || '';
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
    let phone = parsedData.contactInfo.phone?.trim() || '';
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
        email: parsedData.contactInfo.email || '',
        phone,
        location: parsedData.contactInfo.location || '',
        linkedin: parsedData.contactInfo.linkedin || undefined,
        portfolio: parsedData.contactInfo.portfolio || undefined,
      },
      summary: parsedData.summary || '',
      experience: (parsedData.experience || []).map((exp: any) => ({
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
      education: (parsedData.education || []).map((edu: any) => ({
        id: generateId(),
        institution: edu.institution || '',
        degree: edu.degree || '',
        field: edu.field || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        gpa: edu.gpa || undefined,
      })),
      skills: parsedData.skills || [],
      certifications: (parsedData.certifications || []).map((cert: any) => ({
        id: generateId(),
        name: cert.name || '',
        issuer: cert.issuer || '',
        date: cert.date || '',
        expiryDate: cert.expiryDate || undefined,
        credentialId: cert.credentialId || undefined,
      })),
      awards: (parsedData.awards || []).map((award: any) => ({
        id: generateId(),
        title: award.title || '',
        issuer: award.issuer || '',
        date: award.date || '',
        description: award.description || '',
      })),
      publications: (parsedData.publications || []).map((pub: any) => ({
        id: generateId(),
        title: pub.title || '',
        publisher: pub.publisher || '',
        date: pub.date || '',
        url: pub.url || undefined,
        description: pub.description || '',
      })),
      volunteering: (parsedData.volunteering || []).map((vol: any) => ({
        id: generateId(),
        organization: vol.organization || '',
        role: vol.role || '',
        startDate: vol.startDate || '',
        endDate: vol.endDate || '',
        current: vol.current || false,
        description: vol.description || '',
      })),
      hobbies: parsedData.hobbies || [],
    };

    // Final confidence scoring
    const finalConfidence = computeFieldConfidence(resumeData);

    console.log(
      `parse-resume: Extracted ${resumeData.experience.length} experiences, ` +
      `${resumeData.education.length} education, ${resumeData.skills.length} skills, ` +
      `${resumeData.awards.length} awards, ${resumeData.publications.length} publications, ` +
      `${resumeData.volunteering.length} volunteering. Completeness: ${finalConfidence.completeness}%`
    );

    await recordUsage(user.id, 'parse_resume');

    return new Response(JSON.stringify({
      ...resumeData,
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
  } catch (error) {
    console.error('parse-resume error:', error);
    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Validate and fix misclassified fields (e.g. skills in location).
 */
function validateAndFixFields(data: any): any {
  const SKILL_PATTERN = /^(python|javascript|typescript|java|c\+\+|c#|ruby|go|rust|swift|kotlin|php|r|scala|perl|html|css|sql|react|angular|vue|node|django|flask|spring|express|docker|kubernetes|aws|azure|gcp|git|linux|mongodb|postgresql|mysql|redis|terraform|jenkins|graphql|rest|api|agile|scrum|jira|figma|tableau|power\s*bi|excel|machine\s*learning|ai|ml|data\s*science|deep\s*learning|nlp|tensorflow|pytorch)$/i;

  const skills: string[] = [...(data.skills || [])];

  // Location: if it looks like a skill, move it
  const location = data.contactInfo?.location?.trim() || '';
  if (location && SKILL_PATTERN.test(location)) {
    console.log(`⚠️ Location "${location}" looks like a skill, moving to skills array`);
    skills.push(location);
    data.contactInfo.location = '';
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

  // Deduplicate skills
  data.skills = [...new Set(skills.map(s => s.trim()).filter(Boolean))];

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

  return merged;
}
