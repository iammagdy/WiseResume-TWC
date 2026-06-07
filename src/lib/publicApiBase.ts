function isLocalHostOrigin(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value.trim());
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function resolvePublicApiBase(): string {
  const envBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!envBase) return '';

  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    if (!isLocalHostOrigin(currentOrigin) && isLocalHostOrigin(envBase)) {
      return '';
    }
  }

  return trimTrailingSlash(envBase);
}

export function resolveAbsolutePublicApiBase(): string {
  const apiBase = resolvePublicApiBase();
  if (apiBase) return apiBase;
  if (typeof window !== 'undefined') return trimTrailingSlash(window.location.origin);
  return '';
}
