const sdk = require('node-appwrite');
const { InputFile } = require('node-appwrite/file');
const path = require('path');
const fs = require('fs');

const client = new sdk.Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);

async function run() {
  try {
    console.log('🚀 Starting Deployment of Smart Hubs...');
    
    const authPath = path.join(process.cwd(), 'auth-master.tar.gz');
    const aiPath = path.join(process.cwd(), 'ai-gateway.tar.gz');

    if (!fs.existsSync(authPath)) throw new Error('File not found: ' + authPath);
    if (!fs.existsSync(aiPath)) throw new Error('File not found: ' + aiPath);

    console.log('Uploading Auth-Master Hub...');
    const d1 = await functions.createDeployment(
        'auth-master', 
        InputFile.fromPath(authPath, 'code.tar.gz'), 
        true, 
        'src/main.js'
    );
    console.log('✅ Auth-Master Hub Deployed:', d1.$id);

    console.log('Uploading AI-Gateway Hub...');
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
