'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sdk = require('node-appwrite');

const DB_ID = 'main';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

// SECURITY: Fail closed if JWT secret is not configured
const JWT_SECRET = process.env.PORTFOLIO_JWT_SECRET;

const PROFILES_COLLECTION_ID = 'profiles';
const RESUMES_COLLECTION_ID = 'resumes';
const PORTFOLIO_SETTINGS_COLLECTION_ID = 'portfolio_settings';
// PORT-P1-03: brute-force lockout for the password gate (shared collection with
// the secondary Vercel path so limits are consistent across both surfaces).
const PORTFOLIO_RATE_LIMIT_COLLECTION_ID = 'portfolio_session_rate_limits';
const PASSWORD_ATTEMPT_LIMIT = 8;
const PASSWORD_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function getClient() {
  return new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
}

function getDatabases() {
  return new sdk.Databases(getClient());
}

function parseBody(req) {
  if (typeof req.body !== 'string') {
    return req.body && typeof req.body === 'object' ? req.body : {};
  }
  const raw = req.body.trim();
  if (!raw) return {};
  // PORT-P3-03: guard JSON.parse so a malformed body yields a clean 400 (handled
  // downstream by the missing-username check) instead of an unhandled 500.
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// WARMUP: a side-effect-free ping used by the scheduled warmer (native Appwrite
// cron, configured in scripts/deploy_hubs.cjs) to keep this function's container
// hot so visitors never pay the cold-start delay. True for a native schedule
// trigger or an explicit { action: 'warmup' } body. It can never match a real
// visitor request — those are http-triggered and carry a username — so it cannot
// alter normal behavior.
function isWarmupRequest(req, body) {
  if (body && body.action === 'warmup') return true;
  const headers = (req && req.headers) || {};
  return (headers['x-appwrite-trigger'] || headers['X-Appwrite-Trigger']) === 'schedule';
}

function sha256Hex(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// PORT-P2-05: constant-time, length-independent comparison. Hashing both inputs
// to a fixed 32-byte digest first means we never early-return on a length
// mismatch (which previously leaked the stored hash format via timing), while
// satisfying crypto.timingSafeEqual's equal-length requirement.
function timingSafeCompare(a, b) {
  const da = crypto.createHash('sha256').update(String(a)).digest();
  const db = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(da, db);
}

async function verifyStoredPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  const submittedSha = sha256Hex(password);
  const normalizedHash = String(storedHash).trim();

  try {
    if (/^\$2[aby]\$\d{2}\$/.test(normalizedHash)) {
      return await bcrypt.compare(password, normalizedHash);
    }

    if (normalizedHash.toLowerCase().startsWith('sha256:')) {
      return timingSafeCompare(`sha256:${submittedSha}`, normalizedHash.toLowerCase());
    }

    if (/^[a-f0-9]{64}$/i.test(normalizedHash)) {
      return timingSafeCompare(submittedSha, normalizedHash.toLowerCase());
    }
  } catch {
    return false;
  }

  return false;
}

function signSessionToken(username, userId) {
  // SECURITY: Fail if JWT secret not configured
  if (!JWT_SECRET) {
    throw new Error('JWT secret not configured');
  }
  const payload = JSON.stringify({
    username,
    userId,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64');
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

function verifySessionToken(token) {
  try {
    // SECURITY: Fail if JWT secret not configured
    if (!JWT_SECRET) return null;
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;
    const payload = Buffer.from(payloadB64, 'base64').toString();
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64');
    // Timing-safe comparison
    if (!timingSafeCompare(signature, expectedSig)) return null;
    const data = JSON.parse(payload);
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function parseJsonField(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeArray(value, defaultValue = []) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through
    }
  }
  return defaultValue;
}

// PORT-P1-03: best-effort per-(username, IP) brute-force lockout. Rate-limit
// infrastructure failures fail OPEN (never hard-lock a legitimate visitor out
// because of a DB hiccup) — the gate itself remains fail-closed elsewhere.
function getClientIp(req) {
  const headers = (req && req.headers) || {};
  const cfIp = typeof headers['cf-connecting-ip'] === 'string' ? headers['cf-connecting-ip'].trim() : '';
  if (cfIp) return cfIp;
  const realIp = typeof headers['x-real-ip'] === 'string' ? headers['x-real-ip'].trim() : '';
  if (realIp) return realIp;
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim() || 'unknown';
  return 'unknown';
}

function passwordAttemptId(username, ip) {
  const digest = sha256Hex(`${String(username).toLowerCase()}|${ip || 'unknown'}`);
  return `pwd_${digest.slice(0, 32)}`;
}

async function getPasswordAttemptState(db, username, ip) {
  const id = passwordAttemptId(username, ip);
  try {
    const doc = await db.getDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id);
    const resetAt = new Date(doc.reset_at).getTime();
    const count = Number(doc.count || 0);
    if (Number.isFinite(resetAt) && Date.now() <= resetAt && count >= PASSWORD_ATTEMPT_LIMIT) {
      return { blocked: true, retryAfterSeconds: Math.ceil((resetAt - Date.now()) / 1000) };
    }
    return { blocked: false };
  } catch {
    return { blocked: false };
  }
}

async function recordPasswordFailure(db, username, ip) {
  const id = passwordAttemptId(username, ip);
  const now = Date.now();
  const resetAt = new Date(now + PASSWORD_ATTEMPT_WINDOW_MS).toISOString();
  try {
    const doc = await db.getDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id);
    const currentReset = new Date(doc.reset_at).getTime();
    const count = Number(doc.count || 0);
    if (!Number.isFinite(currentReset) || now > currentReset) {
      await db.updateDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id, { count: 1, reset_at: resetAt });
      return;
    }
    await db.updateDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id, { count: count + 1 });
  } catch {
    try {
      await db.createDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id, { count: 1, reset_at: resetAt });
    } catch {
      // Rate-limit collection unavailable — fail open (do not block the gate).
    }
  }
}

async function clearPasswordFailures(db, username, ip) {
  const id = passwordAttemptId(username, ip);
  try {
    await db.updateDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id, {
      count: 0,
      reset_at: new Date(Date.now() + PASSWORD_ATTEMPT_WINDOW_MS).toISOString(),
    });
  } catch {
    // Best-effort reset.
  }
}

// PORT-P2-04: pure verification against an already-fetched settings document.
// The settings collection is read ONCE in the handler and passed in here, which
// removes the previous time-of-check/time-of-use double read that could bypass
// the gate if the document changed between reads.
async function verifyProvidedPassword(settingsDoc, password) {
  if (!settingsDoc) return false; // caller only invokes this when protection is active
  const passwordEnabled = !!(settingsDoc.password_enabled || settingsDoc.passwordEnabled);
  if (!passwordEnabled) return true;
  const storedHash = settingsDoc.password_hash || settingsDoc.passwordHash;
  if (!storedHash) return false;
  return await verifyStoredPassword(password, storedHash);
}

async function buildPublicPortfolio(db, username, sessionToken, prefetchedProfile) {
  // Reuse the profile already fetched by the handler when available to avoid a
  // redundant read; fall back to a fresh lookup for any other caller.
  let rawProfile = prefetchedProfile || null;
  if (!rawProfile) {
    const profileRes = await db.listDocuments(DB_ID, PROFILES_COLLECTION_ID, [
      sdk.Query.equal('username', username.toLowerCase()),
      sdk.Query.limit(1),
    ]);
    if (profileRes.total === 0) return null;
    rawProfile = profileRes.documents[0];
  }

  // Check portfolio enabled
  if (rawProfile.portfolio_enabled !== true && rawProfile.portfolioEnabled !== true) {
    return null;
  }

  // Parse extras safely
  const extras = parseJsonField(rawProfile.portfolio_extras || rawProfile.portfolioExtras);

  // Build sanitized public profile with OLD SHAPE for backward compatibility
  // Fields must match what PublicPortfolioPage and child components expect.
  // PORT-P1-02: the owner's contact email and internal user_id are intentionally
  // NOT included in the public payload (privacy — see usePortfolioSEO + the
  // gated contact form). Do not re-add them without an explicit opt-in.
  const publicProfile = {
    $id: rawProfile.$id,
    username: rawProfile.username || '',
    fullName: rawProfile.full_name || rawProfile.fullName || null,
    jobTitle: rawProfile.job_title || rawProfile.jobTitle || null,
    avatarUrl: rawProfile.avatar_url || rawProfile.avatarUrl || null,
    portfolioBio: rawProfile.portfolio_bio || rawProfile.portfolioBio || null,
    portfolioEnabled: true,
    portfolioStyle: rawProfile.portfolio_style || rawProfile.portfolioStyle || 'modern',
    portfolioLayout: rawProfile.portfolio_layout || rawProfile.portfolioLayout || 'standard',
    portfolioAccentColor: rawProfile.portfolio_accent_color || rawProfile.portfolioAccentColor || '#e84545',
    portfolioFont: rawProfile.portfolio_font || rawProfile.portfolioFont || 'inter',
    portfolioSections: rawProfile.portfolio_sections || rawProfile.portfolioSections || {},
    portfolioMetaTitle: rawProfile.portfolio_meta_title || rawProfile.portfolioMetaTitle || null,
    portfolioMetaDescription: rawProfile.portfolio_meta_description || rawProfile.portfolioMetaDescription || null,
    metaTitle: rawProfile.portfolio_meta_title || rawProfile.portfolioMetaTitle || null,
    metaDescription: rawProfile.portfolio_meta_description || rawProfile.portfolioMetaDescription || null,
    theme: rawProfile.portfolio_style || rawProfile.portfolioStyle || 'modern',
    githubUrl: rawProfile.github_url || rawProfile.githubUrl || null,
    linkedinUrl: rawProfile.linkedin_url || rawProfile.linkedinUrl || null,
    twitterUrl: rawProfile.twitter_url || rawProfile.twitterUrl || null,
    websiteUrl: rawProfile.website_url || rawProfile.websiteUrl || null,
    openToWork: !!(rawProfile.open_to_work || rawProfile.openToWork),
    availabilityStatus: extras.availabilityStatus || 'not-looking',
    availabilityHeadline: rawProfile.availability_headline || rawProfile.availabilityHeadline || null,
    location: rawProfile.location || null,
    industry: rawProfile.industry || null,
    seoNoindex: !!(rawProfile.seo_noindex || rawProfile.seoNoindex),
    lastActiveAt: rawProfile.last_active_at || rawProfile.lastActiveAt || null,
    portfolioTranslations: extras.portfolioTranslations || null,
    // extras fields surfaced directly for backward compatibility
    testimonials: extras.testimonials || [],
    services: extras.services || [],
    caseStudies: extras.caseStudies || [],
    highlights: extras.highlights || [],
    portfolioSummary: extras.portfolioSummary || null,
    sectionOrder: extras.sectionOrder || [],
    pinnedProject: extras.pinnedProject || null,
    scrollEffect: extras.scrollEffect || 'none',
    videoIntroUrl: extras.videoIntroUrl || null,
    schedulingUrl: extras.schedulingUrl || null,
    abChallengerTheme: extras.abChallengerTheme || null,
    portfolioCertifications: extras.portfolioCertifications || [],
    githubProjectsCache: rawProfile.github_projects_cache || rawProfile.githubProjectsCache || null,
    portfolioPrimaryLanguage: extras.portfolioPrimaryLanguage || 'English',
    portfolioSecondaryLanguage: extras.portfolioSecondaryLanguage || null,
    contactFormEnabled: typeof extras.contactFormEnabled === 'boolean' ? extras.contactFormEnabled : true,
  };

  // Get selected resume with ownership verification
  const portfolioResumeId = rawProfile.portfolio_resume_id || rawProfile.portfolioResumeId;

  // Default empty resume (never null for backward compatibility)
  const emptyResume = {
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

  let publicResume = emptyResume;

  if (portfolioResumeId) {
    try {
      const resumeRes = await db.listDocuments(DB_ID, RESUMES_COLLECTION_ID, [
        sdk.Query.equal('$id', portfolioResumeId),
        sdk.Query.equal('user_id', rawProfile.user_id),
        sdk.Query.limit(1),
      ]);

      if (resumeRes.total > 0) {
        const rawResume = resumeRes.documents[0];
        // SECURITY: Verify ownership before returning
        if (rawResume.user_id === rawProfile.user_id) {
          publicResume = {
            $id: rawResume.$id,
            summary: rawResume.summary || null,
            experience: normalizeArray(rawResume.experience),
            education: normalizeArray(rawResume.education),
            skills: normalizeArray(rawResume.skills),
            projects: normalizeArray(rawResume.projects),
            certifications: normalizeArray(rawResume.certifications),
            awards: normalizeArray(rawResume.awards),
            publications: normalizeArray(rawResume.publications),
            volunteering: normalizeArray(rawResume.volunteering),
          };
        }
      }
    } catch {
      // Resume fetch failed, use empty resume
    }
  }

  return {
    profile: publicProfile,
    resume: publicResume,
    sessionToken,
  };
}

async function handler({ req, res, error }) {
  if (!API_KEY) {
    return res.json({ success: false, error: 'Appwrite API key is not configured.' }, 500);
  }

  const body = parseBody(req);

  // WARMUP: keep this container warm so the first visitor after an idle period
  // never pays the cold-start delay. Returns immediately, BEFORE getDatabases()
  // and any query — no database reads/writes, no analytics, no rate-limit,
  // session, or email side effects.
  if (isWarmupRequest(req, body)) {
    return res.json({ ok: true, warm: true });
  }

  const db = getDatabases();
  const { username, password, sessionToken: providedToken } = body;

  if (!username) {
    return res.json({ success: false, error: 'Username is required' }, 400);
  }

  try {
    // Check if portfolio exists and get password status
    const profileRes = await db.listDocuments(DB_ID, PROFILES_COLLECTION_ID, [
      sdk.Query.equal('username', username.toLowerCase()),
      sdk.Query.limit(1),
    ]);

    if (profileRes.total === 0) {
      return res.json({ success: false, error: 'Portfolio not found' }, 404);
    }

    const profile = profileRes.documents[0];

    if (profile.portfolio_enabled !== true && profile.portfolioEnabled !== true) {
      return res.json({ success: false, error: 'Portfolio not published' }, 404);
    }

    // PORT-P2-04: read portfolio_settings exactly ONCE here and reuse it for both
    // the protection check and the password verification.
    // SECURITY: Default to protected if the settings read fails (fail closed).
    let settingsDoc = null;
    let passwordEnabled = true;
    try {
      const settingsRes = await db.listDocuments(DB_ID, PORTFOLIO_SETTINGS_COLLECTION_ID, [
        sdk.Query.equal('user_id', profile.user_id),
        sdk.Query.limit(1),
      ]);
      if (settingsRes.total > 0) {
        settingsDoc = settingsRes.documents[0];
        passwordEnabled = !!(settingsDoc.password_enabled || settingsDoc.passwordEnabled);
      } else {
        // No settings document = no password protection
        passwordEnabled = false;
      }
    } catch {
      // SECURITY: Fail closed - if we can't read settings, assume password protected
      // and leave settingsDoc null so verification below can never succeed.
      passwordEnabled = true;
      settingsDoc = null;
    }

    // If password protected, verify
    if (passwordEnabled) {
      // First check if valid session token provided
      let hasValidSession = false;
      if (providedToken) {
        const sessionData = verifySessionToken(providedToken);
        // Bind the unlock token to BOTH the username and the owner's user_id so
        // a token issued for a now-recycled username can't unlock a different
        // owner's portfolio. Existing tokens already carry userId.
        if (
          sessionData &&
          sessionData.username === username.toLowerCase() &&
          sessionData.userId === profile.user_id
        ) {
          hasValidSession = true;
        }
      }

      // If no valid session, verify password
      if (!hasValidSession) {
        // PORT-P1-03: brute-force lockout (best-effort; fails open on infra error).
        const clientIp = getClientIp(req);
        const attempt = await getPasswordAttemptState(db, username, clientIp);
        if (attempt.blocked) {
          return res.json({
            success: false,
            error: 'too_many_attempts',
            protected: true,
            retryAfterSeconds: attempt.retryAfterSeconds,
          }, 429);
        }

        if (!password) {
          return res.json({
            success: false,
            error: 'Password required',
            protected: true,
            gate: {
              exists: true,
              portfolioEnabled: true,
              passwordEnabled: true,
              accentColor: profile.portfolio_accent_color || profile.portfolioAccentColor || '#e84545',
            }
          }, 401);
        }

        const isValid = await verifyProvidedPassword(settingsDoc, password);
        if (!isValid) {
          await recordPasswordFailure(db, username, clientIp);
          return res.json({
            success: false,
            error: 'Invalid password',
            protected: true
          }, 401);
        }

        // Successful unlock — clear the failure counter.
        await clearPasswordFailures(db, username, clientIp);

        // Generate session token for subsequent requests
        const newToken = signSessionToken(username.toLowerCase(), profile.user_id);

        // Build and return portfolio with token (reuse the already-fetched profile)
        const portfolio = await buildPublicPortfolio(db, username, newToken, profile);
        if (!portfolio) {
          return res.json({ success: false, error: 'Portfolio not found' }, 404);
        }

        return res.json({
          success: true,
          protected: true,
          verified: true,
          ...portfolio
        });
      }
    }

    // Build and return public portfolio (not protected or already verified)
    const portfolio = await buildPublicPortfolio(db, username, providedToken, profile);
    if (!portfolio) {
      return res.json({ success: false, error: 'Portfolio not found' }, 404);
    }

    return res.json({
      success: true,
      protected: passwordEnabled,
      ...portfolio
    });

  } catch (err) {
    console.error('Get public portfolio error:', err);
    return res.json({ success: false, error: 'Failed to fetch portfolio' }, 500);
  }
}

module.exports = handler;
module.exports.__test = {
  sha256Hex,
  timingSafeCompare,
  verifyStoredPassword,
};
