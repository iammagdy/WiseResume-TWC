/**
 * Maps route prefixes to human-readable page titles for the mobile header.
 * Order matters — first match wins.
 */
const PAGE_TITLES: [string, string][] = [
  ['/editor', 'Editor'],
  ['/preview', 'Preview'],
  ['/upload', 'Import Resume'],
  ['/ai-studio', 'AI Tools'],
  ['/interview', 'Interview Prep'],
  ['/career', 'Career Path'],
  ['/cover-letter', 'Cover Letter'],
  ['/cover-letters', 'Cover Letters'],
  ['/resignation-letter', 'Resignation Letter'],
  ['/resignation-letters', 'Resignation Letters'],
  ['/applications', 'Activity'],
  ['/application', 'Application'],
  ['/job', 'Job Details'],
  ['/settings', 'Settings'],
  ['/profile', 'Profile'],
  ['/notifications', 'Notifications'],
  ['/templates', 'Templates'],
  ['/examples', 'Examples'],
  ['/guides', 'Guides'],
  ['/resume', 'Resume'],
  ['/onboarding', 'Getting Started'],
  ['/portfolio', 'Portfolio'],
  ['/dashboard', 'Home'],
];

/**
 * Get a human-readable page title for the current route.
 * Returns null for unmapped routes (will fallback to brand name).
 */
export function getPageTitle(pathname: string): string | null {
  for (const [prefix, title] of PAGE_TITLES) {
    if (pathname.startsWith(prefix)) return title;
  }
  return null;
}
