import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runSetup } = require('./setup_owner_collections_schema.cjs');

await runSetup({ collections: ['user_preferences'] });
