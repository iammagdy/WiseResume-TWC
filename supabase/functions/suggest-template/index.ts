import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';
import { callAI, toUserError } from '../_shared/aiClient.ts';
import { recordUsage } from '../_shared/rateLimiter.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await requireAuth(req);
    const { jobTitle, industry, careerLevel, skills } = await req.json();

    if (!jobTitle && !industry && (!skills || skills.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Provide at least a job title, industry, or skills' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const templateIds = [
      'minimal', 'classic', 'modern', 'developer', 'executive', 'professional',
      'creative', 'compact', 'academic', 'healthcare', 'sales', 'elegant',
      'corporate', 'banking', 'consulting', 'federal', 'legal', 'marketing',
      'designer', 'portfolio', 'startup', 'infographic', 'data-science',
      'devops', 'cyber', 'product', 'clean', 'swiss', 'mono', 'zen',
    ];

    const systemPrompt = `You are a resume design expert. Based on the user's industry, job title, career level, and skills, recommend the best resume template and customization settings.

Available template IDs: ${templateIds.join(', ')}

Template categories:
- Professional: classic, professional, executive, corporate, banking, consulting, federal, legal, elegant
- Creative: creative, designer, marketing, portfolio, infographic
- Tech: developer, data-science, devops, cyber, product, startup
- Minimalist: minimal, modern, compact, clean, swiss, mono, zen, academic, healthcare, sales

Guidelines:
- Finance/Banking/Legal → banking, consulting, corporate, executive
- Tech/Engineering → developer, devops, cyber, data-science, product
- Creative/Design/Marketing → creative, designer, marketing, portfolio
- Healthcare → healthcare
- Academic/Research → academic
- Entry-level → clean, minimal, modern
- Executive/Senior → executive, elegant, corporate
- Startup → startup, product

For colors: use professional, muted tones for corporate roles; bolder accents for creative; dark tones for tech.
For fonts: serif pairs for traditional industries; sans-serif for modern/tech; display fonts for creative.`;

    const aiResponse = await callAI({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Recommend a template for:
Job Title: ${jobTitle || 'Not specified'}
Industry: ${industry || 'Not specified'}
Career Level: ${careerLevel || 'Not specified'}
Key Skills: ${skills?.join(', ') || 'Not specified'}`,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'suggest_template',
            description: 'Return the recommended template and customization settings',
            parameters: {
              type: 'object',
              properties: {
                recommendedTemplateId: {
                  type: 'string',
                  description: 'The template ID from the available list',
                  enum: templateIds,
                },
                customization: {
                  type: 'object',
                  properties: {
                    accentColor: { type: 'string', description: 'Hex color e.g. #1e3a5f' },
                    fontHeading: { type: 'string', enum: ['Inter', "'Playfair Display', serif", 'Roboto, sans-serif', "'Merriweather', serif", 'Poppins, sans-serif', 'Lato, sans-serif'] },
                    fontBody: { type: 'string', enum: ['Inter', 'Roboto, sans-serif', 'Poppins, sans-serif', 'Lato, sans-serif'] },
                    fontSize: { type: 'string', enum: ['small', 'medium', 'large'] },
                    spacing: { type: 'string', enum: ['compact', 'normal', 'spacious'] },
                  },
                  required: ['accentColor', 'fontHeading', 'fontBody', 'fontSize', 'spacing'],
                },
                reasoning: { type: 'string', description: 'Brief explanation of why this template fits (max 2 sentences)' },
              },
              required: ['recommendedTemplateId', 'customization', 'reasoning'],
              additionalProperties: false,
            },
          },
        },
      ],
      toolChoice: { type: 'function', function: { name: 'suggest_template' } },
      userId,
    });

    const toolCall = aiResponse.toolCalls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('No tool call returned');
    }

    const result = JSON.parse(toolCall.function.arguments);
    const providerUsed = aiResponse.providerUsed || 'unknown';

    await recordUsage(userId, 'suggest_template', { provider: providerUsed });

    return new Response(JSON.stringify({
      ...result,
      _providerUsed: providerUsed,
      _fallbackUsed: aiResponse.fallbackUsed || false,
      _fallbackReason: aiResponse.fallbackReason || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'status' in err) {
      return authErrorResponse(err, origin);
    }
    console.error('suggest-template error:', err);
    const userErr = toUserError(err);
    return new Response(
      JSON.stringify({ error: userErr.error, message: userErr.message }),
      { status: userErr.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
