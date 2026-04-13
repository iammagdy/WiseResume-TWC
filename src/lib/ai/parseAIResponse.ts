/**
 * Shared utilities for safely extracting and parsing AI chat responses.
 * All functions use proper types — no `any` casts.
 */

/** Extract the text content from a wise-ai-chat edge function response.
 * Checks `result` (typed API), then `content` (legacy/alias), then `message`/`text`.
 */
export function extractAIContent(data: unknown): string {
  if (typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>;
    if (typeof d.result === 'string') return d.result;
    if (typeof d.content === 'string') return d.content;
    if (typeof d.message === 'string') return d.message;
    if (typeof d.text === 'string') return d.text;
  }
  return '';
}

/** Extract and parse a JSON object from AI response text. Throws if not found or type guard fails. */
export function parseAIJson<T>(
  content: string,
  guard: (v: unknown) => v is T,
  errorMsg = 'AI response did not match expected format',
): T {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in AI response');
  const parsed: unknown = JSON.parse(jsonMatch[0]);
  if (!guard(parsed)) throw new Error(errorMsg);
  return parsed;
}
