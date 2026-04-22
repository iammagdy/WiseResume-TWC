/**
 * One realistic scenario per AI tool — used by the runner to verify the smart
 * model router picks a provider that actually returns valid output for the
 * tool's real-world input shape.
 *
 * Each scenario has:
 *   • tool        — matches the key in `modelRouter.ts` ROUTES
 *   • system/user — prompts roughly mirroring what the edge function sends
 *   • maxTokens   — generous upper bound
 *   • jsonMode    — request structured JSON when the tool needs it
 *   • validate    — checks the response shape; returns { ok, reason? }
 */

export interface Scenario {
  tool: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  jsonMode?: boolean;
  /** Returns { ok: true } if output passes the shape check for this tool. */
  validate: (content: string) => { ok: boolean; reason?: string };
}

// ── shared validators ─────────────────────────────────────────────────────────

function notEmpty(content: string): { ok: boolean; reason?: string } {
  const trimmed = content.trim();
  if (trimmed.length < 20) return { ok: false, reason: `too short (${trimmed.length} chars)` };
  if (/<think>|<\/think>/i.test(trimmed)) return { ok: false, reason: 'leaked <think> tokens' };
  return { ok: true };
}

function jsonShape(keys: string[]) {
  return (content: string): { ok: boolean; reason?: string } => {
    if (/<think>|<\/think>/i.test(content)) return { ok: false, reason: 'leaked <think> tokens' };
    const cleaned = content.replace(/```json|```/g, '').trim();
    let parsed: any;
    try { parsed = JSON.parse(cleaned); } catch (e) {
      return { ok: false, reason: `invalid JSON: ${String(e).slice(0, 80)}` };
    }
    for (const k of keys) {
      if (!(k in parsed)) return { ok: false, reason: `missing key "${k}"` };
    }
    return { ok: true };
  };
}

// ── 13 Gemma 4 / openrouter scenarios (writing, chat, friendly tone) ─────────

const GEMMA: Scenario[] = [
  {
    tool: 'enhance-section',
    systemPrompt: 'You are a resume writing expert. Rewrite the bullet to be impact-driven, quantified, and ATS-friendly. Reply with only the rewritten bullet, no preamble.',
    userPrompt: 'Section: experience. Bullet: "Helped the team with sales reports."',
    maxTokens: 200,
    validate: notEmpty,
  },
  {
    tool: 'tailor-section',
    systemPrompt: 'You are a resume tailoring expert. Rewrite the section so it aligns with the target job. Reply with only the rewritten section text.',
    userPrompt: 'Target role: Senior Backend Engineer (Go, Kafka). Section: "Built REST APIs in Node.js for an e-commerce site."',
    maxTokens: 250,
    validate: notEmpty,
  },
  {
    tool: 'tailor-resume',
    systemPrompt: 'You are a resume tailoring expert. Return a short tailored summary (2 sentences) for the resume against the target JD.',
    userPrompt: 'Resume: 6y full-stack engineer (React, Node, AWS). JD: Staff Frontend Engineer focused on design systems and accessibility.',
    maxTokens: 250,
    validate: notEmpty,
  },
  {
    tool: 'generate-cover-letter',
    systemPrompt: 'Write a 3-paragraph cover letter. Friendly, specific, no clichés. Reply with only the letter body.',
    userPrompt: 'Candidate: Maya, 4y product designer. Company: Linear. Role: Senior Designer. Why interested: loves their craft and motion work.',
    maxTokens: 600,
    validate: notEmpty,
  },
  {
    tool: 'optimize-for-linkedin',
    systemPrompt: 'Rewrite the LinkedIn About section to be 3 short paragraphs, first-person, with one CTA at the end. Reply with only the rewritten text.',
    userPrompt: 'Current About: "Software engineer with experience in many technologies. Passionate about coding."',
    maxTokens: 400,
    validate: notEmpty,
  },
  {
    tool: 'generate-portfolio-bio',
    systemPrompt: 'Write a 4-sentence portfolio bio in first person. Warm, confident, specific. Reply with only the bio.',
    userPrompt: 'Name: Diego Alvarez. Role: Brand designer. Years: 7. Notable: rebranded a fintech that hit Series B.',
    maxTokens: 300,
    validate: notEmpty,
  },
  {
    tool: 'generate-resignation-letter',
    systemPrompt: 'Write a brief, gracious resignation letter. Reply with only the letter body, no headers.',
    userPrompt: 'Employee: Priya Shah. Manager: Tom. Last day: in 2 weeks. Tone: warm, no negative reasons.',
    maxTokens: 400,
    validate: notEmpty,
  },
  {
    tool: 'explain-gap',
    systemPrompt: 'Write a 2-3 sentence honest, confident explanation of the resume gap, suitable for a cover letter or interview.',
    userPrompt: 'Gap: 2023-2024 (14 months). Reason: caregiving for ill parent; took online courses in product analytics during the gap.',
    maxTokens: 250,
    validate: notEmpty,
  },
  {
    tool: 'interview-chat',
    systemPrompt: 'You are an interview coach. Reply conversationally with one tight paragraph plus one follow-up question.',
    userPrompt: 'I just got asked "Tell me about a time you failed." How should I structure my answer?',
    maxTokens: 350,
    validate: notEmpty,
  },
  {
    tool: 'agentic-chat',
    systemPrompt: 'You are an autonomous resume assistant. Acknowledge the request in one sentence and propose 2 concrete next steps as a numbered list.',
    userPrompt: 'I want to apply to 5 SaaS PM roles this week. My resume is currently generic. Help.',
    maxTokens: 350,
    validate: notEmpty,
  },
  {
    tool: 'wise-ai-chat',
    systemPrompt: 'You are WiseAI, a friendly career assistant. Reply in 2 short paragraphs.',
    userPrompt: 'I have 3 years as a junior data analyst. How do I move toward a senior data scientist role?',
    maxTokens: 350,
    validate: notEmpty,
  },
  {
    tool: 'ask-portfolio',
    systemPrompt: 'Answer the question about the portfolio in 2-3 sentences, friendly tone, first person on behalf of the portfolio owner.',
    userPrompt: 'Portfolio owner: Sam (UX researcher, 5y). Question from a recruiter: "What kind of research do you specialise in?"',
    maxTokens: 250,
    validate: notEmpty,
  },
  {
    tool: 'suggest-template',
    systemPrompt: 'Recommend ONE resume template name from: ["modern-minimal","classic-serif","two-column-tech","creative-portfolio","executive-bold"]. Reply with strict JSON: {"template":"<name>","reason":"<one sentence>"}',
    userPrompt: 'Candidate: senior software engineer applying to FAANG. Wants ATS-friendly, single column.',
    maxTokens: 150,
    jsonMode: true,
    validate: jsonShape(['template', 'reason']),
  },
];

// ── 9 GPT-OSS-120B / openrouter2 scenarios (HR reasoning, premium) ───────────

const ELEPHANT: Scenario[] = [
  {
    tool: 'wisehire-write-jd',
    systemPrompt: 'You are a recruiting expert. Write a job description with sections: Summary, Responsibilities (5 bullets), Requirements (5 bullets). Reply with markdown only.',
    userPrompt: 'Role: Senior Site Reliability Engineer at a fintech (200 people). Stack: AWS, Terraform, Kubernetes. Remote EU. Salary band 90-120k EUR.',
    maxTokens: 800,
    validate: notEmpty,
  },
  {
    tool: 'wisehire-generate-brief',
    systemPrompt: 'Write a 1-paragraph candidate brief for the hiring manager. Cover: fit, strengths, concerns, recommendation. Reply with prose only.',
    userPrompt: 'Candidate: Aisha, 8y backend engineer at two scale-ups (Stripe-like and Notion-like). Strong in Go, weak in mobile. Role: Backend Tech Lead at a payments startup.',
    maxTokens: 400,
    validate: notEmpty,
  },
  {
    tool: 'wisehire-bulk-screen',
    systemPrompt: 'Screen the candidate against the JD. Reply with strict JSON: {"verdict":"shortlist|maybe|reject","score":0-100,"reasons":[3 strings]}.',
    userPrompt: 'JD: Senior React Engineer, requires 5y React, TypeScript, design-systems experience. Candidate: 6y frontend (3y React, 3y Angular), TypeScript daily, built Storybook design system at last role.',
    maxTokens: 350,
    jsonMode: true,
    validate: jsonShape(['verdict', 'score', 'reasons']),
  },
  {
    tool: 'wisehire-mask-cvs',
    systemPrompt: 'Redact PII from the CV snippet. Replace name, email, phone, address with [REDACTED]. Preserve everything else. Reply with only the masked text.',
    userPrompt: 'CV: "John Mitchell — john.m@gmail.com — +44 7700 900123 — 12 Oak Lane, London. 7 years backend engineer at Vodafone and BT, now seeking lead role."',
    maxTokens: 400,
    validate: (c) => {
      const v = notEmpty(c); if (!v.ok) return v;
      if (/john\.m@gmail\.com/i.test(c)) return { ok: false, reason: 'email not redacted' };
      if (/7700 900123/.test(c)) return { ok: false, reason: 'phone not redacted' };
      return { ok: true };
    },
  },
  {
    tool: 'company-briefing',
    systemPrompt: 'Write a 3-paragraph company briefing for a candidate preparing for an interview. Cover: what they do, recent news angle, what to ask.',
    userPrompt: 'Company: Anthropic. Role candidate is interviewing for: Research Engineer.',
    maxTokens: 600,
    validate: notEmpty,
  },
  {
    tool: 'recruiter-simulation',
    systemPrompt: 'You are simulating a senior tech recruiter conducting a screening call. Ask one open-ended question and explain in one sentence why you are asking it.',
    userPrompt: 'Candidate background: 4 years iOS engineer, just left a unicorn startup, looking at Series A roles.',
    maxTokens: 300,
    validate: notEmpty,
  },
  {
    tool: 'career-path-advisor',
    systemPrompt: 'Recommend a 12-month career path. Reply with strict JSON: {"goal":"<string>","milestones":[3 strings],"risks":[2 strings]}.',
    userPrompt: 'Person: Dev (3y data analyst, knows SQL & Python, wants to become an ML engineer). Constraints: keep current job, 5h/week study time.',
    maxTokens: 400,
    jsonMode: true,
    validate: jsonShape(['goal', 'milestones', 'risks']),
  },
  {
    tool: 'career-assessment',
    systemPrompt: 'Score the person on 4 dimensions (technical_depth, communication, leadership, market_fit), each 1-10, with one-line justification. Reply with strict JSON.',
    userPrompt: 'Person: Sara, 9y product manager, shipped 4 zero-to-one products, presents at industry conferences, mentored 6 PMs. Targeting Director of Product roles.',
    maxTokens: 500,
    jsonMode: true,
    validate: jsonShape(['technical_depth', 'communication', 'leadership', 'market_fit']),
  },
  {
    tool: 'analyze-resume',
    systemPrompt: 'Analyze the resume and return strict JSON: {"overall_score":0-100,"strengths":[3 strings],"gaps":[3 strings],"top_action":"<one sentence>"}.',
    userPrompt: 'Resume: "Mark Lee. 5y software engineer at Shopify. Built checkout flows in Ruby/Rails serving 10M+ requests/day. Mentored 3 juniors. BSc Computer Science, University of Toronto."',
    maxTokens: 500,
    jsonMode: true,
    validate: jsonShape(['overall_score', 'strengths', 'gaps', 'top_action']),
  },
];

// ── 8 Llama-3.3-70B / Groq scenarios (fast structured extraction) ────────────

const QWEN: Scenario[] = [
  {
    tool: 'parse-job-url',
    systemPrompt: 'Extract job posting fields from the text. Reply with strict JSON: {"title":"","company":"","location":"","employment_type":"","seniority":""}.',
    userPrompt: 'JOIN US — Staff Backend Engineer (Remote, Europe) — Linear is hiring a Staff Backend Engineer to lead our sync infrastructure. Full-time.',
    maxTokens: 250,
    jsonMode: true,
    validate: jsonShape(['title', 'company', 'location', 'employment_type', 'seniority']),
  },
  {
    tool: 'parse-job-text',
    systemPrompt: 'Extract structured fields from the JD. Reply with strict JSON: {"title":"","required_skills":[strings],"nice_to_have":[strings],"years_experience":"<string>"}.',
    userPrompt: 'Senior Data Engineer. Required: 5+ years with Spark, Airflow, AWS. Nice to have: dbt, Snowflake, Terraform.',
    maxTokens: 300,
    jsonMode: true,
    validate: jsonShape(['title', 'required_skills', 'nice_to_have', 'years_experience']),
  },
  {
    tool: 'parse-resume',
    systemPrompt: 'Parse the resume into strict JSON: {"name":"","email":"","experience":[{"company":"","role":"","years":""}],"skills":[strings]}.',
    userPrompt: 'CV: Elena Romano — elena@romano.it. Experience: Senior Designer at Figma (2021-2024), Designer at Adobe (2018-2021). Skills: Figma, motion, design systems, prototyping.',
    maxTokens: 400,
    jsonMode: true,
    validate: jsonShape(['name', 'email', 'experience', 'skills']),
  },
  {
    tool: 'parse-linkedin',
    systemPrompt: 'Extract LinkedIn profile fields. Reply with strict JSON: {"headline":"","current_role":"","current_company":"","top_skills":[3 strings]}.',
    userPrompt: 'LinkedIn: "Rohan Patel | Engineering Manager at Datadog | 10+ years scaling observability platforms | Skills: Go, Kubernetes, distributed systems, leadership, hiring."',
    maxTokens: 250,
    jsonMode: true,
    validate: jsonShape(['headline', 'current_role', 'current_company', 'top_skills']),
  },
  {
    tool: 'detect-and-humanize',
    systemPrompt: 'Detect AI-generated text and rewrite it more naturally. Reply with strict JSON: {"ai_likelihood":0-100,"humanized":"<rewritten text>"}.',
    userPrompt: 'Text: "In conclusion, leveraging synergistic methodologies enables paradigm shifts that empower stakeholders to maximize ROI."',
    maxTokens: 300,
    jsonMode: true,
    validate: jsonShape(['ai_likelihood', 'humanized']),
  },
  {
    tool: 'one-page-optimizer',
    systemPrompt: 'Suggest cuts to fit the resume on one page. Reply with strict JSON: {"cuts":[{"section":"","reason":""}],"estimated_lines_saved":<number>}.',
    userPrompt: 'Resume currently 2 pages. Sections: Summary (5 lines), Experience (4 jobs spanning 12 years), Education (3 entries inc. high school), Hobbies (5 lines), References (3 listed).',
    maxTokens: 400,
    jsonMode: true,
    validate: jsonShape(['cuts', 'estimated_lines_saved']),
  },
  {
    tool: 'fill-gap',
    systemPrompt: 'Suggest projects/courses to fill the skill gap. Reply with strict JSON: {"missing_skills":[strings],"suggestions":[{"type":"course|project","title":"","duration":""}]}.',
    userPrompt: 'Candidate has: HTML, CSS, basic JS. Target role: Frontend Developer (React, TypeScript, testing).',
    maxTokens: 400,
    jsonMode: true,
    validate: jsonShape(['missing_skills', 'suggestions']),
  },
  {
    tool: 'generate-question-bank',
    systemPrompt: 'Generate interview questions. Reply with strict JSON: {"behavioral":[3 strings],"technical":[3 strings],"role_specific":[3 strings]}.',
    userPrompt: 'Role: Senior DevOps Engineer (AWS, Terraform, Kubernetes). Seniority: Senior. Company stage: Series B SaaS.',
    maxTokens: 600,
    jsonMode: true,
    validate: jsonShape(['behavioral', 'technical', 'role_specific']),
  },
];

export const ALL_SCENARIOS: Scenario[] = [...GEMMA, ...ELEPHANT, ...QWEN];
