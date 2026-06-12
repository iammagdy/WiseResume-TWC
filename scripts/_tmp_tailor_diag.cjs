'use strict';

const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');

function loadEnv(f) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const [k, ...r] = t.split('=');
    if (!process.env[k]) process.env[k] = r.join('=').replace(/^['"]|['"]$/g, '');
  }
}
loadEnv('.env.deploy');
loadEnv('.env');

const client = new sdk.Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY);
const fn = new sdk.Functions(client);

(async () => {
  const ex = await fn.listExecutions('ai-gateway');
  const rows = (ex.executions || [])
    .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt))
    .slice(0, 25);

  for (const row of rows) {
    let body = row.responseBody || '';
    let parsed = null;
    try { parsed = JSON.parse(body); } catch { /* */ }
    const feature = parsed?.meta?.feature || (typeof body === 'string' && body.includes('tailor-resume') ? 'tailor-resume?' : '');
    const snippet = parsed
      ? JSON.stringify({
          status: parsed.status,
          code: parsed.code,
          message: parsed.message,
          feature: parsed.meta?.feature,
          http: row.responseStatusCode,
        })
      : String(body).slice(0, 160);
    console.log(
      row.$createdAt,
      row.status,
      row.responseStatusCode,
      feature || '-',
      snippet,
      (row.errors || '').slice(0, 120),
    );
  }
})().catch((e) => console.error(e.message));
