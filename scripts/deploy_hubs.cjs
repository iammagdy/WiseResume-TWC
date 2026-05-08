const { Client, Functions, InputFile } = require('node-appwrite');
const path = require('path');

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new Functions(client);

async function run() {
  try {
    console.log('🚀 Starting Deployment of Smart Hubs...');
    
    const authPath = path.join(process.cwd(), 'auth-master.tar.gz');
    const aiPath = path.join(process.cwd(), 'ai-gateway.tar.gz');

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
