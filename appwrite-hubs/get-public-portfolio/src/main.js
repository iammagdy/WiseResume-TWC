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
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function sha256Hex(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
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

// Timing-safe signature comparison
function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
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

async function verifyPassword(db, username, password) {
  const profileRes = await db.listDocuments(DB_ID, PROFILES_COLLECTION_ID, [
    sdk.Query.equal('username', username.toLowerCase()),
    sdk.Query.limit(1),
  ]);
  if (profileRes.total === 0) return { valid: false };
  
  const profile = profileRes.documents[0];
  const userId = profile.user_id;
  
  const settingsRes = await db.listDocuments(DB_ID, PORTFOLIO_SETTINGS_COLLECTION_ID, [
    sdk.Query.equal('user_id', userId),
    sdk.Query.limit(1),
  ]);
  
  if (settingsRes.total === 0) return { valid: true, userId }; // No password set
  
  const settings = settingsRes.documents[0];
  const passwordEnabled = settings.password_enabled || settings.passwordEnabled;
  const storedHash = settings.password_hash || settings.passwordHash;
  
  if (!passwordEnabled) return { valid: true, userId };
  if (!storedHash) return { valid: false };
  
  if (!(await verifyStoredPassword(password, storedHash))) return { valid: false };
  
  return { valid: true, userId };
}

async function buildPublicPortfolio(db, username, sessionToken) {
  // Get profile
  const profileRes = await db.listDocuments(DB_ID, PROFILES_COLLECTION_ID, [
    sdk.Query.equal('username', username.toLowerCase()),
    sdk.Query.limit(1),
  ]);
  if (profileRes.total === 0) return null;
  
  const rawProfile = profileRes.documents[0];
  
  // Check portfolio enabled
  if (rawProfile.portfolio_enabled !== true && rawProfile.portfolioEnabled !== true) {
    return null;
  }
  
  // Parse extras safely
  const extras = parseJsonField(rawProfile.portfolio_extras || rawProfile.portfolioExtras);
  
  // Build sanitized public profile with OLD SHAPE for backward compatibility
  // Fields must match what PublicPortfolioPage and child components expect
  const publicProfile = {
    $id: rawProfile.$id,
    user_id: rawProfile.user_id,
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
    contactEmail: rawProfile.contact_email || rawProfile.contactEmail || null,
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

  const db = getDatabases();
  const body = parseBody(req);
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

    // Check password protection from portfolio_settings (server-side only)
    // SECURITY: Default to true if settings read fails (fail closed)
    let passwordEnabled = true;
    try {
      const settingsRes = await db.listDocuments(DB_ID, PORTFOLIO_SETTINGS_COLLECTION_ID, [
        sdk.Query.equal('user_id', profile.user_id),
        sdk.Query.limit(1),
      ]);
      if (settingsRes.total > 0) {
        const settings = settingsRes.documents[0];
        passwordEnabled = !!(settings.password_enabled || settings.passwordEnabled);
      } else {
        // No settings document = no password protection
        passwordEnabled = false;
      }
    } catch {
      // SECURITY: Fail closed - if we can't read settings, assume password protected
      passwordEnabled = true;
    }

    // If password protected, verify
    if (passwordEnabled) {
      // First check if valid session token provided
      let hasValidSession = false;
      if (providedToken) {
        const sessionData = verifySessionToken(providedToken);
        if (sessionData && sessionData.username === username.toLowerCase()) {
          hasValidSession = true;
        }
      }

      // If no valid session, verify password
      if (!hasValidSession) {
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

        const verifyResult = await verifyPassword(db, username, password);
        if (!verifyResult.valid) {
          return res.json({ 
            success: false, 
            error: 'Invalid password',
            protected: true 
          }, 401);
        }

        // Generate session token for subsequent requests
        const newToken = signSessionToken(username.toLowerCase(), profile.user_id);
        
        // Build and return portfolio with token
        const portfolio = await buildPublicPortfolio(db, username, newToken);
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
    const portfolio = await buildPublicPortfolio(db, username, providedToken);
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
