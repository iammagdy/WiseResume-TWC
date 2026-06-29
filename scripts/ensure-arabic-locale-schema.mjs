import { Client, Databases } from 'node-appwrite';

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || 'main';

if (!endpoint || !project || !apiKey) {
  console.error('APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY are required.');
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const databases = new Databases(client);
const collectionId = 'user_preferences';
const attributes = await databases.listAttributes({ databaseId, collectionId });

if (attributes.attributes.some((attribute) => attribute.key === 'language')) {
  console.log('[schema:i18n] user_preferences.language already exists.');
  process.exit(0);
}

await databases.createStringAttribute({
  databaseId,
  collectionId,
  key: 'language',
  size: 8,
  required: false,
  array: false,
  encrypt: false,
});
console.log('[schema:i18n] Created user_preferences.language. Appwrite will build the attribute asynchronously.');
