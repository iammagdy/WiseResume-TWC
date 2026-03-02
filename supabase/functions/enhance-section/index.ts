import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithRetry, isAIError, parseAIJSON } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// ============= SECURITY: Input validation limits =============
const MAX_CONTENT_SIZE = 50 * 1024; // 50KB for current content
const MAX_CONTEXT_SIZE = 100 * 1024; // 100KB for context (resume data)
const VALID_SECTIONS = ['summary', 'experience', 'education', 'skills', 'contact', 'custom', 'awards', 'projects', 'publications', 'volunteering', 'certifications', 'languages'];
const VALID_ACTIONS = ['generate', 'improve', 'ats_improve', 'ats_optimize', 'shorten', 'expand', 'add_metrics', 'generate_bullets', 'fix_error', 'custom', 'generate_with_answers', 'suggest_technologies'];

interface EnhanceRequest {
  section: 'summary' | 'experience' | 'education' | 'skills' | 'contact';
  action: 'generate' | 'improve' | 'ats_optimize' | 'shorten' | 'expand' | 'add_metrics' | 'generate_bullets' | 'fix_error';
  currentContent: unknown;
  fixInstruction?: string;
  context: {
    resume: unknown;
    jobDescription?: string;
  };
}

function getSchemaInstructions(section: string, currentContent: unknown): string {
  switch (section) {
    case 'summary':
      return `Return "improved" as a plain string (the enhanced summary text).`;
    case 'experience':
      return `Return "improved" as a JSON array of experience objects. Each object MUST have EXACTLY these fields:
{
  "id": "<PRESERVE the original id exactly>",
  "company": "<string>",
  "position": "<string>",
  "account": "<string, optional — the client/account served, preserve if present>",
  "startDate": "<string, e.g. Jan 2020>",
  "endDate": "<string, e.g. Present>",
  "current": <boolean>,
  "description": "<string — a detailed role summary, NOT a one-liner>",
  "achievements": ["<string>", "<string>", "<string>", "<string>"],
  "responsibilities": ["<string>", "<string>"]
}
You MUST preserve all original "id" values. Do NOT omit any field. If a field was empty, keep it as empty string or empty array. Preserve "account" exactly if present.
Here are the exact IDs and structure you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, company: e.company, position: e.position, account: e.account, startDate: e.startDate, endDate: e.endDate, current: e.current
})), null, 2)}`;
    case 'education':
      return `Return "improved" as a JSON array of education objects. Each object MUST have EXACTLY these fields:
{
  "id": "<PRESERVE the original id exactly>",
  "institution": "<string>",
  "degree": "<string>",
  "field": "<string>",
  "startDate": "<string>",
  "endDate": "<string>",
  "gpa": "<string or empty string>"
}
You MUST preserve all original "id" values. Do NOT omit any field.
Here are the exact IDs you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, institution: e.institution, degree: e.degree
})), null, 2)}`;
    case 'skills':
      return `Return "improved" as a flat JSON array of strings ONLY. Example: ["Python", "React", "AWS", "Leadership"]. Do NOT return objects like {"name":"Python","level":"Expert"} — only plain strings.`;
    case 'awards':
      return `Return "improved" as a JSON array of award objects. Each object MUST have EXACTLY these fields:
{
  "id": "<PRESERVE the original id exactly>",
  "title": "<string>",
  "issuer": "<string>",
  "date": "<string>",
  "description": "<string, optional>"
}
You MUST preserve all original "id" values. Do NOT omit any field. If a field was empty, keep it as empty string.
Here are the exact IDs you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, title: e.title
})), null, 2)}`;
    case 'projects':
      return `Return "improved" as a JSON array of project objects. Each object MUST have EXACTLY these fields:
{
  "id": "<PRESERVE the original id exactly>",
  "name": "<string>",
  "role": "<string>",
  "startDate": "<string>",
  "endDate": "<string>",
  "description": "<string>",
  "technologies": ["<string>", "<string>"],
  "url": "<string, optional>",
  "github": "<string, optional>"
}
You MUST preserve all original "id" values. Do NOT omit any field. If a field was empty, keep it as empty string or empty array.
Here are the exact IDs you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, name: e.name
})), null, 2)}`;
    case 'publications':
      return `Return "improved" as a JSON array of publication objects. Each object MUST have EXACTLY these fields:
{
  "id": "<PRESERVE the original id exactly>",
  "title": "<string>",
  "publisher": "<string>",
  "date": "<string>",
  "coauthors": "<string, optional>",
  "url": "<string, optional>",
  "description": "<string, optional>"
}
You MUST preserve all original "id" values. Do NOT omit any field.
Here are the exact IDs you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, title: e.title
})), null, 2)}`;
    case 'volunteering':
      return `Return "improved" as a JSON array of volunteering objects. Each object MUST have EXACTLY these fields:
{
  "id": "<PRESERVE the original id exactly>",
  "role": "<string>",
  "organization": "<string>",
  "startDate": "<string>",
  "endDate": "<string>",
  "description": "<string>",
  "hoursPerWeek": "<string, optional>"
}
You MUST preserve all original "id" values. Do NOT omit any field.
Here are the exact IDs you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, role: e.role, organization: e.organization
})), null, 2)}`;
    case 'certifications':
      return `Return "improved" as a JSON array of certification objects. Each object MUST have EXACTLY these fields:
{
  "id": "<PRESERVE the original id exactly>",
  "name": "<string>",
  "issuer": "<string>",
  "date": "<string>"
}
You MUST preserve all original "id" values. Do NOT omit any field.
Here are the exact IDs you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, name: e.name
})), null, 2)}`;
    case 'languages':
      return `Return "improved" as a JSON array of language objects. Each object MUST have EXACTLY these fields:
{
  "id": "<PRESERVE the original id exactly>",
  "name": "<string>",
  "proficiency": "<string — one of: Native, Fluent, Advanced, Intermediate, Basic>"
}
You MUST preserve all original "id" values.
Here are the exact IDs you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, name: e.name
})), null, 2)}`;
    default:
      return `Return "improved" in the same format as the input.`;
  }
}

// Approved action verbs the deterministic scorer checks for
const ACTION_VERBS = [
  'Led', 'Managed', 'Developed', 'Created', 'Implemented', 'Designed',
  'Built', 'Established', 'Launched', 'Directed', 'Coordinated', 'Supervised',
  'Delivered', 'Achieved', 'Increased', 'Reduced', 'Improved', 'Optimized',
  'Streamlined', 'Accelerated', 'Generated', 'Negotiated', 'Resolved',
  'Transformed', 'Pioneered', 'Spearheaded', 'Orchestrated', 'Architected',
  'Engineered', 'Mentored', 'Trained', 'Analyzed', 'Evaluated', 'Assessed',
  'Researched', 'Identified', 'Initiated', 'Executed', 'Facilitated',
  'Collaborated', 'Presented', 'Published', 'Authored', 'Secured',
  'Integrated', 'Migrated', 'Automated', 'Consolidated', 'Revamped',
  'Overhauled', 'Expanded', 'Scaled', 'Drove', 'Championed',
  'Cultivated', 'Fostered', 'Navigated', 'Influenced', 'Maximized',
  'Minimized', 'Restructured', 'Standardized'
];

function getSectionSpecificAtsRules(section: string, currentContent: unknown, context: unknown): string {
  const ctx = context as Record<string, unknown>;
  const resume = ctx?.resume as Record<string, unknown> | undefined;

  switch (section) {
    case 'skills': {
      const existingSkills = Array.isArray(currentContent)
        ? currentContent.map((s: unknown) => typeof s === 'string' ? s : (s as Record<string, unknown>)?.name || '').filter(Boolean)
        : [];
      return `
SECTION-SPECIFIC SCORING RULES FOR SKILLS:
The scorer checks keyword echo — it does textBlob.includes(skillName) to see if each skill appears in the resume text.
- NEVER rename, merge, paraphrase, or remove ANY existing skill. Keep every skill EXACTLY as written.
- Existing skills you MUST preserve verbatim: ${JSON.stringify(existingSkills)}
- Only ADD new relevant skills that are short (1-3 words max), e.g. "AWS", "Docker", "Agile"
- Do NOT turn "React" into "React.js Development" or "Python" into "Python Programming Language"
- Return as a flat array of plain strings ONLY.`;
    }
    case 'experience':
      return `
SECTION-SPECIFIC SCORING RULES FOR EXPERIENCE:
The scorer checks two things per bullet: (1) starts with an action verb, (2) contains a number/metric.
- Every bullet in "achievements" and "responsibilities" MUST start with one of these exact action verbs: ${ACTION_VERBS.join(', ')}
- Every bullet MUST contain at least one quantified metric (number, percentage, dollar amount, team size, or timeframe). If the original has none, add a realistic placeholder like "10+", "15%", "$50K".
- NEVER remove existing bullets — only improve wording or add new ones
- Preserve ALL dates, company names, job titles, and "id" values EXACTLY as given — do NOT reformat dates
- Preserve the exact date format used (if "2020" do not change to "Jan 2020")`;
    case 'education':
      return `
SECTION-SPECIFIC SCORING RULES FOR EDUCATION:
The scorer penalizes inconsistent date formats (deducts 15 points for mixed formats).
- Preserve ALL date strings EXACTLY as written — do NOT reformat (e.g. keep "2020" as "2020", keep "May 2020" as "May 2020")
- Preserve institution names, degree names, and field names EXACTLY
- Only enhance: add GPA if missing, add relevant coursework, or improve field description
- Do NOT add new education entries the user didn't have`;
    case 'summary': {
      const skills = Array.isArray((resume as Record<string, unknown>)?.skills)
        ? ((resume as Record<string, unknown>).skills as unknown[]).map((s: unknown) => typeof s === 'string' ? s : (s as Record<string, unknown>)?.name || '').filter(Boolean)
        : [];
      return `
SECTION-SPECIFIC SCORING RULES FOR SUMMARY:
The scorer checks keyword echo — each skill from the skills list that appears in the summary boosts the score by 35% weight.
- You MUST mention at least ${Math.min(5, skills.length)} of these skills BY EXACT NAME in the summary: ${JSON.stringify(skills.slice(0, 15))}
- Start sentences with strong action verbs from this list: ${ACTION_VERBS.slice(0, 20).join(', ')}
- Include at least 2 quantified achievements (years of experience, number of projects, team sizes, etc.)
- Keep the summary between 3-5 sentences for optimal density score`;
    }
    case 'awards':
      return `
SECTION-SPECIFIC RULES FOR AWARDS:
- Preserve all award titles, issuers, and dates EXACTLY as written
- Enhance descriptions to highlight the significance and selectivity of each award
- Do NOT rename awards or change issuer names
- Preserve all "id" values EXACTLY`;
    case 'projects':
      return `
SECTION-SPECIFIC RULES FOR PROJECTS:
- Preserve all project names, roles, dates, and technologies EXACTLY
- Enhance descriptions with quantified impact, technical details, and outcomes
- Every description should mention specific technologies used
- Start description sentences with strong action verbs
- Preserve all "id" values EXACTLY`;
    case 'publications':
      return `
SECTION-SPECIFIC RULES FOR PUBLICATIONS:
- Preserve all publication titles, publishers, dates, and coauthors EXACTLY
- Enhance descriptions to highlight research impact, methodology, and findings
- Do NOT rename publications or change publisher names
- Preserve all "id" values EXACTLY`;
    case 'volunteering':
      return `
SECTION-SPECIFIC RULES FOR VOLUNTEERING:
- Preserve all roles, organizations, and dates EXACTLY
- Enhance descriptions with measurable impact (people served, funds raised, hours contributed)
- Start sentences with action verbs
- Preserve all "id" values EXACTLY`;
    case 'certifications':
      return `
SECTION-SPECIFIC RULES FOR CERTIFICATIONS:
- Preserve all certification names, issuers, and dates EXACTLY — do NOT rename
- Only improve formatting consistency
- Preserve all "id" values EXACTLY`;
    case 'languages':
      return `
SECTION-SPECIFIC RULES FOR LANGUAGES:
- Preserve all language names EXACTLY
- Proficiency must be one of: Native, Fluent, Advanced, Intermediate, Basic
- Do NOT add languages the user didn't list
- Preserve all "id" values EXACTLY`;
    default:
      return '';
  }
}

function buildSummaryExperienceContext(context: unknown): { experienceContext: string; skillsList: string } {
  const ctx = context as Record<string, unknown>;
  const resume = ctx?.resume as Record<string, unknown> | undefined;
  const experience = Array.isArray(resume?.experience) ? resume.experience as Record<string, unknown>[] : [];
  const skills = Array.isArray(resume?.skills)
    ? (resume.skills as unknown[]).map((s: unknown) => typeof s === 'string' ? s : (s as Record<string, unknown>)?.name || '').filter(Boolean)
    : [];

  const experienceContext = experience.map((exp, i) =>
    `${i + 1}. ${exp.position || 'Role'} at ${exp.company || 'Company'}${exp.account ? ` (${exp.account} account)` : ''} (${exp.startDate || '?'} - ${exp.endDate || 'Present'})\n   Description: ${exp.description || 'N/A'}\n   Achievements: ${(Array.isArray(exp.achievements) ? exp.achievements.join('; ') : '') || 'N/A'}`
  ).join('\n');

  return { experienceContext, skillsList: skills.join(', ') };
}

function getSummaryActionPrompt(action: string, currentContent: unknown, context: unknown): string | null {
  const { experienceContext, skillsList } = buildSummaryExperienceContext(context);
  if (!experienceContext) return null;

  switch (action) {
    case 'generate':
      return `Write a professional summary based EXCLUSIVELY on the user's actual work history below. Do NOT invent roles, companies, or achievements that are not listed.

ACTUAL EXPERIENCE:
${experienceContext}

ACTUAL SKILLS: ${skillsList || 'N/A'}

Instructions:
- Synthesize 3-5 sentences that capture total years of experience, primary domain/industry, 2-3 standout achievements WITH metrics pulled from the experience above, and key technical skills.
- Start with a strong positioning statement that names the user's most recent or most relevant job title.
- Reference actual company names and account names when they add credibility.
- Every claim MUST trace back to the experience data above. Do NOT fabricate metrics, companies, or roles.`;

    case 'improve':
      return `Improve this summary by cross-referencing it with the user's actual work experience below. Replace any generic or vague claims with specific achievements from the experience entries. Add missing metrics, correct any inaccuracies, and ensure every statement is backed by real data from the work history.

CURRENT SUMMARY:
${JSON.stringify(currentContent)}

ACTUAL EXPERIENCE:
${experienceContext}

ACTUAL SKILLS: ${skillsList || 'N/A'}

Instructions:
- Keep the summary between 3-5 sentences.
- Replace generic phrases like "results-driven professional" with specifics from the experience (actual role titles, company names, account names, metrics).
- Every claim MUST trace back to the experience data above. Do NOT fabricate.`;

    case 'ats_improve':
      return `Optimize this summary for ATS scoring while grounding EVERY claim in the user's actual work experience below.

CURRENT SUMMARY:
${JSON.stringify(currentContent)}

ACTUAL EXPERIENCE:
${experienceContext}

ACTUAL SKILLS: ${skillsList || 'N/A'}

ATS RULES:
- Mention at least ${Math.min(5, skillsList.split(', ').filter(Boolean).length)} skills by EXACT name from the skills list.
- Start sentences with strong action verbs.
- Include at least 2 quantified achievements pulled from the experience entries.
- Keep between 3-5 sentences.
- Every claim MUST trace back to the experience data above. Do NOT fabricate metrics, companies, or roles.`;

    default:
      return null;
  }
}

function buildExperienceRoleContext(currentContent: unknown): string {
  // Array of entries (Boost All)
  if (Array.isArray(currentContent) && currentContent.length > 0) {
    const entries = currentContent as Record<string, unknown>[];
    const roleLines = entries.map((c, i) => {
      const position = c.position || 'Untitled Role';
      const company = c.company || 'Unknown Company';
      const account = c.account || '';
      return `${i + 1}. "${position}" at "${company}"${account ? ` (serving ${account} account)` : ''}`;
    }).join('\n');

    return `CRITICAL ROLE CONTEXT — READ THIS FOR EVERY ENTRY:
You are optimizing ${entries.length} different positions. Each has a UNIQUE job title and company. You MUST tailor each entry's description and achievements to match its SPECIFIC role.

POSITIONS TO OPTIMIZE:
${roleLines}

RULES:
- For EACH entry, research what that specific job title does at that specific company/industry.
- Do NOT copy content between entries — each role must have unique, role-appropriate content.
- A "Transport Supervisor" gets transport/logistics content. A "Customer Service Rep" gets customer service content. NEVER mix them.
- Match the industry, function, and seniority level of EACH title EXACTLY.

`;
  }

  // Single entry
  if (!currentContent || typeof currentContent !== 'object') return '';
  const c = currentContent as Record<string, unknown>;
  const position = c.position || '';
  const company = c.company || '';
  const account = c.account || '';
  if (!position) return '';

  let ctx = `CRITICAL ROLE CONTEXT — READ THIS FIRST:
The user's ACTUAL job title is: "${position}"
The user's ACTUAL company is: "${company}"`;
  if (account) ctx += `\nThe user serves the "${account}" account/client at ${company}.`;
  ctx += `\n\nYou MUST research what a "${position}" actually does${company ? ` at a company like "${company}"` : ''} and generate content that accurately reflects this specific role's real-world responsibilities. Do NOT generate content for a different role. If the title says "Supervisor" do NOT write about "technical support." If the title says "Transport" do NOT write about "software development." Match the industry, function, and seniority level of the title EXACTLY.\n\n`;
  return ctx;
}

function buildPrompt(section: string, action: string, currentContent: unknown, context: unknown, fixInstruction?: string): string {
  const baseContext = `You are an expert resume writer and career coach. Your goal is to help users create compelling, ATS-friendly resume content.

Current resume context:
${JSON.stringify(context, null, 2)}

Section to enhance: ${section}
Current content:
${JSON.stringify(currentContent, null, 2)}
`;

  const sectionAtsRules = getSectionSpecificAtsRules(section, currentContent, context);

  // Summary-specific prompts that are grounded in actual experience
  const summaryOverride = section === 'summary' ? getSummaryActionPrompt(action, currentContent, context) : null;

  const roleContext = section === 'experience' ? buildExperienceRoleContext(currentContent) : '';

  const actionPrompts: Record<string, string> = {
    generate: summaryOverride && action === 'generate' ? summaryOverride : `${roleContext}Generate a detailed, compelling description for this SPECIFIC role ("${section === 'experience' && typeof currentContent === 'object' && currentContent !== null && !Array.isArray(currentContent) ? (currentContent as Record<string, unknown>).position || '' : ''}") from scratch based on the resume context. Include 4-6 bullet points covering key responsibilities and measurable achievements that are realistic for this exact job title. Use power verbs (Led, Managed, Developed, etc.), include specific metrics (percentages, dollar amounts, team sizes), mention relevant tools/technologies, and describe the scope and impact of the work.
${section === 'experience' && typeof currentContent === 'object' && currentContent !== null && !Array.isArray(currentContent) && (currentContent as Record<string, unknown>).account ? `ACCOUNT/CLIENT CONTEXT: The user works at "${(currentContent as Record<string, unknown>).company}" but serves the "${(currentContent as Record<string, unknown>).account}" account/client. Research what ${(currentContent as Record<string, unknown>).account} does and tailor the description to reflect the specific products, services, and workflows of ${(currentContent as Record<string, unknown>).account}. Mention the account/client by name in the description and achievements.` : ''}
Do NOT produce generic one-liner descriptions. Every role must have rich, detailed content.`,
    improve: summaryOverride && action === 'improve' ? summaryOverride : `${roleContext}Transform this description into a powerful, detailed narrative that accurately reflects the "${section === 'experience' && typeof currentContent === 'object' && currentContent !== null && !Array.isArray(currentContent) ? (currentContent as Record<string, unknown>).position || '' : ''}" role. Expand thin descriptions into 4-6 impactful bullet points. Add quantified metrics (percentages, dollar amounts, team sizes), specific technologies, scope of responsibility, and measurable outcomes. Replace weak/passive language with strong action verbs. If the content is only 1-2 sentences, expand it significantly with realistic details based on the ACTUAL role title, company, and industry context.
${section === 'experience' && typeof currentContent === 'object' && currentContent !== null && !Array.isArray(currentContent) && (currentContent as Record<string, unknown>).account ? `ACCOUNT/CLIENT CONTEXT: The user works at "${(currentContent as Record<string, unknown>).company}" but serves the "${(currentContent as Record<string, unknown>).account}" account/client. Weave in specific details about ${(currentContent as Record<string, unknown>).account}'s products, services, or industry. Mention the account/client by name.` : ''}
Do NOT leave thin, generic descriptions. Every bullet must have substance and specificity.`,
    ats_improve: summaryOverride && action === 'ats_improve' ? summaryOverride : `${roleContext}Optimize this resume section to MAXIMIZE the ATS score. The score is computed by a deterministic algorithm with these 6 weighted pillars:

1. KEYWORD OPTIMIZATION (35% weight): The scorer checks if each skill from the skills list appears verbatim in the resume text using exact string matching. More keyword echoes = higher score.
2. CONTENT QUALITY (25% weight): The scorer checks if each bullet starts with a recognized action verb AND contains at least one number/metric.
3. SECTION STRUCTURE (15% weight): Standard section headers, logical ordering, no missing critical content.
4. PARSABILITY (10% weight): Clean text, consistent date formats. Mixed date formats (e.g. "2020" and "Jan 2020" in the same resume) lose 15 points.
5. CONTACT COMPLETENESS (10% weight): All contact fields present.
6. LENGTH & DENSITY (5% weight): Rich content, no filler, 3-5 sentence summaries, 3-5 bullets per role.

${sectionAtsRules}

ABSOLUTE RULES:
- NEVER remove, rename, or rephrase existing content in ways that change its meaning
- NEVER reformat dates — preserve the exact format given
- Only ADD and IMPROVE — never subtract`,
    ats_optimize: `Optimize this content for Applicant Tracking Systems (ATS). Add relevant industry keywords, use standard section headers, avoid special characters, and ensure the format is easily parseable by automated systems.`,
    shorten: `Make this content more concise while retaining the most impactful information. Remove filler words, combine related points, and prioritize the most impressive achievements.`,
    expand: `Expand this content with more detail. Add context, specific achievements, technologies used, and measurable outcomes where appropriate.`,
    add_metrics: `Add quantifiable metrics and numbers to this content. Suggest specific percentages, dollar amounts, time saved, team sizes, or other measurable outcomes based on the role and industry.`,
    generate_bullets: `Convert this description into powerful bullet points. Each bullet should start with a strong action verb and include a specific achievement or responsibility.`,
    fix_error: `Apply the following fix to the content: "${fixInstruction}". Keep the rest of the content consistent, but ensure the specific issue is resolved. Do not invent false information, but you may rephrase or restructure as needed to apply the fix effectively.`,
    custom: `${fixInstruction || String(currentContent)}. Respond with valid JSON only.`
  };

  const schemaInstructions = getSchemaInstructions(section, currentContent);

  return baseContext + '\n\nTask: ' + (actionPrompts[action] || actionPrompts.improve) + `

CRITICAL RESPONSE FORMAT: Respond with ONLY valid JSON, no markdown or code blocks. All text values must be plain text WITHOUT any Markdown formatting (no **, *, #, _, or backticks).

${schemaInstructions}

Full response structure:
{
  "improved": <see schema instructions above>,
  "changes": ["<change 1>", "<change 2>"],
  "suggestions": ["<optional suggestion 1>"]
}`;
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
    let userId: string | null = null;

    // Try standard auth first
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (!authError && user) {
      userId = user.id;
    } else {
      // Fallback: decode JWT payload for cross-project tokens
      try {
        const payloadB64 = token.split('.')[1];
        const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
        const payload = JSON.parse(atob(padded));
        if (payload.sub) userId = payload.sub;
      } catch (_) { /* ignore */ }
    }

    if (!userId) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Authenticated user:', userId);

    // Server-side rate limiting
    const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'enhance' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: 'rate_limit', message: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json() as EnhanceRequest & { content?: string; instruction?: string };
    const section = body.section;
    const action = body.action || (section === 'custom' ? 'custom' : undefined);
    const currentContent = body.currentContent ?? body.content;
    const context = body.context;
    // userGeminiKey removed
    const fixInstruction = body.fixInstruction ?? body.instruction;

    // ============= SECURITY: Input validation =============
    if (!section || !VALID_SECTIONS.includes(section)) {
      return new Response(
        JSON.stringify({ error: `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentStr = JSON.stringify(currentContent || '');
    if (contentStr.length > MAX_CONTENT_SIZE) {
      return new Response(
        JSON.stringify({ error: `Content is too large. Maximum size is ${MAX_CONTENT_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contextStr = JSON.stringify(context || {});
    if (contextStr.length > MAX_CONTEXT_SIZE) {
      return new Response(
        JSON.stringify({ error: `Context is too large. Maximum size is ${MAX_CONTEXT_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Enhancing ${section} with action: ${action}`);

    const prompt = buildPrompt(section, action, currentContent, context, fixInstruction);

    // Call AI using the shared client
    const temperature = action === 'ats_improve' ? 0.3 : 0.7;
    const aiResponse = await callAIWithRetry({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      userId,
    });

    const content = aiResponse.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

    // Parse the JSON from the AI response — never inject raw text into resume
    const enhancedContent = parseAIJSON(content);

    if (!enhancedContent) {
      console.error("Failed to parse enhance AI response:", content?.slice(0, 500));
      return new Response(JSON.stringify({
        error: 'enhancement_failed',
        message: 'AI response was malformed. Please try again.',
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Enhancement complete:', JSON.stringify(enhancedContent).slice(0, 200));

    // Record usage for rate limiting
    await recordUsage(userId, 'enhance', { section, action });

    const responseBody: Record<string, unknown> = { ...(enhancedContent as Record<string, unknown>) };
    if (aiResponse.fallbackUsed) {
      responseBody._fallbackUsed = true;
      responseBody._fallbackReason = aiResponse.fallbackReason;
    }

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhancement error:', error);

    if (isAIError(error)) {
      const errorMap: Record<string, { error: string; message: string }> = {
        'invalid_key': { error: 'invalid_key', message: 'Invalid Gemini API key. Please check your AI settings.' },
        'rate_limit': { error: 'rate_limit', message: 'Too many requests. Please wait a moment and try again.' },
        'payment_required': { error: 'payment_required', message: 'AI credits exhausted. Please check your account.' },
        'quota_exceeded': { error: 'quota_exceeded', message: 'Daily quota exceeded. Try again tomorrow or use a paid key.' },
      };
      const mapped = errorMap[error.type] || { error: error.type, message: error.message };
      return new Response(JSON.stringify(mapped), {
        status: error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'enhancement_failed',
      message: 'Failed to enhance content. Please try again.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
