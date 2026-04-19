import { callAI, sanitizeInputText, toUserError } from '../_shared/aiClient.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
import { checkRateLimit, recordUsage } from '../_shared/rateLimiter.ts';
import { checkUserRateLimit } from '../_shared/userRateLimiter.ts';
import { checkAndDeductCredit, refundCredit } from '../_shared/creditUtils.ts';
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

      let response;
      try {
        response = await callAI({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          maxTokens: 400,
          userId,
        });
      } catch (aiErr) {
        await refundCredit(userId, creditCheck, 1);
        throw aiErr;
      }

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
        caseStudies: rawCaseStudies,
        portfolioCertifications: rawPortfolioCerts,
      } = body;

      if (!targetLanguage) {
        return new Response(
          JSON.stringify({ error: 'targetLanguage is required for translation.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const hasAnyContent = bioText || summaryText || rawHighlights?.length || rawServices?.length
        || rawTestimonials?.length || rawPinnedDesc || rawCaseStudies?.length || rawPortfolioCerts?.length;
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
      type CaseStudyItem = { id: string; title: string; challenge: string; outcome: string };
      type CertItem = { id: string; name: string; issuer: string };

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
      if (Array.isArray(rawCaseStudies) && rawCaseStudies.length > 0) {
        inputObj.caseStudies = rawCaseStudies.slice(0, 8).map((cs: CaseStudyItem) => ({
          id: cs.id,
          title: sanitizeInputText(cs.title || '', 200),
          challenge: sanitizeInputText(cs.challenge || '', 500),
          outcome: sanitizeInputText(cs.outcome || '', 500),
        }));
      }
      if (Array.isArray(rawPortfolioCerts) && rawPortfolioCerts.length > 0) {
        inputObj.portfolioCertifications = rawPortfolioCerts.slice(0, 20).map((c: CertItem) => ({
          id: c.id,
          name: sanitizeInputText(c.name || '', 200),
          issuer: sanitizeInputText(c.issuer || '', 200),
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

      let response;
      try {
        response = await callAI({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          maxTokens: 4000,
          userId,
        });
      } catch (aiErr) {
        await refundCredit(userId, creditCheck, 1);
        throw aiErr;
      }

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

    // ── Action: critique ──────────────────────────────────────────────────
    if (action === 'critique') {
      const { caseStudies: cs, services: sv, testimonials: tes, highlights: hi, pinnedProject: pp, portfolioSummary: ps } = body;

      if (!fullName && !jobTitle) {
        return new Response(
          JSON.stringify({ error: 'Please add your name and job title before running a critique.' }),
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

      const expContext = Array.isArray(experience) && experience.length > 0
        ? experience.slice(0, 3).map((e: any) => `${e.position || ''} at ${e.company || ''}`).join(', ')
        : '';
      const skillList = Array.isArray(skills) ? skills.slice(0, 8).join(', ') : '';
      const bioText = sanitizeInputText(ps || summary || '', 600);

      const csText = Array.isArray(cs) && cs.length > 0
        ? cs.slice(0, 3).map((c: Record<string, unknown>) => `"${sanitizeInputText(c.title as string || '', 60)}": ${sanitizeInputText((c.challenge as string || '') + ' ' + (c.outcome as string || ''), 200)}`).join('; ')
        : 'None';
      const svText = Array.isArray(sv) && sv.length > 0
        ? sv.slice(0, 3).map((s: Record<string, unknown>) => `"${sanitizeInputText(s.title as string || '', 60)}": ${sanitizeInputText(s.description as string || '', 120)}`).join('; ')
        : 'None';
      const tesText = Array.isArray(tes) && tes.length > 0
        ? tes.slice(0, 3).map((t: Record<string, unknown>) => `"${sanitizeInputText(t.quote as string || '', 150)}" — ${sanitizeInputText(t.authorName as string || 'Unknown', 40)}, ${sanitizeInputText(t.authorTitle as string || '', 40)}`).join(' | ')
        : 'None';
      const hiText = Array.isArray(hi) && hi.length > 0
        ? hi.map((h: Record<string, unknown>) => `${sanitizeInputText(h.value as string || '', 20)} ${sanitizeInputText(h.label as string || '', 30)}`).join(', ')
        : 'None';

      const context = [
        `Name: ${fullName || 'N/A'}`,
        `Job Title: ${jobTitle || 'Not set'}`,
        `Bio: ${bioText || 'Not set'}`,
        `Recent Experience: ${expContext || 'Not listed'}`,
        `Top Skills: ${skillList || 'Not listed'}`,
        `Case Studies / Projects: ${csText}`,
        `Services: ${svText}`,
        `Testimonials: ${tesText}`,
        `Highlight Metrics: ${hiText}`,
        `Pinned Project: ${pp?.title ? sanitizeInputText(pp.title as string, 80) + (pp.description ? ' — ' + sanitizeInputText(pp.description as string, 150) : '') : 'Not set'}`,
      ].join('\n');

      const prompt = `You are a senior recruiter and portfolio coach. Analyze this professional portfolio and provide specific, actionable critique items a recruiter would notice.

PORTFOLIO DATA:
${context}

Return a JSON array of 5-8 critique items. Each item MUST have:
- "category": One of "About", "Experience", "Skills", "Social Proof", "Projects", "SEO", "Availability", "Structure"
- "priority": "high", "medium", or "low"
- "finding": What is missing or weak (1 concise sentence)
- "suggestion": A specific, actionable fix (1-2 sentences)

Rules:
- Prioritize "high" only for things that are completely absent or critically harmful
- Be specific to the data provided, not generic advice
- Include at least 2 high-priority items if warranted
- Return ONLY a valid JSON array, no markdown or explanation

Example:
[{"category":"About","priority":"high","finding":"Bio is not set, leaving recruiters with no first impression.","suggestion":"Add a 2-3 sentence first-person bio that highlights your specialty and what makes you stand out."}]`;

      let response;
      try {
        response = await callAI({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          maxTokens: 1500,
          userId,
        });
      } catch (aiErr) {
        await refundCredit(userId, creditCheck, 1);
        throw aiErr;
      }

      let suggestions: Array<{ category: string; priority: string; finding: string; suggestion: string }> = [];
      try {
        const raw = response.content?.trim() || '[]';
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        suggestions = [];
      }

      await recordUsage(userId, 'portfolio_critique');
      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Action: testimonial-prompt ─────────────────────────────────────────
    if (action === 'testimonial-prompt') {
      const { colleagueName = '', colleagueContext = '' } = body;
      const expContext = Array.isArray(experience) && experience.length > 0
        ? experience.slice(0, 2).map((e: any) => `${e.position || ''} at ${e.company || ''}`).join('; ')
        : '';

      if (!fullName && !jobTitle) {
        return new Response(
          JSON.stringify({ error: 'Please add your name and job title first.' }),
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

      const prompt = `You are a professional copywriter. Write a short, warm, personalized message someone can send to a former colleague or client asking for a brief portfolio testimonial.

About the person requesting:
Name: ${fullName || 'the professional'}
Job Title: ${jobTitle || 'a professional'}${expContext ? `\nRecent roles: ${expContext}` : ''}${colleagueName ? `\nRecipient name: ${colleagueName}` : ''}${colleagueContext ? `\nContext about recipient / shared work: ${colleagueContext}` : ''}

Requirements:
- 3-5 sentences only
- Warm but professional tone
- Reference shared work context if provided
- End with a clear, low-friction ask (e.g., "2-3 sentences about our time working together would mean a lot")
- Do NOT include a subject line — just the message body
- Write in first person as ${fullName || 'the sender'}
- Return ONLY the message text, no labels, quotes, or explanation`;

      let response;
      try {
        response = await callAI({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.75,
          maxTokens: 350,
          userId,
        });
      } catch (aiErr) {
        await refundCredit(userId, creditCheck, 1);
        throw aiErr;
      }

      const promptText = response.content?.trim() || '';
      await recordUsage(userId, 'portfolio_testimonial_prompt');
      return new Response(JSON.stringify({ prompt: promptText }), {
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

      let response;
      try {
        response = await callAI({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          maxTokens: 1200,
          userId,
        });
      } catch (aiErr) {
        await refundCredit(userId, creditCheck, 1);
        throw aiErr;
      }

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

      let response;
      try {
        response = await callAI({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          maxTokens: 400,
          userId,
        });
      } catch (aiErr) {
        await refundCredit(userId, creditCheck, 1);
        throw aiErr;
      }

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

      let response;
      try {
        response = await callAI({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          maxTokens: 120,
          userId,
        });
      } catch (aiErr) {
        await refundCredit(userId, creditCheck, 1);
        throw aiErr;
      }

      const headline = response.content?.trim().replace(/^["']|["']$/g, '') || '';
      await recordUsage(userId, 'portfolio_bio_availability');
      return new Response(JSON.stringify({ headline }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (error) {
    log.error('Unhandled error', error);
    const { status, error: errorCode, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: errorCode, message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
