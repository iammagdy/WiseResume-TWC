const assert = require('node:assert/strict');

const aiGateway = require('../../appwrite-hubs/ai-gateway/src/main.js');

const DEEPSEEK_FIRST_FEATURES = [
  'tailor-resume',
  'generate-cover-letter',
  'recruiter-simulation',
  'agentic-chat',
  'wise-ai-chat',
  'editor-ai',
  'detect-and-humanize',
  'smart-fit-rewrite',
  'career-assessment',
  'generate-portfolio-bio',
  'generate-resignation-letter',
  'validate-tailor',
  'suggest-template',
  'analyze-resume',
  'generate-fix-suggestions',
  'parse-resume',
  'parse-job',
  'optimize-for-linkedin',
  'generate-question-bank',
  'company-briefing',
  'ask-portfolio',
];

function main() {
  assert.ok(aiGateway.__test, 'ai-gateway should expose __test helpers');

  for (const featureId of DEEPSEEK_FIRST_FEATURES) {
    assert.deepEqual(
      aiGateway.__test.FEATURE_ROUTES[featureId],
      { provider: 'deepseek', model: 'deepseek-chat' },
      `${featureId} should prefer DeepSeek first`,
    );
  }

  assert.throws(
    () => aiGateway.__test.normalizeStructuredFeatureData(
      'optimize-for-linkedin',
      '{"headlines":[],"aboutSections":{"short":"","medium":"","long":""},"experienceRewrites":[],"suggestedSkills":[],"keywords":[],"tips":[]}',
      {},
    ),
    /usable linkedin/i,
    'LinkedIn optimizer should reject empty but technically valid JSON',
  );

  assert.throws(
    () => aiGateway.__test.normalizeStructuredFeatureData(
      'generate-question-bank',
      '{"categories":[]}',
      {},
    ),
    /usable question bank/i,
    'Question bank should reject empty category payloads',
  );

  const linkedin = aiGateway.__test.normalizeStructuredFeatureData(
    'optimize-for-linkedin',
    JSON.stringify({
      headlines: ['AI Product Manager | SaaS | Growth'],
      aboutSections: {
        short: 'Short about',
        medium: 'Medium about section',
        long: 'Long about section with detail',
      },
      experienceRewrites: [
        {
          original: 'Built features',
          linkedin: 'Built measurable SaaS features that improved activation.',
          position: 'Product Manager',
          company: 'Acme',
        },
      ],
      suggestedSkills: ['Product Strategy'],
      keywords: ['SaaS'],
      tips: ['Keep the headline keyword-rich.'],
    }),
    {},
  );
  assert.equal(linkedin.success, true);
  assert.equal(linkedin.headlines.length, 1);

  const questionBank = aiGateway.__test.normalizeStructuredFeatureData(
    'generate-question-bank',
    JSON.stringify({
      categories: [
        {
          id: 'company',
          label: 'Company',
          questions: [
            {
              question: 'Why this company?',
              context: 'Tests motivation.',
              answerTip: 'Tie the mission to your past work.',
            },
          ],
        },
      ],
    }),
    {},
  );
  assert.equal(questionBank.categories.length, 1);
}

main();
