import { callAI, parseAIJSON } from '../_shared/aiClient.ts';
import { checkRateLimit, recordUsage } from '../_shared/rateLimiter.ts';
import { checkUserRateLimit } from '../_shared/userRateLimiter.ts';
import { checkAndDeductCredit, refundCredit } from '../_shared/creditUtils.ts';
import { logger } from '../_shared/logger.ts';

const log = logger('editor-ai');

interface ResumeData {
  contactInfo: { fullName: string; email: string; phone: string; location: string; linkedin?: string; portfolio?: string; };
  summary: string;
  experience: { id: string; company: string; position: string; startDate: string; endDate: string; current: boolean; description: string; achievements: string[]; }[];
  education: { id: string; institution: string; degree: string; field: string; startDate: string; endDate: string; gpa?: string; }[];
  skills: (string | { name?: string })[];
  certifications?: { id: string; name: string; issuer: string; date: string; }[];
}

type RecruiterPersona = 'fortune500' | 'startup' | 'tech' | 'agency';

const PERSONA_PROMPTS: Record<RecruiterPersona, { name: string; style: string; priorities: string }> = {
  fortune500: {
    name: 'Sarah Chen - Fortune 500 HR Director',
    style: 'You are a seasoned HR director at a Fortune 500 company with 18 years of experience. You value structure, progression, brand-name companies, and quantifiable achievements. You are skeptical of job hoppers and gaps. You speak professionally but can be blunt about deal-breakers.',
    priorities: 'Focus on: career progression, company prestige, leadership experience, measurable impact, educational credentials, stability, and cultural fit for corporate environments.',
  },
  startup: {
    name: 'Marcus Rivera - Startup Founder & CEO',
    style: 'You are a 3x startup founder who has raised $50M+ and hired 200+ people. You value scrappiness, wearing multiple hats, ownership mentality, and results over credentials. You are allergic to corporate jargon and look for builders. You are direct and sometimes irreverent.',
    priorities: 'Focus on: impact and outcomes, versatility, side projects, entrepreneurial spirit, ability to thrive in chaos, speed of execution, and genuine passion.',
  },
  tech: {
    name: 'Priya Sharma - Senior Tech Recruiter at FAANG',
    style: 'You are a technical recruiter at a top tech company with 12 years specializing in engineering and product roles. You understand technical depth, system design, and what separates good engineers from great ones. You look for signals of technical excellence and growth mindset.',
    priorities: 'Focus on: technical skills depth, system scale, open source contributions, technical leadership, problem-solving signals, continuous learning, and impact on product/engineering.',
  },
  agency: {
    name: "James O'Connor - Executive Headhunter",
    style: 'You are a high-powered executive recruiter who places C-suite and VP-level candidates. You have placed 500+ executives and know what boards and investors look for. You are polished but brutally honest about marketability. You think in terms of "the story" a resume tells.',
    priorities: 'Focus on: executive presence, P&L ownership, board-level communication, strategic impact, revenue/growth metrics, industry reputation, and the narrative arc of their career.',
  },
};

function safeSkillsString(skills: unknown): string {
  if (!Array.isArray(skills)) return 'None listed';
  return skills.map(s => typeof s === 'string' ? s : (s as any)?.name || String(s)).join(', ') || 'None listed';
}

function formatResumeForAnalysis(resume: ResumeData): string {
  const sections: string[] = [];
  sections.push(`CONTACT INFORMATION:
Name: ${resume.contactInfo.fullName || 'Not provided'}
Email: ${resume.contactInfo.email || 'Not provided'}
Phone: ${resume.contactInfo.phone || 'Not provided'}
Location: ${resume.contactInfo.location || 'Not provided'}
LinkedIn: ${resume.contactInfo.linkedin || 'Not provided'}
Portfolio: ${resume.contactInfo.portfolio || 'Not provided'}`);

  if (resume.summary) {
    sections.push(`\nPROFESSIONAL SUMMARY:\n${resume.summary}`);
  } else {
    sections.push('\nPROFESSIONAL SUMMARY: Not provided');
  }

  if (resume.experience?.length > 0) {
    sections.push('\nWORK EXPERIENCE:');
    resume.experience.forEach((exp, i) => {
      const dateRange = exp.current ? `${exp.startDate} - Present` : `${exp.startDate} - ${exp.endDate}`;
      sections.push(`\n${i + 1}. ${exp.position} at ${exp.company}\n   ${dateRange}\n   ${exp.description || ''}\n   ${exp.achievements?.length ? 'Achievements: ' + exp.achievements.join('; ') : ''}`);
    });
  } else {
    sections.push('\nWORK EXPERIENCE: None listed');
  }

  if (resume.education?.length > 0) {
    sections.push('\nEDUCATION:');
    resume.education.forEach((edu, i) => {
      sections.push(`\n${i + 1}. ${edu.degree} in ${edu.field} - ${edu.institution}\n   ${edu.startDate} - ${edu.endDate}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`);
    });
  } else {
    sections.push('\nEDUCATION: None listed');
  }

  sections.push(`\nSKILLS:\n${safeSkillsString(resume.skills)}`);

  if (resume.certifications && resume.certifications.length > 0) {
    sections.push('\nCERTIFICATIONS:');
    resume.certifications.forEach((cert, i) => {
      sections.push(`${i + 1}. ${cert.name} - ${cert.issuer} (${cert.date})`);
    });
  }

  return sections.join('\n');
}

export async function handleRecruiterSim(
  req: Request,
  userId: string,
  bodyText: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const _fnStart = Date.now();

  const rateCheck = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'recruiter_sim' });
  if (!rateCheck.allowed) {
    log.warn('rate limit exceeded', { function_name: 'editor-ai', provider_used: null, error_type: 'RateLimitError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const serverRateCheck = await checkUserRateLimit(userId, 'recruiter_sim', 10, 60);
  if (!serverRateCheck.allowed) {
    log.warn('server rate limit exceeded', { function_name: 'editor-ai', provider_used: null, error_type: 'RateLimitError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let parsed: { resume?: ResumeData; persona?: RecruiterPersona; targetRole?: string; targetIndustry?: string };
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { resume, persona, targetRole, targetIndustry } = parsed;

  if (!resume || !persona) {
    return new Response(
      JSON.stringify({ error: 'Resume and persona are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const personaConfig = PERSONA_PROMPTS[persona];
  if (!personaConfig) {
    return new Response(
      JSON.stringify({ error: 'Invalid persona' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const resumeText = formatResumeForAnalysis(resume);
  const targetContext = targetRole
    ? `The candidate is targeting: ${targetRole}${targetIndustry ? ` in ${targetIndustry}` : ''}.`
    : 'Evaluate for general employability.';

  const systemPrompt = `You are ${personaConfig.name}.

${personaConfig.style}

${personaConfig.priorities}

You are reviewing a resume and will provide brutally honest feedback - the kind of thoughts that go through a recruiter's mind but are rarely said out loud. Be specific, cite examples from the resume, and don't sugarcoat issues.

Your response must be valid JSON with this exact structure:
{
  "hireabilityScore": <number 1-100>,
  "scoreExplanation": "<brief explanation of the score>",
  "firstImpression": "<your gut reaction in 1-2 sentences>",
  "redFlags": [
    {
      "issue": "<the problem>",
      "severity": "<high|medium|low>",
      "quote": "<relevant text from resume or 'N/A'>",
      "fix": "<specific actionable fix>",
      "fixType": "<summary|experience|skills|education|contact>"
    }
  ],
  "questionsIdAsk": [
    {
      "question": "<what you'd ask in an interview>",
      "concern": "<what's driving this question>",
      "idealAnswer": "<what a good answer would address>"
    }
  ],
  "callMeFactors": [
    {
      "strength": "<what stands out positively>",
      "impact": "<why this matters for hiring>"
    }
  ],
  "overallVerdict": "<would_call|maybe_call|pass>",
  "verdictReasoning": "<2-3 sentences on your decision>",
  "topPriorityFix": "<the single most impactful thing to fix>"
}

Provide 3-5 items for redFlags, 2-4 for questionsIdAsk, and 2-4 for callMeFactors.`;

  const userPrompt = `${targetContext}

Here is the resume to review:

${resumeText}

Analyze this resume from your unique perspective as ${personaConfig.name}. Be specific and reference actual content from the resume.`;

  const creditCheck = await checkAndDeductCredit(userId);
  if (!creditCheck.hasCredits) {
    log.warn('credit exhausted', { function_name: 'editor-ai', provider_used: null, error_type: 'CreditError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let aiResponse;
  try {
    aiResponse = await callAI({
      featureName: 'editor-ai',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 3000,
      userId,
    });
  } catch (aiErr) {
    await refundCredit(userId, creditCheck, 1);
    throw aiErr;
  }

  const analysis = parseAIJSON(aiResponse.content || '{}');

  if (!analysis) {
    await refundCredit(userId, creditCheck, 1);
    return new Response(
      JSON.stringify({ error: 'Failed to parse AI response' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await recordUsage(userId, 'recruiter_sim', { provider: aiResponse.providerUsed || 'unknown' });
  log.info('recruiter-sim completed', { function_name: 'editor-ai', provider_used: aiResponse.providerUsed || 'unknown', error_type: null, duration_ms: Date.now() - _fnStart });

  return new Response(
    JSON.stringify({
      success: true,
      persona: { id: persona, name: personaConfig.name },
      analysis,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
