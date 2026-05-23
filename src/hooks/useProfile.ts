import { useQuery, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import {
  PORTFOLIO_DRAFT_EXTRAS_KEY,
  PORTFOLIO_DRAFT_SAVED_AT_EXTRAS_KEY,
  mergeDraftIntoPortfolioExtras,
  readPortfolioDraftFromProfileDoc,
} from '@/lib/portfolioDraftStorage';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type CareerLevel = 'entry' | 'mid' | 'senior' | 'executive';

export interface Profile {
  id?: string;
  user_id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  industry: string | null;
  careerLevel: CareerLevel | null;
  location: string | null;
  linkedinUrl: string | null;
  profileCompleted: boolean;
  username: string | null;
  portfolioBio: string | null;
  portfolioEnabled: boolean;
  onboarding_completed: boolean;
  loginStreak: number;
  updatedAt?: string;
  // Portfolio-specific fields
  githubUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  contactEmail: string | null;
  theme: string | null;
  portfolioSections: Record<string, unknown> | null;
  portfolioMetaTitle: string | null;
  portfolioMetaDescription: string | null;
  portfolioStyle: string | null;
  portfolioLayout: string | null;
  portfolioAccentColor: string | null;
  portfolioFont: string | null;
  openToWork: boolean;
  portfolioExtras: Record<string, unknown> | null;
  availabilityHeadline: string | null;
  portfolioSyncMode: string | null;
  portfolioDraft: Record<string, unknown> | null;
  portfolioDraftSavedAt: string | null;
  portfolioResumeId: string | null;
  phoneNumber: string | null;
  views: number;
  lastLoginDate: string | null;
  digestEnabled: boolean;
  hiredAt: string | null;
}

/** Minimal shape accepted by the profile completion helpers — camelCase keys matching Profile */
export interface ProfileCompletionFields {
  fullName?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  careerLevel?: string | null;
  location?: string | null;
}

export function calculateProfileCompletion(profile: ProfileCompletionFields | null): number {
  if (!profile) return 0;
  const fields: (keyof ProfileCompletionFields)[] = ['fullName', 'jobTitle', 'industry', 'careerLevel', 'location'];
  const filled = fields.filter(f => !!profile[f]).length;
  return (filled / fields.length) * 100;
}

export function getNextMissingField(profile: ProfileCompletionFields | null): string | null {
  if (!profile) return 'fullName';
  if (!profile.fullName) return 'fullName';
  if (!profile.jobTitle) return 'jobTitle';
  if (!profile.industry) return 'industry';
  if (!profile.location) return 'location';
  return null;
}

export interface ProfileUpdates {
  // Core fields
  fullName?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  careerLevel?: CareerLevel | null;
  location?: string | null;
  onboarding_completed?: boolean;
  avatarUrl?: string | null;
  linkedinUrl?: string | null;
  profileCompleted?: boolean;
  portfolioBio?: string | null;
  portfolioEnabled?: boolean;
  username?: string | null;
  // Portfolio-specific fields
  portfolioResumeId?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  contactEmail?: string | null;
  theme?: string | null;
  portfolioSections?: Record<string, unknown> | null;
  portfolioMetaTitle?: string | null;
  portfolioMetaDescription?: string | null;
  portfolioStyle?: string | null;
  portfolioLayout?: string | null;
  portfolioAccentColor?: string | null;
  portfolioFont?: string | null;
  openToWork?: boolean;
  availabilityHeadline?: string | null;
  portfolioSyncMode?: string | null;
  portfolioExtras?: Record<string, unknown> | null;
  portfolioDraft?: Record<string, unknown> | null;
  portfolioDraftSavedAt?: string | null;
  phoneNumber?: string | null;
  digestEnabled?: boolean;
  hiredAt?: string | null;
}

/** Parse a field that Appwrite may return as a JSON string or as an object */
function parseJsonField(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return null;
}

/** Appwrite stores former Supabase JSONB columns as stringified JSON attributes. */
function stringifyJsonField(value: Record<string, unknown> | null): string | null {
  if (value === null) return null;
  return JSON.stringify(value);
}

export function useProfile(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: profile = null, isLoading: loading } = useQuery({
    queryKey: ['profile', userId],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      // No Query.select — return all fields so portfolio and other extended
      // fields are available without individual column enumeration.
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
        Query.equal('user_id', userId),
      ]);
      const doc = response.documents[0];
      if (!doc) return null;

      const draftFields = readPortfolioDraftFromProfileDoc(doc as Record<string, unknown>);

      return {
        id: doc.$id as string,
        user_id: doc.user_id as string,
        email: (doc.email as string | null) ?? null,
        fullName: (doc.full_name as string | null) ?? null,
        avatarUrl: (doc.avatar_url as string | null) ?? null,
        jobTitle: (doc.job_title as string | null) ?? null,
        industry: (doc.industry as string | null) ?? null,
        careerLevel: (doc.career_level as CareerLevel | null) ?? null,
        location: (doc.location as string | null) ?? null,
        linkedinUrl: (doc.linkedin_url as string | null) ?? null,
        profileCompleted: (doc.profile_completed as boolean) ?? false,
        username: (doc.username as string | null) ?? null,
        portfolioBio: (doc.portfolio_bio as string | null) ?? null,
        portfolioEnabled: (doc.portfolio_enabled as boolean) ?? false,
        onboarding_completed: (doc.onboarding_completed as boolean) ?? false,
        loginStreak: (doc.login_streak as number) ?? 0,
        updatedAt: doc.$updatedAt as string,
        // Portfolio-specific
        githubUrl: (doc.github_url as string | null) ?? null,
        websiteUrl: (doc.website_url as string | null) ?? null,
        twitterUrl: (doc.twitter_url as string | null) ?? null,
        contactEmail: (doc.contact_email as string | null) ?? null,
        theme: ((doc.portfolio_theme ?? doc.theme) as string | null) ?? null,
        portfolioSections: parseJsonField(doc.portfolio_sections),
        portfolioMetaTitle: (doc.portfolio_meta_title as string | null) ?? null,
        portfolioMetaDescription: (doc.portfolio_meta_description as string | null) ?? null,
        portfolioStyle: (doc.portfolio_style as string | null) ?? null,
        portfolioLayout: (doc.portfolio_layout as string | null) ?? null,
        portfolioAccentColor: (doc.portfolio_accent_color as string | null) ?? null,
        portfolioFont: (doc.portfolio_font as string | null) ?? null,
        openToWork: (doc.open_to_work as boolean) ?? false,
        portfolioExtras: parseJsonField(doc.portfolio_extras),
        availabilityHeadline: (doc.availability_headline as string | null) ?? null,
        portfolioSyncMode: (doc.portfolio_sync_mode as string | null) ?? null,
        portfolioDraft: draftFields.portfolioDraft,
        portfolioDraftSavedAt: draftFields.portfolioDraftSavedAt,
        portfolioResumeId: (doc.portfolio_resume_id as string | null) ?? null,
        phoneNumber: (doc.phone_number as string | null) ?? null,
        views: (doc.views as number) ?? 0,
        lastLoginDate: (doc.last_login_date as string | null) ?? null,
        digestEnabled: (doc.digest_enabled as boolean) ?? true,
        hiredAt: (doc.hired_at as string | null) ?? null,
      };
    },
    enabled: !!userId,
  });

  const updateProfile = async (updates: ProfileUpdates): Promise<void> => {
    if (!userId) throw new Error('Identity not settled');
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
      Query.equal('user_id', userId),
    ]);
    const data: Record<string, unknown> = {};
    // Core fields
    if (updates.fullName !== undefined) data.full_name = updates.fullName;
    if (updates.jobTitle !== undefined) data.job_title = updates.jobTitle;
    if (updates.industry !== undefined) data.industry = updates.industry;
    if (updates.careerLevel !== undefined) data.career_level = updates.careerLevel;
    if (updates.location !== undefined) data.location = updates.location;
    if (updates.onboarding_completed !== undefined) data.onboarding_completed = updates.onboarding_completed;
    if (updates.avatarUrl !== undefined) data.avatar_url = updates.avatarUrl;
    if (updates.linkedinUrl !== undefined) data.linkedin_url = updates.linkedinUrl;
    if (updates.profileCompleted !== undefined) data.profile_completed = updates.profileCompleted;
    if (updates.portfolioBio !== undefined) data.portfolio_bio = updates.portfolioBio;
    if (updates.portfolioEnabled !== undefined) data.portfolio_enabled = updates.portfolioEnabled;
    if (updates.username !== undefined) data.username = updates.username;
    // Portfolio fields
    if (updates.portfolioResumeId !== undefined) data.portfolio_resume_id = updates.portfolioResumeId;
    if (updates.githubUrl !== undefined) data.github_url = updates.githubUrl;
    if (updates.websiteUrl !== undefined) data.website_url = updates.websiteUrl;
    if (updates.twitterUrl !== undefined) data.twitter_url = updates.twitterUrl;
    if (updates.contactEmail !== undefined) data.contact_email = updates.contactEmail;
    if (updates.theme !== undefined) data.portfolio_theme = updates.theme;
    if (updates.portfolioSections !== undefined) {
      data.portfolio_sections = stringifyJsonField(updates.portfolioSections);
    }
    if (updates.portfolioMetaTitle !== undefined) data.portfolio_meta_title = updates.portfolioMetaTitle;
    if (updates.portfolioMetaDescription !== undefined) data.portfolio_meta_description = updates.portfolioMetaDescription;
    if (updates.portfolioStyle !== undefined) data.portfolio_style = updates.portfolioStyle;
    if (updates.portfolioLayout !== undefined) data.portfolio_layout = updates.portfolioLayout;
    if (updates.portfolioAccentColor !== undefined) data.portfolio_accent_color = updates.portfolioAccentColor;
    if (updates.portfolioFont !== undefined) data.portfolio_font = updates.portfolioFont;
    if (updates.openToWork !== undefined) data.open_to_work = updates.openToWork;
    if (updates.availabilityHeadline !== undefined) data.availability_headline = updates.availabilityHeadline;
    if (updates.portfolioSyncMode !== undefined) data.portfolio_sync_mode = updates.portfolioSyncMode;
    const doc = existing.documents[0] as Record<string, unknown> | undefined;
    let extrasForWrite: Record<string, unknown> | null | undefined = updates.portfolioExtras;

    if (
      (updates.portfolioDraft !== undefined || updates.portfolioDraftSavedAt !== undefined) &&
      extrasForWrite === undefined &&
      doc
    ) {
      extrasForWrite = parseJsonField(doc.portfolio_extras);
    }

    if (updates.portfolioDraft !== undefined || updates.portfolioDraftSavedAt !== undefined) {
      const base = (extrasForWrite ?? parseJsonField(doc?.portfolio_extras) ?? {}) as Record<string, unknown>;
      const draft =
        updates.portfolioDraft !== undefined
          ? updates.portfolioDraft
          : (base[PORTFOLIO_DRAFT_EXTRAS_KEY] as Record<string, unknown> | undefined) ?? null;
      const savedAt =
        updates.portfolioDraftSavedAt !== undefined
          ? updates.portfolioDraftSavedAt
          : (typeof base[PORTFOLIO_DRAFT_SAVED_AT_EXTRAS_KEY] === 'string'
              ? base[PORTFOLIO_DRAFT_SAVED_AT_EXTRAS_KEY]
              : null);
      extrasForWrite = mergeDraftIntoPortfolioExtras(base, draft, savedAt);
    }

    if (extrasForWrite !== undefined) {
      data.portfolio_extras = stringifyJsonField(extrasForWrite);
    }
    if (updates.phoneNumber !== undefined) data.phone_number = updates.phoneNumber;
    if (updates.digestEnabled !== undefined) data.digest_enabled = updates.digestEnabled;
    if (updates.hiredAt !== undefined) data.hired_at = updates.hiredAt;

    if (existing.total > 0) {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, existing.documents[0].$id, data);
    } else {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.profiles, ID.unique(), {
        ...data,
        user_id: userId,
        email: user?.email ?? null,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    toast.success('Profile updated');
  };

  return { profile, loading, updateProfile };
}

export const INDUSTRY_OPTIONS = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
  'Marketing', 'Sales', 'Real Estate', 'Logistics', 'Retail', 'Other',
];

export const CAREER_LEVEL_OPTIONS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid-Senior' },
  { value: 'senior', label: 'Senior' },
  { value: 'executive', label: 'Executive' },
];
