#!/usr/bin/env node
/**
 * deploy_email_service.cjs
 *
 * Targeted deploy script for the email-service Appwrite Function.
 * Also blanks Appwrite's built-in Email Verification and Password Recovery
 * templates so they don't fire alongside our Resend emails.
 *
 * Usage:
 *   APPWRITE_API_KEY=<key> node scripts/deploy_email_service.cjs
 *
 * All other vars are optional — defaults shown in the variable table below.
 */

'use strict';

const sdk  = require('node-appwrite');
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENDPOINT   = (process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID  || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY      || '';

if (!API_KEY) {
  console.error('❌ APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new sdk.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const functions = new sdk.Functions(client);

// ─── Build the hub ────────────────────────────────────────────────────────────

function buildHub() {
  const hubDir     = path.join(process.cwd(), 'appwrite-hubs', 'email-service');
  const archivePath = path.join(process.cwd(), 'email-service.tar.gz');

  if (!fs.existsSync(hubDir)) {
    throw new Error(`Hub directory not found: ${hubDir}`);
  }

  console.log('📦 Installing dependencies...');
  execSync('npm install --omit=dev --silent', { cwd: hubDir, stdio: 'inherit' });

  console.log('📦 Creating archive...');
  execSync(`tar -czf "${archivePath}" .`, { cwd: hubDir });

  // Validate archive contains src/main.js
  const listing = execSync(`tar -tzf "${archivePath}"`).toString();
  if (!listing.includes('src/main.js')) {
    throw new Error('Archive does not contain src/main.js');
  }

  console.log(`✅ Built email-service.tar.gz`);
  return archivePath;
}

// ─── Ensure function exists ───────────────────────────────────────────────────

async function ensureFunction() {
  const id      = 'email-service';
  const name    = 'Email Service Hub';
  const runtime = 'node-18.0';
  const timeout = 30;

  try {
    const fn = await functions.get(id);
    const needsUpdate = !fn.execute || fn.execute.length === 0;
    if (needsUpdate) {
      await functions.update(id, name, fn.runtime || runtime, ['any'], [], '', timeout);
      console.log(`  Updated permissions for ${id}`);
    }
    console.log(`  ✅ Function ${id} exists`);
  } catch (e) {
    if (e.code === 404) {
      console.log(`  Creating function ${id}...`);
      await functions.create(id, name, runtime, ['any'], [], '', timeout);
      console.log(`  ✅ Created ${id}`);
    } else {
      throw e;
    }
  }
}

// ─── Set function variable ────────────────────────────────────────────────────

async function ensureVariable(key, value) {
  if (!value) {
    console.log(`  ⚠️  Skipping ${key} — not set`);
    return;
  }
  try {
    const vars = await functions.listVariables('email-service');
    const existing = vars.variables.find(v => v.key === key);
    if (existing) {
      if (existing.value !== value) {
        await functions.updateVariable('email-service', existing.$id, key, value);
        console.log(`  Updated ${key}`);
      } else {
        console.log(`  ${key} already up to date`);
      }
    } else {
      await functions.createVariable('email-service', key, value);
      console.log(`  Created ${key}`);
    }
  } catch (e) {
    console.warn(`  ⚠️  Could not set ${key}: ${e.message}`);
  }
}

// ─── Deploy the archive ───────────────────────────────────────────────────────

async function deploy(archivePath) {
  const fileBuffer = fs.readFileSync(archivePath);
  const fileName   = path.basename(archivePath);
  const file       = new File([fileBuffer], fileName, { type: 'application/gzip' });

  const deployment = await functions.createDeployment({
    functionId: 'email-service',
    code:       file,
    activate:   true,
    entrypoint: 'src/main.js',
  });

  console.log(`  ✅ Deployed: ${deployment.$id}, status=${deployment.status}`);
}

// ─── Blank Appwrite auth templates ────────────────────────────────────────────
// This stops Appwrite from firing its own (broken) email template alongside ours.
// We set both to a single space so Appwrite "sends" an invisible no-op email.

async function blankAuthTemplates() {
  const templates = [
    { type: 'verification', locale: 'en', subject: 'Verify your email' },
    { type: 'magicSession', locale: 'en', subject: 'Reset your password' },
    // Use the REST API directly — the Projects SDK class handles this
  ];

  for (const { type, locale, subject } of templates) {
    const url = `${ENDPOINT}/projects/${PROJECT_ID}/templates/email/${type}/${locale}`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Key': API_KEY,
          'X-Appwrite-Project': PROJECT_ID,
        },
        body: JSON.stringify({ subject, message: ' ' }),
      });
      if (res.ok) {
        console.log(`  ✅ Blanked ${type}/${locale} template`);
      } else {
        const text = await res.text();
        console.warn(`  ⚠️  Could not blank ${type} template (${res.status}): ${text.slice(0, 120)}`);
      }
    } catch (e) {
      console.warn(`  ⚠️  Could not blank ${type} template: ${e.message}`);
    }
  }

  // Also blank verification and recovery separately using correct types
  const authTypes = ['verification', 'recovery'];
  for (const type of authTypes) {
    const url = `${ENDPOINT}/projects/${PROJECT_ID}/templates/email/${type}/en`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Key': API_KEY,
          'X-Appwrite-Project': PROJECT_ID,
        },
        body: JSON.stringify({ subject: 'WiseResume', message: ' ' }),
      });
      if (res.ok) {
        console.log(`  ✅ Blanked auth template: ${type}`);
      } else {
        const text = await res.text();
        console.warn(`  ⚠️  Could not blank ${type} (${res.status}): ${text.slice(0, 200)}`);
      }
    } catch (e) {
      console.warn(`  ⚠️  Could not blank ${type}: ${e.message}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🚀 Deploying email-service to Appwrite\n');
  console.log(`   Endpoint:   ${ENDPOINT}`);
  console.log(`   Project:    ${PROJECT_ID}`);
  console.log('');

  // 1. Build
  const archivePath = buildHub();

  // 2. Ensure function exists with correct permissions
  console.log('\n📋 Ensuring function...');
  await ensureFunction();

  console.log('\n📋 Ensuring password_reset_otps collection schema...');
  execSync('node scripts/setup_password_reset_otps_schema.cjs', { stdio: 'inherit' });

  // 3. Set variables
  console.log('\n🔑 Setting function variables...');
  const OTP_SECRET = process.env.PASSWORD_RESET_OTP_SECRET;
  if (!OTP_SECRET) {
    console.error('❌ PASSWORD_RESET_OTP_SECRET is required to deploy email-service');
    process.exit(1);
  }
  await ensureVariable('APPWRITE_API_KEY',    API_KEY);
  await ensureVariable('APPWRITE_ENDPOINT',   ENDPOINT);
  await ensureVariable('APPWRITE_PROJECT_ID', PROJECT_ID);
  await ensureVariable('DEVKIT_PASSWORD',     process.env.DEVKIT_PASSWORD);
  await ensureVariable('RESEND_API_KEY',      process.env.RESEND_API_KEY);
  await ensureVariable('RESEND_FROM_EMAIL',   process.env.RESEND_FROM_EMAIL || 'noreply@thewise.cloud');
  await ensureVariable('RESEND_FROM_NAME',    process.env.RESEND_FROM_NAME  || 'WiseResume');
  // Canonical production domain. Must match the function default and deploy_hubs.cjs,
  // and the host MUST be registered as an Appwrite Web Platform — otherwise
  // account.createRecovery() rejects the redirect URL and no reset email is sent.
  await ensureVariable('FRONTEND_URL',        process.env.FRONTEND_URL       || 'https://wiseresume.app');
  await ensureVariable('PASSWORD_RESET_OTP_SECRET', OTP_SECRET);

  // 4. Deploy
  console.log('\n📤 Uploading deployment...');
  await deploy(archivePath);

  // 5. Blank Appwrite templates
  console.log('\n🔇 Blanking Appwrite built-in email templates...');
  await blankAuthTemplates();

  // 6. Cleanup
  try { fs.unlinkSync(archivePath); } catch {}

  console.log('\n✅ Done! email-service is deployed and active.\n');
  console.log('Next steps:');
  console.log('  1. Test via DevKit → Email → Studio tab');
  console.log('  2. Try signing up with a new account to confirm the verification email works');
}

run().catch(e => {
  console.error('\n❌ Fatal:', e.message);
  if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 500));
  process.exit(1);
});
