import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, isAIError, parseAIJSON } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_RESUME_SIZE = 100 * 1024;

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

    // Server-side rate limiting
    const rateCheck = await checkRateLimit(user.id, { maxRequests: 30, windowSeconds: 60, actionType: 'score' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resume, background } = await req.json();

    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumeStr = JSON.stringify(resume);
    if (resumeStr.length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Resume data too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format resume sections for evaluation
    const contactInfo = resume.contactInfo || {};
    const skills = Array.isArray(resume.skills)
      ? resume.skills.map((s: unknown) => typeof s === 'string' ? s : (s as Record<string, string>)?.name || String(s)).join(', ')
      : 'Not provided';
    const experience = resume.experience?.map((e: any) =>
      `${e.position || 'Untitled'} at ${e.company || 'Unknown'} (${e.startDate || '?'} - ${e.endDate || 'Present'}):\n${e.description || 'No description'}`
    ).join('\n\n') || 'Not provided';
    const education = resume.education?.map((e: any) =>
      `${e.degree || ''} in ${e.field || ''} from ${e.institution || 'Unknown'} (${e.startDate || '?'} - ${e.endDate || '?'})`
    ).join('\n') || 'Not provided';
    const certifications = resume.certifications?.map((c: any) => `${c.name || c} (${c.issuer || ''})`).join(', ') || 'None';
    const projects = resume.projects?.map((p: any) => `${p.name || 'Untitled'}: ${p.description || ''}`).join('\n') || 'None';
    const awards = resume.awards?.map((a: any) => `${a.title || a.name || a}`).join(', ') || 'None';
    const volunteering = resume.volunteering?.map((v: any) => `${v.role || v.position || ''} at ${v.organization || ''}`).join(', ') || 'None';
    const hobbies = Array.isArray(resume.hobbies) ? resume.hobbies.join(', ') : (resume.hobbies || 'None');
    const languages = Array.isArray(resume.languages) ? resume.languages.map((l: any) => typeof l === 'string' ? l : l.name || l).join(', ') : 'None';

    const systemPrompt = `You are an ATS (Applicant Tracking System) parsing and scoring engine that evaluates resumes exactly the way enterprise ATS platforms like Greenhouse, Lever, Workday, and Taleo do.

You evaluate resumes using 6 weighted pillars based on real-world ATS scoring standards. You must be strict, consistent, and fair — identical content must always produce the same scores.

IMPORTANT: Respond ONLY with valid JSON, no markdown or code blocks.
IMPORTANT: Be deterministic — the same resume content must always receive the same scores.`;

    const userPrompt = `Score this resume using real ATS evaluation standards across 6 pillars.

=== RESUME DATA ===
Full Name: ${contactInfo.fullName || 'Not provided'}
Email: ${contactInfo.email || 'Not provided'}
Phone: ${contactInfo.phone || 'Not provided'}
Location: ${contactInfo.location || 'Not provided'}
LinkedIn: ${contactInfo.linkedin || 'Not provided'}
Website: ${contactInfo.website || 'Not provided'}

Summary: ${resume.summary || 'Not provided'}

Skills: ${skills}

Experience:
${experience}

Education:
${education}

Certifications: ${certifications}
Projects: ${projects}
Awards: ${awards}
Volunteering: ${volunteering}
Languages: ${languages}
Hobbies: ${hobbies}
=== END RESUME DATA ===

Score each of the 6 pillars from 0-100 using these rubrics:

### 1. Keyword Optimization (Weight: 35%)
Measures: Industry-relevant keywords, hard skills, soft skills, tools, technologies, certifications mentioned
- 0-25: Almost no relevant keywords; generic language only
- 26-50: Some relevant keywords but major gaps; missing core industry terms
- 51-75: Good keyword coverage; most important skills and tools mentioned
- 76-100: Excellent keyword density; comprehensive industry terms, tools, technologies, and certifications naturally woven throughout

### 2. Content Quality (Weight: 25%)
Measures: Action verbs, quantified achievements (%, $, numbers), result-oriented bullet points
- 0-25: No action verbs; purely descriptive; no measurable outcomes
- 26-50: Some action verbs but mostly passive voice; few or no metrics
- 51-75: Good action verbs; some quantified results; mostly result-oriented
- 76-100: Strong action verbs throughout; rich quantified achievements; every bullet demonstrates clear impact

### 3. Section Structure (Weight: 15%)
Measures: Standard ATS-recognized headers, logical section ordering, no missing critical sections (Contact, Experience, Education, Skills)
- 0-25: Missing 2+ critical sections; non-standard or absent headers
- 26-50: Has basic sections but missing important ones; poor ordering
- 51-75: All critical sections present; reasonable ordering; minor gaps
- 76-100: All sections present with standard headers; logical flow; includes optional sections (projects, certifications)

### 4. Parsability (Weight: 10%)
Measures: Clean text without special characters/symbols, consistent date formats, standard job titles, no tables/columns that confuse parsers
- 0-25: Heavy use of special characters, inconsistent formatting, unparseable structure
- 26-50: Some formatting issues; inconsistent dates; some special characters
- 51-75: Mostly clean text; minor inconsistencies in date formats
- 76-100: Perfectly clean text; consistent MM/YYYY or Month YYYY dates; standard formatting throughout

### 5. Contact Completeness (Weight: 10%)
Measures: Presence of full name, professional email, phone number, location, LinkedIn URL
- 0-25: Only 1 contact field provided
- 26-50: 2 contact fields provided
- 51-75: 3-4 contact fields provided
- 76-100: All 5 contact fields (name, email, phone, location, LinkedIn) provided and valid

### 6. Length & Density (Weight: 5%)
Measures: Appropriate content volume (not too sparse, not too bloated), bullet point density, meaningful content vs filler
- 0-25: Extremely sparse (< 3 bullets total) or entirely filler content
- 26-50: Light content; few details; some sections too thin
- 51-75: Good content volume; most sections have adequate detail
- 76-100: Optimal density; rich detail in all sections; no filler; professional length

Calculate the weighted overall score using:
overallScore = round(keywordOptimization * 0.35 + contentQuality * 0.25 + sectionStructure * 0.15 + parsability * 0.10 + contactCompleteness * 0.10 + lengthDensity * 0.05)

Return JSON:
{
  "overallScore": <weighted 0-100>,
  "categories": {
    "keywordOptimization": <0-100>,
    "contentQuality": <0-100>,
    "sectionStructure": <0-100>,
    "parsability": <0-100>,
    "contactCompleteness": <0-100>,
    "lengthDensity": <0-100>
  },
  "topStrength": "<one short sentence about the strongest aspect>",
  "topImprovement": "<one short actionable sentence about the biggest improvement opportunity>"
}`;

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      userId: user.id,
    });

    const content = aiResponse.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const result = parseAIJSON(content);
    if (!result || typeof result.overallScore !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI scoring response. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record usage
    if (background) {
      await recordUsage(user.id, 'score', { background: true });
    } else {
      await recordUsage(user.id, 'score');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("score-resume error:", error);

    if (isAIError(error)) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
