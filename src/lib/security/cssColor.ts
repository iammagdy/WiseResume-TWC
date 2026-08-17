const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*((?:0(?:\.\d+)?|1(?:\.0+)?|\.\d+)))?\s*\)$/i;

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}

/**
 * Returns a complete, bounded CSS color token or null. Keeping this validator
 * deliberately small prevents stored profile data from escaping a style value.
 */
export function normalizeCssColor(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 64) return null;
  const color = value.trim();
  if (!color || containsControlCharacter(color)) return null;
  if (HEX_COLOR.test(color)) return color;

  const match = RGB_COLOR.exec(color);
  if (!match) return null;
  const channels = match.slice(1, 4).map(Number);
  if (channels.some(channel => channel < 0 || channel > 255)) return null;

  const isRgba = color.slice(0, 4).toLowerCase() === 'rgba';
  const alpha = match[4];
  if (isRgba !== (alpha !== undefined)) return null;
  if (alpha !== undefined && Number(alpha) > 1) return null;
  return color;
}

export function safeCssColor(value: unknown, fallback = '#e84545'): string {
  return normalizeCssColor(value) ?? fallback;
}
