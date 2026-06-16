import { useQuery } from '@tanstack/react-query';
import { functions } from '@/lib/appwrite';
import type { ExecutionMethod } from 'appwrite';
import { resolvePublicApiBase } from '@/lib/publicApiBase';

// ── Public types ──────────────────────────────────────────────────────────────
// NOTE: These interfaces match what the existing Public Portfolio UI expects.
// Any changes here require updating PublicPortfolioPage.tsx and child components.

export interface PortfolioSections {
  about?: boolean;
  experience?: boolean;
  education?: boolean;
  skills?: boolean;
  projects?: boolean;
  caseStudies?: boolean;
  services?: boolean;
  testimonials?: boolean;
  certifications?: boolean;
  awards?: boolean;
  publications?: boolean;
  volunteering?: boolean;
  githubProjects?: boolean;
}

export interface PublicProfile {
  $id: string;
  user_id: string;
  username: string;
  fullName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  portfolioBio: string | null;
  portfolioEnabled: boolean;
  portfolioStyle: string | null;
  portfolioLayout: string | null;
  portfolioAccentColor: string | null;
  portfolioFont: string | null;
  portfolioSections: PortfolioSections | null;
  portfolioMetaTitle: string | null;
  portfolioMetaDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  theme: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  openToWork: boolean;
  availabilityStatus: string | null;
  availabilityHeadline: string | null;
  location: string | null;
  industry: string | null;
  seoNoindex: boolean;
  lastActiveAt: string | null;
  portfolioTranslations: Record<string, Record<string, unknown>> | null;
  testimonials: Array<{ id: string; quote: string; authorName: string; authorTitle: string }> | null;
  services: Array<{ id: string; title: string; description: string; category: string }> | null;
  caseStudies: Array<{ id: string; title: string; challenge: string; outcome: string }> | null;
  highlights: Array<{ id: string; value: string; label: string }> | null;
  portfolioSummary: string | null;
  sectionOrder: string[] | null;
  pinnedProject: { title: string; description: string; url: string } | null;
  scrollEffect: string | null;
  videoIntroUrl: string | null;
  schedulingUrl: string | null;
  abChallengerTheme: string | null;
  portfolioCertifications: Array<{ id: string; name: string; issuer: string; date: string; credentialUrl: string; badgeUrl: string }> | null;
  githubProjectsCache: unknown[] | null;
  portfolioPrimaryLanguage: string | null;
  portfolioSecondaryLanguage: string | null;
  contactFormEnabled: boolean;
}

export interface PublicResume {
  $id: string;
  summary: string | null;
  experience: Array<{ id?: string; position: string; company: string; startDate?: string; endDate?: string; description?: string; current?: boolean }>;
  education: Array<{ id?: string; institution: string; degree: string; startDate?: string; endDate?: string; gpa?: string }>;
  skills: Array<{ id?: string; name: string; level?: string }> | string[];
  projects: Array<{ id?: string; title: string; description?: string; url?: string; technologies?: string[] }>;
  certifications: Array<{ id?: string; name: string; issuer?: string; date?: string; url?: string }>;
  awards: Array<{ id?: string; title: string; issuer?: string; date?: string; description?: string }>;
  publications: Array<{ id?: string; title: string; publisher?: string; date?: string; url?: string; description?: string }>;
  volunteering: Array<{ id?: string; role: string; organization: string; startDate?: string; endDate?: string; description?: string }>;
}

export interface PublicPortfolio {
  profile: PublicProfile;
  resume: PublicResume;
  sessionToken?: string;
}

function buildPublicPortfolioUrl(pathAndQuery: string): string {
  const apiBase = resolvePublicApiBase();
  return `${apiBase}${pathAndQuery}`;
}

async function fetchPublicPortfolioJson<T>(input: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(input, init);
  if (response.status === 404) return null;
  if (response.status === 401) {
    let code = 'invalid_password';
    try {
      const payload = await response.json() as { error?: string };
      if (payload?.error) code = payload.error;
    } catch {
      // keep default
    }
    throw new Error(code);
  }
  if (!response.ok) {
    throw new Error(`public_portfolio_request_failed:${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface PortfolioGateInfo {
  passwordEnabled: boolean;
  accentColor: string;
  exists: boolean;
}

// ── Gate check — uses server function, NO browser reads of portfolio_settings ──

export function usePortfolioGate(username: string | undefined) {
  return useQuery<PortfolioGateInfo | null>({
    queryKey: ['portfolio-gate', username],
    queryFn: async () => {
      if (!username) return null;

      // SECURITY: Use server function instead of direct DB read
      // This prevents exposing password_hash to browser
      const res = await functions.createExecution(
        'portfolio-gate',
        JSON.stringify({ username: username.toLowerCase() }),
        false,
        '/',
        'POST' as ExecutionMethod,
      );

      const result = JSON.parse(res.responseBody || '{}');

      if (!result.success && !result.exists) {
        return { exists: false, portfolioEnabled: false, passwordEnabled: false, accentColor: '#e84545' };
      }

      return {
        exists: result.exists ?? false,
        portfolioEnabled: result.portfolioEnabled ?? false,
        passwordEnabled: result.passwordEnabled ?? false,
        accentColor: result.accentColor || '#e84545',
      };
    },
    enabled: !!username,
    staleTime: 30_000,
  });
}

// ── Full portfolio fetch — uses server function, NO browser reads ───────────────

export function usePublicPortfolio(
  username: string | undefined,
  contentEnabled = true,
  submittedPassword: string | null = null,
  sessionToken?: string,
) {
  return useQuery<PublicPortfolio | null>({
    queryKey: ['public-portfolio', username, contentEnabled, submittedPassword, sessionToken],
    queryFn: async () => {
      if (!username) return null;

      // SECURITY: Use server function for ALL portfolio data
      // - No direct reads of profiles, resumes, or portfolio_settings
      // - Password verification happens server-side
      // - Only sanitized public data is returned
      const payload: Record<string, string> = { username: username.toLowerCase() };
      if (submittedPassword) {
        payload.password = submittedPassword;
      }
      if (sessionToken) {
        payload.sessionToken = sessionToken;
      }

      const res = await functions.createExecution(
        'get-public-portfolio',
        JSON.stringify(payload),
        false,
        '/',
        'POST' as ExecutionMethod,
      );

      const result = JSON.parse(res.responseBody || '{}');

      if (!result.success) {
        if (result.error === 'Invalid password') {
          throw new Error('invalid_password');
        }
        if (result.protected && result.gate) {
          // Return gate info for protected portfolio
          throw new Error('password_required');
        }
        return null;
      }

      return {
        profile: result.profile,
        resume: result.resume,
        sessionToken: result.sessionToken,
      };
    },
    enabled: !!username && contentEnabled,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if ((error as Error)?.message === 'invalid_password') return false;
      if ((error as Error)?.message === 'password_required') return false;
      return failureCount < 2;
    },
  });
}

export function validateCustomDomain(domain: string): string | null {
  if (!domain || !domain.trim()) return null;
  const d = domain.trim().toLowerCase();
  const appDomains = ['thewise.cloud', 'wiseresume.com', 'wiseresume.app', 'localhost', '127.0.0.1', 'replit.dev', 'replit.co'];
  if (appDomains.some(ad => d.includes(ad))) return 'This domain is reserved — use your own domain.';
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) return 'Invalid domain format.';
  return null;
}

export function isAppHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === 'thewise.cloud' ||
    h.endsWith('.thewise.cloud') ||
    h === 'wiseresume.app' ||
    h === 'www.wiseresume.app' ||
    h.endsWith('.replit.dev') ||
    h.endsWith('.replit.co')
  );
}

/**
 * Custom-domain portfolio resolver.
 *
 * TODO(custom-domains): This is intentionally stubbed — custom-domain portfolio
 * lookup is not yet functional end-to-end. Blockers:
 *   1. `customDomain` is stored inside the `portfolioExtras` JSON blob in Appwrite
 *      and cannot be queried with Query.equal() without a top-level indexed field.
 *   2. No Vercel domain registration automation is in place.
 * Until both are resolved the UI should present custom-domain as "manual setup /
 * beta" only. Returning null causes AppInterior to render "Portfolio not found
 * for this domain." which is the correct honest fallback.
 */
export function usePublicPortfolioByDomain(domain: string | null) {
  return useQuery<{ profile: { username: string }; resume: { $id: string } } | null>({
    queryKey: ['public-portfolio-by-domain', domain],
    queryFn: async () => {
      if (!domain) return null;
      return fetchPublicPortfolioJson<{ profile: { username: string }; resume: { $id: string } }>(
        buildPublicPortfolioUrl(`/api/public-portfolio?mode=domain&domain=${encodeURIComponent(domain.toLowerCase())}`),
      );
    },
    enabled: !!domain,
  });
}
