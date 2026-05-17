const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function buildHub(dir, archive) {
    const hubDir = path.join(process.cwd(), 'appwrite-hubs', dir);
    const archivePath = path.join(process.cwd(), archive);
    if (!fs.existsSync(hubDir)) throw new Error(`Hub directory not found: ${hubDir}`);
    const pkgJson = path.join(hubDir, 'package.json');
    if (fs.existsSync(pkgJson)) {
        console.log(`  Installing deps for ${dir}...`);
        execSync('npm install --omit=dev --silent', { cwd: hubDir, stdio: 'inherit' });
    }
    console.log(`  Packaging ${dir}...`);
    execSync(`tar -czf "${archivePath}" .`, { cwd: hubDir });
    console.log(`  Built ${archive}`);
}

const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);
const databases = new sdk.Databases(client);

async function ensureFunction(id, name) {
    try {
        const fn = await functions.get(id);
        // Browser-initiated executions require Appwrite execute permission.
        // Admin hubs enforce their own DevKit token inside the function.
        if (!fn.execute || fn.execute.length === 0) {
            await functions.update(id, name, fn.runtime || 'node-18.0', ['any']);
            console.log(`  Fixed execute permissions for ${id}`);
        }
        console.log(`  ${id} already exists`);
    } catch (e) {
        if (e.code === 404) {
            console.log(`  Creating ${id} with node-18.0...`);
            await functions.create(id, name, 'node-18.0', ['any']);
            console.log(`  Created ${id}`);
        } else throw e;
    }
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
            await functions.createVariable(fnId, key, value);
            console.log(`  Created ${key} on ${fnId}`);
        }
    } catch (e) {
        console.warn(`  Could not set ${key} on ${fnId}: ${e.message}`);
    }
}

async function deployFunction(id, name, filePath) {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    console.log(`\nDeploying ${name} (${id})...`);

    if (!fs.existsSync(absPath)) {
        console.log(`  Archive not found, building...`);
        buildHub(id, filePath);
    }

    try {
        await ensureFunction(id, name);
        const fileBuffer = fs.readFileSync(absPath);
        const fileName = path.basename(absPath);
        const file = new File([fileBuffer], fileName, { type: 'application/gzip' });
        const deployment = await functions.createDeployment({
            functionId: id,
            code: file,
            activate: true,
            entrypoint: 'src/main.js',
        });
        console.log(`  Deployed: ${deployment.$id}, status=${deployment.status}`);
    } catch (e) {
        console.error(`  Failed: ${e.message}`);
        if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 400));
        throw e;
    }
}

async function smokeFunction(id, body) {
    if (!process.env.DEVKIT_PASSWORD) return;
    try {
        const execution = await functions.createExecution({
            functionId: id,
            body: JSON.stringify({
                ...body,
                __headers: { Authorization: `Bearer ${process.env.DEVKIT_PASSWORD}` },
            }),
            async: false,
            path: '/',
            method: 'POST',
        });
        if (execution.status === 'failed' || execution.responseStatusCode >= 500) {
            throw new Error(execution.errors || `HTTP ${execution.responseStatusCode}`);
        }
        console.log(`  Smoke ${id}: HTTP ${execution.responseStatusCode}`);
    } catch (e) {
        console.warn(`  Smoke ${id} failed: ${e.message}`);
    }
}

async function run() {
    const hubs = [
        { id: 'resume-section-ai',         name: 'Resume Section AI Hub',         file: 'resume-section-ai.tar.gz' },
        { id: 'job-import',                name: 'Job Import Hub',                file: 'job-import.tar.gz' },
        { id: 'ai-gateway',                name: 'AI Gateway Hub',                file: 'ai-gateway.tar.gz' },
        { id: 'coupons',                   name: 'Coupons Hub',                   file: 'coupons.tar.gz' },
        { id: 'wisehire-gateway',          name: 'WiseHire Gateway Hub',          file: 'wisehire-gateway.tar.gz' },
        { id: 'public-share',              name: 'Public Share Hub',              file: 'public-share.tar.gz' },
        { id: 'ai-health',                 name: 'AI Health Hub',                 file: 'ai-health.tar.gz' },
{ id: 'admin-devkit-data',         name: 'Admin DevKit Data Hub',         file: 'admin-devkit-data.tar.gz' },
        { id: 'admin-email',               name: 'Admin Email Hub',               file: 'admin-email.tar.gz' },
        { id: 'admin-testmail',            name: 'Admin Testmail Hub',            file: 'admin-testmail.tar.gz' },
        { id: 'admin-feature-flags',       name: 'Admin Feature Flags Hub',       file: 'admin-feature-flags.tar.gz' },
        { id: 'admin-moderation',          name: 'Admin Moderation Hub',          file: 'admin-moderation.tar.gz' },
        { id: 'admin-portfolio-usernames', name: 'Admin Portfolio Usernames Hub', file: 'admin-portfolio-usernames.tar.gz' },
        { id: 'admin-visitor-analytics',   name: 'Admin Visitor Analytics Hub',   file: 'admin-visitor-analytics.tar.gz' },
        { id: 'admin-onboarding-funnel',   name: 'Admin Onboarding Funnel Hub',   file: 'admin-onboarding-funnel.tar.gz' },
        { id: 'admin-impersonate',         name: 'Admin Impersonate Hub',         file: 'admin-impersonate.tar.gz' },
        { id: 'inspect-ai-keys',           name: 'Inspect AI Keys Hub',           file: 'inspect-ai-keys.tar.gz' },
    ];

    for (const hub of hubs) {
        await deployFunction(hub.id, hub.name, hub.file);
    }

    console.log('\nEnsuring resume-section-ai provider keys...');
    for (const [key, value] of [
        ['OPENROUTER_KEY_1', process.env.OPENROUTER_KEY_1],
        ['OPENROUTER_KEY_2', process.env.OPENROUTER_KEY_2],
        ['GROQ_KEY_1', process.env.GROQ_KEY_1],
    ]) {
        await ensureVariable('resume-section-ai', key, value);
    }

    console.log('\nEnsuring job-import provider keys...');
    for (const [key, value] of [
        ['GROQ_KEY_1', process.env.GROQ_KEY_1],
        ['OPENROUTER_KEY_1', process.env.OPENROUTER_KEY_1],
        ['DEEPSEEK_KEY', process.env.DEEPSEEK_KEY],
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT],
        ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID],
    ]) {
        await ensureVariable('job-import', key, value);
    }

    console.log('\nEnsuring shared admin hub variables...');
    const adminFunctionIds = [
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
    ];
    for (const fnId of adminFunctionIds) {
        for (const [key, value] of [
            ['DEVKIT_PASSWORD', process.env.DEVKIT_PASSWORD],
            ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
            ['APPWRITE_ENDPOINT', process.env.APPWRITE_ENDPOINT],
            ['APPWRITE_PROJECT_ID', process.env.APPWRITE_PROJECT_ID],
        ]) {
            await ensureVariable(fnId, key, value);
        }
    }

    console.log('\nEnsuring email hub variables...');
    for (const fnId of ['admin-email', 'admin-testmail', 'admin-devkit-data']) {
        for (const [key, value] of [
            ['RESEND_API_KEY', process.env.RESEND_API_KEY],
            ['RESEND_FROM_EMAIL', process.env.RESEND_FROM_EMAIL],
            ['RESEND_FROM_NAME', process.env.RESEND_FROM_NAME],
        ]) {
            await ensureVariable(fnId, key, value);
        }
    }

    console.log('\nEnsuring coupons and WiseHire gateway variables...');
    for (const fnId of ['coupons', 'wisehire-gateway', 'public-share']) {
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
    }

    console.log('\nRunning safe admin hub smoke checks...');
    await smokeFunction('admin-devkit-data', { action: 'diagnostics' });
    await smokeFunction('admin-email', { module: 'resend-stats', action: 'stats' });
    await smokeFunction('admin-testmail', { module: 'testmail-inbox', tag: null });
    await smokeFunction('admin-portfolio-usernames', { action: 'directory_list', page: 1, per_page: 1 });
    await smokeFunction('admin-visitor-analytics', { action: 'kpis', range: '7d' });
    await smokeFunction('admin-onboarding-funnel', { days: 7, granularity: 'day' });
    await smokeFunction('admin-feature-flags', { action: 'list' });
    await smokeFunction('admin-moderation', { action: 'list_bug_reports', page: 1, per_page: 1 });

    // Ensure jobs collection allows authenticated users to create documents.
    // Without this, client-side job creation fails with "No permissions for action 'create'".
    console.log('\nEnsuring jobs collection create permission...');
    try {
        const col = await databases.getCollection('main', 'jobs');
        const hasCreate = (col.permissions || []).some(p => p.includes('create') && p.includes('users'));
        if (!hasCreate) {
            const existing = col.permissions || [];
            await databases.updateCollection('main', 'jobs', col.name, [
                ...existing,
                sdk.Permission.create(sdk.Role.users()),
            ]);
            console.log('  ✅ Added Permission.create(Role.users()) to jobs collection');
        } else {
            console.log('  jobs collection create permission already set');
        }
    } catch (e) {
        console.warn(`  Could not update jobs collection permissions: ${e.message}`);
    }

    console.log('\nAll hubs processed.');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
