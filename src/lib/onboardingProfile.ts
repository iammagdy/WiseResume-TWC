/**
 * Onboarding profile helpers
 *
 * Normalizes extraction results from the CV parser (`ResumeData`) and the
 * LinkedIn parser (`Partial<ProfileData>`) into a single `ExtractedProfile`
 * shape that powers the per-item Review & Confirm sheet, then persists the
 * user's selection to the `profiles` table and (when there's substantial
 * resume content) to the `resumes` table.
 */

import type { ResumeData } from '@/types/resume';
import type { ProfileData } from '@/components/settings/ProfileImportSheet';
import { databases, DATABASE_ID, Query, ID, account } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { upsertProfileIdentity } from '@/lib/profileSeed';

export interface OnboardingExperience {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description?: string;
}

export interface OnboardingEducation {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  startYear?: string;
  endYear?: string;
  description?: string;
}

export interface OnboardingCertification {
  id: string;
  name: string;
  organization?: string;
  date?: string;
}

export interface OnboardingLanguage {
  id: string;
  language: string;
  proficiency?: string;
}

export interface OnboardingProject {
  id: string;
  name: string;
  description?: string;
  url?: string;
}

export interface OnboardingVolunteering {
  id: string;
  role: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ExtractedProfile {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  jobTitle?: string;
  summary?: string;
  experience: OnboardingExperience[];
  education: OnboardingEducation[];
  skills: string[];
  certifications: OnboardingCertification[];
  languages: OnboardingLanguage[];
  projects: OnboardingProject[];
  volunteering: OnboardingVolunteering[];
}

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

export function emptyProfile(): ExtractedProfile {
  return {
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    projects: [],
    volunteering: [],
  };
}

/** Convert CV-parser output into the unified onboarding profile shape. */
export function fromResumeData(data: ResumeData): ExtractedProfile {
  const c = data.contactInfo || ({} as ResumeData['contactInfo']);
  const firstExp = (data.experience || [])[0];
  return {
    fullName: c.fullName?.trim() || undefined,
    email: c.email?.trim() || undefined,
    phone: c.phone?.trim() || undefined,
    location: c.location?.trim() || undefined,
    linkedinUrl: c.linkedin?.trim() || undefined,
    jobTitle: firstExp?.position?.trim() || undefined,
    summary: data.summary?.trim() || undefined,
    experience: (data.experience || []).map((e) => ({
      id: e.id || uid(),
      title: e.position || '',
      company: e.company || '',
      location: '',
      startDate: e.startDate || '',
      endDate: e.endDate || '',
      current: !!e.current,
      description: e.description || (e.achievements || []).join('. '),
    })),
    education: (data.education || []).map((e) => ({
      id: e.id || uid(),
      institution: e.institution || '',
      degree: e.degree || '',
      field: e.field || '',
      startYear: e.startDate || '',
      endYear: e.endDate || '',
    })),
    skills: data.skills || [],
    certifications: (data.certifications || []).map((c) => ({
      id: c.id || uid(),
      name: c.name || '',
      organization: c.issuer || '',
      date: c.date || '',
    })),
    languages: (data.languages || []).map((l) => ({
      id: l.id || uid(),
      language: l.name || '',
      proficiency: l.proficiency || '',
    })),
    projects: (data.projects || []).map((p) => ({
      id: p.id || uid(),
      name: p.name || '',
      description: p.description || '',
      url: p.url,
    })),
    volunteering: (data.volunteering || []).map((v) => ({
      id: v.id || uid(),
      role: v.role || '',
      organization: v.organization || '',
      startDate: v.startDate || '',
      endDate: v.endDate || '',
      description: v.description || '',
    })),
  };
}

/** Convert ProfileImportSheet output into the unified onboarding profile shape. */
export function fromProfileData(
  data: Partial<ProfileData>,
  extras?: { fullName?: string; linkedinUrl?: string },
): ExtractedProfile {
  const firstExp = (data.experience || [])[0];
  return {
    fullName: extras?.fullName?.trim() || undefined,
    linkedinUrl: extras?.linkedinUrl?.trim() || undefined,
    location: firstExp?.location || undefined,
    jobTitle: firstExp?.title || undefined,
    summary: data.summary || undefined,
    experience: (data.experience || []).map((e) => ({
      id: uid(),
      title: e.title || '',
      company: e.company || '',
      location: e.location || '',
      startDate: e.startDate || '',
      endDate: e.endDate || '',
      current: !!e.current,
      description: e.description || '',
    })),
    education: (data.education || []).map((e) => ({
      id: uid(),
      institution: e.institution || '',
      degree: e.degree || '',
      field: e.field || '',
      startYear: e.startYear || '',
      endYear: e.endYear || '',
      description: e.description || '',
    })),
    skills: data.skills || [],
    certifications: (data.certifications || []).map((c) => ({
      id: uid(),
      name: c.name || '',
      organization: c.organization || '',
      date: c.date || '',
    })),
    languages: (data.languages || []).map((l) => ({
      id: uid(),
      language: l.language || '',
      proficiency: l.proficiency || '',
    })),
    projects: (data.projects || []).map((p) => ({
      id: uid(),
      name: p.name || '',
      description: p.description || '',
      url: p.url,
    })),
    volunteering: (data.volunteering || []).map((v) => ({
      id: uid(),
      role: v.role || '',
      organization: v.organization || '',
      startDate: v.startDate || '',
      endDate: v.endDate || '',
      description: v.description || '',
    })),
  };
}

export interface ProfileSelection {
  fullName: boolean;
  email: boolean;
  phone: boolean;
  location: boolean;
  linkedinUrl: boolean;
  jobTitle: boolean;
  summary: boolean;
  experienceIds: Set<string>;
  educationIds: Set<string>;
  skillIndices: Set<number>;
  certIds: Set<string>;
  languageIds: Set<string>;
  projectIds: Set<string>;
  volunteeringIds: Set<string>;
}

export function defaultSelection(p: ExtractedProfile): ProfileSelection {
  return {
    fullName: !!p.fullName,
    email: !!p.email,
    phone: !!p.phone,
    location: !!p.location,
    linkedinUrl: !!p.linkedinUrl,
    jobTitle: !!p.jobTitle,
    summary: !!p.summary,
    experienceIds: new Set(p.experience.map((e) => e.id)),
    educationIds: new Set(p.education.map((e) => e.id)),
    skillIndices: new Set(p.skills.map((_, i) => i)),
    certIds: new Set(p.certifications.map((c) => c.id)),
    languageIds: new Set(p.languages.map((l) => l.id)),
    projectIds: new Set(p.projects.map((pr) => pr.id)),
    volunteeringIds: new Set(p.volunteering.map((v) => v.id)),
  };
}

export function filterProfile(p: ExtractedProfile, sel: ProfileSelection): ExtractedProfile {
  return {
    fullName: sel.fullName ? p.fullName : undefined,
    email: sel.email ? p.email : undefined,
    phone: sel.phone ? p.phone : undefined,
    location: sel.location ? p.location : undefined,
    linkedinUrl: sel.linkedinUrl ? p.linkedinUrl : undefined,
    jobTitle: sel.jobTitle ? p.jobTitle : undefined,
    summary: sel.summary ? p.summary : undefined,
    experience: p.experience.filter((e) => sel.experienceIds.has(e.id)),
    education: p.education.filter((e) => sel.educationIds.has(e.id)),
    skills: p.skills.filter((_, i) => sel.skillIndices.has(i)),
    certifications: p.certifications.filter((c) => sel.certIds.has(c.id)),
    languages: p.languages.filter((l) => sel.languageIds.has(l.id)),
    projects: p.projects.filter((pr) => sel.projectIds.has(pr.id)),
    volunteering: p.volunteering.filter((v) => sel.volunteeringIds.has(v.id)),
  };
}

export function selectionCount(sel: ProfileSelection): number {
  let n = 0;
  if (sel.fullName) n++;
  if (sel.email) n++;
  if (sel.phone) n++;
  if (sel.location) n++;
  if (sel.linkedinUrl) n++;
  if (sel.jobTitle) n++;
  if (sel.summary) n++;
  n += sel.experienceIds.size + sel.educationIds.size + sel.skillIndices.size +
       sel.certIds.size + sel.languageIds.size + sel.projectIds.size + sel.volunteeringIds.size;
  return n;
}

export interface SaveProfileArgs {
  selectedProfile: ExtractedProfile;
  /** Fallback userId used when account.get() is not yet hydrated. */
  fallbackUserId?: string | null;
  /** Fallback account email used when account.get() is not yet hydrated. */
  fallbackUserEmail?: string | null;
  /** Title for the resume row when one is created. */
  resumeTitle?: string;
  /** Template id for the resume row when one is created. */
  templateId?: string;
}

export interface SaveProfileResult {
  resumeId: string | null;
  hasResume: boolean;
}

function normalizeEmail(value?: string | null): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function fallbackProfileEmail(userId: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80) || 'unknown-user';
  return `missing-email+${safeUserId}@wiseresume.local`;
}

/**
 * Persist the onboarding profile selection.
 *  - Always upserts profile-level fields the user kept (name, contact, etc.)
 *  - Creates a `resumes` row when there's enough resume content (any
 *    experience/education/skill/cert/language/project/volunteering entry, or
 *    a summary).
 *  - Marks `onboarding_completed = true`.
 */
export async function saveOnboardingProfile({
  selectedProfile,
  fallbackUserId,
  fallbackUserEmail,
  resumeTitle = 'My Resume',
  templateId = 'modern',
}: SaveProfileArgs): Promise<SaveProfileResult> {
  let userId: string | null = null;
  let accountEmail = normalizeEmail(fallbackUserEmail);
  try {
    const user = await account.get();
    userId = user.$id;
    accountEmail = normalizeEmail(user.email) || accountEmail;
  } catch {
    userId = fallbackUserId ?? null;
  }

  if (!userId) {
    throw new Error('You must be signed in to save your profile.');
  }

  const parsedEmail = normalizeEmail(selectedProfile.email);
  const profileEmail = accountEmail || parsedEmail || fallbackProfileEmail(userId);

  const hasResumeContent =
    !!selectedProfile.summary ||
    selectedProfile.experience.length > 0 ||
    selectedProfile.education.length > 0 ||
    selectedProfile.skills.length > 0 ||
    selectedProfile.certifications.length > 0 ||
    selectedProfile.languages.length > 0 ||
    selectedProfile.projects.length > 0 ||
    selectedProfile.volunteering.length > 0;

  // 1) Upsert profile row.
  const profilePayload: Record<string, unknown> = {
    user_id: userId,
    email: profileEmail,
  };
  if (!hasResumeContent) {
    profilePayload.onboarding_completed = true;
    profilePayload.profile_completed = true;
  }
  if (selectedProfile.fullName) profilePayload.full_name = selectedProfile.fullName;
  if (selectedProfile.jobTitle) profilePayload.job_title = selectedProfile.jobTitle;
  if (selectedProfile.location) profilePayload.location = selectedProfile.location;
  if (selectedProfile.linkedinUrl) profilePayload.linkedin_url = selectedProfile.linkedinUrl;
  if (parsedEmail) profilePayload.contact_email = parsedEmail;

  // Appwrite upsert: check if profile already exists, update or create
  let profileDocId: string | null = null;
  try {
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ]);
    if (existing.documents.length > 0) {
      profileDocId = existing.documents[0].$id;
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, profileDocId, profilePayload);
    } else {
      const created = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.profiles,
        ID.unique(),
        profilePayload,
      );
      profileDocId = created.$id;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save your profile.';
    throw new Error(msg);
  }

  if (!hasResumeContent) {
    return { resumeId: null, hasResume: false };
  }

  const contactInfo = {
    fullName: selectedProfile.fullName || '',
    email: selectedProfile.email || '',
    phone: selectedProfile.phone || '',
    location: selectedProfile.location || '',
    linkedin: selectedProfile.linkedinUrl || '',
  };

  const experience = selectedProfile.experience.map((e) => ({
    id: e.id,
    company: e.company,
    position: e.title,
    startDate: e.startDate,
    endDate: e.endDate,
    current: e.current,
    description: e.description || '',
    achievements: [],
  }));

  const education = selectedProfile.education.map((e) => ({
    id: e.id,
    institution: e.institution,
    degree: e.degree,
    field: e.field || '',
    startDate: e.startYear || '',
    endDate: e.endYear || '',
  }));

  const certifications = selectedProfile.certifications.map((c) => ({
    id: c.id,
    name: c.name,
    issuer: c.organization || '',
    date: c.date || '',
  }));

  const languages = selectedProfile.languages.map((l) => ({
    id: l.id,
    name: l.language,
    proficiency: (l.proficiency || 'professional').toLowerCase() as 'native' | 'fluent' | 'professional' | 'basic',
  }));

  const projects = selectedProfile.projects.map((p) => ({
    id: p.id,
    name: p.name,
    role: '',
    startDate: '',
    endDate: '',
    technologies: [],
    description: p.description || '',
    url: p.url,
  }));

  const volunteering = selectedProfile.volunteering.map((v) => ({
    id: v.id,
    role: v.role,
    organization: v.organization,
    startDate: v.startDate || '',
    endDate: v.endDate || '',
    description: v.description || '',
  }));

  // 2) Create resume row.
  let resumeId: string;
  try {
    const resumeDoc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.resumes,
      ID.unique(),
      {
        user_id: userId,
        title: resumeTitle,
        contact_info: JSON.stringify(contactInfo),
        summary: selectedProfile.summary || '',
        experience: JSON.stringify(experience),
        education: JSON.stringify(education),
        skills: JSON.stringify(selectedProfile.skills),
        certifications: JSON.stringify(certifications),
        languages: JSON.stringify(languages),
        projects: JSON.stringify(projects),
        volunteering: JSON.stringify(volunteering),
        template: templateId,
      },
    );
    resumeId = resumeDoc.$id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create your resume.';
    throw new Error(msg);
  }

  // 3) Mark onboarding complete — only after resume insert succeeds.
  try {
    if (profileDocId) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.profiles,
        profileDocId,
        { onboarding_completed: true, profile_completed: true },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to finalize onboarding.';
    throw new Error(msg);
  }

  return { resumeId, hasResume: true };
}

/**
 * Reconcile a half-completed onboarding state.
 *
 * `saveOnboardingProfile()` runs three writes (profile upsert → resume insert
 * → mark `onboarding_completed=true`). If the network drops between steps 2
 * and 3 the user ends up with a resume row but `onboarding_completed=false`,
 * which would force them through onboarding again on next login.
 *
 * This helper detects that state and flips the flag. It's safe to call
 * repeatedly: it only writes when (a) the profile exists, (b) the flag is
 * false, and (c) the user already has at least one resume row (i.e. the
 * earlier writes clearly succeeded).
 *
 * Returns `true` if reconciliation flipped the flag, `false` otherwise.
 * Never throws — failures are swallowed and logged so callers can use it
 * defensively on every page load.
 */
export async function reconcileOnboardingCompletion(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const profileRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ]);
    if (profileRes.documents.length === 0) return false;

    const profileDoc = profileRes.documents[0] as unknown as Record<string, unknown>;
    if (profileDoc.onboarding_completed === true) return false;
    const profileDocId = profileDoc.$id as string;

    const resumeRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ]);
    if (resumeRes.documents.length === 0) return false;

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, profileDocId, {
      onboarding_completed: true,
    });

    try {
      const { logAudit } = await import('@/lib/auditLogger');
      logAudit('onboarding', 'reconciled', {});
    } catch {
      /* ignore */
    }
    return true;
  } catch (e) {
    console.warn('reconcileOnboardingCompletion failed:', e);
    return false;
  }
}

/**
 * Server-side LinkedIn importer result. When `structured` is present, the
 * `/api/linkedin-profile` endpoint returned a fully-parsed profile from
 * the upstream provider (Proxycurl) and the caller should skip the AI
 * `parse-linkedin` step. `quotaExhausted` / `notConfigured` flag the
 * specific failure modes so the UI can show an accurate notice.
 */
export interface LinkedInProbeResult {
  profileText: string;
  derivedName: string | null;
  derivedHeadline: string | null;
  hadAnyData: boolean;
  /** Already-parsed structured data from the server importer, if available. */
  structured?: Partial<ProfileData> & { fullName?: string; location?: string };
  /** True if /api/linkedin-profile responded 503 (key missing). */
  notConfigured?: boolean;
  /** True if /api/linkedin-profile responded 402 (per-user monthly cap hit). */
  quotaExhausted?: boolean;
  /** Quota info returned by the server, when present. */
  quota?: { used: number; cap: number; remaining: number };
}

/**
 * LinkedIn URL probe.
 *
 * Tries the rich server-side importer first (`/api/linkedin-profile` →
 * Proxycurl). Falls back to the existing OG-meta best-effort probe via
 * `/api/fetch-url` whenever the server importer is unavailable (503),
 * times out, or hits the per-user monthly quota.
 *
 * Returns synthesized profile text suitable for piping through the
 * `parse-linkedin` edge function, a slug-derived display name, and (on
 * server-importer success) a `structured` field the caller can use to
 * skip the AI parse entirely.
 */
export async function probeLinkedInUrl(rawUrl: string): Promise<LinkedInProbeResult> {
  const url = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  const slugMatch = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  const derivedName = slugMatch
    ? decodeURIComponent(slugMatch[1])
        .replace(/-+/g, ' ')
        .replace(/\d+/g, '')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || null
    : null;

  let derivedHeadline: string | null = null;
  let derivedSummary: string | null = null;
  let hadAnyData = !!derivedName;
  let structured: LinkedInProbeResult['structured'] | undefined;
  let notConfigured = false;
  let quotaExhausted = false;
  let quota: LinkedInProbeResult['quota'] | undefined;

  // Get Appwrite JWT for authenticated requests
  const { getAppwriteJWT } = await import('@/lib/appwriteJWT');
  const token = await getAppwriteJWT().catch(() => null);

  // 1) Try the rich server-side importer first.
  if (token) {
    try {
      const r = await fetch('/api/linkedin-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url }),
      });
      if (r.ok) {
        const body = (await r.json()) as {
          provider?: string;
          profile?: Partial<ProfileData> & { fullName?: string; headline?: string; location?: string };
          quota?: { used: number; cap: number; remaining: number };
        };
        if (body?.profile) {
          structured = body.profile;
          quota = body.quota;
          if (body.profile.fullName) hadAnyData = true;
          if (body.profile.headline) {
            derivedHeadline = body.profile.headline;
            hadAnyData = true;
          }
          const lines: string[] = [];
          if (body.profile.fullName) lines.push(`Name: ${body.profile.fullName}`);
          if (body.profile.headline) lines.push(`Headline: ${body.profile.headline}`);
          if (body.profile.summary) lines.push('', 'About:', body.profile.summary);
          return {
            profileText: lines.join('\n') || `Source URL:\n${url}`,
            derivedName: body.profile.fullName || derivedName,
            derivedHeadline,
            hadAnyData,
            structured,
            quota,
          };
        }
      } else if (r.status === 503) {
        notConfigured = true;
      } else if (r.status === 402) {
        quotaExhausted = true;
        try { quota = (await r.json())?.quota; } catch { /* ignore */ }
      }
    } catch {
      // Network error → fall through to best-effort probe below.
    }
  }

  // 2) Fall back to the OG-meta best-effort probe via the Express proxy.
  try {
    {
      const proxyRes = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (proxyRes.ok) {
        const proxyBody = await proxyRes.json() as { html?: string };
        const body = proxyBody;
        const html = body.html || '';
        const titleMatch =
          html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<title>([^<]+)<\/title>/i);
        const descMatch =
          html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        if (titleMatch) {
          const t = titleMatch[1].replace(/\s*\|\s*LinkedIn\s*$/i, '').trim();
          if (t) {
            derivedHeadline = t;
            hadAnyData = true;
          }
        }
        if (descMatch) {
          const d = descMatch[1].trim();
          if (d) {
            derivedSummary = d;
            hadAnyData = true;
          }
        }
      }
    }
  } catch {
    // best-effort, fall through with whatever we derived
  }

  const lines: string[] = [];
  if (derivedName) lines.push(`Name: ${derivedName}`);
  if (derivedHeadline) lines.push(`Headline: ${derivedHeadline}`);
  if (derivedSummary) lines.push('', 'About:', derivedSummary);
  lines.push('', 'Source URL:', url);
  lines.push(
    '',
    '(Note: this is a public LinkedIn URL. Extract whatever profile data is plainly stated above. Do not invent data.)',
  );

  return {
    profileText: lines.join('\n'),
    derivedName,
    derivedHeadline,
    hadAnyData,
    structured,
    notConfigured: notConfigured || undefined,
    quotaExhausted: quotaExhausted || undefined,
    quota,
  };
}
