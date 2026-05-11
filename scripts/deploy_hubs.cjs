const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');

const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);

async function ensureFunction(id, name) {
    try {
        await functions.get(id);
        console.log(`  ✅ ${id} already exists`);
    } catch (e) {
        if (e.code === 404) {
            console.log(`  🔧 Creating ${id} with node-18.0...`);
            await functions.create(id, name, 'node-18.0', []);
            console.log(`  ✅ Created ${id}`);
        } else throw e;
    }
}

async function deployFunction(id, name, filePath) {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    console.log(`\n🚀 Deploying ${name} (${id})...`);

    if (!fs.existsSync(absPath)) {
        console.error(`❌ File not found: ${absPath}`);
        return;
    }

    try {
        await ensureFunction(id, name);
        const fileBuffer = fs.readFileSync(absPath);
        const fileName = path.basename(absPath);
        // SDK v24 accepts File/Blob for the code parameter
        const file = new File([fileBuffer], fileName, { type: 'application/gzip' });
        const deployment = await functions.createDeployment({
            functionId: id,
            code: file,
            activate: true,
            entrypoint: 'src/main.js',
        });
        console.log(`  ✅ Deployed — ID: ${deployment.$id}, status: ${deployment.status}`);
    } catch (e) {
        console.error(`  ❌ Failed: ${e.message}`);
        if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 400));
    }
}

async function run() {
    const hubs = [
        { id: 'ai-gateway',                name: 'AI Gateway Hub',                file: 'ai-gateway.tar.gz' },
        { id: 'ai-health',                 name: 'AI Health Hub',                 file: 'ai-health.tar.gz' },
        { id: 'auth-master',               name: 'Auth Master Hub',               file: 'auth-master.tar.gz' },
        { id: 'admin-devkit-data',         name: 'Admin DevKit Data Hub',         file: 'admin-devkit-data.tar.gz' },
        { id: 'admin-email',               name: 'Admin Email Hub',               file: 'admin-email.tar.gz' },
        { id: 'admin-testmail',            name: 'Admin Testmail Hub',            file: 'admin-testmail.tar.gz' },
        { id: 'admin-feature-flags',       name: 'Admin Feature Flags Hub',       file: 'admin-feature-flags.tar.gz' },
        { id: 'admin-moderation',          name: 'Admin Moderation Hub',          file: 'admin-moderation.tar.gz' },
        { id: 'admin-portfolio-usernames', name: 'Admin Portfolio Usernames Hub', file: 'admin-portfolio-usernames.tar.gz' },
        { id: 'inspect-ai-keys',           name: 'Inspect AI Keys Hub',           file: 'inspect-ai-keys.tar.gz' },
    ];

    for (const hub of hubs) {
        await deployFunction(hub.id, hub.name, hub.file);
    }
    console.log('\n🎉 All hubs processed.');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

