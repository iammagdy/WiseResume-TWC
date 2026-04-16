import { callAI, sanitizeInputText } from '../_shared/aiClient.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
import { checkRateLimit, recordUsage } from '../_shared/rateLimiter.ts';
import { checkUserRateLimit } from '../_shared/userRateLimiter.ts';
import { checkAndDeductCredit } from '../_shared/creditUtils.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { checkPayloadSize } from '../_shared/requestUtils.ts';
import { logger } from '../_shared/logger.ts';
const log = logger('generate-portfolio-bio');


Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  try {
    let userId: string;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
    } catch (authErr) {
      return authErrorResponse(authErr, req.headers.get('origin'));
    }

    const { allowed } = await checkRateLimit(userId, { actionType: 'portfolio_bio', maxRequests: 20, windowSeconds: 60 });
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before generating more bio content.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'portfolio_bio', 20, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action = 'bio', summary, fullName, jobTitle, experience, skills, careerLevel } = body;

    // case-study action has different required fields — validate before charging credits
    if (action === 'case-study') {
      const { projectName, projectDescription, projectTechnologies } = body;

      if (!projectDescription && !projectName) {
        return new Response(
          JSON.stringify({ error: 'Please provide a project name or description to generate a case study.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Credit enforcement: charged only after input validation passes, ensuring
      // invalid requests never consume credits.
      const creditCheck = await checkAndDeductCredit(userId);
      if (!creditCheck.hasCredits) {
        return new Response(
          JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or add your own API key.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const safeDesc = sanitizeInputText(projectDescription || '', 1500);
      const techList = Array.isArray(projectTechnologies) ? projectTechnologies.slice(0, 10).join(', ') : (projectTechnologies || '');

      const prompt = `You are a UX writer and portfolio expert. Generate a professional case study for a portfolio website based on the following project information.

Project Name: ${projectName || 'Untitled Project'}
Description: ${safeDesc || 'Not provided'}
Technologies Used: ${techList || 'Not specified'}

Write two distinct paragraphs:

1. CHALLENGE paragraph (2-3 sentences): Describe the problem that needed solving, the context, and why it mattered. Be specific.
2. OUTCOME paragraph (2-3 sentences): Describe what was built, the results achieved, and the impact. Include metrics or concrete results if inferrable.

Rules:
- Write in past tense
- Be specific and professional, not generic
- Do not use phrases like "I built" — write in a neutral, portfolio-ready tone
- Return ONLY valid JSON with keys "challenge" and "outcome", no markdown, no explanation

Example:
{"challenge":"The team needed a way to reduce onboarding time for new enterprise customers, who were spending up to 3 days getting set up before they could use the product.","outcome":"A streamlined onboarding wizard reduced setup time by 70%, cutting the average from 3 days to under 8 hours, and improved first-week activation rates by 45%."}`;

      const response = await callAI({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        maxTokens: 400,
        userId,
      });

      let challenge = '';
      let outcome = '';
      try {
        const raw = response.content?.trim() || '{}';
        const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        challenge = parsed.challenge || '';
        outcome = parsed.outcome || '';
      } catch {
        const challengeMatch = response.content?.match(/"challenge"\s*:\s*"([^"]+)"/);
        const outcomeMatch = response.content?.match(/"outcome"\s*:\s*"([^"]+)"/);
        challenge = challengeMatch?.[1] || '';
        outcome = outcomeMatch?.[1] || '';
      }

      await recordUsage(userId, 'portfolio_bio_case_study');

      return new Response(JSON.stringify({ challenge, outcome }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Action: translate ──────────────────────────────────────────────────
    // Handled before the resume-data gate — translation only needs bio/portfolioSummary.
    if (action === 'translate') {
      const {
        targetLanguage,
        bio: bioText,
        portfolioSummary: summaryText,
        highlights: rawHighlights,
        services: rawServices,
        testimonials: rawTestimonials,
        pinnedProjectDescription: rawPinnedDesc,
      } = body;

      if (!targetLanguage) {
        return new Response(
          JSON.stringify({ error: 'targetLanguage is required for translation.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const hasAnyContent = bioText || summaryText || rawHighlights?.length || rawServices?.length || rawTestimonials?.length || rawPinnedDesc;
      if (!hasAnyContent) {
        return new Response(
          JSON.stringify({ error: 'Provide at least one piece of portfolio content to translate.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const creditCheck = await checkAndDeductCredit(userId);
      if (!creditCheck.hasCredits) {
        return new Response(
          JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or add your own API key.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const safeBio = sanitizeInputText(bioText || '', 1000);
      const safeSummary = sanitizeInputText(summaryText || '', 500);
      const safePinnedDesc = sanitizeInputText(rawPinnedDesc || '', 500);

      // Build a structured input for the AI
      type HighlightItem = { id: string; value: string; label: string };
      type ServiceItem = { id: string; title: string; description?: string };
      type TestimonialItem = { id: string; quote: string };

      const inputObj: Record<string, unknown> = {};
      if (safeBio) inputObj.bio = safeBio;
      if (safeSummary) inputObj.portfolioSummary = safeSummary;
      if (safePinnedDesc) inputObj.pinnedProjectDescription = safePinnedDesc;
      if (Array.isArray(rawHighlights) && rawHighlights.length > 0) {
        inputObj.highlights = rawHighlights.slice(0, 10).map((h: HighlightItem) => ({
          id: h.id,
          value: sanitizeInputText(h.value || '', 200),
          label: sanitizeInputText(h.label || '', 100),
        }));
      }
      if (Array.isArray(rawServices) && rawServices.length > 0) {
        inputObj.services = rawServices.slice(0, 10).map((s: ServiceItem) => ({
          id: s.id,
          title: sanitizeInputText(s.title || '', 200),
          description: sanitizeInputText(s.description || '', 500),
        }));
      }
      if (Array.isArray(rawTestimonials) && rawTestimonials.length > 0) {
        inputObj.testimonials = rawTestimonials.slice(0, 10).map((t: TestimonialItem) => ({
          id: t.id,
          quote: sanitizeInputText(t.quote || '', 500),
        }));
      }

      const prompt = `You are a professional translator. Translate ALL text content in the following JSON into ${targetLanguage}. Rules:
- Preserve the exact JSON structure and all keys (including "id" fields which must NOT be translated)
- Keep professional tone and natural phrasing
- Only translate values that are human-readable text (skip empty strings)
- Do NOT add commentary, explanation, or wrapper objects
- Return ONLY valid JSON matching the exact structure provided

Input JSON:
${JSON.stringify(inputObj, null, 2)}

Return ONLY the translated JSON object:`;

      const response = await callAI({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 4000,
        userId,
      });

      let translations: Record<string, unknown> = {};
      try {
        const rawText = response.content?.trim() || '{}';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        translations = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        translations = {};
      }

      await recordUsage(userId, 'portfolio_bio_translate');
      return new Response(JSON.stringify({ translations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // All other actions require resume data
    const hasSummary = summary && summary.trim().length > 0;
    const hasJobTitle = jobTitle && jobTitle.trim().length > 0;
    const hasExperience = Array.isArray(experience) && experience.length > 0;

    if (!hasSummary && !hasJobTitle && !hasExperience) {
      return new Response(JSON.stringify({ error: 'Please add a summary, job title, or experience to your resume first' }), { status: 400, headers: corsHeaders });
    }

    // Credit enforcement: charged only after input validation passes so that invalid
    // requests (missing required fields, unknown action) never consume credits.
    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or add your own API key.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedSummary = hasSummary ? sanitizeInputText(summary, 2000) : '';
    const experienceContext = hasExperience
      ? experience.slice(0, 3).map((e: any) => `${e.position || ''} at ${e.company || ''}`).join(', ')
      : '';
    const topSkills = Array.isArray(skills) ? skills.slice(0, 5).join(', ') : '';

    // ── Action: bio (default) ──────────────────────────────────────────────
    if (action === 'bio') {
      const prompt = `You are a personal branding expert. Write a warm, friendly, first-person "About Me" bio for a personal portfolio website based on this information.

Name: ${fullName || 'the user'}
Job Title: ${hasJobTitle ? jobTitle : 'Professional'}
Resume Summary: ${sanitizedSummary || 'Not provided'}
Recent Experience: ${experienceContext || 'Not provided'}

Requirements:
- Write in first person ("I", "my")
- Keep it under 120 words
- Make it warm, human, and conversational — NOT corporate
- Highlight what excites them about their work
- End with something personal or aspirational
- Do NOT use clichés like "results-oriented" or "passionate professional"
- Return ONLY the bio text, no quotes or labels`;

      const response = await callAI({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        maxTokens: 1200,
        userId,
      });

      const bio = response.content?.trim() || '';
      await recordUsage(userId, 'portfolio_bio');
      return new Response(JSON.stringify({ bio }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Action: seo ────────────────────────────────────────────────────────
    if (action === 'seo') {
      const prompt = `You are an SEO expert. Generate an optimized meta title and meta description for a personal portfolio website.

Name: ${fullName || 'Professional'}
Job Title: ${hasJobTitle ? jobTitle : 'Professional'}
Summary: ${sanitizedSummary || 'Not provided'}
Top Skills: ${topSkills || 'Not provided'}
Recent Experience: ${experienceContext || 'Not provided'}

Requirements:
- Meta title: under 60 characters, include the person's name + role. No quotes.
- Meta description: 120–155 characters. Compelling, mention key skills or value. No quotes.
- Return ONLY valid JSON with keys "metaTitle" and "metaDescription". No markdown, no explanation.

Example output:
{"metaTitle":"Jane Smith — Full-Stack Developer & UX Designer","metaDescription":"Full-stack developer with 5+ years building React and Node.js apps. Open to remote roles. View my portfolio and latest projects."}`;

      const response = await callAI({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        maxTokens: 400,
        userId,
      });

      let metaTitle = '';
      let metaDescription = '';
      try {
        const raw = response.content?.trim() || '{}';
        const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        metaTitle = parsed.metaTitle || '';
        metaDescription = parsed.metaDescription || '';
      } catch {
        const titleMatch = response.content?.match(/"metaTitle"\s*:\s*"([^"]+)"/);
        const descMatch = response.content?.match(/"metaDescription"\s*:\s*"([^"]+)"/);
        metaTitle = titleMatch?.[1] || '';
        metaDescription = descMatch?.[1] || '';
      }

      await recordUsage(userId, 'portfolio_bio_seo');
      return new Response(JSON.stringify({ metaTitle, metaDescription }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Action: availability ───────────────────────────────────────────────
    if (action === 'availability') {
      const prompt = `You are a career coach. Write a short, punchy availability headline for a personal portfolio website hero section.

Name: ${fullName || 'Professional'}
Job Title: ${hasJobTitle ? jobTitle : 'Professional'}
Career Level: ${careerLevel || 'mid'}
Recent Experience: ${experienceContext || 'Not provided'}

Requirements:
- Under 80 characters
- Format: "Open to [work type] · Available [timeframe]" or similar punchy format
- Use middle dot (·) as separator between items
- Be specific and honest (e.g. "Open to remote contracts · Available June 2025")
- Do NOT include quotes, labels, or explanation
- Return ONLY the headline text`;

      const response = await callAI({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        maxTokens: 120,
        userId,
      });

      const headline = response.content?.trim().replace(/^["']|["']$/g, '') || '';
      await recordUsage(userId, 'portfolio_bio_availability');
      return new Response(JSON.stringify({ headline }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (error) {
    log.error('Unhandled error', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
