const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

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

const ROOT = process.cwd();
const APPWRITE_MANIFEST_PATH = path.join(ROOT, 'appwrite.json');
const SOURCE_HASHES_PATH = path.join(ROOT, 'src', 'lib', 'devkit', 'sourceHashes.generated.json');
const DEFAULT_RUNTIME = 'node-22';
const DEFAULT_TIMEOUT = 30;
const DEPLOY_POLL_INTERVAL_MS = 2000;
const DEPLOY_POLL_ATTEMPTS = 120;

// GitHub Actions + this script are the canonical deployment path.
// Appwrite Git auto-deploy is intentionally disabled for managed hubs.
const DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS = true;

const HUB_TIMEOUTS = {
    // tailor-resume allows up to 28s per provider attempt with cross-provider fallbacks
    'ai-gateway': 180,
    'admin-deploy-hubs': 900,
    // DevKit admin hubs — timeouts aligned with their heaviest action:
    //   admin-devkit-data: mission-control (4 external pings + 3 DB reads), purge-orphans, overview-stats
    //   admin-visitor-analytics: dashboard action paginates visitor_events (large dataset)
    //   admin-onboarding-funnel: unbounded fetchAll over audit_logs
    //   admin-moderation: multi-collection paginated queries
    //   admin-portfolio-usernames: multi-collection reads
    'admin-devkit-data': 300,
    'admin-visitor-analytics': 300,
    'admin-onboarding-funnel': 120,
    'admin-moderation': 60,
    'admin-portfolio-usernames': 60,
};

const HUBS = [
    { id: 'resume-section-ai', name: 'Resume Section AI Hub', file: 'resume-section-ai.tar.gz' },
    { id: 'job-import', name: 'Job Import Hub', file: 'job-import.tar.gz' },
    { id: 'ai-gateway', name: 'AI Gateway Hub', file: 'ai-gateway.tar.gz' },
    { id: 'coupons', name: 'Coupons Hub', file: 'coupons.tar.gz' },
    { id: 'wisehire-gateway', name: 'WiseHire Gateway Hub', file: 'wisehire-gateway.tar.gz' },
    { id: 'public-share', name: 'Public Share Hub', file: 'public-share.tar.gz' },
    { id: 'ai-health', name: 'AI Health Hub', file: 'ai-health.tar.gz' },
    { id: 'admin-devkit-data', name: 'Admin DevKit Data Hub', file: 'admin-devkit-data.tar.gz' },
    { id: 'admin-email', name: 'Admin Email Hub', file: 'admin-email.tar.gz' },
    { id: 'admin-testmail', name: 'Admin Testmail Hub', file: 'admin-testmail.tar.gz' },
    { id: 'admin-feature-flags', name: 'Admin Feature Flags Hub', file: 'admin-feature-flags.tar.gz' },
    { id: 'admin-moderation', name: 'Admin Moderation Hub', file: 'admin-moderation.tar.gz' },
    { id: 'admin-portfolio-usernames', name: 'Admin Portfolio Usernames Hub', file: 'admin-portfolio-usernames.tar.gz' },
    { id: 'admin-visitor-analytics', name: 'Admin Visitor Analytics Hub', file: 'admin-visitor-analytics.tar.gz' },
    { id: 'admin-onboarding-funnel', name: 'Admin Onboarding Funnel Hub', file: 'admin-onboarding-funnel.tar.gz' },
    { id: 'admin-impersonate', name: 'Admin Impersonate Hub', file: 'admin-impersonate.tar.gz' },
    { id: 'inspect-ai-keys', name: 'Inspect AI Keys Hub', file: 'inspect-ai-keys.tar.gz' },
    { id: 'admin-deploy-hubs', name: 'Admin Deploy Hubs', file: 'admin-deploy-hubs.tar.gz' },
    { id: 'admin-sentry', functionId: '6a0760710000ff231048', name: 'Admin Sentry Hub', file: 'admin-sentry.tar.gz' },
    { id: 'email-service', name: 'Email Service Hub', file: 'email-service.tar.gz' },
    { id: 'portfolio-gate', name: 'Portfolio Gate', file: 'portfolio-gate.tar.gz' },
    { id: 'get-public-portfolio', name: 'Get Public Portfolio', file: 'get-public-portfolio.tar.gz' },
    { id: 'verify-portfolio-password', name: 'Verify Portfolio Password', file: 'verify-portfolio-password.tar.gz' },
    { id: 'portfolio-settings', name: 'Portfolio Settings Hub', file: 'portfolio-settings.tar.gz' },
];

const SAFE_SMOKE_CHECKS = new Map([
    // admin-sentry is fail-closed: an UNSIGNED Sentry webhook must be REJECTED
    // with 401. Treat 401 as the expected PASS — a 200 here would mean the
    // fail-open behaviour regressed. We intentionally send no signature and do
    // not reference the webhook secret in this check.
    ['admin-sentry', { auth: 'none', body: { action: 'webhook', resource: 'health' }, okStatuses: [401] }],
    ['admin-devkit-data', { auth: 'devkit', body: { action: 'diagnostics' } }],
    ['admin-email', { auth: 'devkit', body: { module: 'resend-stats', action: 'stats' } }],
    ['admin-feature-flags', { auth: 'devkit', body: { action: 'list' } }],
    ['admin-moderation', { auth: 'devkit', body: { action: 'list_bug_reports', page: 1, per_page: 1 } }],
    ['admin-portfolio-usernames', { auth: 'devkit', body: { action: 'directory_list', page: 1, per_page: 1 } }],
    ['admin-visitor-analytics', { auth: 'devkit', body: { action: 'kpis', range: '7d' } }],
    ['admin-onboarding-funnel', { auth: 'devkit', body: { days: 7, granularity: 'day' } }],
    ['inspect-ai-keys', { auth: 'devkit', body: { action: 'inspect', includeModels: true } }],
    ['admin-deploy-hubs', { auth: 'devkit', body: { action: 'health' } }],
    ['ai-gateway', { auth: 'gateway-internal', body: { featureName: 'smoke-check', 'x-smoke-test': 'true' } }],
    // ai-health now requires an authenticated user session: an anonymous request
    // must be REJECTED with 401. Treat 401 as the expected PASS.
    ['ai-health', { auth: 'none', body: {}, okStatuses: [401] }],
]);

function selectedHubIds() {
    const arg = process.argv.find(v => v.startsWith('--only='));
    const raw = (arg ? arg.slice('--only='.length) : process.env.HUB_FILTER || '').trim();
    if (!raw) return null;
    return new Set(raw.split(',').map(v => v.trim()).filter(Boolean));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function functionIdForHub(hub) {
    return hub.functionId || hub.id;
}

function loadAppwriteManifest() {
    if (!fs.existsSync(APPWRITE_MANIFEST_PATH)) {
        throw new Error(`Missing Appwrite manifest: ${APPWRITE_MANIFEST_PATH}`);
    }
    const manifest = JSON.parse(fs.readFileSync(APPWRITE_MANIFEST_PATH, 'utf8'));
    const byFunctionId = new Map();
    for (const fn of manifest.functions || []) {
        byFunctionId.set(fn.functionId, fn);
    }
    return { manifest, byFunctionId };
}

function loadSourceHashes() {
    if (!fs.existsSync(SOURCE_HASHES_PATH)) return {};
    const parsed = JSON.parse(fs.readFileSync(SOURCE_HASHES_PATH, 'utf8'));
    return parsed.hashes || {};
}

const appwriteManifest = loadAppwriteManifest();
const sourceHashes = loadSourceHashes();

function manifestConfigForHub(hub) {
    const fnId = functionIdForHub(hub);
    const fn = appwriteManifest.byFunctionId.get(fnId)
        || appwriteManifest.byFunctionId.get(hub.id);
    if (!fn) throw new Error(`Missing appwrite.json entry for ${hub.id} (${fnId})`);
    return fn;
}

function buildHub(hub) {
    const hubDir = path.join(ROOT, 'appwrite-hubs', hub.id);
    const archivePath = path.join(ROOT, hub.file);
    if (!fs.existsSync(hubDir)) throw new Error(`Hub directory not found: ${hubDir}`);
    const pkgJson = path.join(hubDir, 'package.json');
    if (fs.existsSync(pkgJson)) {
        console.log(`  Installing deps for ${hub.id}...`);
        execSync('npm install --omit=dev --silent', { cwd: hubDir, stdio: 'inherit' });
    }
    console.log(`  Packaging ${hub.id}...`);
    execSync(`tar -czf "${archivePath}" .`, { cwd: hubDir });
    console.log(`  Built ${hub.file}`);
}

const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);
const databases = new sdk.Databases(client);

function desiredFunctionSettings(hub, currentFn = null) {
    const manifestEntry = manifestConfigForHub(hub);
    const timeoutTarget = HUB_TIMEOUTS[hub.id] ?? DEFAULT_TIMEOUT;
    return {
        functionId: functionIdForHub(hub),
        name: manifestEntry.name || hub.name,
        runtime: manifestEntry.runtime || currentFn?.runtime || DEFAULT_RUNTIME,
        execute: ['any'],
        events: Array.isArray(currentFn?.events) ? currentFn.events : [],
        schedule: currentFn?.schedule || '',
        timeout: Math.max(timeoutTarget, currentFn?.timeout ?? 0),
        enabled: true,
        logging: true,
        entrypoint: manifestEntry.entrypoint || 'src/main.js',
        commands: typeof manifestEntry.commands === 'string' ? manifestEntry.commands : '',
        scopes: Array.isArray(currentFn?.scopes) ? currentFn.scopes : [],
        installationId: DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS ? '' : (currentFn?.installationId || ''),
        providerRepositoryId: DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS ? '' : (currentFn?.providerRepositoryId || ''),
        providerBranch: DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS ? '' : (currentFn?.providerBranch || ''),
        providerSilentMode: false,
        providerRootDirectory: DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS ? '' : (currentFn?.providerRootDirectory || ''),
        buildSpecification: currentFn?.buildSpecification,
        runtimeSpecification: currentFn?.runtimeSpecification,
        deploymentRetention: currentFn?.deploymentRetention ?? 0,
    };
}

function settingsNeedUpdate(currentFn, desired) {
    const currentExecute = Array.isArray(currentFn.execute) ? currentFn.execute : [];
    const desiredExecute = Array.isArray(desired.execute) ? desired.execute : [];
    const sameExecute = currentExecute.length === desiredExecute.length && currentExecute.every(v => desiredExecute.includes(v));
    return (
        currentFn.name !== desired.name ||
        currentFn.runtime !== desired.runtime ||
        !sameExecute ||
        (currentFn.timeout ?? 0) !== desired.timeout ||
        (currentFn.enabled ?? true) !== desired.enabled ||
        (currentFn.logging ?? true) !== desired.logging ||
        (currentFn.entrypoint || '') !== desired.entrypoint ||
        (currentFn.commands || '') !== desired.commands ||
        (currentFn.installationId || '') !== desired.installationId ||
        (currentFn.providerRepositoryId || '') !== desired.providerRepositoryId ||
        (currentFn.providerBranch || '') !== desired.providerBranch ||
        (currentFn.providerRootDirectory || '') !== desired.providerRootDirectory
    );
}

async function ensureFunction(hub) {
    const functionId = functionIdForHub(hub);
    try {
        const fn = await functions.get(functionId);
        const desired = desiredFunctionSettings(hub, fn);
        if (settingsNeedUpdate(fn, desired)) {
            await functions.update(desired);
            console.log(`  Updated settings for ${hub.id}`);
        }
        console.log(`  ${hub.id} already exists`);
    } catch (e) {
        if (e.code === 404) {
            const desired = desiredFunctionSettings(hub, null);
            await functions.create(desired);
            console.log(`  Created ${hub.id}`);
        } else {
            throw e;
        }
    }
}

async function waitForDeploymentReady(functionId, deploymentId) {
    for (let attempt = 0; attempt < DEPLOY_POLL_ATTEMPTS; attempt += 1) {
        const deployment = await functions.getDeployment(functionId, deploymentId);
        if (!['waiting', 'processing', 'building'].includes(deployment.status)) {
            if (deployment.status !== 'ready') {
                throw new Error(`${functionId} deployment ${deploymentId} finished with status=${deployment.status}`);
            }
            return deployment;
        }
        await sleep(DEPLOY_POLL_INTERVAL_MS);
    }
    throw new Error(`${functionId} deployment ${deploymentId} did not reach ready state in time`);
}

async function deployFunction(hub) {
    const absPath = path.join(ROOT, hub.file);
    const functionId = functionIdForHub(hub);
    const manifestEntry = manifestConfigForHub(hub);

    console.log(`\nDeploying ${hub.name} (${hub.id})...`);
    buildHub(hub);

    await ensureFunction(hub);

    const fileBuffer = fs.readFileSync(absPath);
    const fileName = path.basename(absPath);
    const file = new File([fileBuffer], fileName, { type: 'application/gzip' });
    const deployment = await functions.createDeployment({
        functionId,
        code: file,
        activate: true,
        entrypoint: manifestEntry.entrypoint || 'src/main.js',
    });
    console.log(`  Deployed: ${deployment.$id}, status=${deployment.status}`);
    const readyDeployment = await waitForDeploymentReady(functionId, deployment.$id);
    console.log(`  Ready: ${readyDeployment.$id}, status=${readyDeployment.status}`);
    return readyDeployment;
}

async function ensureVariable(fnId, key, value) {
    if (!value) return;
    try {
        const vars = await functions.listVariables(fnId);
        const existing = vars.variables.find(v => v.key === key);
        if (existing) {
            if (existing.value !== value) {
                await functions.updateVariable(fnId, existing.$id, key, value);
                console.log(`  Updated ${key} on ${fnId}`);
            }
        } else {
            await functions.createVariable(fnId, sdk.ID.unique(), key, value);
            console.log(`  Created ${key} on ${fnId}`);
        }
    } catch (e) {
        console.warn(`  Could not set ${key} on ${fnId}: ${e.message}`);
    }
}

async function existingVariableValue(fnId, key) {
    try {
        const vars = await functions.listVariables(fnId);
        const existing = vars.variables.find(v => v.key === key);
        return existing?.value || null;
    } catch {
        return null;
    }
}

async function firstExistingVariableValue(fnIds, key) {
    for (const fnId of fnIds) {
        const value = await existingVariableValue(fnId, key);
        if (value) return value;
    }
    return null;
}

function base64url(input) {
    return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function devKitToken() {
    const secret = process.env.APPWRITE_API_KEY;
    if (!secret) throw new Error('APPWRITE_API_KEY is required for signed DevKit smoke tests');
    const now = Date.now();
    const payload = { purpose: 'devkit', iat: now, exp: now + (15 * 60 * 1000), version: 2, uid: 'deploy-script' };
    const encoded = base64url(JSON.stringify(payload));
    const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    return `${encoded}.${sig}`;
}

function gatewayInternalToken(purpose) {
    const secret = process.env.GATEWAY_SMOKE_SECRET;
    if (!secret) throw new Error('GATEWAY_SMOKE_SECRET is required for signed ai-gateway smoke tests');
    const now = Date.now();
    const payload = { purpose, iat: now, exp: now + (5 * 60 * 1000), source: 'deploy-script' };
    const encoded = base64url(JSON.stringify(payload));
    const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    return `${encoded}.${sig}`;
}

async function smokeFunction(hubId, smoke) {
    const hub = HUBS.find(entry => entry.id === hubId);
    if (!hub) throw new Error(`Unknown hub for smoke test: ${hubId}`);
    const functionId = functionIdForHub(hub);
    const body = { ...(smoke.body || {}) };
    if (smoke.auth === 'devkit') {
        body.__headers = { Authorization: `Bearer ${devKitToken()}` };
    } else if (smoke.auth === 'gateway-internal') {
        body.__headers = {
            ...(body.__headers || {}),
            'X-Internal-Gateway-Token': gatewayInternalToken('gateway-smoke'),
        };
    }
    const execution = await functions.createExecution({
        functionId,
        body: JSON.stringify(body),
        async: false,
        path: '/',
        method: 'POST',
    });
    if (execution.status === 'failed') {
        throw new Error(`${hubId} smoke execution failed: ${execution.errors || 'execution failed'}`);
    }
    const status = execution.responseStatusCode;
    // A smoke check may declare explicit expected statuses (smoke.okStatuses) for
    // endpoints that are intentionally fail-closed — i.e. an unsigned webhook or
    // an unauthenticated request that MUST be rejected. Otherwise any 2xx passes.
    const expected = Array.isArray(smoke.okStatuses) && smoke.okStatuses.length
        ? smoke.okStatuses
        : null;
    const passed = expected ? expected.includes(status) : (status >= 200 && status < 300);
    if (!passed) {
        throw new Error(`${hubId} smoke returned HTTP ${status}${expected ? ` (expected ${expected.join('/')})` : ''}`);
    }
    console.log(`  Smoke ${hubId}: HTTP ${status}${expected ? ' (expected — fail-closed)' : ''}`);
    return execution;
}

async function runSmokeChecks(hubsToCheck) {
    if (!hubsToCheck.length) return;
    console.log('\nRunning safe smoke checks...');
    for (const hub of hubsToCheck) {
        const smoke = SAFE_SMOKE_CHECKS.get(hub.id);
        if (!smoke) continue;
        await smokeFunction(hub.id, smoke);
    }
}

async function patchAuthEmailTemplate(type, subject, message) {
    const endpoint = (process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
    const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
    const apiKey = process.env.APPWRITE_API_KEY;
    if (!apiKey) {
        console.warn('  Could not patch auth templates: APPWRITE_API_KEY not configured');
        return;
    }

    const response = await fetch(`${endpoint}/projects/${projectId}/templates/email/${type}/en`, {
        method: 'PATCH',
        headers: {
            'X-Appwrite-Key': apiKey,
            'X-Appwrite-Project': projectId,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, message }),
    });
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
}

async function syncAuthEmailTemplates() {
    const templatesDir = path.join(ROOT, 'appwrite-hubs', 'email-templates');

    console.log('\nConfiguring Appwrite auth email templates...');

    try {
        await patchAuthEmailTemplate('verification', ' ', ' ');
        console.log('  Blanked verification template (Resend is the branded verification email)');
    } catch (e) {
        console.warn(`  Could not blank verification template: ${e.message}`);
    }

    const recoveryPath = path.join(templatesDir, 'password-recovery.html');
    if (fs.existsSync(recoveryPath)) {
        try {
            const message = fs.readFileSync(recoveryPath, 'utf8');
            await patchAuthEmailTemplate('recovery', 'Reset your WiseResume password', message);
            console.log('  Synced recovery template (password-recovery.html)');
        } catch (e) {
            console.warn(`  Could not sync recovery template: ${e.message}`);
        }
    }
}

async function upsertDeployedHashes(hubIds) {
    const hashesToWrite = {};
    for (const hubId of hubIds) {
        if (sourceHashes[hubId]) hashesToWrite[hubId] = String(sourceHashes[hubId]).slice(0, 16);
    }
    if (!Object.keys(hashesToWrite).length) return;

    const existing = await databases.listDocuments('main', 'app_settings', [sdk.Query.limit(100)]);
    const existingDoc = (existing.documents || []).find(doc => doc.key === 'fn_deployed_hashes');

    let merged = {};
    if (existingDoc?.value) {
        try { merged = JSON.parse(existingDoc.value) || {}; } catch { merged = {}; }
    }
    merged = { ...merged, ...hashesToWrite };
    const serialized = JSON.stringify(merged);

    if (existingDoc) {
        await databases.updateDocument('main', 'app_settings', existingDoc.$id, { value: serialized });
    } else {
        await databases.createDocument('main', 'app_settings', sdk.ID.unique(), { key: 'fn_deployed_hashes', value: serialized });
    }
    console.log(`\nUpdated fn_deployed_hashes for: ${Object.keys(hashesToWrite).join(', ')}`);
}

async function cleanupStaleDeployments(hub, keepDeploymentId) {
    const functionId = functionIdForHub(hub);
    const deployments = await functions.listDeployments(functionId, [
        sdk.Query.limit(100),
        sdk.Query.orderDesc('$createdAt'),
    ]);
    const stale = deployments.deployments.filter(deployment =>
        deployment.$id !== keepDeploymentId &&
        deployment.status === 'waiting' &&
        (deployment.sourceSize || 0) === 0
    );

    for (const deployment of stale) {
        await functions.deleteDeployment(functionId, deployment.$id);
        console.log(`  Deleted stale waiting deployment ${deployment.$id} from ${hub.id}`);
    }
}

async function ensureAiGatewayVariables() {
    const vars = [
        ['OPENROUTER_KEY_1', process.env.OPENROUTER_KEY_1],
        ['OPENROUTER_KEY_2', process.env.OPENROUTER_KEY_2],
        ['OPENROUTER_KEY_3', process.env.OPENROUTER_KEY_3],
        ['GROQ_KEY_1', process.env.GROQ_KEY_1],
        ['GROQ_KEY_2', process.env.GROQ_KEY_2],
        ['GROQ_KEY_3', process.env.GROQ_KEY_3],
        ['DEEPSEEK_KEY', process.env.DEEPSEEK_KEY],
        ['NVIDIA_KEY_1', process.env.NVIDIA_KEY_1],
        ['NVIDIA_KEY_2', process.env.NVIDIA_KEY_2],
        ['NVIDIA_KEY_3', process.env.NVIDIA_KEY_3],
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT],
        ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID],
        ['DEVKIT_PASSWORD', process.env.DEVKIT_PASSWORD],
        ['DATADOG_API_KEY', process.env.DATADOG_API_KEY],
        ['DD_API_KEY', process.env.DD_API_KEY],
        ['DD_SITE', process.env.DD_SITE],
        ['ADMIN_EMAIL', process.env.ADMIN_EMAIL],
        ['RESEND_API_KEY', process.env.RESEND_API_KEY],
        ['TURNSTILE_SECRET_KEY', process.env.TURNSTILE_SECRET_KEY],
        ['PUBLIC_SHARE_TOKEN_SECRET', process.env.PUBLIC_SHARE_TOKEN_SECRET],
        ['GATEWAY_SMOKE_SECRET', process.env.GATEWAY_SMOKE_SECRET],
        ['ADMIN_TEST_HMAC_SECRET', process.env.ADMIN_TEST_HMAC_SECRET],
    ];
    for (const [key, value] of vars) await ensureVariable('ai-gateway', key, value);
}

async function ensureAiHealthVariables() {
    const vars = [
        ['OPENROUTER_KEY_1', process.env.OPENROUTER_KEY_1],
        ['OPENROUTER_KEY_2', process.env.OPENROUTER_KEY_2],
        ['OPENROUTER_KEY_3', process.env.OPENROUTER_KEY_3],
        ['GROQ_KEY_1', process.env.GROQ_KEY_1],
        ['GROQ_KEY_2', process.env.GROQ_KEY_2],
        ['GROQ_KEY_3', process.env.GROQ_KEY_3],
        ['DEEPSEEK_KEY', process.env.DEEPSEEK_KEY],
        ['NVIDIA_KEY_1', process.env.NVIDIA_KEY_1],
        ['NVIDIA_KEY_2', process.env.NVIDIA_KEY_2],
        ['NVIDIA_KEY_3', process.env.NVIDIA_KEY_3],
    ];
    for (const [key, value] of vars) await ensureVariable('ai-health', key, value);
}

async function ensureResumeSectionVariables() {
    for (const [key, value] of [
        ['OPENROUTER_KEY_1', process.env.OPENROUTER_KEY_1],
        ['OPENROUTER_KEY_2', process.env.OPENROUTER_KEY_2],
        ['OPENROUTER_KEY_3', process.env.OPENROUTER_KEY_3],
        ['GROQ_KEY_1', process.env.GROQ_KEY_1],
        ['GROQ_KEY_2', process.env.GROQ_KEY_2],
        ['GROQ_KEY_3', process.env.GROQ_KEY_3],
        ['DEEPSEEK_KEY', process.env.DEEPSEEK_KEY],
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT],
        ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID],
    ]) {
        await ensureVariable('resume-section-ai', key, value);
    }
}

async function ensureJobImportVariables() {
    for (const [key, value] of [
        ['GROQ_KEY_1', process.env.GROQ_KEY_1],
        ['OPENROUTER_KEY_1', process.env.OPENROUTER_KEY_1],
        ['DEEPSEEK_KEY', process.env.DEEPSEEK_KEY],
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT],
        ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID],
        ['JINA_READER_API_KEY', process.env.JINA_READER_API_KEY],
        ['JINA_API_KEY', process.env.JINA_API_KEY],
    ]) {
        await ensureVariable('job-import', key, value);
    }
}

async function ensureSharedAdminVariables(fnIds) {
    for (const fnId of fnIds) {
        for (const [key, value] of [
            ['DEVKIT_PASSWORD', process.env.DEVKIT_PASSWORD],
            ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
            ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT],
            ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID],
            ['ADMIN_EMAIL', process.env.ADMIN_EMAIL],
            ['ADMIN_TEST_HMAC_SECRET', process.env.ADMIN_TEST_HMAC_SECRET],
        ]) {
            await ensureVariable(fnId, key, value);
        }
    }
}

async function ensureAdminSentryVariables() {
    const fnId = functionIdForHub(HUBS.find(hub => hub.id === 'admin-sentry'));
    for (const [key, value] of [
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT],
        ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID],
        ['SENTRY_AUTH_TOKEN', process.env.SENTRY_AUTH_TOKEN],
        ['SENTRY_ORG_SLUG', process.env.SENTRY_ORG_SLUG],
        ['SENTRY_PROJECT_SLUG', process.env.SENTRY_PROJECT_SLUG],
        ['SENTRY_ORG', process.env.SENTRY_ORG],
        ['SENTRY_PROJECT', process.env.SENTRY_PROJECT],
        ['SENTRY_WEBHOOK_SECRET', process.env.SENTRY_WEBHOOK_SECRET],
        ['VITE_SENTRY_DSN', process.env.VITE_SENTRY_DSN],
    ]) {
        await ensureVariable(fnId, key, value);
    }
}

async function ensureEmailHubVariables(fnIds) {
    for (const fnId of fnIds) {
        for (const [key, value] of [
            ['RESEND_API_KEY', process.env.RESEND_API_KEY],
            ['RESEND_FROM_EMAIL', process.env.RESEND_FROM_EMAIL],
            ['RESEND_FROM_NAME', process.env.RESEND_FROM_NAME],
            ['RESEND_SEGMENT_ALL_USERS', process.env.RESEND_SEGMENT_ALL_USERS],
            ['RESEND_AUDIENCE_ALL_USERS', process.env.RESEND_AUDIENCE_ALL_USERS],
        ]) {
            await ensureVariable(fnId, key, value);
        }
    }
}

async function ensureCouponsWiseHireVariables(fnIds) {
    for (const fnId of fnIds) {
        for (const [key, value] of [
            ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
            ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT],
            ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID],
            ['OPENROUTER_KEY_1', process.env.OPENROUTER_KEY_1],
            ['GROQ_KEY_1', process.env.GROQ_KEY_1],
            ['DEEPSEEK_KEY', process.env.DEEPSEEK_KEY],
            ['NVIDIA_KEY_1', process.env.NVIDIA_KEY_1],
            ['RESEND_API_KEY', process.env.RESEND_API_KEY],
            ['RESEND_FROM_EMAIL', process.env.RESEND_FROM_EMAIL],
            ['RESEND_FROM_NAME', process.env.RESEND_FROM_NAME],
        ]) {
            await ensureVariable(fnId, key, value);
        }
        if (fnId === 'public-share') {
            await ensureVariable(fnId, 'PUBLIC_SHARE_TOKEN_SECRET', process.env.PUBLIC_SHARE_TOKEN_SECRET);
        }
    }
}

async function ensureAdminDeployHubsVariables() {
    for (const [key, value] of [
        ['GITHUB_TOKEN', process.env.GITHUB_TOKEN],
        ['GITHUB_REPO', process.env.GITHUB_REPO || 'iammagdy/WiseResume-TWC'],
        ['RESEND_API_KEY', process.env.RESEND_API_KEY],
        ['RESEND_FROM_EMAIL', process.env.RESEND_FROM_EMAIL || 'noreply@thewise.cloud'],
        ['RESEND_FROM_NAME', process.env.RESEND_FROM_NAME || 'WiseResume'],
    ]) {
        await ensureVariable('admin-deploy-hubs', key, value);
    }
}

async function ensureEmailServiceVariables() {
    const emailVarSources = ['admin-email', 'admin-testmail', 'admin-devkit-data', 'admin-deploy-hubs'];
    const emailServiceVars = [
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'],
        ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192'],
        ['DEVKIT_PASSWORD', process.env.DEVKIT_PASSWORD || await firstExistingVariableValue(emailVarSources, 'DEVKIT_PASSWORD')],
        ['RESEND_API_KEY', process.env.RESEND_API_KEY || await firstExistingVariableValue(emailVarSources, 'RESEND_API_KEY')],
        ['RESEND_FROM_EMAIL', process.env.RESEND_FROM_EMAIL || await firstExistingVariableValue(emailVarSources, 'RESEND_FROM_EMAIL') || 'noreply@thewise.cloud'],
        ['RESEND_FROM_NAME', process.env.RESEND_FROM_NAME || await firstExistingVariableValue(emailVarSources, 'RESEND_FROM_NAME') || 'WiseResume'],
        ['FRONTEND_URL', process.env.FRONTEND_URL || 'https://wiseresume.app'],
    ];
    for (const [key, value] of emailServiceVars) {
        await ensureVariable('email-service', key, value);
    }
}

async function ensureJobsCreatePermission() {
    console.log('\nEnsuring jobs collection create permission...');
    try {
        const col = await databases.getCollection('main', 'jobs');
        const hasCreate = (col.permissions || []).some(p => p.includes('create') && p.includes('users'));
        if (!hasCreate) {
            await databases.updateCollection('main', 'jobs', col.name, [
                ...(col.permissions || []),
                sdk.Permission.create(sdk.Role.users()),
            ]);
            console.log('  Added Permission.create(Role.users()) to jobs collection');
        } else {
            console.log('  jobs collection create permission already set');
        }
    } catch (e) {
        console.warn(`  Could not update jobs collection permissions: ${e.message}`);
    }
}

async function ensurePortfolioGateVariables() {
    for (const [key, value] of [
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'],
        ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192'],
    ]) {
        await ensureVariable('portfolio-gate', key, value);
    }
}

async function ensureGetPublicPortfolioVariables() {
    for (const [key, value] of [
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'],
        ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192'],
        ['PORTFOLIO_JWT_SECRET', process.env.PORTFOLIO_JWT_SECRET],
    ]) {
        await ensureVariable('get-public-portfolio', key, value);
    }
}

async function ensureVerifyPortfolioPasswordVariables() {
    for (const [key, value] of [
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'],
        ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192'],
    ]) {
        await ensureVariable('verify-portfolio-password', key, value);
    }
}

async function ensurePortfolioSettingsVariables() {
    for (const [key, value] of [
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'],
        ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192'],
    ]) {
        await ensureVariable('portfolio-settings', key, value);
    }
}

async function syncVariablesForHubs(hubIds) {
    const selected = new Set(hubIds);
    const hasAny = ids => ids.some(id => selected.has(id));

    if (selected.has('ai-gateway')) {
        await ensureAiGatewayVariables();
        console.log('\nEnsuring ai_credits schema...');
        execSync('node scripts/setup_ai_credits_schema.cjs', { cwd: ROOT, stdio: 'inherit' });
    }
    if (selected.has('ai-health')) await ensureAiHealthVariables();
    if (selected.has('resume-section-ai')) await ensureResumeSectionVariables();
    if (selected.has('job-import')) {
        await ensureJobImportVariables();
        console.log('\nEnsuring jobs collection schema...');
        execSync('node scripts/setup_jobs_schema.cjs', { cwd: ROOT, stdio: 'inherit' });
    }

    const sharedAdminIds = [
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
        functionIdForHub(HUBS.find(hub => hub.id === 'admin-sentry')),
    ];
    const selectedAdminTargets = sharedAdminIds.filter(id => selected.has(id) || selected.has('admin-sentry') && id === functionIdForHub(HUBS.find(hub => hub.id === 'admin-sentry')));
    if (selectedAdminTargets.length) await ensureSharedAdminVariables(selectedAdminTargets);
    if (selected.has('admin-sentry')) await ensureAdminSentryVariables();

    for (const fnId of ['admin-impersonate', 'admin-devkit-data'].filter(id => selected.has(id))) {
        await ensureVariable(fnId, 'IMPERSONATION_HMAC_SECRET', process.env.IMPERSONATION_HMAC_SECRET);
    }

    const emailTargets = ['admin-email', 'admin-testmail', 'admin-devkit-data'].filter(id => selected.has(id));
    if (emailTargets.length) await ensureEmailHubVariables(emailTargets);

    const couponsTargets = ['coupons', 'wisehire-gateway', 'public-share'].filter(id => selected.has(id));
    if (couponsTargets.length) await ensureCouponsWiseHireVariables(couponsTargets);

    if (selected.has('admin-deploy-hubs')) await ensureAdminDeployHubsVariables();
    if (selected.has('email-service')) await ensureEmailServiceVariables();

    // Portfolio functions
    if (selected.has('portfolio-gate')) await ensurePortfolioGateVariables();
    if (selected.has('get-public-portfolio')) await ensureGetPublicPortfolioVariables();
    if (selected.has('verify-portfolio-password')) await ensureVerifyPortfolioPasswordVariables();
    if (selected.has('portfolio-settings')) await ensurePortfolioSettingsVariables();
}

function resolveRequestedHubs(requestedIds) {
    if (!requestedIds) return HUBS;
    const selected = [];
    const unknown = [];

    for (const requestedId of requestedIds) {
        const match = HUBS.find(hub => hub.id === requestedId || functionIdForHub(hub) === requestedId);
        if (match) {
            if (!selected.includes(match)) selected.push(match);
        } else {
            unknown.push(requestedId);
        }
    }

    if (unknown.length) {
        throw new Error(`Unknown hub id(s): ${unknown.join(', ')}`);
    }
    return selected;
}

async function run() {
    const requestedIds = selectedHubIds();
    const hubsToDeploy = resolveRequestedHubs(requestedIds);

    if (requestedIds) {
        console.log(`Deploying selected hubs only: ${hubsToDeploy.map(h => h.id).join(', ')}`);
    }

    const deployed = [];
    for (const hub of hubsToDeploy) {
        const readyDeployment = await deployFunction(hub);
        deployed.push({ hub, deploymentId: readyDeployment.$id });
    }

    await syncVariablesForHubs(hubsToDeploy.map(hub => hub.id));

    if (hubsToDeploy.some(hub => hub.id === 'email-service')) {
        await syncAuthEmailTemplates();
    }

    await upsertDeployedHashes(hubsToDeploy.map(hub => hub.id));

    for (const { hub, deploymentId } of deployed) {
        if (hub.id === 'admin-deploy-hubs') {
            await cleanupStaleDeployments(hub, deploymentId);
        }
    }

    await runSmokeChecks(hubsToDeploy);

    if (!requestedIds) {
        await ensureJobsCreatePermission();
        await syncAuthEmailTemplates();
    }

    console.log('\nAll requested hubs processed successfully.');
}

run().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
