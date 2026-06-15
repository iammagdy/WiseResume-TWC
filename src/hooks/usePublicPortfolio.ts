import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';

// ── Public types ──────────────────────────────────────────────────────────────

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
  // portfolioExtras fields surfaced directly
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

// ── Helper: SHA-256 hash in hex ───────────────────────────────────────────────

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Helper: normalize possibly malformed array data from Appwrite ─────────────

function normalizeArray<T>(value: unknown, defaultValue: T[] = []): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === null || value === undefined) return defaultValue;
  // Handle case where Appwrite returns JSON string that should be parsed
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      // Fall through to default
    }
  }
  return defaultValue;
}

// ── Helper: map raw Appwrite profile document to PublicProfile ────────────────

/** Parse a field that Appwrite may return as a JSON string or as an object */
function parseExtras(raw: unknown): Record<string, unknown> {
  if (raw === null || raw === undefined) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return {};
}

function mapProfile(p: Record<string, unknown>): PublicProfile {
  // Appwrite stores fields in snake_case. Fall back to camelCase for safety.
  const extras = parseExtras(p.portfolio_extras ?? p.portfolioExtras);
  return {
    $id: p.$id as string,
    user_id: p.user_id as string,
    username: (p.username as string) ?? '',
    fullName: ((p.full_name ?? p.fullName) as string | null) ?? null,
    jobTitle: ((p.job_title ?? p.jobTitle) as string | null) ?? null,
    avatarUrl: ((p.avatar_url ?? p.avatarUrl) as string | null) ?? null,
    portfolioBio: ((p.portfolio_bio ?? p.portfolioBio) as string | null) ?? null,
    portfolioEnabled: ((p.portfolio_enabled ?? p.portfolioEnabled) as boolean) ?? false,
    portfolioStyle: ((p.portfolio_style ?? p.portfolioStyle) as string | null) ?? null,
    portfolioLayout: ((p.portfolio_layout ?? p.portfolioLayout) as string | null) ?? null,
    portfolioAccentColor: ((p.portfolio_accent_color ?? p.portfolioAccentColor) as string | null) ?? null,
    portfolioFont: ((p.portfolio_font ?? p.portfolioFont) as string | null) ?? null,
    portfolioSections: ((p.portfolio_sections ?? p.portfolioSections) as PortfolioSections | null) ?? null,
    portfolioMetaTitle: ((p.portfolio_meta_title ?? p.portfolioMetaTitle) as string | null) ?? null,
    portfolioMetaDescription: ((p.portfolio_meta_description ?? p.portfolioMetaDescription) as string | null) ?? null,
    metaTitle: ((p.meta_title ?? p.metaTitle) as string | null) ?? null,
    metaDescription: ((p.meta_description ?? p.metaDescription) as string | null) ?? null,
    theme: ((p.portfolio_theme ?? p.theme) as string | null) ?? null,
    githubUrl: ((p.github_url ?? p.githubUrl) as string | null) ?? null,
    linkedinUrl: ((p.linkedin_url ?? p.linkedinUrl) as string | null) ?? null,
    twitterUrl: ((p.twitter_url ?? p.twitterUrl) as string | null) ?? null,
    websiteUrl: ((p.website_url ?? p.websiteUrl) as string | null) ?? null,
    contactEmail: ((p.contact_email ?? p.contactEmail) as string | null) ?? null,
    openToWork: ((p.open_to_work ?? p.openToWork) as boolean) ?? false,
    availabilityStatus: (extras.availabilityStatus as string | null) ?? null,
    availabilityHeadline: ((p.availability_headline ?? p.availabilityHeadline) as string | null) ?? null,
    location: (p.location as string | null) ?? null,
    industry: (p.industry as string | null) ?? null,
    seoNoindex: ((p.seo_noindex ?? p.seoNoindex) as boolean) ?? false,
    lastActiveAt: ((p.last_active_at ?? p.lastActiveAt) as string | null) ?? null,
    portfolioTranslations: (extras.portfolioTranslations as Record<string, Record<string, unknown>> | null) ?? null,
    testimonials: (extras.testimonials as PublicProfile['testimonials']) ?? null,
    services: (extras.services as PublicProfile['services']) ?? null,
    caseStudies: (extras.caseStudies as PublicProfile['caseStudies']) ?? null,
    highlights: (extras.highlights as PublicProfile['highlights']) ?? null,
    portfolioSummary: (extras.portfolioSummary as string | null) ?? null,
    sectionOrder: (extras.sectionOrder as string[] | null) ?? null,
    pinnedProject: (extras.pinnedProject as PublicProfile['pinnedProject']) ?? null,
    scrollEffect: (extras.scrollEffect as string | null) ?? null,
    videoIntroUrl: (extras.videoIntroUrl as string | null) ?? null,
    schedulingUrl: (extras.schedulingUrl as string | null) ?? null,
    abChallengerTheme: (extras.abChallengerTheme as string | null) ?? null,
    portfolioCertifications: (extras.portfolioCertifications as PublicProfile['portfolioCertifications']) ?? null,
    githubProjectsCache: ((p.github_projects_cache ?? p.githubProjectsCache) as unknown[] | null) ?? null,
    portfolioPrimaryLanguage: (extras.portfolioPrimaryLanguage as string | null) ?? null,
    portfolioSecondaryLanguage: (extras.portfolioSecondaryLanguage as string | null) ?? null,
    contactFormEnabled: typeof extras.contactFormEnabled === 'boolean' ? extras.contactFormEnabled : true,
  };
}

// ── Gate check — lightweight, no password hash exposed ───────────────────────

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
      const res = await databases.listDocuments(DATABASE_ID, 'profiles', [
        Query.equal('username', username.toLowerCase()),
        Query.limit(1),
      ]);
      if (res.total === 0) return { passwordEnabled: false, accentColor: '#e84545', exists: false };
      const p = res.documents[0] as Record<string, unknown>;
      const extras = parseExtras(p.portfolio_extras ?? p.portfolioExtras);
      return {
        passwordEnabled: !!(extras.passwordEnabled),
        accentColor: ((p.portfolio_accent_color ?? p.portfolioAccentColor) as string) || '#e84545',
        exists: !!(p.portfolio_enabled ?? p.portfolioEnabled),
      };
    },
    enabled: !!username,
    staleTime: 30_000,
  });
}

// ── Full portfolio fetch ───────────────────────────────────────────────────────

export function usePublicPortfolio(
  username: string | undefined,
  contentEnabled = true,
  submittedPassword: string | null = null,
) {
  return useQuery({
    queryKey: ['public-portfolio', username, contentEnabled, submittedPassword],
    queryFn: async () => {
      if (!username) return null;

      const profileRes = await databases.listDocuments(DATABASE_ID, 'profiles', [
        Query.equal('username', username.toLowerCase()),
        Query.limit(1),
      ]);
      if (profileRes.total === 0) return null;

      const rawProfile = profileRes.documents[0] as Record<string, unknown>;
      const extras = parseExtras(rawProfile.portfolio_extras ?? rawProfile.portfolioExtras);

      // If the owner hasn't published their portfolio, treat it as not found.
      const portfolioEnabled = rawProfile.portfolio_enabled === true || rawProfile.portfolioEnabled === true;
      if (!portfolioEnabled) return null;

      // Password verification — compare SHA-256 hashes client-side.
      // The hash is stored in portfolioExtras.passwordHash (written by the editor).
      if (extras.passwordEnabled && extras.passwordHash) {
        if (!submittedPassword) {
          // Content should not be loaded yet; gate check should have caught this.
          return null;
        }
        const submittedHash = await sha256Hex(submittedPassword);
        if (submittedHash !== extras.passwordHash) {
          throw new Error('invalid_password');
        }
      }

      const profile = mapProfile(rawProfile);

      const resumeRes = await databases.listDocuments(DATABASE_ID, 'resumes', [
        Query.equal('user_id', rawProfile.user_id as string),
        Query.limit(1),
      ]);
      const rawResume = resumeRes.documents[0] as Record<string, unknown> | undefined;
      const resume: PublicResume = rawResume
        ? {
            $id: rawResume.$id as string,
            summary: (rawResume.summary as string | null) ?? null,
            experience: normalizeArray<PublicResume['experience'][number]>(rawResume.experience),
            education: normalizeArray<PublicResume['education'][number]>(rawResume.education),
            skills: normalizeArray<PublicResume['skills'][number]>(rawResume.skills),
            projects: normalizeArray<PublicResume['projects'][number]>(rawResume.projects),
            certifications: normalizeArray<PublicResume['certifications'][number]>(rawResume.certifications),
            awards: normalizeArray<PublicResume['awards'][number]>(rawResume.awards),
            publications: normalizeArray<PublicResume['publications'][number]>(rawResume.publications),
            volunteering: normalizeArray<PublicResume['volunteering'][number]>(rawResume.volunteering),
          }
        : {
            $id: '',
            summary: null,
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
            awards: [],
            publications: [],
            volunteering: [],
          };

      return { profile, resume };
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
  return useQuery({
    queryKey: ['public-portfolio-by-domain', domain],
    queryFn: async () => null,
    enabled: !!domain,
  });
}
