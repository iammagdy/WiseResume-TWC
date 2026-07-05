'use strict';
const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');

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

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error('APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const functions = new sdk.Functions(client);

async function main() {
  console.log('Triggering production job-feed-sync execution...');
  const exec = await functions.createExecution('job-feed-sync', '', true);
  console.log(`Execution triggered! ID: ${exec.$id}, Status: ${exec.status}`);

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const status = await functions.getExecution('job-feed-sync', exec.$id);
      console.log(`[${i + 1}/60] Status: ${status.status}`);
      if (status.status === 'completed' || status.status === 'failed') {
        console.log('Response body:', status.responseBody);
        if (status.responseErrors) console.log('Errors:', status.responseErrors);
        break;
      }
    } catch (e) {
      console.warn(`Polling notice: ${e.message}`);
    }
  }
}

main().catch(err => console.error('Error:', err));
