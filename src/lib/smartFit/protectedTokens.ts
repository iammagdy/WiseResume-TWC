import type { ResumeData } from '@/types/resume';
import type { ProtectedToken } from './types';

const ACRONYM_ALLOWLIST = new Set([
  'AWS', 'GCP', 'AZURE', 'API', 'SDK', 'CLI', 'CI', 'CD', 'CI/CD', 'SQL',
  'NoSQL', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS', 'UI', 'UX', 'B2B',
  'B2C', 'SaaS', 'PaaS', 'IaaS', 'KPI', 'OKR', 'ROI', 'CRM', 'ERP', 'CMS',
  'AI', 'ML', 'NLP', 'LLM', 'GPT', 'IoT', 'AR', 'VR', 'XR', 'PWA', 'SEO',
  'SEM', 'PPC', 'CTR', 'CPM', 'CPC', 'IDE', 'OS', 'VM', 'TLS', 'SSL', 'JWT',
  'OAuth', 'SSO', 'MFA', 'PII', 'GDPR', 'HIPAA', 'PCI', 'SOC', 'ISO', 'WCAG',
  'PMP', 'PMI', 'CFA', 'CPA', 'MBA', 'PhD', 'MSc', 'BSc', 'BA', 'MA',
  'NYSE', 'NASDAQ', 'IPO', 'QA', 'QE', 'SRE', 'DevOps',
]);

const TECH_ALLOWLIST = [
  'React', 'Vue', 'Svelte', 'Angular', 'Next.js', 'Nuxt', 'Remix', 'Astro',
  'Node.js', 'Deno', 'Bun', 'Express', 'Fastify', 'NestJS', 'Django', 'Flask',
  'FastAPI', 'Rails', 'Laravel', 'Spring', 'Symfony', '.NET', 'Kotlin',
  'Swift', 'Objective-C', 'Go', 'Golang', 'Rust', 'Python', 'TypeScript',
  'JavaScript', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Scala', 'Elixir',
  'Postgres', 'PostgreSQL', 'MySQL', 'MariaDB', 'SQLite', 'MongoDB', 'Redis',
  'Cassandra', 'DynamoDB', 'Snowflake', 'BigQuery', 'Databricks', 'Spark',
  'Kafka', 'RabbitMQ', 'Docker', 'Kubernetes', 'Terraform', 'Ansible',
  'Jenkins', 'CircleCI', 'GitHub', 'GitLab', 'Bitbucket', 'Figma', 'Sketch',
  'Adobe', 'Photoshop', 'Illustrator', 'Tableau', 'Looker', 'PowerBI',
  'Salesforce', 'HubSpot', 'Stripe', 'Shopify', 'Magento', 'WordPress',
  'Webflow', 'Notion', 'Linear', 'Jira', 'Asana', 'Slack', 'Zoom', 'Teams',
  'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'Pandas', 'NumPy',
  'OpenAI', 'Anthropic', 'Gemini', 'Llama', 'Claude',
];

const FILLER_WORDS = new Set([
  'really', 'very', 'actually', 'basically', 'literally', 'just', 'quite',
  'rather', 'somewhat', 'kind', 'sort', 'a', 'the', 'that', 'which',
  'simply', 'definitely', 'certainly', 'truly', 'totally', 'utterly',
]);

export const FILLER_WORD_SET: ReadonlySet<string> = FILLER_WORDS;

const NUMBER_RE = /(?<![\w])\d+(?:[.,]\d+)?(?![\w%$])/g;
const PERCENT_RE = /\d+(?:\.\d+)?%/g;
const CURRENCY_RE = /(?:\$|€|£|¥)\s*\d+(?:[.,]\d+)?[kKmMbB]?/g;
const YEAR_RE = /\b(19|20)\d{2}\b/g;
const MONTH_YEAR_RE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}\b/gi;
const DATE_RANGE_RE = /\b(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|present|current|now)\b/gi;
const ACRONYM_RE = /\b[A-Z][A-Z0-9/]{1,8}\b/g;

function uniqueByText(tokens: ProtectedToken[]): ProtectedToken[] {
  const seen = new Map<string, ProtectedToken>();
  for (const t of tokens) {
    const key = `${t.text.toLowerCase()}|${t.kind}`;
    if (!seen.has(key)) seen.set(key, t);
  }
  return Array.from(seen.values());
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeArray<T>(v: T[] | undefined | null): T[] {
  return Array.isArray(v) ? v : [];
}

/**
 * Extract the set of substrings that AI rewrites must preserve verbatim.
 * Pure function — given the same inputs always returns the same tokens.
 *
 * The set is intentionally generous: it's better to over-protect (and reject
 * a slightly-shortened rewrite) than to silently let the AI invent or alter
 * a number/date/proper noun.
 */
export function extractProtectedTokens(
  resume: ResumeData,
  jobDescription?: string,
): ProtectedToken[] {
  const out: ProtectedToken[] = [];

  // ── Numeric tokens scanned across all free-form text ────────────────────
  const allText = collectAllFreeText(resume);
  for (const m of allText.matchAll(PERCENT_RE)) out.push({ text: m[0], kind: 'percent' });
  for (const m of allText.matchAll(CURRENCY_RE)) out.push({ text: m[0].replace(/\s+/g, ''), kind: 'currency' });
  for (const m of allText.matchAll(DATE_RANGE_RE)) out.push({ text: m[0], kind: 'date-range' });
  for (const m of allText.matchAll(MONTH_YEAR_RE)) out.push({ text: m[0], kind: 'date' });
  for (const m of allText.matchAll(YEAR_RE)) out.push({ text: m[0], kind: 'date' });
  for (const m of allText.matchAll(NUMBER_RE)) {
    // Skip very short numbers that aren't meaningful (e.g. "1", "2") UNLESS
    // they appear with a unit (handled by other regexes already).
    if (m[0].length >= 2) out.push({ text: m[0], kind: 'number' });
  }
  for (const m of allText.matchAll(ACRONYM_RE)) {
    if (ACRONYM_ALLOWLIST.has(m[0]) || m[0].length >= 3) {
      out.push({ text: m[0], kind: 'acronym' });
    }
  }

  // ── Proper nouns from structured fields ────────────────────────────────
  for (const exp of safeArray(resume.experience)) {
    if (exp.company) out.push({ text: exp.company, kind: 'company' });
    if (exp.account) out.push({ text: exp.account, kind: 'company' });
  }
  for (const edu of safeArray(resume.education)) {
    if (edu.institution) out.push({ text: edu.institution, kind: 'school' });
    if (edu.degree) out.push({ text: edu.degree, kind: 'cert' });
  }
  for (const cert of safeArray(resume.certifications)) {
    if (cert.name) out.push({ text: cert.name, kind: 'cert' });
    if (cert.issuer) out.push({ text: cert.issuer, kind: 'company' });
    if (cert.credentialId) out.push({ text: cert.credentialId, kind: 'cert' });
  }
  for (const proj of safeArray(resume.projects)) {
    if (proj.name) out.push({ text: proj.name, kind: 'tech' });
    for (const tech of safeArray(proj.technologies)) {
      if (tech) out.push({ text: tech, kind: 'tech' });
    }
  }
  if (resume.contactInfo?.fullName) {
    out.push({ text: resume.contactInfo.fullName, kind: 'person' });
  }

  // ── Tech allow-list, but only when the term actually appears in resume ──
  for (const tech of TECH_ALLOWLIST) {
    const re = new RegExp(`\\b${escapeRegExp(tech)}\\b`, 'i');
    if (re.test(allText)) out.push({ text: tech, kind: 'tech' });
  }

  // ── Job-description keywords — only multi-letter alpha tokens ──────────
  if (jobDescription && jobDescription.trim()) {
    const jdKeywords = extractJDKeywords(jobDescription);
    for (const kw of jdKeywords) {
      // Only add JD keyword if it actually appears in the resume — the
      // protected-token set is about preserving what's already written,
      // not about adding the JD into the resume.
      const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      if (re.test(allText)) out.push({ text: kw, kind: 'jd-keyword' });
    }
  }

  return uniqueByText(out);
}

function collectAllFreeText(resume: ResumeData): string {
  const parts: string[] = [];
  if (resume.summary) parts.push(resume.summary);
  for (const exp of safeArray(resume.experience)) {
    if (exp.position) parts.push(exp.position);
    if (exp.description) parts.push(exp.description);
    for (const a of safeArray(exp.achievements)) parts.push(a);
    for (const r of safeArray(exp.responsibilities)) parts.push(r);
  }
  for (const edu of safeArray(resume.education)) {
    if (edu.description) parts.push(edu.description);
    if (edu.field) parts.push(edu.field);
  }
  for (const proj of safeArray(resume.projects)) {
    if (proj.description) parts.push(proj.description);
  }
  for (const award of safeArray(resume.awards)) {
    if (award.description) parts.push(award.description);
  }
  return parts.join('\n');
}

/**
 * Generic words a sentence-start capitaliser produces but that aren't
 * actually domain keywords (action verbs, sentence-starters, modal forms).
 * Adding any of these to the protected-token set would force the AI to
 * preserve high-frequency English words and crush rewrite quality.
 */
const JD_STOP_WORDS = new Set([
  // articles / connectors
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'their',
  'will', 'have', 'has', 'had', 'are', 'was', 'were', 'been', 'being', 'but',
  'not', 'all', 'any', 'who', 'why', 'how', 'when', 'where', 'what', 'our',
  'you', 'they', 'them', 'these', 'those', 'such', 'than', 'then', 'about',
  // common action verbs (sentence-starters in JDs / resumes)
  'led', 'leads', 'leading', 'managed', 'managing', 'develop', 'developed', 'developing',
  'built', 'building', 'created', 'creating', 'designed', 'designing',
  'oversaw', 'overseeing', 'drove', 'driving', 'shipped', 'shipping',
  'launched', 'launching', 'delivered', 'delivering', 'owned', 'owning',
  'partner', 'partnered', 'collaborated', 'collaborating',
  'responsible', 'experience', 'experienced', 'skilled',
  'highly', 'strong', 'strongly', 'proven', 'demonstrated',
  // resume verbs
  'increase', 'increased', 'reduce', 'reduced', 'improve', 'improved',
  'enable', 'enabled', 'enhance', 'enhanced', 'support', 'supported',
  'work', 'works', 'worked', 'working', 'use', 'used', 'using',
  'help', 'helped', 'helping',
  // generic JD nouns
  'team', 'teams', 'role', 'company', 'business', 'product', 'project',
  'projects', 'opportunity', 'position', 'candidate', 'requirement',
  'requirements', 'qualification', 'qualifications', 'preferred', 'plus',
  'must', 'should', 'will', 'would',
]);

function extractJDKeywords(jd: string): string[] {
  // Take capitalised multi-word phrases and 4+-letter capitalised tokens —
  // a coarse but deterministic filter. Anything we miss the per-token
  // scanners above will catch as numbers/dates/acronyms.
  const out = new Set<string>();
  const tokens = jd.match(/\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,}){0,2}\b/g) || [];
  for (const t of tokens) {
    if (t.length < 4) continue;
    // Reject if every word in the phrase is a stop-word (the phrase has
    // no informational nouns — it's just a capitalised verb / connector).
    const words = t.split(/\s+/).map(w => w.toLowerCase());
    if (words.every(w => JD_STOP_WORDS.has(w))) continue;
    // Reject if the head of the phrase is a stop-word AND the phrase is a
    // single token — single-word capitalised verbs like "Managed" / "Led".
    if (words.length === 1 && JD_STOP_WORDS.has(words[0])) continue;
    out.add(t);
  }
  return Array.from(out).slice(0, 50);
}

/**
 * Validate that every protected token from `tokens` still appears in
 * `candidate`. Returns the list of missing tokens (empty = pass).
 *
 * Comparison is case-insensitive but exact substring — the AI is forbidden
 * from rephrasing "AWS" to "Amazon Web Services" or "$2M" to "two million".
 */
export function findMissingTokens(
  candidate: string,
  tokens: ProtectedToken[],
): ProtectedToken[] {
  const lower = candidate.toLowerCase();
  return tokens.filter(t => !lower.includes(t.text.toLowerCase()));
}

/**
 * Filter the global protected-token set down to tokens that actually
 * appear in `text`. Used to send the AI a per-sentence preservation list
 * instead of blasting it with the full set.
 */
export function tokensInText(text: string, all: ProtectedToken[]): ProtectedToken[] {
  const lower = text.toLowerCase();
  return all.filter(t => lower.includes(t.text.toLowerCase()));
}
