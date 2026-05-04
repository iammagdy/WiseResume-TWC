/**
 * Shared portfolio bio prompt builders.
 *
 * Two distinct use-cases — kept as separate functions because they serve
 * different UX contexts and voice conventions:
 *
 *  buildBioVariantsPrompt — used by wise-ai-chat (portfolio_bio type).
 *    Returns a prompt that produces three third-person variant bios
 *    ({short, medium, full}) for compare-and-choose in the AI Studio sidebar.
 *
 *  buildSingleBioPrompt — used by generate-portfolio-bio (action: 'bio').
 *    Returns a prompt that produces a single first-person bio written
 *    directly into the user's portfolio About section.
 *
 * Both prompts share BIO_TONE_RULES so tone guidelines stay in sync.
 */

export const BIO_TONE_RULES = [
  'Do NOT use clichés like "results-oriented", "passionate professional", "dynamic", or "synergy"',
  'Make it warm, human, and conversational — NOT corporate or buzzword-heavy',
  'Highlight what genuinely excites the person about their work',
  'Be specific to the data provided — avoid generic statements',
].join('\n');

interface BioVariantsData {
  name: string;
  summary: string;
  topSkills: string;
  experience: string;
}

/**
 * Produces a prompt for three third-person bio variants: short, medium, full.
 * Used by wise-ai-chat (portfolio_bio case).
 */
export function buildBioVariantsPrompt(data: BioVariantsData): string {
  return `You are a professional bio writer. Create three portfolio bio variants for this person.

Name: ${data.name}
Summary: ${data.summary}
Top Skills: ${data.topSkills}
Experience: ${data.experience}

Tone rules:
${BIO_TONE_RULES}

Return ONLY a JSON object with exactly these keys:
{
  "short": "<1 sentence (15-25 words) — ideal for taglines or Twitter/X bio>",
  "medium": "<2-3 sentences (40-70 words) — ideal for GitHub or portfolio header>",
  "full": "<4-5 sentences (80-120 words) — ideal for About page or LinkedIn summary>"
}

All bios should be written in third person and convey professional credibility. Return no markdown, no code blocks — just the JSON.`;
}

interface SingleBioData {
  fullName: string;
  jobTitle: string;
  summary: string;
  experienceContext: string;
}

/**
 * Produces a prompt for a single first-person bio (≤120 words).
 * Used by generate-portfolio-bio (action: 'bio').
 */
export function buildSingleBioPrompt(data: SingleBioData): string {
  return `You are a personal branding expert. Write a warm, friendly, first-person "About Me" bio for a personal portfolio website based on this information.

Name: ${data.fullName || 'the user'}
Job Title: ${data.jobTitle || 'Professional'}
Resume Summary: ${data.summary || 'Not provided'}
Recent Experience: ${data.experienceContext || 'Not provided'}

Requirements:
- Write in first person ("I", "my")
- Keep it under 120 words
- ${BIO_TONE_RULES.split('\n').join('\n- ')}
- End with something personal or aspirational
- Return ONLY the bio text, no quotes or labels`;
}
