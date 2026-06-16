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
  'admin-sentry',
  'inspect-ai-keys',
  'admin-deploy-hubs',
  'email-service',
];

function verifySignedToken(token) {
  const secrets = [
    process.env.APPWRITE_API_KEY,
    process.env.APPWRITE_FUNCTION_API_KEY,
    process.env.DEVKIT_PASSWORD,
  ].filter(Boolean);
  if (!secrets.length || !token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;
  const signed = secrets.some(secret => {
    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    const actualBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  });
  if (!signed) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

function bearerToken(req, body) {
  const authHeader = body?.__headers?.Authorization || req.headers?.authorization || req.headers?.Authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

function timingSafeStringEqual(a, b) {
  const nonce = crypto.randomBytes(32);
  const h1 = crypto.createHmac('sha256', nonce).update(String(a)).digest();
  const h2 = crypto.createHmac('sha256', nonce).update(String(b)).digest();
  return crypto.timingSafeEqual(h1, h2);
}

function checkAuth(req, body) {
  const token = bearerToken(req, body);
  const password = process.env.DEVKIT_PASSWORD;
  if (!token) return false;
  if (password && timingSafeStringEqual(token, password)) return true;
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

  if (body?.action === 'health') {
    return res.json({
      ok: true,
      managedHubs: HUBS.length,
      gitConfigured: !!process.env.GITHUB_TOKEN,
      appwriteConfigured: !!process.env.APPWRITE_API_KEY,
    });
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
  const tmpTar = `${workDir}-repo.tar.gz`;
  const results = [];

  try {
    log(`Downloading ${githubRepo} from GitHub API (no git required)...`);
    fs.mkdirSync(workDir, { recursive: true });
    const tarResponse = await axios.get(
      `https://api.github.com/repos/${githubRepo}/tarball/main`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'WiseResume-DeployHubs/1.0',
        },
        responseType: 'arraybuffer',
        timeout: 90000,
        maxRedirects: 10,
      }
    );
    fs.writeFileSync(tmpTar, Buffer.from(tarResponse.data));
    execSync(`tar -xzf "${tmpTar}" --strip-components=1 -C "${workDir}"`, { stdio: 'pipe', timeout: 60000 });
    try { fs.unlinkSync(tmpTar); } catch {}
    log('Repository downloaded and extracted successfully');

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
  } catch (fatalErr) {
    const fatalMsg = fatalErr.response?.data?.message || fatalErr.message || String(fatalErr);
    error(`Deploy fatal error: ${fatalMsg}`);
    return res.json({ ok: false, error: fatalMsg, results });
  } finally {
    try { execSync(`rm -rf "${workDir}"`, { stdio: 'pipe' }); } catch {}
    try { if (fs.existsSync(tmpTar)) fs.unlinkSync(tmpTar); } catch {}
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
      ['FRONTEND_URL',        'https://wiseresume.app'],
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
    success: failed === 0,
    ok: failed === 0,
    results,
    summary: { deployed, failed, skipped: results.filter(r => r.status === 'skipped').length },
  });
};
