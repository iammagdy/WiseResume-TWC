const sdk = require('node-appwrite');
const path = require('path');
const fs = require('fs');

const { Client, Functions, InputFile } = sdk;

if (!process.env.APPWRITE_API_KEY) {
    console.error('❌ APPWRITE_API_KEY is missing.');
    process.exit(1);
}

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new Functions(client);

async function run() {
  try {
    console.log('🚀 Starting Deployment of Smart Hubs...');
    
    // Use absolute paths relative to process.cwd() (root of repo)
    const authPath = path.join(process.cwd(), 'auth-master.tar.gz');
    const aiPath = path.join(process.cwd(), 'ai-gateway.tar.gz');

    if (!fs.existsSync(authPath)) throw new Error('auth-master.tar.gz not found at ' + authPath);
    if (!fs.existsSync(aiPath)) throw new Error('ai-gateway.tar.gz not found at ' + aiPath);

    console.log('Uploading Auth-Master...');
    const d1 = await functions.createDeployment(
        'auth-master', 
        InputFile.fromPath(authPath, 'code.tar.gz'), 
        true, 
        'src/main.js'
    );
    console.log('✅ Auth-Master Hub Deployed:', d1.$id);

    console.log('Uploading AI-Gateway...');
    const d2 = await functions.createDeployment(
        'ai-gateway', 
        InputFile.fromPath(aiPath, 'code.tar.gz'), 
        true, 
        'src/main.js'
    );
    console.log('✅ AI-Gateway Hub Deployed:', d2.$id);
    
    console.log('✨ All Hubs are LIVE!');
  } catch(e) {
    console.error('❌ DEPLOYMENT FAILED:', e.message);
    process.exit(1);
  }
}

run();
