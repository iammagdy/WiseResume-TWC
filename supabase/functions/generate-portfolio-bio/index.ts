import { callAI, sanitizeInputText } from '../_shared/aiClient.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let userId: string;
    let client: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2').createClient>;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
      client = auth.client;
    } catch (authErr) {
      return authErrorResponse(authErr, req.headers.get('origin'));
    }

    const body = await req.json();
    const { action = 'bio', summary, fullName, jobTitle, experience, skills, careerLevel } = body;

    // case-study action has different required fields
    if (action === 'case-study') {
      const { projectName, projectDescription, projectTechnologies } = body;

      if (!projectDescription && !projectName) {
        return new Response(
          JSON.stringify({ error: 'Please provide a project name or description to generate a case study.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Increment AI usage
      await client.rpc('increment_ai_usage', { p_user_id: userId });

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

      return new Response(JSON.stringify({ challenge, outcome }), {
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

    // Increment AI usage
    await client.rpc('increment_ai_usage', { p_user_id: userId });

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
      return new Response(JSON.stringify({ headline }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('generate-portfolio-bio error:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
