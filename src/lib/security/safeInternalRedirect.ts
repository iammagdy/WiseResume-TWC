function containsControlOrBackslash(value: string): boolean {
  return Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return character === '\\' || code <= 0x1f || code === 0x7f;
  });
}

export function safeInternalRedirect(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || value !== value.trim() || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  let candidate = value;
  for (let pass = 0; pass < 3; pass += 1) {
    if (
      containsControlOrBackslash(candidate)
      || !candidate.startsWith('/')
      || candidate.startsWith('//')
    ) {
      return fallback;
    }
    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) break;
      candidate = decoded;
    } catch {
      return fallback;
    }
  }

  if (
    containsControlOrBackslash(candidate)
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
  ) {
    return fallback;
  }
  return value;
}
