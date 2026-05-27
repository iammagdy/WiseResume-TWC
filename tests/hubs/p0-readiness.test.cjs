const assert = require('node:assert/strict');
function makeRes() {
  return {
    last: null,
    json(body, status = 200) {
      this.last = { body, status };
      return this.last;
    },
    send(body, status = 200) {
      this.last = { body, status };
      return this.last;
    },
  };
}

function makeLogger() {
  return {
    log() {},
    error() {},
  };
}

async function testAiGatewayRejectsMissingJwt() {
  process.env.APPWRITE_FUNCTION_PROJECT_ID = 'test-project';
  process.env.APPWRITE_FUNCTION_API_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
  const aiGateway = require('../../appwrite-hubs/ai-gateway/src/main.js');
  const res = makeRes();
  await aiGateway({
    req: {
      body: JSON.stringify({ featureName: 'analyze-resume', resumeText: 'private resume text' }),
      headers: {},
    },
    res,
    ...makeLogger(),
  });
  assert.equal(res.last.status, 401);
  assert.equal(res.last.body.code, 'unauthorized');
}

async function testResumeSectionRejectsMissingJwt() {
  const resumeSection = require('../../appwrite-hubs/resume-section-ai/src/main.js');
  const res = makeRes();
  await resumeSection({
    req: {
      method: 'POST',
      body: JSON.stringify({
        section: 'summary',
        action: 'improve',
        currentContent: 'Short summary',
      }),
      headers: {},
    },
    res,
    ...makeLogger(),
  });
  assert.equal(res.last.status, 401);
  assert.equal(res.last.body.code, 'unauthorized');
}

async function main() {
  await testAiGatewayRejectsMissingJwt();
  await testResumeSectionRejectsMissingJwt();
  console.log('p0-readiness hub tests passed');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
