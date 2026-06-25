const TEST_ROUTE_PATTERNS = [
  /\/AUDIT_TEST/i,
  /\/test-/i,
  /\/dev-test/i,
  /\/_test/i,
];

const PAGE_LABEL_MAP: Record<string, string> = {
  '/': 'Home',
  '/auth': 'Auth',
  '/auth/callback': 'Auth Callback',
  '/auth/reset-password': 'Reset Password',
  '/dashboard': 'Dashboard',
  '/settings': 'Settings',
  '/editor': 'Resume Editor',
  '/tailor': 'Tailor Resume',
  '/applications': 'Applications',
  '/portfolio': 'Portfolio',
  '/devkit': 'DevKit',
  '/cover-letter': 'Cover Letter',
  '/pricing': 'Pricing',
  '/share': 'Share',
};

export function normalizePageLabel(path: string | null | undefined): string {
  if (!path) return 'Unknown';
  const trimmed = path.split('?')[0].split('#')[0];
  if (PAGE_LABEL_MAP[trimmed]) return PAGE_LABEL_MAP[trimmed];
  for (const [key, label] of Object.entries(PAGE_LABEL_MAP)) {
    if (key !== '/' && trimmed.startsWith(key + '/')) return label;
  }
  const segments = trimmed.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';
  return segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
}

export function isTestRoute(path: string | null | undefined): boolean {
  if (!path) return false;
  return TEST_ROUTE_PATTERNS.some(p => p.test(path));
}

export function filterCleanPages<T extends { name?: string; page?: string | null }>(
  items: T[],
): T[] {
  return items.filter(item => {
    const page = (item.name ?? item.page ?? '') as string;
    return !isTestRoute(page);
  });
}

export function normalizeReferrer(
  url: string | null | undefined,
  isDev: boolean,
): string | null {
  if (!url || url === 'direct' || url === '') return null;
  try {
    const parsed = new URL(url);
    if (!isDev && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return null;
    }
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function cleanReferrers(
  items: { name: string; count: number }[],
  isDev: boolean,
): { name: string; count: number }[] {
  const cleaned: Record<string, number> = {};
  for (const item of items) {
    const normalized = normalizeReferrer(item.name, isDev);
    if (!normalized) continue;
    cleaned[normalized] = (cleaned[normalized] ?? 0) + item.count;
  }
  return Object.entries(cleaned)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function formatUnknown(value: string | null | undefined): string {
  if (!value || value === '??' || value === 'null' || value === 'undefined') return 'Unknown';
  return value;
}

export function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}
