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
const db = new sdk.Databases(new sdk.Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY));
(async () => {
  const col = await db.getCollection('main', 'ai_credits');
  console.log(JSON.stringify({
    documentSecurity: col.documentSecurity,
    permissions: col.$permissions || col.permissions,
  }, null, 2));
})().catch((e) => console.error(e.message));
