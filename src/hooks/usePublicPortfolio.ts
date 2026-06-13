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

// ── Helper: map raw Appwrite profile document to PublicProfile ────────────────

function mapProfile(p: Record<string, unknown>): PublicProfile {
  const extras = (p.portfolioExtras ?? {}) as Record<string, unknown>;
  return {
    $id: p.$id as string,
    user_id: p.user_id as string,
    username: (p.username as string) ?? '',
    fullName: (p.fullName as string | null) ?? null,
    jobTitle: (p.jobTitle as string | null) ?? null,
    avatarUrl: (p.avatarUrl as string | null) ?? null,
    portfolioBio: (p.portfolioBio as string | null) ?? null,
    portfolioEnabled: (p.portfolioEnabled as boolean) ?? false,
    portfolioStyle: (p.portfolioStyle as string | null) ?? null,
    portfolioLayout: (p.portfolioLayout as string | null) ?? null,
    portfolioAccentColor: (p.portfolioAccentColor as string | null) ?? null,
    portfolioFont: (p.portfolioFont as string | null) ?? null,
    portfolioSections: (p.portfolioSections as PortfolioSections | null) ?? null,
    portfolioMetaTitle: (p.portfolioMetaTitle as string | null) ?? null,
    portfolioMetaDescription: (p.portfolioMetaDescription as string | null) ?? null,
    metaTitle: (p.metaTitle as string | null) ?? null,
    metaDescription: (p.metaDescription as string | null) ?? null,
    theme: (p.theme as string | null) ?? null,
    githubUrl: (p.githubUrl as string | null) ?? null,
    linkedinUrl: (p.linkedinUrl as string | null) ?? null,
    twitterUrl: (p.twitterUrl as string | null) ?? null,
    websiteUrl: (p.websiteUrl as string | null) ?? null,
    contactEmail: (p.contactEmail as string | null) ?? null,
    openToWork: (p.openToWork as boolean) ?? false,
    availabilityStatus: (extras.availabilityStatus as string | null) ?? null,
    availabilityHeadline: (p.availabilityHeadline as string | null) ?? null,
    location: (p.location as string | null) ?? null,
    industry: (p.industry as string | null) ?? null,
    seoNoindex: (p.seoNoindex as boolean) ?? false,
    lastActiveAt: (p.lastActiveAt as string | null) ?? null,
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
    githubProjectsCache: (p.githubProjectsCache as unknown[] | null) ?? null,
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
      const extras = (p.portfolioExtras ?? {}) as Record<string, unknown>;
      return {
        passwordEnabled: !!(extras.passwordEnabled),
        accentColor: (p.portfolioAccentColor as string) || '#e84545',
        exists: !!(p.portfolioEnabled),
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
      const extras = (rawProfile.portfolioExtras ?? {}) as Record<string, unknown>;

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
            experience: (rawResume.experience as PublicResume['experience']) ?? [],
            education: (rawResume.education as PublicResume['education']) ?? [],
            skills: (rawResume.skills as PublicResume['skills']) ?? [],
            projects: (rawResume.projects as PublicResume['projects']) ?? [],
            certifications: (rawResume.certifications as PublicResume['certifications']) ?? [],
            awards: (rawResume.awards as PublicResume['awards']) ?? [],
            publications: (rawResume.publications as PublicResume['publications']) ?? [],
            volunteering: (rawResume.volunteering as PublicResume['volunteering']) ?? [],
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

export function usePublicPortfolioByDomain(domain: string | null) {
  return useQuery({
    queryKey: ['public-portfolio-by-domain', domain],
    queryFn: async () => null,
    enabled: !!domain,
  });
}
