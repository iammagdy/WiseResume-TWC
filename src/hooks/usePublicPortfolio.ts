import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseConstants';
import type { Experience, Education, Project, Certification, Award, Publication, Volunteering, Hobby } from '@/types/resume';
import type { CaseStudy, PortfolioService } from '@/hooks/useProfile';

export interface PortfolioSections {
  experience: boolean;
  education: boolean;
  skills: boolean;
  projects: boolean;
  certifications: boolean;
  awards: boolean;
  publications: boolean;
  volunteering: boolean;
  githubProjects: boolean;
}

export interface PublicProfile {
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  industry: string | null;
  careerLevel: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  contactEmail: string | null;
  portfolioBio: string | null;
  theme: string | null;
  views: number;
  username: string;
  portfolioSections: PortfolioSections | null;
  metaTitle: string | null;
  metaDescription: string | null;
  // Portfolio design fields
  portfolioStyle: string;
  portfolioLayout: 'single' | 'two-col';
  portfolioAccentColor: string | null;
  portfolioFont: 'inter' | 'space-grotesk' | 'serif';
  openToWork: boolean;
  availabilityHeadline: string | null;
  lastActiveAt: string | null;
  // Portfolio extras
  caseStudies: CaseStudy[];
  services: PortfolioService[];
  testimonials: Array<{ id: string; quote: string; authorName: string; authorTitle?: string; avatarUrl?: string }>;
  highlights: Array<{ id: string; value: string; label: string }>;
  portfolioSummary: string | null;
  portfolioSyncMode: 'auto' | 'locked';
  githubProjectsCache: Array<{ name: string; description: string; url: string; language: string | null; stars: number; topics: string[] }>;
  availabilityStatus: 'actively-looking' | 'open-to-offers' | 'not-looking';
  sectionOrder: string[] | null;
  pinnedProject: { title: string; description: string; url: string } | null;
  scrollEffect: 'fade' | 'parallax' | 'tilt-3d' | 'cinematic' | null;
  seoNoindex: boolean;
  videoIntroUrl: string | null;
  schedulingUrl: string | null;
  abChallengerTheme: string | null;
  portfolioCertifications: Array<{ id: string; name: string; issuer: string; date: string; credentialUrl: string; badgeUrl: string }>;
  portfolioPrimaryLanguage: string | null;
  portfolioSecondaryLanguage: string | null;
  portfolioTranslations: Record<string, {
    bio?: string;
    portfolioSummary?: string;
    pinnedProjectDescription?: string;
    highlights?: Array<{ id: string; value: string; label: string }>;
    services?: Array<{ id: string; title: string; description?: string }>;
    testimonials?: Array<{ id: string; quote: string }>;
    caseStudies?: Array<{ id: string; title: string; challenge: string; outcome: string }>;
    portfolioCertifications?: Array<{ id: string; name: string; issuer: string }>;
  }> | null;
  passwordEnabled: boolean;
  customDomain: string | null;
  contactFormEnabled: boolean;
}

export interface PublicResume {
  id: string;
  title: string;
  summary: string | null;
  templateId: string | null;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications: Certification[];
  awards: Award[];
  publications: Publication[];
  volunteering: Volunteering[];
  hobbies: Hobby[];
}

export interface PublicPortfolioData {
  profile: PublicProfile;
  resume: PublicResume;
}

async function fetchPublicPortfolio(username: string, password?: string | null): Promise<PublicPortfolioData | null> {
  const params: Record<string, string> = { p_username: username.toLowerCase() };
  if (password != null) params.p_password = password;

  let { data, error } = await supabase.rpc('get_public_portfolio', params);

  // If PostgreSQL reports the function signature doesn't exist yet (migration pending),
  // fall back to calling without p_password so portfolios remain accessible.
  // This is a temporary bridge; the migration adds p_password support server-side.
  if (error && (error as { code?: string }).code === '42883' && password != null) {
    console.warn('get_public_portfolio p_password overload not yet deployed — falling back to legacy call');
    const fallback = await supabase.rpc('get_public_portfolio', { p_username: username.toLowerCase() });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Error fetching public portfolio:', error);
    throw error;
  }

  if (!data) return null;

  const raw = data as Record<string, unknown>;

  // Server returns this discriminated shape when password is wrong.
  // Never expose the hash — the server already did the comparison.
  if (raw.error === 'invalid_password') {
    throw new Error('invalid_password');
  }
  const profile = raw.profile as Record<string, unknown>;
  const resume = raw.resume as Record<string, unknown>;

  const extras = (profile.portfolioExtras as Record<string, any>) || {};
  const safeArray = (arr: any) => Array.isArray(arr) ? arr : [];

  return {
    profile: {
      fullName: (profile.fullName as string) || null,
      avatarUrl: (profile.avatarUrl as string) || null,
      jobTitle: (profile.jobTitle as string) || null,
      industry: (profile.industry as string) || null,
      careerLevel: (profile.careerLevel as string) || null,
      location: (profile.location as string) || null,
      linkedinUrl: (profile.linkedinUrl as string) || null,
      githubUrl: (profile.githubUrl as string) || null,
      websiteUrl: (profile.websiteUrl as string) || null,
      twitterUrl: (profile.twitterUrl as string) || null,
      contactEmail: (profile.contactEmail as string) || null,
      portfolioBio: (profile.portfolioBio as string) || null,
      theme: (profile.theme as string) || null,
      views: (profile.views as number) || 0,
      username: (profile.username as string) || username,
      portfolioSections: (profile.portfolioSections as PortfolioSections) || null,
      metaTitle: (profile.metaTitle as string) || null,
      metaDescription: (profile.metaDescription as string) || null,
      portfolioStyle: ((profile.portfolioStyle as string) || 'minimal'),
      portfolioLayout: ((profile.portfolioLayout as string) || 'single') as 'single' | 'two-col',
      portfolioAccentColor: (profile.portfolioAccentColor as string) || null,
      portfolioFont: ((profile.portfolioFont as string) || 'inter') as 'inter' | 'space-grotesk' | 'serif',
      openToWork: (profile.openToWork as boolean) || false,
      availabilityHeadline: (profile.availabilityHeadline as string) || null,
      lastActiveAt: (profile.lastActiveAt as string) || null,
      caseStudies: safeArray(extras.caseStudies),
      services: safeArray(extras.services),
      testimonials: safeArray(extras.testimonials),
      highlights: safeArray(extras.highlights),
      portfolioSummary: (extras.portfolioSummary as string) || null,
      portfolioSyncMode: ((profile.portfolioSyncMode as string) || 'auto') as 'auto' | 'locked',
      githubProjectsCache: (profile.githubProjectsCache as Array<{ name: string; description: string; url: string; language: string | null; stars: number; topics: string[] }>) || [],
      availabilityStatus: ((extras.availabilityStatus as string) || ((profile.openToWork as boolean) ? 'actively-looking' : 'not-looking')) as 'actively-looking' | 'open-to-offers' | 'not-looking',
      sectionOrder: (extras.sectionOrder as string[]) || null,
      pinnedProject: (extras.pinnedProject as { title: string; description: string; url: string }) || null,
      scrollEffect: ((extras.scrollEffect as string) || null) as 'fade' | 'parallax' | 'tilt-3d' | 'cinematic' | null,
      seoNoindex: (profile.seoNoindex as boolean) || false,
      videoIntroUrl: (extras.videoIntroUrl as string) || null,
      schedulingUrl: (extras.schedulingUrl as string) || null,
      abChallengerTheme: (extras.abChallengerTheme as string) || null,
      portfolioCertifications: safeArray(extras.portfolioCertifications),
      portfolioPrimaryLanguage: (extras.portfolioPrimaryLanguage as string) || 'English',
      portfolioSecondaryLanguage: (extras.portfolioSecondaryLanguage as string) || null,
      portfolioTranslations: (extras.portfolioTranslations as PublicProfile['portfolioTranslations']) || null,
      passwordEnabled: (extras.passwordEnabled as boolean) || false,
      customDomain: (extras.customDomain as string) || null,
      contactFormEnabled: typeof extras.contactFormEnabled === 'boolean' ? extras.contactFormEnabled : true,
    },
    resume: {
      id: (resume.id as string) || '',
      title: (resume.title as string) || 'Untitled',
      summary: (resume.summary as string) || null,
      templateId: (resume.templateId as string) || null,
      experience: (resume.experience as Experience[]) || [],
      education: (resume.education as Education[]) || [],
      skills: (resume.skills as string[]) || [],
      projects: (resume.projects as Project[]) || [],
      certifications: (resume.certifications as Certification[]) || [],
      awards: (resume.awards as Award[]) || [],
      publications: (resume.publications as Publication[]) || [],
      volunteering: (resume.volunteering as Volunteering[]) || [],
      hobbies: (resume.hobbies as Hobby[]) || [],
    },
  };
}

export function usePublicPortfolio(username: string | undefined, fetchEnabled = true, password?: string | null) {
  return useQuery({
    // Include password in queryKey so a new attempt triggers a fresh fetch.
    queryKey: ['public-portfolio', username, password ?? null],
    queryFn: () => fetchPublicPortfolio(username!, password),
    enabled: !!username && fetchEnabled,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
}

// ─── Portfolio Gate (lightweight password check) ───────────────────────────────
export interface PortfolioGateInfo {
  fullName: string | null;
  avatarUrl: string | null;
  accentColor: string | null;
  passwordEnabled: boolean;
  portfolioEnabled: boolean;
  // passwordHash intentionally absent — server enforces password, never returns hash to client
}

async function fetchPortfolioGateInfo(username: string): Promise<PortfolioGateInfo | null> {
  // Use the dedicated gate RPC: never returns passwordHash — enforcement is server-side.
  const { data, error } = await supabase.rpc('get_portfolio_gate_info', {
    p_username: username.toLowerCase(),
  });
  if (!error && data) {
    const raw = data as Record<string, unknown>;
    return {
      fullName: (raw.fullName as string) || null,
      avatarUrl: (raw.avatarUrl as string) || null,
      accentColor: (raw.accentColor as string) || null,
      passwordEnabled: (raw.passwordEnabled as boolean) || false,
      portfolioEnabled: (raw.portfolioEnabled as boolean) || false,
    };
  }

  // Fallback: safeClient query if get_portfolio_gate_info RPC is not yet deployed.
  // We fetch only non-sensitive columns. portfolio_extras is avoided because it
  // contains the passwordHash field. passwordEnabled is inferred from the RPC
  // failure: if the RPC is unavailable, we conservatively assume no gate is needed
  // and return passwordEnabled=false so the caller doesn't show a gate it can't enforce.
  // (The new RPC is now deployed; this path is only reached if Supabase is degraded.)
  const { data: rows } = await supabase
    .from('profiles')
    .select('full_name,avatar_url,portfolio_enabled,portfolio_accent_color')
    .eq('username', username.toLowerCase())
    .limit(1);
  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    fullName: (row.full_name as string) || null,
    avatarUrl: (row.avatar_url as string) || null,
    accentColor: (row.portfolio_accent_color as string) || null,
    // passwordEnabled conservatively false: in degraded state the gate RPC is
    // unavailable so we cannot enforce a password — we do not expose portfolios
    // without a gate (the get_public_portfolio call itself is the enforcement layer).
    passwordEnabled: false,
    portfolioEnabled: (row.portfolio_enabled as boolean) || false,
  };
}

export function usePortfolioGate(username: string | undefined) {
  return useQuery({
    queryKey: ['portfolio-gate', username],
    queryFn: () => fetchPortfolioGateInfo(username!),
    enabled: !!username,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  });
}

// ─── Custom domain resolution ──────────────────────────────────────────────────
const KNOWN_APP_SUFFIXES = [
  '.replit.dev',
  '.replit.app',
  '.thewise.cloud',
  '.kirk.replit.dev',
  '.picard.replit.dev',
];

export function isAppHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  return KNOWN_APP_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

async function fetchPublicPortfolioByDomain(domain: string): Promise<PublicPortfolioData | null> {
  const params = new URLSearchParams({
    select: 'username',
    portfolio_enabled: 'eq.true',
    'portfolio_extras->>customDomain': `eq.${domain}`,
    limit: '1',
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${params}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json() as Array<{ username: string }>;
  const username = rows?.[0]?.username;
  if (!username) return null;
  return fetchPublicPortfolio(username);
}

export function usePublicPortfolioByDomain(domain: string | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['public-portfolio-by-domain', domain],
    queryFn: async () => {
      const data = await fetchPublicPortfolioByDomain(domain!);
      if (data?.profile?.username) {
        queryClient.setQueryData(['public-portfolio', data.profile.username], data);
      }
      return data;
    },
    enabled: !!domain,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}
