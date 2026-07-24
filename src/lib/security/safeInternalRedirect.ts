const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;

export function safeInternalRedirect(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || value !== value.trim() || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  let candidate = value;
  for (let pass = 0; pass < 3; pass += 1) {
    if (
      CONTROL_OR_BACKSLASH.test(candidate)
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
    CONTROL_OR_BACKSLASH.test(candidate)
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
  ) {
    return fallback;
  }
  return value;
}
