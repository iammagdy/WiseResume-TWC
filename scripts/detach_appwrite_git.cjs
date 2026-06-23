#!/usr/bin/env node
/**
 * detach_appwrite_git.cjs
 *
 * Disconnects Appwrite's Git (GitHub-App) auto-build from one or more Functions.
 * This is the scriptable equivalent of the Appwrite Console action:
 *   Function -> Settings -> Git -> Disconnect repository
 *
 * WHY THIS EXISTS
 * ---------------
 * When a Function is linked to a GitHub repo, Appwrite installs a push webhook
 * (via the Appwrite GitHub App) and creates a `type: vcs` deployment on EVERY
 * push to the repo - on every branch. For this project that is unwanted: hubs
 * are deployed exclusively via `scripts/deploy_hubs.cjs` (GitHub Actions
 * `Deploy Appwrite Hubs`, workflow_dispatch) or a manual Console upload.
 *
 * The Function-config API masks the VCS fields - `installationId` /
 * `providerRepositoryId` already read back empty even while a repo link is
 * still live. Because of that masking, `deploy_hubs.cjs` cannot detect that a
 * detach is needed (its diff check sees "empty == empty" and skips the update),
 * so the link is never cleared. This script ALWAYS issues an explicit update
 * with the VCS fields blanked - the per-function "Disconnect Git" path.
 *
 * IMPORTANT - install-level links: if a Function is connected at the Appwrite
 * GitHub-App INSTALLATION level, this per-function detach is cosmetic and pushes
 * will STILL auto-build (verified for `ai-gateway`: a fresh push created a
 * `type: vcs` deployment after this update). To fully stop those, remove the
 * link at the install level instead - either remove the repo from the Appwrite
 * GitHub App (GitHub -> Settings -> Applications -> Appwrite -> Configure), or
 * delete the project's VCS installation (`DELETE /vcs/installations/{id}`).
 *
 * USAGE
 * -----
 *   node scripts/detach_appwrite_git.cjs --only=ai-gateway
 *   node scripts/detach_appwrite_git.cjs --all
 *   node scripts/detach_appwrite_git.cjs --only=ai-gateway,wisehire-gateway
 *
 * Required env (same as deploy_hubs.cjs):
 *   APPWRITE_ENDPOINT (default https://fra.cloud.appwrite.io/v1)
 *   APPWRITE_PROJECT_ID (default 69fd362b001eb325a192)
 *   APPWRITE_API_KEY (needs functions.read + functions.write scopes)
 *
 * Re-connecting is intentionally NOT automated: do it from the Appwrite Console
 * (Function -> Settings -> Git -> Connect) if you ever want auto-build back.
 */

const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');

function loadEnvFile(fileName) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const [key, ...rest] = trimmed.split('=');
        if (!key || process.env[key]) continue;
        process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
    }
}

loadEnvFile('.env.deploy');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
    console.error('ERROR: APPWRITE_API_KEY is required (functions.read + functions.write).');
    process.exit(1);
}

function parseTargets() {
    const onlyArg = process.argv.find(v => v.startsWith('--only='));
    if (onlyArg) {
        return {
            all: false,
            ids: onlyArg.slice('--only='.length).split(',').map(s => s.trim()).filter(Boolean),
        };
    }
    if (process.argv.includes('--all')) return { all: true, ids: [] };
    return null;
}

const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);
const functions = new sdk.Functions(client);

// Cleared VCS fields, applied on top of each Function's existing settings.
const VCS_CLEARED = {
    installationId: '',
    providerRepositoryId: '',
    providerBranch: '',
    providerSilentMode: false,
    providerRootDirectory: '',
};

async function detach(fn) {
    const desired = {
        functionId: fn.$id,
        name: fn.name,
        runtime: fn.runtime,
        execute: Array.isArray(fn.execute) ? fn.execute : [],
        events: Array.isArray(fn.events) ? fn.events : [],
        schedule: fn.schedule || '',
        timeout: fn.timeout ?? 30,
        enabled: fn.enabled ?? true,
        logging: fn.logging ?? true,
        entrypoint: fn.entrypoint || 'src/main.js',
        commands: fn.commands || '',
        scopes: Array.isArray(fn.scopes) ? fn.scopes : [],
        ...VCS_CLEARED,
    };
    await functions.update(desired);
}

async function main() {
    const targets = parseTargets();
    if (!targets) {
        console.error('Refusing to run without a target. Pass --only=<id[,id...]> or --all.');
        process.exit(1);
    }

    const list = await functions.list();
    let fns = list.functions;
    if (!targets.all) {
        const wanted = new Set(targets.ids);
        fns = fns.filter(f => wanted.has(f.$id));
        const found = new Set(fns.map(f => f.$id));
        const missing = targets.ids.filter(id => !found.has(id));
        if (missing.length) {
            console.error(`ERROR: function(s) not found: ${missing.join(', ')}`);
            process.exit(1);
        }
    }

    if (!fns.length) {
        console.log('No matching functions. Nothing to do.');
        return;
    }

    console.log(`Detaching Appwrite Git from ${fns.length} function(s) on project ${PROJECT_ID}:`);
    let failures = 0;
    for (const fn of fns) {
        try {
            await detach(fn);
            console.log(`  [ok]   ${fn.$id} (${fn.name}) - Git disconnected; pushes no longer auto-build`);
        } catch (e) {
            failures += 1;
            console.error(`  [fail] ${fn.$id}: ${e.message}`);
        }
    }
    if (failures) {
        console.error(`Done with ${failures} failure(s).`);
        process.exit(1);
    }
    console.log('Done. Deploy via "Deploy Appwrite Hubs" (workflow_dispatch) or the Appwrite Console.');
}

main().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
