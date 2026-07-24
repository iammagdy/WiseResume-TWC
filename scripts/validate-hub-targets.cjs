'use strict';

const fs = require('fs');
const { parseExplicitHubTargets } = require('./appwrite-function-policy.cjs');

function main() {
  const raw = process.argv[2] || process.env.HUB_TARGET || '';
  const targets = parseExplicitHubTargets(raw);
  const json = JSON.stringify(targets);
  console.log(`Validated Appwrite targets: ${targets.join(', ')}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `targets_json=${json}\ntargets_csv=${targets.join(',')}\n`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
