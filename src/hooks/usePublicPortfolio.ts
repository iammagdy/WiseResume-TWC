import { useQuery } from '@tanstack/react-query';
import { resolvePublicApiBase } from '@/lib/publicApiBase';

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

export function usePortfolioGate(username: string | undefined) {
  return useQuery<PortfolioGateInfo | null>({
    queryKey: ['portfolio-gate', username],
    queryFn: async () => {
      if (!username) return null;
      return fetchPublicPortfolioJson<PortfolioGateInfo>(
        buildPublicPortfolioUrl(`/api/public-portfolio?mode=gate&username=${encodeURIComponent(username.toLowerCase())}`),
      );
    },
    enabled: !!username,
    staleTime: 30_000,
  });
}

export function usePublicPortfolio(
  username: string | undefined,
  contentEnabled = true,
  submittedPassword: string | null = null,
) {
  return useQuery<{ profile: PublicProfile; resume: PublicResume } | null>({
    queryKey: ['public-portfolio', username, contentEnabled, submittedPassword],
    queryFn: async () => {
      if (!username) return null;

      const payload = await fetchPublicPortfolioJson<{ profile: PublicProfile; resume: PublicResume }>(
        buildPublicPortfolioUrl('/api/public-portfolio'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.toLowerCase(),
            password: submittedPassword,
          }),
        },
      );

      if (!payload) return null;
      return {
        profile: payload.profile,
        resume: {
          $id: payload.resume.$id || '',
          summary: payload.resume.summary ?? null,
          experience: payload.resume.experience ?? [],
          education: payload.resume.education ?? [],
          skills: payload.resume.skills ?? [],
          projects: payload.resume.projects ?? [],
          certifications: payload.resume.certifications ?? [],
          awards: payload.resume.awards ?? [],
          publications: payload.resume.publications ?? [],
          volunteering: payload.resume.volunteering ?? [],
        },
      };
    },
    enabled: !!username && contentEnabled,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if ((error as Error)?.message === 'invalid_password') return false;
      return failureCount < 2;
    },
  });
}

export function validateCustomDomain(domain: string): string | null {
  if (!domain || !domain.trim()) return null;
  const d = domain.trim().toLowerCase();
  const appDomains = ['thewise.cloud', 'wiseresume.com', 'wiseresume.app', 'localhost', '127.0.0.1'];
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
    h === 'www.wiseresume.app'
  );
}

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
