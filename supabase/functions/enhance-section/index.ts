import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { callAIWithRetry, isAIError, parseAIJSON, sanitizeInputText } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkUserCreditBalance } from "../_shared/creditUtils.ts";
import { deductCredits } from "../_shared/deductCredits.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";

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
    case 'projects': {
      const isSingleProject = !Array.isArray(currentContent) && typeof currentContent === 'object' && currentContent !== null;
      if (isSingleProject) {
        const c = currentContent as Record<string, unknown>;
        return `Return "improved" as a SINGLE project object (NOT an array). The object MUST have EXACTLY these fields:
{
  "id": "${c.id || ''}",
  "name": "<string>",
  "role": "<string>",
  "startDate": "<string>",
  "endDate": "<string>",
  "description": "<string>",
  "technologies": ["<string>", "<string>"],
  "url": "<string, optional>",
  "githubUrl": "<string, optional>"
}
You MUST preserve the original "id" value exactly. Do NOT omit any field.`;
      }
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
  "githubUrl": "<string, optional>"
}
You MUST preserve all original "id" values. Do NOT omit any field. If a field was empty, keep it as empty string or empty array.
Here are the exact IDs you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, name: e.name
})), null, 2)}`;
    }
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

// Universal ATS compliance preamble — injected at the top of every content-producing action prompt.
// Ensures ATS-grade output from every button the user clicks, not just the dedicated ATS actions.
const ATS_BULLET_PREAMBLE = `
ATS COMPLIANCE — mandatory for all output regardless of action:
- Start every bullet with a strong action verb — BANNED OPENERS: "Responsible for", "Helped with", "Worked on", "Assisted in", "Was involved in", "Participated in", "Tasked with"
- Follow the XYZ formula for every bullet: ACTION VERB + WHAT YOU DID + MEASURABLE RESULT
- Include a quantified metric OR bracket placeholder [X%] / [~$X] in every bullet — no metric-free bullets
- Echo at least 1 of the candidate's skill keywords verbatim in EACH bullet (exact string match, not synonyms)
- No bullet symbols (•, ●, ■) and no Markdown (**bold**, *italic*) — plain text only
`;

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
- Every bullet MUST contain at least one quantified metric (number, percentage, dollar amount, team size, or timeframe). If the original bullet has no real metric, insert a bracket placeholder like "[X%]", "[~$X]", or "[N] team members" so the user knows to fill in their actual number — do NOT invent a specific number that wasn't in the original.
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

function buildProjectContext(currentContent: unknown): string {
  if (!currentContent || typeof currentContent !== 'object' || Array.isArray(currentContent)) return '';
  const c = currentContent as Record<string, unknown>;
  const name = c.name || '';
  const role = c.role || '';
  const techs = Array.isArray(c.technologies) ? (c.technologies as string[]).join(', ') : '';
  const desc = c.description || '';
  if (!name) return '';
  let ctx = `PROJECT CONTEXT:\nProject Name: "${name}"`;
  if (role) ctx += `\nRole: "${role}"`;
  if (techs) ctx += `\nTechnologies: ${techs}`;
  if (desc) ctx += `\nExisting Description: ${desc}`;
  ctx += '\n\n';
  return ctx;
}

function shouldAskQuestions(section: string, action: string, currentContent: unknown): boolean {
  if (section !== 'projects' || action !== 'generate') return false;
  if (!currentContent || typeof currentContent !== 'object' || Array.isArray(currentContent)) return false;
  const c = currentContent as Record<string, unknown>;
  const hasDesc = typeof c.description === 'string' && (c.description as string).trim().length > 10;
  const hasTechs = Array.isArray(c.technologies) && (c.technologies as unknown[]).length > 0;
  // Ask questions only if there's very little context (just a name)
  return !hasDesc && !hasTechs;
}

function buildPrompt(section: string, action: string, currentContent: unknown, context: unknown, fixInstruction?: string): string {
  const baseContext = `You are a professional resume writer and ATS optimization specialist with deep expertise in how enterprise Applicant Tracking Systems — Workday, Taleo, Greenhouse, Lever, and iCIMS — parse, rank, and score resumes.

You know that:
- ATS systems score keyword density using EXACT string matching. A skill listed as "JavaScript" only scores if "JavaScript" appears verbatim in the experience text — synonyms ("JS", "JavaScript development") do not count.
- Every experience bullet must follow the XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]" — the standard validated by Jobscan, Resume Worded, and Google's hiring rubric.
- Bullets MUST start with a strong action verb. BANNED openers that kill ATS scores: "Responsible for", "Helped with", "Worked on", "Assisted in", "Was involved in", "Participated in", "Tasked with", "Duties included".
- No two bullets in the same role may start with the same verb — verb variety is evaluated by modern ATS parsers.
- Metrics are mandatory. If no real number exists, insert a bracket placeholder like [X%] or [~$X] — NEVER invent a specific number that was not in the original.
- Clean parseable text only: no bullet symbols (•, ●, ■), no tables, no multi-column layout, no Markdown (**bold**, *italic*). Plain text only.
- Summaries must be 3-5 sentences, reflect the candidate's actual seniority level, and echo at least 5 skills from their skills list by exact name.
- Skills must mirror exact terminology: "JavaScript" not "JavaScript development", "Project Management" not "Managing Projects".
Every output you produce will be evaluated by Jobscan or Resume Worded — it must score 70%+ on keyword match and content quality without additional manual edits by the user.

Current resume context:
${sanitizeInputText(JSON.stringify(context, null, 2), 15000)}

Section to enhance: ${section}
Current content:
${sanitizeInputText(JSON.stringify(currentContent, null, 2), 5000)}
`;

  const sectionAtsRules = getSectionSpecificAtsRules(section, currentContent, context);

  // Summary-specific prompts that are grounded in actual experience
  const summaryOverride = section === 'summary' ? getSummaryActionPrompt(action, currentContent, context) : null;

  const roleContext = section === 'experience' ? buildExperienceRoleContext(currentContent) : '';
  const projectContext = section === 'projects' ? buildProjectContext(currentContent) : '';

  const actionPrompts: Record<string, string> = {
    generate: summaryOverride && action === 'generate' ? summaryOverride : `${roleContext}${projectContext}Generate a detailed, ATS-optimized description from scratch for this SPECIFIC role.

FORMAT — every bullet must follow the XYZ formula:
ACTION VERB + WHAT YOU DID + MEASURABLE RESULT
Example: "Engineered CI/CD pipeline reducing deployment time by [X%] across [N] microservices"
Example: "Led cross-functional team of [N] engineers to deliver $[X]M platform on schedule"

RULES:
- Generate 4-6 bullet points covering key responsibilities and measurable achievements realistic for this exact job title and industry
- BANNED OPENERS — NEVER use: "Responsible for", "Helped with", "Worked on", "Assisted in", "Was involved in" — use strong action verbs only
- VARIED VERBS — no two bullets start with the same verb
- Include bracket placeholders [X%] or [~$X] for any metric — do not invent specific numbers
- Echo relevant keywords from the candidate's skills list where they naturally fit
- Mention specific technologies, tools, or methodologies appropriate for this role and industry
- PLAIN TEXT — no bullet symbols (•, ●, ■), no Markdown formatting
${section === 'experience' && typeof currentContent === 'object' && currentContent !== null && !Array.isArray(currentContent) && (currentContent as Record<string, unknown>).account ? `\nACCOUNT/CLIENT CONTEXT: The user works at "${(currentContent as Record<string, unknown>).company}" but serves the "${(currentContent as Record<string, unknown>).account}" account/client. Tailor the description to reflect ${(currentContent as Record<string, unknown>).account}'s specific products, services, and workflows. Mention the account/client by name.` : ''}
${section === 'projects' ? `\nFor project "${(currentContent as Record<string, unknown>)?.name || 'this project'}": start with a clear one-sentence summary of what it does, then 2-4 XYZ-format bullets covering technical approach, your specific contributions, and measurable outcomes.` : ''}`,
    improve: summaryOverride && action === 'improve' ? summaryOverride : `${roleContext}${projectContext}Transform this content into a powerful, ATS-optimized description.

BULLET TRANSFORMATION — every bullet (existing and new) must look like the AFTER, not the BEFORE:
BEFORE: "Worked on frontend development"
AFTER:  "Architected [N] React components serving [N]+ daily users, reducing load time by [X%]"
BEFORE: "Responsible for customer service"
AFTER:  "Resolved [N]+ customer inquiries weekly with [X%] satisfaction rating, reducing escalations by [Y%]"
BEFORE: "Helped with team projects"
AFTER:  "Collaborated with cross-functional team of [N] engineers to deliver [project] [X] weeks ahead of schedule"

MANDATORY RULES:
1. BANNED PHRASES — NEVER start a bullet with: "Responsible for", "Helped with", "Worked on", "Assisted in", "Was involved in", "Participated in", "Tasked with"
2. XYZ FORMULA — every bullet: ACTION VERB + WHAT YOU DID + MEASURABLE RESULT
3. VARIED VERBS — no two bullets may start with the same verb
4. METRICS — use bracket placeholders [X%] or [~$X] if no real metric exists — NEVER invent a specific number
5. KEYWORD ECHO — weave the candidate's own skill keywords naturally into bullets
6. EXPAND — if only 1-2 sentences exist, expand to 4-6 bullets with realistic details for this ACTUAL role title and industry
7. PLAIN TEXT — no bullet symbols (•, ●, ■), no Markdown formatting${section === 'experience' && typeof currentContent === 'object' && currentContent !== null && !Array.isArray(currentContent) && (currentContent as Record<string, unknown>).account ? `\n\nACCOUNT/CLIENT CONTEXT: Weave in specific details about ${(currentContent as Record<string, unknown>).account}'s products, services, or industry. Mention the account/client by name.` : ''}`,
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
    ats_optimize: `${roleContext}Optimize this resume section to MAXIMIZE the ATS score using the same 6-pillar scoring framework that drives the ATS Score meter:

1. KEYWORD OPTIMIZATION (35% weight): Echo EXACT skill names from the resume's skills list verbatim in the experience/summary text. The scorer uses exact string matching — "JavaScript" must appear as "JavaScript", not "JS" or "scripting". Natural placement only — no keyword stuffing.
2. CONTENT QUALITY (25% weight): Every bullet in "achievements" MUST: (a) start with one of these approved action verbs: ${ACTION_VERBS.join(', ')}, AND (b) contain at least one quantified metric or bracket placeholder like [X%] or [~$X].
3. SECTION STRUCTURE (15% weight): Standard section headers, logical ordering, all required fields present.
4. PARSABILITY (10% weight): Clean plain text only — no bullet symbols (•, ●, ■), no tables, no multi-column layout. NEVER mix date formats (e.g. "2020" and "Jan 2020" in the same resume deducts 15 points — preserve the exact format given).
5. CONTACT COMPLETENESS (10% weight): Ensure all contact fields are populated.
6. LENGTH & DENSITY (5% weight): 3-5 bullets per experience role, 3-5 sentence summaries — fewer than 3 bullets per role triggers an ATS length penalty.

${sectionAtsRules}

ABSOLUTE RULES:
- NEVER fabricate metrics — use bracket placeholders [X%] or [~$X] if no real number exists
- NEVER remove existing bullets — only improve and add
- NEVER reformat dates — preserve the exact format given
- BANNED OPENERS: "Responsible for", "Helped with", "Worked on" — replace with action verbs`,
    shorten: `${projectContext}${section === 'projects' ? 'Shorten ONLY the "description" field of this project to 2-3 sentences max. Remove filler, combine related points, keep the highest-impact information. PRESERVE all other fields (name, role, dates, technologies, URLs) exactly as they are — do not modify them.' : `Make this content more concise while protecting its ATS score.

RULES:
- KEEP all bullets that contain a quantified metric or a keyword from the candidate's skills list — these directly affect ATS scoring
- KEEP all bullets that start with a strong action verb and have measurable impact
- REMOVE or MERGE only filler bullets that have no metrics, no skill keyword echoes, and weak/banned openers ("Responsible for", "Helped with", "Worked on")
- PRESERVE all date formats and "id" values exactly
- MINIMUM: 3 bullets per experience role — fewer than 3 triggers an ATS length penalty
- NEVER drop the only bullet containing a specific metric or skill keyword`}`,
    expand: `${roleContext}${projectContext}Expand this content into a richer, more detailed description that improves the ATS score.

RULES:
- Add 1-3 new bullet points, each following the XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]"
- Each new bullet must start with a DIFFERENT action verb from any existing bullets — no duplicate verbs
- Echo at least 1 keyword from the candidate's skills list in each new bullet where natural
- Use vocabulary specific to this candidate's industry and seniority level
- For experience: add technologies used, scope of responsibility, team size, or project scale
- All new metrics must be real or use bracket placeholders [X%] or [~$X] — NEVER invent specific numbers
- Target: 4-6 total bullets after expansion (ATS-optimal length per role)
- PLAIN TEXT only — no bullet symbols (•, ●, ■), no Markdown formatting`,
    add_metrics: `${roleContext}Add quantifiable metrics and impact data to strengthen this content's ATS score.

METRIC TYPES BY DOMAIN — choose what fits this role's industry and seniority:
- Engineering / Tech: response time (ms), uptime (%), code coverage (%), deploy frequency, team size (N engineers), services or components built (N)
- Sales / Business Development: revenue generated ($), quota attainment (%), pipeline value ($), accounts managed (N), close rate (%)
- Operations / Logistics: cost reduction ($), processing time saved (hours/days), error rate reduction (%), monthly volume (N units)
- Marketing / Growth: campaign reach (N impressions), conversion rate (%), leads generated (N), engagement rate (%), ROI (%)
- Management / Leadership: direct reports (N), budget managed ($), project delivery on-time rate (%), team performance uplift (%)

RULES:
- If a real metric already exists, strengthen its framing but preserve the exact number
- If no real metric exists, insert a bracket placeholder [X%], [~$X], or [N team members] — NEVER invent a specific number
- After adding the metric, ensure the bullet follows XYZ format: "Action verb + what + [metric] result"
- Aim for at least 1 metric per bullet — bullets with no metric or placeholder are ATS dead weight
- PLAIN TEXT — no bullet symbols or Markdown`,
    generate_bullets: `${roleContext}Convert this description into 4-6 powerful, ATS-optimized bullet points.

REQUIRED FORMAT — every single bullet must follow this pattern:
ACTION VERB + WHAT YOU DID + MEASURABLE RESULT
Example: "Reduced API response latency by [X%] by refactoring database queries across [N] microservices"
Example: "Led cross-functional team of [N] engineers to deliver [product], completing [X] weeks ahead of schedule"
Example: "Increased customer retention from [X%] to [Y%] by redesigning the onboarding workflow"

STRICT RULES:
1. BANNED OPENERS — NEVER use: "Responsible for", "Helped with", "Worked on", "Assisted in", "Was involved in", "Participated in", "Tasked with", "Duties included"
2. VARIED VERBS — no two bullets may start with the same verb. Use verbs from this list: ${ACTION_VERBS.join(', ')}
3. METRICS REQUIRED — every bullet must contain a metric or bracket placeholder [X%] / [~$X] / [N units] — no metric-free bullets
4. KEYWORD ECHO — include at least 1 keyword from the candidate's skills list per bullet where natural
5. COUNT — 4-6 bullets total (3 minimum; ATS systems penalize roles with fewer than 3 bullets)
6. PLAIN TEXT — no bullet symbols (•, ●, ■), no Markdown bold or italic`,
    generate_with_answers: `${projectContext}Generate a compelling project description using the user's answers to clarifying questions below.

USER ANSWERS:
${fixInstruction || '(none)'}

Instructions:
- Write a clear, professional description (3-5 sentences) for the project "${(typeof currentContent === 'object' && currentContent !== null && !Array.isArray(currentContent) ? (currentContent as Record<string, unknown>).name : '') || 'this project'}".
- Incorporate the user's answers naturally — don't just repeat them verbatim.
- Highlight technical approach, contributions, and measurable outcomes.
- Start with a strong summary sentence, then add specific details.
- Use power verbs and include metrics where possible.`,
    suggest_technologies: `${projectContext}Based on the project name, role, and description provided, suggest a list of relevant technologies, frameworks, and tools that would typically be used for this type of project.

Return "improved" as a JSON array of strings (technology names only). Example: ["React", "Node.js", "PostgreSQL", "Docker", "AWS"].
Suggest 5-10 relevant technologies. Consider the project context carefully and only suggest technologies that make sense for this specific project.`,
    fix_error: `Apply the following fix to the content: "${fixInstruction}". Keep the rest of the content consistent, but ensure the specific issue is resolved. Do not invent false information, but you may rephrase or restructure as needed to apply the fix effectively.`,
    custom: `${fixInstruction || String(currentContent)}. Respond with valid JSON only.`
  };

  const schemaInstructions = action === 'suggest_technologies'
    ? `Return "improved" as a flat JSON array of strings ONLY. Example: ["React", "TypeScript", "Docker"]. Do NOT return objects.`
    : getSchemaInstructions(section, currentContent);

  // Inject the universal ATS compliance preamble into every content-producing action.
  // Skipped for utility actions where bullet rules don't apply.
  const PREAMBLE_SKIP_ACTIONS = new Set(['fix_error', 'custom', 'suggest_technologies']);
  const actionPreamble = PREAMBLE_SKIP_ACTIONS.has(action) ? '' : ATS_BULLET_PREAMBLE;

  return baseContext + '\n\nTask: ' + actionPreamble + (actionPrompts[action] || actionPrompts.improve) + `

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

  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  try {
    // Authentication via shared middleware (decodes JWT without signature check)
    let userId: string;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
    } catch (authErr) {
      return authErrorResponse(authErr, req.headers.get('origin'));
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

    // Server-side AI Credits check (Scenario 2.2 Rejection)
    const creditCheck = await checkUserCreditBalance(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'payment_required', message: 'AI credits exhausted. Please add credits to your account or use your own API key.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const isByok = creditCheck.remaining === 9999;

    const body = await req.json() as EnhanceRequest & { content?: string; instruction?: string; variants?: boolean };
    const section = body.section;
    const action = body.action || (section === 'custom' ? 'custom' : undefined);
    const currentContent = body.currentContent ?? body.content;
    const context = body.context;
    const variantsMode = body.variants === true;
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

    // Check if we should ask clarifying questions for projects
    if (shouldAskQuestions(section, action, currentContent)) {
      console.log('Returning clarifying questions for project');
      return new Response(JSON.stringify({
        type: 'questions',
        questions: [
          'What problem does this project solve?',
          'What technologies or frameworks did you use?',
          'What was the scale or impact of the project?',
          'What was your specific role and contribution?',
        ],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = buildPrompt(section, action, currentContent, context, fixInstruction);

    // === VARIANTS MODE: return 3 parallel rewrites (concise / balanced / expanded) ===
    const VARIANT_COMPATIBLE_ACTIONS = ['improve', 'add_metrics', 'generate_bullets', 'expand', 'shorten', 'generate'];
    if (variantsMode && VARIANT_COMPATIBLE_ACTIONS.includes(action)) {
      const temperature = 0.8;
      const styleSuffixes = [
        '\n\nSTYLE DIRECTIVE: Produce a CONCISE version — 20-30% shorter than the original. Cut filler, merge related points, keep only the highest-impact content.',
        '',
        '\n\nSTYLE DIRECTIVE: Produce an EXPANDED version — 20-30% richer than the original. Add specific metrics, context, examples, and outcomes.',
      ];
      const styleLabels = ['Concise', 'Balanced', 'Expanded'];

      console.log(`Variants mode: running 3 parallel enhance calls for ${section}/${action}`);

      const variantResponses = await Promise.allSettled(
        styleSuffixes.map(suffix =>
          callAIWithRetry({
            model: 'google/gemini-3-flash-preview',
            messages: [{ role: 'user', content: prompt + suffix }],
            temperature,
            userId,
          })
        )
      );

      const variants: Array<{ improved: unknown; label: string }> = [];
      let representativeChanges: string[] = [];
      let representativeSuggestions: string[] = [];
      let providerUsed = 'unknown';

      for (let i = 0; i < variantResponses.length; i++) {
        const result = variantResponses[i];
        if (result.status === 'fulfilled' && result.value.content) {
          const parsed = parseAIJSON(result.value.content) as Record<string, unknown> | null;
          if (parsed && parsed.improved !== undefined) {
            variants.push({ improved: parsed.improved, label: styleLabels[i] });
            if (i === 1 && Array.isArray(parsed.changes)) {
              representativeChanges = parsed.changes as string[];
              representativeSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions as string[] : [];
            }
            providerUsed = result.value.providerUsed || 'unknown';
          }
        }
      }

      // All 3 variants must succeed — partial results are not acceptable for the pick-one UX
      if (variants.length < 3) {
        console.error(`Variants mode: only ${variants.length}/3 variants succeeded`);
        return new Response(JSON.stringify({ error: 'enhancement_failed', message: 'Could not generate all 3 variants. Please try again.' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await recordUsage(userId, 'enhance', { section, action, provider: providerUsed, variantsCount: variants.length });

      // Atomically deduct credits server-side before returning results (cost=1 for enhance)
      await deductCredits(userId, 1, isByok, getServiceClient());

      return new Response(JSON.stringify({
        variants,
        changes: representativeChanges,
        suggestions: representativeSuggestions,
        _providerUsed: providerUsed,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call AI using the shared client
    const temperature = action === 'ats_improve' ? 0.3 : 0.7;
    const aiResponse = await callAIWithRetry({
      model: 'google/gemini-3-flash-preview',
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

    // Record usage for rate limiting — include which provider handled the request
    await recordUsage(userId, 'enhance', { section, action, provider: aiResponse.providerUsed || 'unknown' });

    // Atomically deduct credits server-side before returning results (cost=1 for enhance)
    await deductCredits(userId, 1, isByok, getServiceClient());

    const responseBody: Record<string, unknown> = { ...(enhancedContent as Record<string, unknown>) };
    responseBody._providerUsed = aiResponse.providerUsed || 'unknown';
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
