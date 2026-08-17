const assert = require('node:assert/strict');

const { computeRsaContentKey } = require('../../appwrite-hubs/resume-section-ai/src/main.js').__test;

const base = {
  section: 'summary',
  action: 'tailor',
  currentContent: 'Platform engineer with distributed systems experience.',
  context: {
    jobDescription: 'Build reliable payment infrastructure.',
    resumeContext: { skills: ['Node.js', 'PostgreSQL'] },
  },
  answers: { scale: '10M requests/day' },
};

const original = computeRsaContentKey('user-1', 'enhance', base);
assert.equal(
  original,
  computeRsaContentKey('user-1', 'enhance', {
    answers: { scale: '10M requests/day' },
    context: {
      resumeContext: { skills: ['Node.js', 'PostgreSQL'] },
      jobDescription: 'Build reliable payment infrastructure.',
    },
    currentContent: base.currentContent,
    action: 'tailor',
    section: 'summary',
  }),
  'object key order must not change the semantic idempotency key',
);

for (const changed of [
  { ...base, currentContent: `${base.currentContent} Updated.` },
  { ...base, context: { ...base.context, jobDescription: 'Lead a security program.' } },
  { ...base, context: { ...base.context, resumeContext: { skills: ['Go'] } } },
  { ...base, answers: { scale: '1M requests/day' } },
]) {
  assert.notEqual(
    original,
    computeRsaContentKey('user-1', 'enhance', changed),
    'content, JD, context, and answers must each invalidate the cache',
  );
}

assert.equal(
  original,
  computeRsaContentKey('user-1', 'enhance', {
    ...base,
    __headers: { Authorization: 'Bearer rotated-jwt' },
  }),
  'transport credentials must not affect or enter the semantic hash',
);

console.log('resume-section idempotency tests passed');
