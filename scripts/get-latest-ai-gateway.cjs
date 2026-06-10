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

const client = new sdk.Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);
functions.listExecutions('ai-gateway', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(3)]).then((res) => {
  for (const ex of res.executions) {
    console.log('Execution ID:', ex.$id);
    console.log('Status:', ex.status);
    console.log('Response Status:', ex.responseStatusCode);
    console.log('Errors:', ex.errors);
    console.log('Logs:', ex.logs);
    console.log('-------------------------');
  }
}).catch((e) => console.error(e.message));
