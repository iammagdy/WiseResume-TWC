const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../../appwrite-hubs/job-import/src/main.js'),
  'utf8',
);

const buildPoolMatch = source.match(/function buildPool\(\) \{[\s\S]*?\n\}/);

assert.ok(buildPoolMatch, 'job-import should define buildPool');

const buildPoolSource = buildPoolMatch[0];
const deepseekIndex = buildPoolSource.indexOf('process.env.DEEPSEEK_KEY');
const groqIndex = buildPoolSource.indexOf('process.env[`GROQ_KEY_${i}`]');
const openrouterIndex = buildPoolSource.indexOf('process.env[`OPENROUTER_KEY_${i}`]');

assert.ok(deepseekIndex !== -1, 'job-import should include DeepSeek in its provider pool');
assert.ok(groqIndex !== -1, 'job-import should keep Groq fallback providers');
assert.ok(openrouterIndex !== -1, 'job-import should keep OpenRouter fallback providers');
assert.ok(
  deepseekIndex < groqIndex && deepseekIndex < openrouterIndex,
  'job-import should prefer DeepSeek before Groq/OpenRouter fallbacks',
);

console.log('[TEST] job-import routing passed');
