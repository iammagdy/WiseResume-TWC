const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');

const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);

async function deployFunction(id, name, fileName) {
    const filePath = path.join(process.cwd(), fileName);
    console.log(`🚀 Deploying ${name} (${id}) from ${filePath}...`);
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Error: File ${fileName} NOT FOUND in ${process.cwd()}`);
        return;
    }

    try {
        const deployment = await functions.createDeployment(
            id,
            filePath,
            true // Activate
        );
        console.log(`✅ ${name} deployed. ID: ${deployment.$id}`);
    } catch (e) {
        console.error(`❌ Error deploying ${name}:`, e.message);
        if (e.response) console.error(JSON.stringify(e.response, null, 2));
    }
}

async function run() {
    // 1. Check/Create ai-health (using correct runtime node-18)
    try {
        await functions.get('ai-health');
        console.log('✅ ai-health function exists.');
    } catch (e) {
        console.log('🔧 Creating ai-health function...');
        await functions.create('ai-health', 'AI Health Check', 'any', 'node-18');
    }

    await deployFunction('auth-master', 'Auth Master Hub', 'auth-master.tar.gz');
    await deployFunction('ai-gateway', 'AI Gateway Hub', 'ai-gateway.tar.gz');
    await deployFunction('ai-health', 'AI Health Check', 'ai-health.tar.gz');
}

run();
