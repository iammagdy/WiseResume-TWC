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
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
import type { Json } from '@/integrations/supabase/types';

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
  /** Fallback userId used when getUserId() is not yet hydrated. */
  fallbackUserId?: string | null;
  /** Title for the resume row when one is created. */
  resumeTitle?: string;
  /** Template id for the resume row when one is created. */
  templateId?: string;
}

export interface SaveProfileResult {
  resumeId: string | null;
  hasResume: boolean;
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
  resumeTitle = 'My Resume',
  templateId = 'modern',
}: SaveProfileArgs): Promise<SaveProfileResult> {
  const userId = getUserId() || fallbackUserId;
  if (!userId) {
    throw new Error('You must be signed in to save your profile.');
  }

  // Decide up front whether we'll be inserting a resume — this controls
  // whether we mark `onboarding_completed` now (no resume needed) or only
  // after the resume insert succeeds (atomic: profile + resume + flag).
  const hasResumeContent =
    !!selectedProfile.summary ||
    selectedProfile.experience.length > 0 ||
    selectedProfile.education.length > 0 ||
    selectedProfile.skills.length > 0 ||
    selectedProfile.certifications.length > 0 ||
    selectedProfile.languages.length > 0 ||
    selectedProfile.projects.length > 0 ||
    selectedProfile.volunteering.length > 0;

  // 1) Upsert profile row. Defer the `onboarding_completed` flag when a
  //    resume insert still has to succeed, so we never end up with a
  //    completed profile pointing at a non-existent resume.
  const profilePayload: Record<string, unknown> = { user_id: userId };
  if (!hasResumeContent) profilePayload.onboarding_completed = true;
  if (selectedProfile.fullName) profilePayload.full_name = selectedProfile.fullName;
  if (selectedProfile.jobTitle) profilePayload.job_title = selectedProfile.jobTitle;
  if (selectedProfile.location) profilePayload.location = selectedProfile.location;
  if (selectedProfile.linkedinUrl) profilePayload.linkedin_url = selectedProfile.linkedinUrl;

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(profilePayload as never, { onConflict: 'user_id' });
  if (upsertError) {
    throw new Error(upsertError.message || 'Failed to save your profile.');
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

  const { data: row, error } = await supabase
    .from('resumes')
    .insert({
      user_id: userId,
      title: resumeTitle,
      contact_info: contactInfo as unknown as Json,
      summary: selectedProfile.summary || '',
      experience: experience as unknown as Json,
      education: education as unknown as Json,
      skills: selectedProfile.skills as unknown as Json,
      certifications: certifications as unknown as Json,
      languages: languages as unknown as Json,
      projects: projects as unknown as Json,
      volunteering: volunteering as unknown as Json,
      template_id: templateId,
      is_primary: true,
    })
    .select('id')
    .single();

  if (error || !row) {
    throw new Error(error?.message || 'Failed to create your resume.');
  }

  // 3) Resume insert succeeded — only now mark onboarding complete so the
  //    profile flag and the resume row land together.
  const { error: completeError } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true } as never)
    .eq('user_id', userId);
  if (completeError) {
    throw new Error(completeError.message || 'Failed to finalize onboarding.');
  }

  return { resumeId: row.id, hasResume: true };
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
export async function reconcileOnboardingCompletion(
  userId: string,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .maybeSingle();
    if (profileErr) return false;
    // Already complete — nothing to do. (Profile missing is also fine; that
    // means onboarding never ran, so don't synthesize completion for them.)
    if (!profile || profile.onboarding_completed) return false;

    const { data: resumes, error: resumesErr } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    if (resumesErr) return false;
    if (!resumes || resumes.length === 0) return false;

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true } as never)
      .eq('user_id', userId);
    if (updateErr) return false;
    return true;
  } catch (e) {
    console.warn('reconcileOnboardingCompletion failed:', e);
    return false;
  }
}

/**
 * Light-weight LinkedIn URL probe.
 *
 * Calls the `/api/fetch-url` server proxy and extracts whatever public meta
 * data is reachable (LinkedIn typically auth-walls, so this is best-effort).
 * Returns synthesized profile text suitable for piping through the existing
 * `parse-linkedin` edge function, plus a `name` derived from the URL slug
 * which we always have available.
 */
export async function probeLinkedInUrl(rawUrl: string): Promise<{
  profileText: string;
  derivedName: string | null;
  derivedHeadline: string | null;
  hadAnyData: boolean;
}> {
  const url = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  // Derive a name from the slug as a fallback (linkedin.com/in/jane-doe → "Jane Doe").
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

  try {
    const { getSupabaseToken } = await import('@/lib/supabaseAuth');
    const token = await getSupabaseToken();
    if (token) {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const body = (await res.json()) as { html?: string };
        const html = body.html || '';
        const titleMatch =
          html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<title>([^<]+)<\/title>/i);
        const descMatch =
          html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        if (titleMatch) {
          // og:title is often "Jane Doe - Senior Engineer at Acme | LinkedIn"
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

  // Synthesize text the existing parse-linkedin function can chew on.
  // Padded so it doesn't trip the URL_ONLY_REJECTED guard (it requires the
  // input not to look like a bare URL <500 chars / <=3 lines).
  const lines: string[] = [];
  if (derivedName) lines.push(`Name: ${derivedName}`);
  if (derivedHeadline) lines.push(`Headline: ${derivedHeadline}`);
  if (derivedSummary) lines.push('', 'About:', derivedSummary);
  lines.push('', 'Source URL:', url);
  // Pad to ensure the AI gets enough context and to bypass the URL-only guard
  lines.push(
    '',
    '(Note: this is a public LinkedIn URL. Extract whatever profile data is plainly stated above. Do not invent data.)',
  );

  return {
    profileText: lines.join('\n'),
    derivedName,
    derivedHeadline,
    hadAnyData,
  };
}
