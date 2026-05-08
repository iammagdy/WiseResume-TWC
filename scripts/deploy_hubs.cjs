const { Client, Functions, InputFile } = require('node-appwrite');

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new Functions(client);

async function run() {
  try {
    console.log('🚀 Starting Deployment of Smart Hubs...');
    
    const d1 = await functions.createDeployment(
        'auth-master', 
        InputFile.fromPath('auth-master.tar.gz', 'code.tar.gz'), 
        true, 
        'src/main.js'
    );
    console.log('✅ Auth-Master Hub Deployed:', d1.$id);

    const d2 = await functions.createDeployment(
        'ai-gateway', 
        InputFile.fromPath('ai-gateway.tar.gz', 'code.tar.gz'), 
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
