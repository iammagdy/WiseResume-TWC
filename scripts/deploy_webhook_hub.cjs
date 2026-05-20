const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FUNCTION_ID = 'revenuecat-webhook';
const FUNCTION_NAME = 'RevenueCat Webhook Hub';
const TIMEOUT = 10;

const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);

async function ensureVariable(fnId, key, value) {
    if (!value) return;
    try {
        const vars = await functions.listVariables(fnId);
        const existing = vars.variables.find(v => v.key === key);
        if (existing) {
            if (existing.value !== value) {
                await functions.updateVariable(fnId, existing.$id, key, value);
                console.log(`  Updated ${key}`);
            } else {
                console.log(`  ${key} unchanged`);
            }
        } else {
            await functions.createVariable(fnId, key, value);
            console.log(`  Created ${key}`);
        }
    } catch (e) {
        console.warn(`  Could not set ${key}: ${e.message}`);
    }
}

async function run() {
    const hubDir = path.join(process.cwd(), 'appwrite-hubs', FUNCTION_ID);
    const archivePath = path.join(process.cwd(), `${FUNCTION_ID}.tar.gz`);

    if (!fs.existsSync(hubDir)) throw new Error(`Hub directory not found: ${hubDir}`);

    const pkgJson = path.join(hubDir, 'package.json');
    if (fs.existsSync(pkgJson)) {
        console.log('Installing deps...');
        execSync('npm install --omit=dev --silent', { cwd: hubDir, stdio: 'inherit' });
    }

    console.log('Building archive...');
    execSync(`tar -czf "${archivePath}" .`, { cwd: hubDir });
    console.log(`Built ${archivePath}`);

    // Ensure function exists
    try {
        const fn = await functions.get(FUNCTION_ID);
        const needsUpdate = !fn.execute || fn.execute.length === 0 || (fn.timeout ?? 0) < TIMEOUT;
        if (needsUpdate) {
            await functions.update(FUNCTION_ID, FUNCTION_NAME, fn.runtime || 'node-18.0', ['any'], [], '', TIMEOUT);
            console.log(`Updated function permissions`);
        }
        console.log(`Function ${FUNCTION_ID} exists`);
    } catch (e) {
        if (e.code === 404) {
            console.log(`Creating function ${FUNCTION_ID}...`);
            await functions.create(FUNCTION_ID, FUNCTION_NAME, 'node-18.0', ['any'], [], '', TIMEOUT);
        } else throw e;
    }

    // Deploy code
    console.log('Deploying code...');
    const fileBuffer = fs.readFileSync(archivePath);
    const file = new File([fileBuffer], `${FUNCTION_ID}.tar.gz`, { type: 'application/gzip' });
    const deployment = await functions.createDeployment({
        functionId: FUNCTION_ID,
        code: file,
        activate: true,
        entrypoint: 'src/main.js',
    });
    console.log(`Deployed: ${deployment.$id}, status=${deployment.status}`);

    // Set env vars
    console.log('\nSetting environment variables...');
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
    for (const [key, value] of [
        ['REVENUECAT_WEBHOOK_SECRET', process.env.REVENUECAT_WEBHOOK_SECRET],
        ['APPWRITE_API_KEY', process.env.APPWRITE_API_KEY],
        ['APPWRITE_ENDPOINT', endpoint],
        ['APPWRITE_PROJECT_ID', projectId],
    ]) {
        await ensureVariable(FUNCTION_ID, key, value);
    }

    // Print the function endpoint URL
    const endpoint_url = `${endpoint}/functions/${FUNCTION_ID}/executions`;
    console.log(`\nFunction endpoint: ${endpoint.replace('/v1', '')}/console/project-${projectId}/functions/function-${FUNCTION_ID}`);
    console.log('\nDone!');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
