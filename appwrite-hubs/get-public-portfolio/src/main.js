'use strict';

const crypto = require('crypto');
const sdk = require('node-appwrite');

const DB_ID = 'main';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const JWT_SECRET = process.env.PORTFOLIO_JWT_SECRET || 'dev-secret-change-in-production';

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

function signSessionToken(username, userId) {
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
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;
    const payload = Buffer.from(payloadB64, 'base64').toString();
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64');
    if (signature !== expectedSig) return null;
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
  
  if (!passwordEnabled || !storedHash) return { valid: true, userId };
  
  const submittedHash = sha256Hex(password);
  if (submittedHash !== storedHash) return { valid: false };
  
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
  
  // Build sanitized public profile (NO private fields)
  const publicProfile = {
    username: rawProfile.username,
    fullName: rawProfile.full_name || rawProfile.fullName || '',
    jobTitle: rawProfile.job_title || rawProfile.jobTitle || '',
    bio: rawProfile.portfolio_bio || rawProfile.portfolioBio || extras.portfolioSummary || '',
    location: rawProfile.location || '',
    avatarUrl: rawProfile.avatar_url || rawProfile.avatarUrl || null,
    accentColor: rawProfile.portfolio_accent_color || rawProfile.portfolioAccentColor || '#e84545',
    font: rawProfile.portfolio_font || rawProfile.portfolioFont || 'inter',
    style: rawProfile.portfolio_style || rawProfile.portfolioStyle || 'modern',
    layout: rawProfile.portfolio_layout || rawProfile.portfolioLayout || 'standard',
    sections: rawProfile.portfolio_sections || rawProfile.portfolioSections || {},
    metaTitle: rawProfile.portfolio_meta_title || rawProfile.portfolioMetaTitle || null,
    metaDescription: rawProfile.portfolio_meta_description || rawProfile.portfolioMetaDescription || null,
    social: {
      github: rawProfile.github_url || rawProfile.githubUrl || null,
      website: rawProfile.website_url || rawProfile.websiteUrl || null,
      twitter: rawProfile.twitter_url || rawProfile.twitterUrl || null,
      linkedin: rawProfile.linkedin_url || rawProfile.linkedinUrl || null,
    },
    openToWork: rawProfile.open_to_work || rawProfile.openToWork || false,
    availabilityHeadline: rawProfile.availability_headline || rawProfile.availabilityHeadline || null,
    extras: {
      caseStudies: extras.caseStudies || [],
      services: extras.services || [],
      testimonials: extras.testimonials || [],
      highlights: extras.highlights || [],
      portfolioSummary: extras.portfolioSummary || '',
      sectionOrder: extras.sectionOrder || [],
      availabilityStatus: extras.availabilityStatus || 'not-looking',
      scrollEffect: extras.scrollEffect || 'none',
      videoIntroUrl: extras.videoIntroUrl || null,
      schedulingUrl: extras.schedulingUrl || null,
      certifications: extras.portfolioCertifications || [],
      primaryLanguage: extras.portfolioPrimaryLanguage || 'English',
      secondaryLanguage: extras.portfolioSecondaryLanguage || null,
      translations: extras.portfolioTranslations || null,
      customDomain: extras.customDomain || null,
      contactFormEnabled: extras.contactFormEnabled ?? true,
    },
  };
  
  // Get selected resume with ownership verification
  const portfolioResumeId = rawProfile.portfolio_resume_id || rawProfile.portfolioResumeId;
  let publicResume = null;
  
  if (portfolioResumeId) {
    try {
      const resumeRes = await db.listDocuments(DB_ID, RESUMES_COLLECTION_ID, [
        sdk.Query.equal('$id', portfolioResumeId),
        sdk.Query.equal('user_id', rawProfile.user_id),
        sdk.Query.limit(1),
      ]);
      
      if (resumeRes.total > 0) {
        const rawResume = resumeRes.documents[0];
        // Verify ownership
        if (rawResume.user_id === rawProfile.user_id) {
          publicResume = {
            summary: rawResume.summary || null,
            experience: Array.isArray(rawResume.experience) ? rawResume.experience : [],
            education: Array.isArray(rawResume.education) ? rawResume.education : [],
            skills: Array.isArray(rawResume.skills) ? rawResume.skills : [],
            projects: Array.isArray(rawResume.projects) ? rawResume.projects : [],
            certifications: Array.isArray(rawResume.certifications) ? rawResume.certifications : [],
            awards: Array.isArray(rawResume.awards) ? rawResume.awards : [],
            publications: Array.isArray(rawResume.publications) ? rawResume.publications : [],
            volunteering: Array.isArray(rawResume.volunteering) ? rawResume.volunteering : [],
          };
        }
      }
    } catch {
      // Resume fetch failed, return null
    }
  }
  
  return {
    profile: publicProfile,
    resume: publicResume,
    sessionToken, // Return token for protected portfolios
  };
}

module.exports = async ({ req, res, error }) => {
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
    let passwordEnabled = false;
    try {
      const settingsRes = await db.listDocuments(DB_ID, PORTFOLIO_SETTINGS_COLLECTION_ID, [
        sdk.Query.equal('user_id', profile.user_id),
        sdk.Query.limit(1),
      ]);
      if (settingsRes.total > 0) {
        const settings = settingsRes.documents[0];
        passwordEnabled = !!(settings.password_enabled || settings.passwordEnabled);
      }
    } catch {
      passwordEnabled = false;
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
};
