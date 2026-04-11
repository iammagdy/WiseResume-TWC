import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, isAIError, parseAIJSON, sanitizeInputText, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { checkUserCreditBalance } from "../_shared/creditUtils.ts";
import { getServiceClient } from "../_shared/dbClient.ts";

// ============= SECURITY: Input validation limits =============
const MAX_RESUME_SIZE = 100 * 1024; // 100KB
const MAX_JOB_DESCRIPTION_SIZE = 50 * 1024; // 50KB

/** Safely extract skills as a comma-separated string */
function safeSkillsString(skills: unknown): string {
  if (!Array.isArray(skills)) return 'Not provided';
  return skills.map(s => typeof s === 'string' ? s : (s as any)?.name || String(s)).join(', ') || 'Not provided';
}

// Industry keyword baselines — injected when the job description is short (<150 words)
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  software: ['JavaScript', 'TypeScript', 'React', 'Python', 'SQL', 'Git', 'REST API', 'Docker', 'AWS', 'CI/CD', 'Agile', 'Scrum'],
  data: ['Python', 'SQL', 'Machine Learning', 'Data Analysis', 'Tableau', 'Power BI', 'TensorFlow', 'Pandas', 'ETL', 'BigQuery', 'Statistics'],
  marketing: ['SEO', 'SEM', 'Google Analytics', 'Social Media Marketing', 'Content Strategy', 'CRM', 'A/B Testing', 'Email Marketing', 'HubSpot'],
  sales: ['Salesforce', 'CRM', 'Lead Generation', 'B2B Sales', 'Pipeline Management', 'Account Management', 'Quota Attainment', 'Cold Outreach'],
  finance: ['Financial Modeling', 'Excel', 'GAAP', 'Budgeting', 'Forecasting', 'Risk Management', 'Bloomberg', 'Variance Analysis', 'P&L'],
  hr: ['Recruiting', 'HRIS', 'ATS', 'Onboarding', 'Performance Management', 'Employee Relations', 'Workday', 'Benefits Administration'],
  design: ['Figma', 'Adobe Creative Suite', 'UI/UX Design', 'Prototyping', 'User Research', 'Wireframing', 'Design Systems', 'Accessibility'],
  operations: ['Process Improvement', 'Lean', 'Six Sigma', 'Supply Chain', 'Project Management', 'PMP', 'KPIs', 'Logistics', 'ERP'],
  healthcare: ['EHR', 'HIPAA', 'Patient Care', 'Clinical Documentation', 'EPIC', 'Healthcare Compliance', 'ICD-10', 'Medical Coding'],
  legal: ['Contract Review', 'Legal Research', 'Compliance', 'Due Diligence', 'Regulatory Affairs', 'Litigation Support', 'eDiscovery'],
  education: ['Curriculum Development', 'Lesson Planning', 'Student Assessment', 'LMS', 'Differentiated Instruction', 'IEP'],
  general: ['Leadership', 'Communication', 'Problem Solving', 'Teamwork', 'Project Management', 'Microsoft Office', 'Time Management'],
};

function detectIndustryCategory(resume: any): string {
  const titles = (resume.experience || []).map((e: any) => (e.position || '').toLowerCase()).join(' ');
  const skills = (Array.isArray(resume.skills) ? resume.skills.map((s: any) => typeof s === 'string' ? s.toLowerCase() : '') : []).join(' ');
  const summary = (resume.summary || '').toLowerCase();
  const combined = titles + ' ' + skills + ' ' + summary;

  if (/engineer|developer|software|frontend|backend|full.?stack|devops|programmer|typescript|javascript|node\.?js|react\b|angular|vue/.test(combined)) return 'software';
  if (/data scientist|data analyst|machine learning|ai\b|ml\b|analytics|tableau|power bi|bigquery/.test(combined)) return 'data';
  if (/market|seo|sem|digital marketing|content|brand|social media|demand gen|growth/.test(combined)) return 'marketing';
  if (/sales|account executive|business development|sales manager|quota|revenue/.test(combined)) return 'sales';
  if (/financ|accountant|controller|cfo|invest|audit|tax\b|budget|forecast/.test(combined)) return 'finance';
  if (/human resources|hr \b|recruiting|talent acquisition|people ops|hris/.test(combined)) return 'hr';
  if (/design|ux\b|ui \b|figma|adobe|creative|visual/.test(combined)) return 'design';
  if (/operat|supply chain|logistics|manufactur|lean|six sigma|warehouse/.test(combined)) return 'operations';
  if (/nurse|doctor|physician|clinical|healthcare|medical|patient|ehr/.test(combined)) return 'healthcare';
  if (/legal|attorney|lawyer|compliance|paralegal|litigation/.test(combined)) return 'legal';
  if (/teacher|educator|instructor|curriculum|professor|faculty/.test(combined)) return 'education';
  return 'general';
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, client } = await requireAuth(req);
    console.log('Authenticated user:', userId);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'analyze' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creditCheck = await checkUserCreditBalance(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const isByok = creditCheck.remaining === 9999;

    const body = await req.json();
    const resume = body.resume;
    const rawJobDescription = body.jobDescription;
    
    // ============= SECURITY: Input validation =============
    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required and must be an object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // JD is optional — we use industry baseline keywords when absent or short
    const rawJD = typeof rawJobDescription === 'string' ? rawJobDescription : '';
    const jobDescription = rawJD ? sanitizeInputText(rawJD, 15_000) : '';
    if (rawJD && jobDescription.length < rawJD.length) {
      console.log(`[analyze] Job description truncated from ${rawJD.length} to ${jobDescription.length} chars`);
    }

    if (jobDescription && jobDescription.length > MAX_JOB_DESCRIPTION_SIZE) {
      return new Response(
        JSON.stringify({ error: `Job description is too large. Maximum size is ${MAX_JOB_DESCRIPTION_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inject industry baseline when JD is missing or short (<150 words)
    const jdWordCount = jobDescription.split(/\s+/).filter(Boolean).length;
    const category = detectIndustryCategory(resume);
    const baselineKeywords = INDUSTRY_KEYWORDS[category] || INDUSTRY_KEYWORDS.general;
    let baselineKeywordsNote = '';
    if (jdWordCount < 150) {
      const reason = jdWordCount === 0 ? 'No job description provided.' : `The job description is brief (${jdWordCount} words).`;
      baselineKeywordsNote = `\n\nINDUSTRY BASELINE (${category} sector): ${reason} Evaluate the candidate against these standard ${category} industry keywords when identifying gaps and scoring: ${baselineKeywords.join(', ')}.`;
      console.log(`[analyze] Short/missing JD (${jdWordCount} words), injecting ${category} baseline keywords`);
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

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyzer and resume consultant. Analyze the provided resume against the job description and provide detailed scoring and gap analysis.

IMPORTANT: Respond ONLY with valid JSON, no markdown or code blocks. The response must be parseable JSON.`;

    const userPrompt = `Analyze this resume against the job description:

RESUME:
Name: ${resume.contactInfo?.fullName || 'Not provided'}
Summary: ${resume.summary || 'Not provided'}
Skills: ${safeSkillsString(resume.skills)}
Experience: ${resume.experience?.map((e: any) => `${e.position} at ${e.company}: ${e.description}${e.achievements?.length ? '\n  Achievements: ' + e.achievements.join('; ') : ''}`).join('\n') || 'Not provided'}
Education: ${resume.education?.map((e: any) => `${e.degree} in ${e.field} from ${e.institution}`).join('\n') || 'Not provided'}
Projects: ${resume.projects?.map((p: any) => `${p.name}: ${p.description}`).join('\n') || 'Not provided'}
Certifications: ${resume.certifications?.map((c: any) => `${c.name} by ${c.issuer}`).join(', ') || 'Not provided'}
Awards: ${resume.awards?.map((a: any) => `${a.title} from ${a.issuer}`).join(', ') || 'Not provided'}

JOB DESCRIPTION:
${jobDescription || '(No job description provided — use industry baseline keywords above to assess the candidate)'}${baselineKeywordsNote}

Provide analysis in this exact JSON format:
{
  "score": {
    "overallScore": <number 0-100>,
    "skillsMatch": <number 0-100>,
    "experienceRelevance": <number 0-100>,
    "keywordAlignment": <number 0-100>,
    "atsCompatibility": <number 0-100>,
    "strengths": ["<strength1>", "<strength2>", "<strength3>"],
    "improvements": ["<improvement1>", "<improvement2>"]
  },
  "gaps": {
    "missingKeywords": ["<keyword1>", "<keyword2>"],
    "missingSkills": ["<skill1>", "<skill2>"],
    "suggestedSections": ["<section1>"],
    "recommendedPhrases": ["<phrase1>", "<phrase2>"],
    "priorityImprovements": [
      {"priority": "high", "suggestion": "<suggestion>", "impact": "<impact>"},
      {"priority": "medium", "suggestion": "<suggestion>", "impact": "<impact>"}
    ]
  }
}`;

    const aiResponse = await callAIWithRetry({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      userId,
    });

    if (!aiResponse.content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the AI response — never return fake scores
    const analysisResult = parseAIJSON(aiResponse.content);

    if (!analysisResult) {
      console.error("Failed to parse AI analysis response:", aiResponse.content?.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isByok) {
      try {
        const svcClient = getServiceClient();
        svcClient.rpc('increment_ai_usage', { p_user_id: userId }).catch((err: any) => {
          console.error('[credit] increment_ai_usage failed for user:', userId, err);
        });
      } catch (err) {
        console.error('[credit] increment_ai_usage failed for user:', userId, err);
      }
    }

    await recordUsage(userId, 'analyze', { provider: aiResponse.providerUsed || 'unknown' });

    return new Response(
      JSON.stringify({ ...analysisResult as Record<string, unknown>, _providerUsed: aiResponse.providerUsed || 'unknown' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-resume error:", error);

    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...getCorsHeaders(req.headers.get('origin')), "Content-Type": "application/json" } }
    );
  }
});
