'use strict';

/**
 * Sets up the Appwrite schema + permissions required for Cover Letters.
 *
 * The `cover_letters` collection already exists but is missing the
 * correct collection permissions and document security settings, so client-side
 * writes currently fail with:
 *   "No permissions provided for action 'create'"
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_cover_letters_schema.cjs
 *
 * Permissions (Security-Safe):
 * - Enables document-level security (`documentSecurity: true`) so that each
 *   cover letter document is readable/writable/deletable ONLY by its owner.
 * - Grants ONLY collection-level `create` permission to the `users` role
 *   (authenticated users), allowing them to create new cover letters.
 * - Does NOT grant collection-level read/update/delete permissions to `users`
 *   to ensure user-to-user privacy is preserved.
 */

const fs = require('fs');
const path = require('path');

// Load .env.deploy if it exists
const envPath = path.join(__dirname, '..', '.env.deploy');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key && val && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';
const COLLECTION_ID = 'cover_letters';

if (!API_KEY) {
  console.error('✗ APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new sdk.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new sdk.Databases(client);

async function run() {
  console.log('\n=== Cover Letters Schema Setup (Security-Safe) ===\n');

  try {
    const coll = await databases.getCollection(DB_ID, COLLECTION_ID);
    console.log(`✓ Collection "${COLLECTION_ID}" found.`);

    const createForUsers = sdk.Permission.create(sdk.Role.users());
    const existing = Array.isArray(coll.$permissions) ? coll.$permissions : [];

    const hasCreateForUsers = existing.includes(createForUsers);
    const docSecurityOk = coll.documentSecurity === true;

    if (hasCreateForUsers && docSecurityOk) {
      console.log('✓ Create permission and document security already configured correctly.');
      return;
    }

    // Preserve existing permissions and append create for users
    const permissions = hasCreateForUsers ? existing : [...existing, createForUsers];

    // Filter out any unsafe collection-level read, update, or delete permissions for Role.users()
    const cleanedPermissions = permissions.filter(p => {
      const isUserReadUpdateDelete =
        p.includes('read("users")') ||
        p.includes('update("users")') ||
        p.includes('delete("users")');
      return !isUserReadUpdateDelete;
    });

    console.log('Updating collection permissions and document security...');
    await databases.updateCollection(
      DB_ID,
      COLLECTION_ID,
      coll.name || COLLECTION_ID,
      cleanedPermissions,
      true, // documentSecurity: each document carries its own owner read/update/delete
      coll.enabled !== false,
    );
    console.log('✓ Ensured user create-only permissions and document-level security on cover_letters collection.');
  } catch (e) {
    console.error(`✗ Error getting/updating cover_letters collection: ${e.message}`);
    process.exit(1);
  }
}

run().catch(e => {
  console.error(`✗ Fatal: ${e.message}`);
  process.exit(1);
});
