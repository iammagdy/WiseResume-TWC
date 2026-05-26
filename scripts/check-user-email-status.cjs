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

const email = (process.argv[2] || '').trim().toLowerCase();
const key = process.env.APPWRITE_API_KEY;
const client = new sdk.Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('69fd362b001eb325a192')
  .setKey(key);
const users = new sdk.Users(client);

users.list([sdk.Query.equal('email', [email]), sdk.Query.limit(1)]).then((res) => {
  const u = res.users[0];
  if (!u) {
    console.log('NOT_FOUND');
    return;
  }
  console.log(JSON.stringify({
    id: u.$id,
    email: u.email,
    emailVerification: u.emailVerification,
    name: u.name,
  }, null, 2));
}).catch((e) => console.error(e.message));
