'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

const HUBS = [
  'resume-section-ai',
  'job-import',
  'ai-gateway',
  'coupons',
  'wisehire-gateway',
  'public-share',
  'ai-health',
  'admin-devkit-data',
  'admin-email',
  'admin-testmail',
  'admin-feature-flags',
  'admin-moderation',
  'admin-portfolio-usernames',
  'admin-visitor-analytics',
  'admin-onboarding-funnel',
  'admin-impersonate',
  'inspect-ai-keys',
  'admin-deploy-hubs',
  'revenuecat-webhook',
  'email-service',
];

function verifySignedToken(token) {
  const secret = process.env.DEVKIT_PASSWORD;
  if (!secret || !token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const actualBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

function bearerToken(req, body) {
  const authHeader = body?.__headers?.Authorization || req.headers?.authorization || req.headers?.Authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

function checkAuth(req, body) {
  const token = bearerToken(req, body);
  const password = process.env.DEVKIT_PASSWORD;
  if (!password || !token) return false;
  if (token === password) return true;
  return verifySignedToken(token);
}

module.exports = async ({ req, res, log, error }) => {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.json({ ok: false, error: 'Invalid request body' }, 400);
  }

  if (!checkAuth(req, body)) {
    return res.json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const filter = body?.hubs || null; // optional array to deploy only specific hubs
  const hubs = filter ? HUBS.filter(h => filter.includes(h)) : HUBS;

  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO || 'iammagdy/WiseResume-TWC';
  const apiKey = process.env.APPWRITE_API_KEY;
  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;

  if (!githubToken) return res.json({ ok: false, error: 'GITHUB_TOKEN not configured' }, 500);
  if (!apiKey) return res.json({ ok: false, error: 'APPWRITE_API_KEY not configured' }, 500);

  const workDir = path.join(os.tmpdir(), `deploy-hubs-${Date.now()}`);
  const results = [];

  try {
    log(`Cloning ${githubRepo}...`);
    execSync(
      `git clone --depth 1 https://x-access-token:${githubToken}@github.com/${githubRepo}.git "${workDir}"`,
      { timeout: 90000, stdio: 'pipe' }
    );
    log('Repository cloned successfully');

    for (const hub of hubs) {
      const hubDir = path.join(workDir, 'appwrite-hubs', hub);
      if (!fs.existsSync(hubDir)) {
        log(`Skipping ${hub} — directory not found`);
        results.push({ hub, status: 'skipped' });
        continue;
      }

      try {
        const pkgJson = path.join(hubDir, 'package.json');
        if (fs.existsSync(pkgJson)) {
          log(`[${hub}] Installing dependencies...`);
          execSync('npm install --omit=dev --silent', { cwd: hubDir, timeout: 60000, stdio: 'pipe' });
        }

        const archivePath = path.join(workDir, `${hub}.tar.gz`);
        log(`[${hub}] Packaging...`);
        execSync(`tar -czf "${archivePath}" .`, { cwd: hubDir, timeout: 30000, stdio: 'pipe' });

        const archiveSize = fs.statSync(archivePath).size;
        log(`[${hub}] Archive: ${Math.round(archiveSize / 1024)}KB`);

        log(`[${hub}] Deploying...`);
        const form = new FormData();
        form.append('entrypoint', 'src/main.js');
        form.append('activate', 'true');
        form.append('code', fs.createReadStream(archivePath), {
          filename: `${hub}.tar.gz`,
          contentType: 'application/gzip',
        });

        const response = await axios.post(
          `${endpoint}/functions/${hub}/deployments`,
          form,
          {
            headers: {
              ...form.getHeaders(),
              'X-Appwrite-Project': projectId,
              'X-Appwrite-Key': apiKey,
            },
            timeout: 60000,
            maxContentLength: 50 * 1024 * 1024,
            maxBodyLength: 50 * 1024 * 1024,
          }
        );

        log(`[${hub}] Deployed: ${response.data.$id}`);
        results.push({ hub, status: 'deployed', deploymentId: response.data.$id });
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        error(`[${hub}] Failed: ${msg}`);
        results.push({ hub, status: 'failed', error: msg });
      }
    }
  } finally {
    try { execSync(`rm -rf "${workDir}"`, { stdio: 'pipe' }); } catch {}
  }

  const deployed = results.filter(r => r.status === 'deployed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  log(`Done: ${deployed} deployed, ${failed} failed, ${results.filter(r => r.status === 'skipped').length} skipped`);

  // ── Set email-service function variables ─────────────────────────────────
  // After deploying email-service, ensure its core variables are set.
  // RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME must be added manually
  // in Appwrite Console → Functions → email-service → Variables (once only).
  const emailServiceDeployed = results.some(r => r.hub === 'email-service' && r.status === 'deployed');
  if (emailServiceDeployed) {
    const emailServiceVars = [
      ['APPWRITE_API_KEY',    apiKey],
      ['APPWRITE_ENDPOINT',   endpoint],
      ['APPWRITE_PROJECT_ID', projectId],
      ['DEVKIT_PASSWORD',     process.env.DEVKIT_PASSWORD],
      ['FRONTEND_URL',        'https://resume.thewise.cloud'],
      ['RESEND_API_KEY',      process.env.RESEND_API_KEY],
      ['RESEND_FROM_EMAIL',   process.env.RESEND_FROM_EMAIL || 'noreply@thewise.cloud'],
      ['RESEND_FROM_NAME',    process.env.RESEND_FROM_NAME  || 'WiseResume'],
    ].filter(([, v]) => !!v);

    try {
      const existingVarsRes = await axios.get(`${endpoint}/functions/email-service/variables`, {
        headers: { 'X-Appwrite-Key': apiKey, 'X-Appwrite-Project': projectId },
        timeout: 10000,
      });
      const existingVars = existingVarsRes.data?.variables ?? [];

      for (const [key, value] of emailServiceVars) {
        const existing = existingVars.find(v => v.key === key);
        try {
          if (existing) {
            if (existing.value !== value) {
              await axios.put(`${endpoint}/functions/email-service/variables/${existing.$id}`,
                { key, value },
                { headers: { 'X-Appwrite-Key': apiKey, 'X-Appwrite-Project': projectId, 'Content-Type': 'application/json' }, timeout: 10000 },
              );
              log(`Updated email-service variable: ${key}`);
            }
          } else {
            await axios.post(`${endpoint}/functions/email-service/variables`,
              { key, value },
              { headers: { 'X-Appwrite-Key': apiKey, 'X-Appwrite-Project': projectId, 'Content-Type': 'application/json' }, timeout: 10000 },
            );
            log(`Created email-service variable: ${key}`);
          }
        } catch (e) {
          error(`Could not set email-service variable ${key}: ${e.response?.data?.message || e.message}`);
        }
      }
    } catch (e) {
      error(`Could not list email-service variables: ${e.response?.data?.message || e.message}`);
    }
  }

  // ── Blank Appwrite's built-in auth email templates ────────────────────────
  // email-service sends all transactional emails via Resend. Appwrite's own
  // template system fires on createVerification() / createRecovery() calls and
  // would send a broken duplicate. Set both templates to a single space so
  // Appwrite delivers an invisible no-op that users never see.
  if (deployed > 0) {
    for (const type of ['verification', 'recovery']) {
      const url = `${endpoint}/projects/${projectId}/templates/email/${type}/en`;
      try {
        const res2 = await axios.patch(url,
          { subject: 'WiseResume', message: ' ' },
          { headers: { 'X-Appwrite-Key': apiKey, 'X-Appwrite-Project': projectId, 'Content-Type': 'application/json' }, timeout: 10000 },
        );
        log(`Blanked Appwrite ${type} email template (status ${res2.status})`);
      } catch (e) {
        error(`Could not blank ${type} template: ${e.response?.data?.message || e.message}`);
      }
    }
  }

  return res.json({
    ok: failed === 0,
    results,
    summary: { deployed, failed, skipped: results.filter(r => r.status === 'skipped').length },
  });
};
