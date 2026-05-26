const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');
const envPath = path.join(process.cwd(), '.env.deploy');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const [k, ...r] = t.split('=');
    if (!process.env[k]) process.env[k] = r.join('=').replace(/^["']|["']$/g, '');
  }
}
const execId = process.argv[2];
const client = new sdk.Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY);
const functions = new sdk.Functions(client);
functions.getExecution('email-service', execId).then((ex) => {
  console.log(JSON.stringify({
    status: ex.status,
    responseStatusCode: ex.responseStatusCode,
    responseBody: ex.responseBody,
    logs: ex.logs,
    errors: ex.errors,
  }, null, 2));
}).catch((e) => console.error(e.message));
