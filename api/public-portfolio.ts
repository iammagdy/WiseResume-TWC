import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client, Databases, Query } from 'node-appwrite';
import { createHash, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DATABASE_ID = 'main';
const PROFILES_COLLECTION = 'profiles';
const RESUMES_COLLECTION = 'resumes';
const PORTFOLIO_SETTINGS_COLLECTION = 'portfolio_settings';
const PORTFOLIO_RATE_LIMIT_COLLECTION = 'portfolio_session_rate_limits';
const PASSWORD_ATTEMPT_LIMIT = 8;
const PASSWORD_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function getDb() {
  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  return new Databases(client);
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return (JSON.parse(value) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

async function sha256Hex(text: string): Promise<string> {
  return createHash('sha256').update(text).digest('hex');
}

function getClientIp(req: VercelRequest): string {
  const cfIp = typeof req.headers['cf-connecting-ip'] === 'string' ? req.headers['cf-connecting-ip'].trim() : '';
  if (cfIp) return cfIp;
  const realIp = typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'].trim() : '';
  if (realIp) return realIp;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

async function portfolioPasswordAttemptId(username: string, ip: string): Promise<string> {
  const digest = await sha256Hex(`${username.toLowerCase()}|${ip || 'unknown'}`);
  return `pwd_${digest.slice(0, 32)}`;
}

async function getPasswordAttemptState(db: Databases, username: string, ip: string) {
  const id = await portfolioPasswordAttemptId(username, ip);
  try {
    const doc = await db.getDocument(DATABASE_ID, PORTFOLIO_RATE_LIMIT_COLLECTION, id) as unknown as Record<string, unknown>;
    const resetAt = new Date(asString(doc.reset_at)).getTime();
    const count = Number(doc.count || 0);
    if (Number.isFinite(resetAt) && Date.now() <= resetAt && count >= PASSWORD_ATTEMPT_LIMIT) {
      return { blocked: true, id, retryAfterSeconds: Math.ceil((resetAt - Date.now()) / 1000) };
    }
    return { blocked: false, id };
  } catch {
    return { blocked: false, id };
  }
}

async function recordPasswordFailure(db: Databases, username: string, ip: string): Promise<void> {
  const id = await portfolioPasswordAttemptId(username, ip);
  const now = Date.now();
  const resetAt = new Date(now + PASSWORD_ATTEMPT_WINDOW_MS).toISOString();
  try {
    const doc = await db.getDocument(DATABASE_ID, PORTFOLIO_RATE_LIMIT_COLLECTION, id) as unknown as Record<string, unknown>;
    const currentReset = new Date(asString(doc.reset_at)).getTime();
    const count = Number(doc.count || 0);
    if (!Number.isFinite(currentReset) || now > currentReset) {
      await db.updateDocument(DATABASE_ID, PORTFOLIO_RATE_LIMIT_COLLECTION, id, { count: 1, reset_at: resetAt });
      return;
    }
    await db.updateDocument(DATABASE_ID, PORTFOLIO_RATE_LIMIT_COLLECTION, id, { count: count + 1 });
  } catch {
    try {
      await db.createDocument(DATABASE_ID, PORTFOLIO_RATE_LIMIT_COLLECTION, id, { count: 1, reset_at: resetAt });
    } catch { }
  }
}

async function clearPasswordFailures(db: Databases, username: string, ip: string): Promise<void> {
  const id = await portfolioPasswordAttemptId(username, ip);
  try {
    await db.updateDocument(DATABASE_ID, PORTFOLIO_RATE_LIMIT_COLLECTION, id, {
      count: 0,
      reset_at: new Date(Date.now() + PASSWORD_ATTEMPT_WINDOW_MS).toISOString(),
    });
  } catch { }
}

async function findProfileByUsername(db: Databases, username: string) {
  const res = await db.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
    Query.equal('username', username.toLowerCase()),
    Query.limit(1),
  ]);
  return (res.documents?.[0] as Record<string, unknown> | undefined) ?? null;
}

async function findProfileByCustomDomain(db: Databases, domain: string) {
  let offset = 0;

  while (offset < 5000) {
    const res = await db.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
      Query.equal('portfolio_enabled', true),
      Query.limit(100),
      Query.offset(offset),
    ]);
    if (!res.documents.length) return null;

    for (const doc of res.documents as unknown as Record<string, unknown>[]) {
      const extras = parseJsonField<Record<string, unknown>>(doc.portfolio_extras, {});
      const customDomain = asString(extras.customDomain).toLowerCase();
      if (customDomain && customDomain === domain.toLowerCase()) {
        return doc;
      }
    }

    if (res.documents.length < 100) return null;
    offset += 100;
  }

  return null;
}

async function getPortfolioSettings(db: Databases, userId: string) {
  const res = await db.listDocuments(DATABASE_ID, PORTFOLIO_SETTINGS_COLLECTION, [
    Query.equal('user_id', userId),
    Query.limit(1),
  ]);
  const doc = res.documents?.[0] as Record<string, unknown> | undefined;
  return {
    $id: asString(doc?.$id),
    passwordEnabled: Boolean(doc?.password_enabled),
    passwordHash: asString(doc?.password_hash),
  };
}

async function verifyAndMaybeUpgradePassword(
  db: Databases,
  settingsDocId: string,
  submittedPassword: string,
  storedHash: string,
): Promise<boolean> {
  if (!submittedPassword || !storedHash) return false;
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(submittedPassword, storedHash);
  }
  const sha256 = await sha256Hex(submittedPassword);
  const a = Buffer.from(sha256);
  const b = Buffer.from(storedHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const upgraded = await bcrypt.hash(submittedPassword, 12);
    await db.updateDocument(DATABASE_ID, PORTFOLIO_SETTINGS_COLLECTION, settingsDocId, { password_hash: upgraded });
  } catch { }
  return true;
}

function mapProfile(doc: Record<string, unknown>) {
  const extras = parseJsonField<Record<string, unknown>>(doc.portfolio_extras, {});
  return {
    $id: String(doc.$id || ''),
    // PORT-P1-02: do not expose the owner's internal user_id or contact email in
    // the public payload (kept consistent with the Appwrite get-public-portfolio
    // function). Visitors contact the owner through the gated contact form.
    username: asString(doc.username),
    fullName: (doc.full_name as string | null) ?? null,
    jobTitle: (doc.job_title as string | null) ?? null,
    avatarUrl: (doc.avatar_url as string | null) ?? null,
    portfolioBio: (doc.portfolio_bio as string | null) ?? null,
    portfolioEnabled: Boolean(doc.portfolio_enabled),
    portfolioStyle: (doc.portfolio_style as string | null) ?? null,
    portfolioLayout: (doc.portfolio_layout as string | null) ?? null,
    portfolioAccentColor: (doc.portfolio_accent_color as string | null) ?? null,
    portfolioFont: (doc.portfolio_font as string | null) ?? null,
    portfolioSections: parseJsonField<Record<string, unknown> | null>(doc.portfolio_sections, null),
    portfolioMetaTitle: (doc.portfolio_meta_title as string | null) ?? null,
    portfolioMetaDescription: (doc.portfolio_meta_description as string | null) ?? null,
    metaTitle: (doc.meta_title as string | null) ?? null,
    metaDescription: (doc.meta_description as string | null) ?? null,
    theme: ((doc.portfolio_theme as string | null) ?? (doc.theme as string | null)) ?? null,
    githubUrl: (doc.github_url as string | null) ?? null,
    linkedinUrl: (doc.linkedin_url as string | null) ?? null,
    twitterUrl: (doc.twitter_url as string | null) ?? null,
    websiteUrl: (doc.website_url as string | null) ?? null,
    openToWork: Boolean(doc.open_to_work),
    availabilityStatus: (extras.availabilityStatus as string | null) ?? null,
    availabilityHeadline: (doc.availability_headline as string | null) ?? null,
    location: (doc.location as string | null) ?? null,
    industry: (doc.industry as string | null) ?? null,
    seoNoindex: Boolean(doc.seo_noindex),
    lastActiveAt: (doc.last_active_at as string | null) ?? null,
    portfolioTranslations: (extras.portfolioTranslations as Record<string, Record<string, unknown>> | null) ?? null,
    testimonials: (extras.testimonials as unknown[] | null) ?? null,
    services: (extras.services as unknown[] | null) ?? null,
    caseStudies: (extras.caseStudies as unknown[] | null) ?? null,
    highlights: (extras.highlights as unknown[] | null) ?? null,
    portfolioSummary: (extras.portfolioSummary as string | null) ?? null,
    sectionOrder: (extras.sectionOrder as string[] | null) ?? null,
    pinnedProject: (extras.pinnedProject as Record<string, unknown> | null) ?? null,
    scrollEffect: (extras.scrollEffect as string | null) ?? null,
    videoIntroUrl: (extras.videoIntroUrl as string | null) ?? null,
    schedulingUrl: (extras.schedulingUrl as string | null) ?? null,
    abChallengerTheme: (extras.abChallengerTheme as string | null) ?? null,
    portfolioCertifications: (extras.portfolioCertifications as unknown[] | null) ?? null,
    githubProjectsCache: parseJsonField<unknown[] | null>(doc.github_projects_cache, null),
    portfolioPrimaryLanguage: (extras.portfolioPrimaryLanguage as string | null) ?? null,
    portfolioSecondaryLanguage: (extras.portfolioSecondaryLanguage as string | null) ?? null,
    contactFormEnabled: typeof extras.contactFormEnabled === 'boolean' ? extras.contactFormEnabled : true,
  };
}

function mapResume(doc: Record<string, unknown> | null) {
  if (!doc) {
    return {
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
  }

  return {
    $id: String(doc.$id || ''),
    summary: (doc.summary as string | null) ?? null,
    experience: Array.isArray(doc.experience) ? doc.experience : [],
    education: Array.isArray(doc.education) ? doc.education : [],
    skills: Array.isArray(doc.skills) ? doc.skills : [],
    projects: Array.isArray(doc.projects) ? doc.projects : [],
    certifications: Array.isArray(doc.certifications) ? doc.certifications : [],
    awards: Array.isArray(doc.awards) ? doc.awards : [],
    publications: Array.isArray(doc.publications) ? doc.publications : [],
    volunteering: Array.isArray(doc.volunteering) ? doc.volunteering : [],
  };
}

// LEGACY/SECONDARY PATH. The primary public-portfolio runtime is the Appwrite
// `get-public-portfolio` / `portfolio-gate` functions. This Vercel route is kept
// only for the custom-domain `mode=domain` lookup and as a fallback; behavioral
// defaults are intentionally NOT kept in lockstep with the Appwrite functions
// (see PORT-P2-06). Do not extend this path — fold new behavior into the hubs.
async function getResume(db: Databases, profile: Record<string, unknown>) {
  const preferredResumeId = asString(profile.portfolio_resume_id);
  if (preferredResumeId) {
    try {
      const resume = await db.getDocument(DATABASE_ID, RESUMES_COLLECTION, preferredResumeId) as unknown as Record<string, unknown>;
      // SECURITY (PORT-P2-06): verify the selected resume belongs to the profile
      // owner before returning it. Without this, a tampered portfolio_resume_id
      // pointing at another user's resume id would leak that resume publicly.
      if (resume && String(resume.user_id || '') === String(profile.user_id || '')) {
        return resume;
      }
    } catch {
      // Fall through to first user resume
    }
  }

  const res = await db.listDocuments(DATABASE_ID, RESUMES_COLLECTION, [
    Query.equal('user_id', String(profile.user_id || '')),
    Query.limit(1),
  ]);
  return (res.documents?.[0] as Record<string, unknown> | undefined) ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!PROJECT_ID || !API_KEY) {
    return res.status(500).json({ error: 'config_error', message: 'Public portfolio API is not configured.' });
  }

  const db = getDb();
  const mode = asString(req.query.mode);

  try {
    if (req.method === 'GET' && mode === 'gate') {
      const username = asString(req.query.username);
      if (!username) return res.status(400).json({ error: 'bad_request' });
      const profile = await findProfileByUsername(db, username);
      if (!profile || profile.portfolio_enabled !== true) {
        return res.status(404).json({ passwordEnabled: false, accentColor: '#e84545', exists: false });
      }
      const settings = await getPortfolioSettings(db, String(profile.user_id || ''));
      return res.status(200).json({
        passwordEnabled: settings.passwordEnabled,
        accentColor: (profile.portfolio_accent_color as string) || '#e84545',
        exists: true,
      });
    }

    if (req.method === 'GET' && mode === 'domain') {
      const domain = asString(req.query.domain);
      if (!domain) return res.status(400).json({ error: 'bad_request' });
      const profile = await findProfileByCustomDomain(db, domain);
      if (!profile) return res.status(404).json({ error: 'not_found' });
      return res.status(200).json({
        profile: { username: asString(profile.username) },
        resume: { $id: '' },
      });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const username = asString(body.username);
      if (!username) return res.status(400).json({ error: 'bad_request' });

      const profile = await findProfileByUsername(db, username);
      if (!profile || profile.portfolio_enabled !== true) {
        return res.status(404).json({ error: 'not_found' });
      }

      const settings = await getPortfolioSettings(db, String(profile.user_id || ''));
      if (settings.passwordEnabled) {
        const clientIp = getClientIp(req);
        const attemptState = await getPasswordAttemptState(db, username, clientIp);
        if (attemptState.blocked) {
          return res.status(429).json({ error: 'rate_limited', retryAfterSeconds: attemptState.retryAfterSeconds });
        }
        const submittedPassword = typeof body.password === 'string' ? body.password : '';
        if (!submittedPassword) {
          await recordPasswordFailure(db, username, clientIp);
          return res.status(401).json({ error: 'invalid_password' });
        }
        const ok = await verifyAndMaybeUpgradePassword(db, settings.$id, submittedPassword, settings.passwordHash);
        if (!ok) {
          await recordPasswordFailure(db, username, clientIp);
          return res.status(401).json({ error: 'invalid_password' });
        }
        await clearPasswordFailures(db, username, clientIp);
      }

      const resumeDoc = await getResume(db, profile);
      return res.status(200).json({
        profile: mapProfile(profile),
        resume: mapResume(resumeDoc),
      });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Public portfolio request failed.';
    return res.status(500).json({ error: 'server_error', message });
  }
}
