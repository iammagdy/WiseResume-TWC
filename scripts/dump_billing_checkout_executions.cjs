const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const apiKey = process.env.APPWRITE_API_KEY;

if (!apiKey) {
  console.error('[dump] No APPWRITE_API_KEY provided');
  process.exit(0);
}

const client = new sdk.Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const functions = new sdk.Functions(client);

(async () => {
  console.log('[dump] Inspecting billing-checkout variables...');
  try {
    const vars = await functions.listVariables('billing-checkout', [sdk.Query.limit(100)]);
    for (const v of vars.variables || []) {
      const valDesc = v.secret ? '<SECRET_SET>' : (v.value ? `"${v.value}"` : '<EMPTY>');
      console.log(`  VAR: ${v.key} (secret=${v.secret}) = ${valDesc}`);
    }
  } catch (err) {
    console.warn('[dump] Failed to list variables:', err.message);
  }

  console.log('\n[dump] Inspecting billing-checkout executions...');
  try {
    const res = await functions.listExecutions('billing-checkout', [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(5),
    ]);
    for (const exec of res.executions || []) {
      console.log('\n========================================');
      console.log(`Execution: ${exec.$id} | Status: ${exec.status} | HTTP: ${exec.responseStatusCode} | Duration: ${exec.duration}s | Created: ${exec.$createdAt}`);
      if (exec.errors) {
        console.log('--- ERRORS ---');
        console.log(exec.errors);
      }
      if (exec.logs) {
        console.log('--- LOGS ---');
        console.log(exec.logs);
      }
      if (exec.responseBody) {
        console.log('--- BODY ---');
        console.log(exec.responseBody.slice(0, 500));
      }
    }
  } catch (err) {
    console.warn('[dump] Failed to list executions:', err.message);
  }
})().catch(err => {
  console.error('[dump] Fatal:', err.message);
});
