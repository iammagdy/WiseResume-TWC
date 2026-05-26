const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');

function loadEnv(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const [k, ...r] = t.split('=');
    if (!process.env[k]) process.env[k] = r.join('=').replace(/^["']|["']$/g, '');
  }
}
loadEnv('.env.deploy');

const body = JSON.parse(process.argv[2] || '{}');
const client = new sdk.Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY);
const functions = new sdk.Functions(client);

functions
  .createExecution('email-service', JSON.stringify(body), false, '/', 'POST')
  .then((ex) => {
    console.log('status', ex.status, 'code', ex.responseStatusCode);
    console.log(ex.responseBody);
  })
  .catch((e) => console.error(e.message));
