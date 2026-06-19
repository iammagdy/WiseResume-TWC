'use strict';

/**
 * Verification script to check if account_type field exists in profiles collection
 * This script can run without API keys and reports current schema status
 */

const fs = require('fs');
const path = require('path');
const { Client, Users, Query, Databases } = require('node-appwrite');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '..', '.env.deploy'));
loadEnvFile(path.join(__dirname, '..', '.env.local'));

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

console.log('=== Account Type Schema Verification ===\n');

if (!projectId || !apiKey) {
  console.log('⚠️  APPWRITE_PROJECT_ID and/or APPWRITE_API_KEY not found in environment');
  console.log('   Cannot verify live schema. Please run with proper environment variables.');
  console.log('\nTo execute schema migration, run:');
  console.log('   APPWRITE_API_KEY=<your_key> node scripts/setup_account_type_schema.cjs');
  process.exit(0);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

async function verifySchema() {
  try {
    console.log('1. Checking profiles collection...');
    
    // Check if collection exists
    try {
      const collection = await databases.getCollection('main', 'profiles');
      console.log('✅ profiles collection exists');
    } catch (err) {
      if (err.code === 404) {
        console.log('✗ profiles collection does not exist');
        return;
      }
      throw err;
    }

    console.log('\n2. Checking account_type field...');
    
    // Check if account_type attribute exists
    try {
      const attributes = await databases.listAttributes('main', 'profiles');
      const accountTypeAttr = attributes.attributes.find(attr => attr.key === 'account_type');
      
      if (accountTypeAttr) {
        console.log('✅ account_type field exists');
        console.log(`   Type: ${accountTypeAttr.type}`);
        console.log(`   Size: ${accountTypeAttr.size}`);
        console.log(`   Required: ${accountTypeAttr.required}`);
        console.log(`   Default: ${accountTypeAttr.default}`);
      } else {
        console.log('✗ account_type field does not exist');
        console.log('   Run schema migration to add it:');
        console.log('   APPWRITE_API_KEY=<key> node scripts/setup_account_type_schema.cjs');
      }
    } catch (attrErr) {
      console.log('⚠️  Could not check attributes:', attrErr.message);
    }

    console.log('\n3. Checking sample profile documents...');
    
    // Check a few sample documents for account_type field
    try {
      const sampleDocs = await databases.listDocuments('main', 'profiles', [Query.limit(3)]);
      console.log(`Found ${sampleDocs.total} total profile documents`);
      
      if (sampleDocs.documents.length > 0) {
        console.log('\nSample document account_type values:');
        sampleDocs.documents.forEach((doc, index) => {
          const accountType = doc.account_type;
          console.log(`  Document ${index + 1}: ${accountType !== undefined ? `"${accountType}"` : 'missing/undefined'}`);
        });
      }
    } catch (docErr) {
      console.log('⚠️  Could not check sample documents:', docErr.message);
    }

  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exit(1);
  }
}

verifySchema();
