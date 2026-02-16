import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON } from "../_shared/aiClient.ts";

/** Safely extract skills as a comma-separated string */
function safeSkillsString(skills: unknown): string {
  if (!Array.isArray(skills)) return 'Not provided';
  return skills.map(s => typeof s === 'string' ? s : (s as any)?.name || String(s)).join(', ') || 'Not provided';
}

// ============= SECURITY: Input validation limits =============
const MAX_RESUME_SIZE = 100 * 1024; // 100KB
const MAX_JOB_DESCRIPTION_SIZE = 50 * 1024; // 50KB

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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Authenticated user:', userId);

    const { resume, jobDescription, userGeminiKey, intensity } = await req.json();
    const tailorIntensity = intensity || 'moderate';
    
    // ============= SECURITY: Input validation =============
    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required and must be an object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobDescription || typeof jobDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Job description is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // AI client handles provider selection internally via callAI()

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

    const systemPrompt = `You are a LEGENDARY resume writer, career strategist, and ATS optimization expert with 20+ years of experience helping candidates land jobs at top companies.

${intensityInstructions[tailorIntensity] || intensityInstructions.moderate}

## YOUR MISSION
Transform this resume into a PERFECT match for the target job while maintaining complete authenticity.

## CHAIN OF THOUGHT PROCESS
1. ANALYZE: Deeply understand the job requirements, culture, and what the hiring manager truly wants
2. DETECT: Identify the industry, experience level, and key terminology patterns
3. STRATEGIZE: Plan how to position the candidate's experience for maximum impact
4. TRANSFORM: Rewrite each section with powerful, metrics-driven language
5. OPTIMIZE: Ensure ATS compatibility and keyword density without stuffing
6. PREPARE: Generate interview talking points based on the tailored content

## CRITICAL RULES
1. NEVER fabricate experience, skills, or metrics - only reframe existing content
2. Transform weak bullet points into POWERFUL achievement statements with metrics
3. If metrics aren't available, use strong qualitative indicators
4. Match exact terminology from the job description
5. Use industry-specific power verbs (led, architected, spearheaded, orchestrated)
6. Every bullet should follow: ACTION VERB + WHAT + RESULT/IMPACT
7. Weave critical keywords naturally - no stuffing
8. Score honestly - don't inflate scores to please

## BULLET TRANSFORMATION EXAMPLES
WEAK: "Worked on frontend development"
STRONG: "Architected and shipped 15+ React components serving 50K+ daily users, reducing page load time by 40%"

WEAK: "Helped with team projects"
STRONG: "Collaborated with cross-functional team of 8 engineers to deliver $2M product launch, completing 2 weeks ahead of schedule"

WEAK: "Responsible for customer service"
STRONG: "Resolved 200+ customer inquiries weekly with 98% satisfaction rating, reducing escalations by 35%"

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
  
  "keyChanges": ["<specific improvement made>", "..."],
  
  "sectionScores": {
    "summary": { "before": <0-100>, "after": <0-100> },
    "skills": { "before": <0-100>, "after": <0-100> },
    "experience": { "before": <0-100>, "after": <0-100> },
    "education": { "before": <0-100>, "after": <0-100> }
  },
  
  "overallScore": { "before": <0-100>, "after": <0-100> },
  
  "missingSkills": [
    { 
      "skill": "<skill from job description NOT on resume>", 
      "reason": "<why this skill matters for the role>", 
      "frequency": <times mentioned in job>, 
      "action": "add" 
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
  
  "jobParsed": {
    "title": "<extracted job title>",
    "company": "<extracted company name>",
    "keyRequirements": ["<must-have requirement>", "..."],
    "niceToHaves": ["<nice-to-have>", "..."]
  },
  
  "jobIntelligence": {
    "experienceLevel": "<entry | mid | senior | executive>",
    "salaryRange": { "min": <number or null>, "max": <number or null>, "currency": "USD" },
    "workMode": "<remote | hybrid | onsite | unknown>",
    "mustHaveSkills": ["<required skill>", "..."],
    "niceToHaveSkills": ["<preferred skill>", "..."],
    "companyCultureSignals": ["<culture indicator from job language>", "..."],
    "redFlags": ["<any unrealistic requirements or concerns>"],
    "industryDetected": "<detected industry: Tech, Finance, Healthcare, Marketing, etc.>"
  },
  
  "atsAnalysis": {
    "originalKeywordDensity": <percentage of job keywords found in original resume>,
    "optimizedKeywordDensity": <percentage after optimization>,
    "criticalKeywords": ["<must-have keywords from job>", "..."],
    "stuffingWarnings": ["<any over-optimization warnings>"]
  },
  
  "bulletTransformations": [
    {
      "experienceId": "<experience id>",
      "bulletIndex": <0-based index>,
      "originalBullet": "<original text>",
      "enhancedBullet": "<transformed text with metrics>",
      "improvement": "<what was improved>",
      "metricsAdded": <true if metrics were added>
    }
  ],
  
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
      "percentile": <estimated percentile vs typical applicants>,
      "recommendation": "<how to leverage this>"
    }
  ]
}`;

    console.log("Calling SUPERCHARGED AI engine for resume tailoring...", userGeminiKey ? "(Gemini Direct)" : "(Lovable Gateway)");

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      maxTokens: 8000,
      userGeminiKey,
    });

    const content = aiResponse.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("SUPERCHARGED AI response received, parsing...");

    // Parse the JSON from the AI response - robust 3-tier strategy
    let tailoredResult;
    try {
      // Step 1: Strip markdown code fences if present
      let cleaned = content.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/g, '').trim();
      
      // Step 2: Extract JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      let jsonStr = jsonMatch[0];
      
      // Step 3: Try parsing directly
      try {
        tailoredResult = JSON.parse(jsonStr);
      } catch {
        // Step 4: Attempt to fix truncated JSON by closing open braces/brackets
        let openBraces = 0, openBrackets = 0;
        for (const ch of jsonStr) {
          if (ch === '{') openBraces++;
          else if (ch === '}') openBraces--;
          else if (ch === '[') openBrackets++;
          else if (ch === ']') openBrackets--;
        }
        
        // Remove trailing comma or incomplete value
        jsonStr = jsonStr.replace(/,\s*$/, '');
        // Remove incomplete key-value pairs
        jsonStr = jsonStr.replace(/,\s*"[^"]*"\s*:\s*$/, '');
        jsonStr = jsonStr.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, '');
        jsonStr = jsonStr.replace(/,\s*\{[^}]*$/, '');
        
        // Close open brackets and braces
        for (let i = 0; i < openBrackets; i++) jsonStr += ']';
        for (let i = 0; i < openBraces; i++) jsonStr += '}';
        
        try {
          tailoredResult = JSON.parse(jsonStr);
          console.log("Recovered truncated JSON successfully");
        } catch (e2) {
          console.error("Failed to parse AI response even after recovery:", content.slice(0, 500));
          throw e2;
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure all required fields have defaults with enhanced structure
    tailoredResult = {
      ...tailoredResult,
      sectionScores: tailoredResult.sectionScores || null,
      overallScore: tailoredResult.overallScore || null,
      missingSkills: tailoredResult.missingSkills || [],
      boostableSkills: tailoredResult.boostableSkills || [],
      jobParsed: tailoredResult.jobParsed || {
        title: 'Position',
        company: 'Company',
        keyRequirements: [],
        niceToHaves: [],
      },
      jobIntelligence: tailoredResult.jobIntelligence || {
        experienceLevel: 'mid',
        workMode: 'unknown',
        mustHaveSkills: [],
        niceToHaveSkills: [],
        companyCultureSignals: [],
        redFlags: [],
        industryDetected: 'General',
      },
      atsAnalysis: tailoredResult.atsAnalysis || {
        originalKeywordDensity: 0,
        optimizedKeywordDensity: 0,
        criticalKeywords: [],
        stuffingWarnings: [],
      },
      bulletTransformations: tailoredResult.bulletTransformations || [],
      interviewTalkingPoints: tailoredResult.interviewTalkingPoints || [],
      strengthsAnalysis: tailoredResult.strengthsAnalysis || [],
    };

    console.log("Successfully tailored resume with SUPERCHARGED data");

    return new Response(
      JSON.stringify(tailoredResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("tailor-resume error:", error);

    if (isAIError(error)) {
      return new Response(
        JSON.stringify({ error: (error as any).message }),
        { status: (error as any).status, headers: { ...getCorsHeaders(req.headers.get('origin')), "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), "Content-Type": "application/json" } }
    );
  }
});
