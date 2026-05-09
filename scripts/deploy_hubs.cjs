const sdk = require('node-appwrite');
const fs = require('fs');

const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);

async function deployFunction(id, name, path, runtime = 'node-18.0') {
    console.log(`🚀 Deploying ${name} (${id})...`);
    try {
        const deployment = await functions.createDeployment(
            id,
            path,
            true // Activate
        );
        console.log(`✅ ${name} deployed. ID: ${deployment.$id}`);
    } catch (e) {
        console.error(`❌ Error deploying ${name}:`, e.message);
    }
}

async function run() {
    await deployFunction('auth-master', 'Auth Master Hub', 'auth-master.tar.gz');
    await deployFunction('ai-gateway', 'AI Gateway Hub', 'ai-gateway.tar.gz');
    
    // Check if ai-health exists, if not create it first
    try {
        await functions.get('ai-health');
    } catch (e) {
        console.log('🔧 Creating ai-health function...');
        await functions.create('ai-health', 'AI Health Check', 'any', 'node-18.0');
    }
    await deployFunction('ai-health', 'AI Health Check', 'ai-health.tar.gz');
}

run();
