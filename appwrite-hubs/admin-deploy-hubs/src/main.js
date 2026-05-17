'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');

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
];

module.exports = async ({ req, res, log, error }) => {
  const devkitPassword = process.env.DEVKIT_PASSWORD;
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.json({ ok: false, error: 'Invalid request body' }, 400);
  }

  const authHeader = body?.__headers?.Authorization || req.headers?.authorization || '';
  if (!devkitPassword || authHeader !== `Bearer ${devkitPassword}`) {
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

  return res.json({
    ok: failed === 0,
    results,
    summary: { deployed, failed, skipped: results.filter(r => r.status === 'skipped').length },
  });
};
