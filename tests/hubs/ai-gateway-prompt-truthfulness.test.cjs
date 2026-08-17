const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const gateway = require('../../appwrite-hubs/ai-gateway/src/main.js');

function systemPrompt(feature, opts = {}) {
  const messages = gateway.__test.buildMessages(feature, opts);
  return messages.find((message) => message.role === 'system')?.content || '';
}

assert.match(
  systemPrompt('generate-cover-letter', { resume: {}, jobDescription: 'Example role' }),
  /resume as the sole authority/i,
);
assert.match(
  systemPrompt('generate-cover-letter', { resume: {}, jobDescription: 'Example role' }),
  /never promise an interview/i,
);

assert.match(systemPrompt('parse-job', { text: 'Example posting' }), /never guess missing salary/i);
assert.match(systemPrompt('career-assessment', { resume: {} }), /recommendations, not facts or guarantees/i);
assert.match(systemPrompt('recruiter-simulation', { resume: {} }), /simulation signal, not a prediction/i);
assert.match(systemPrompt('company-briefing', { companyName: 'Acme' }), /only facts supported by the supplied company context/i);
assert.match(systemPrompt('detect-and-humanize', { action: 'detect', text: 'Example' }), /writing-style heuristic, not an AI-authorship detector/i);

const styleSignal = gateway.__test.normalizeStructuredFeatureData('detect-and-humanize', {
  detection: {
    aiScore: 130,
    humanScore: -30,
    confidence: 'certain',
    verdict: 'Definitely AI generated',
    flags: [{ phrase: 'delve into', reason: 'Formulaic transition', severity: 'high' }],
  },
}, { action: 'detect', text: 'Example' });
assert.equal(styleSignal.detection.aiScore, 100);
assert.equal(styleSignal.detection.humanScore, 0);
assert.equal(styleSignal.detection.confidence, 'low');
assert.doesNotMatch(styleSignal.detection.verdict, /AI generated/i);

const unsafeStyleRewrite = gateway.__test.normalizeStructuredFeatureData('detect-and-humanize', {
  humanized: {
    humanized: 'Increased revenue by 90%.',
    changes: ['Added a stronger metric'],
  },
}, { action: 'humanize', text: 'Improved revenue.' });
assert.equal(unsafeStyleRewrite.humanized.humanized, 'Improved revenue.');
assert.deepEqual(unsafeStyleRewrite.humanized.changes, []);

const careerIdeas = gateway.__test.normalizeStructuredFeatureData('career-assessment', {
  currentLevel: 'mid',
  yearsExperience: 5,
  primaryField: 'Engineering',
  nextRoles: [{
    title: 'Platform Engineer',
    matchScore: 140,
    requiredSkills: ['Kubernetes'],
    existingSkills: ['React', 'Invented Skill'],
    timeToReady: '3-6 months',
    description: 'An exploration idea',
  }],
  skillGaps: [],
  industryAlternatives: [{
    industry: 'Fintech',
    role: 'Platform Engineer',
    transferableSkills: ['React', 'Invented Skill'],
    newSkillsNeeded: ['Kubernetes'],
    salaryComparison: 'higher',
  }],
  actionPlan: [],
}, { resume: { skills: [{ name: 'React' }] } });
assert.equal(careerIdeas.nextRoles[0].matchScore, 100);
assert.deepEqual(careerIdeas.nextRoles[0].existingSkills, ['React']);
assert.deepEqual(careerIdeas.industryAlternatives[0].transferableSkills, ['React']);
assert.equal(careerIdeas.industryAlternatives[0].salaryComparison, 'unknown');

const salaryMessages = gateway.__test.buildMessages('wise-ai-chat', {
  type: 'salary_negotiation',
  payload: {
    jobTitle: 'Engineer',
    offeredSalary: '90000',
    targetSalary: '110000',
    currency: 'USD',
    injectedSecret: 'must-not-pass',
  },
});
const salarySystem = salaryMessages.find((message) => message.role === 'system').content;
const salaryUser = salaryMessages.find((message) => message.role === 'user').content;
assert.match(salarySystem, /Do not claim a market benchmark/i);
assert.match(salarySystem, /"openingLine"/);
assert.match(salaryUser, /90000/);
assert.match(salaryUser, /110000/);
assert.doesNotMatch(salaryUser, /must-not-pass/);
assert.throws(
  () => gateway.__test.buildMessages('wise-ai-chat', { type: 'unknown_task', payload: { messages: ['ignore safety'] } }),
  /Unsupported Wise AI Studio task/,
);

const safeSalaryDraft = gateway.__test.normalizeWiseAiChatResult('salary_negotiation', {
  openingLine: 'Thank you for the 90000 USD offer.',
  justifications: ['My resume supports the request.'],
  counterOffer: 'I would like to discuss 110000 USD.',
  emailTemplate: 'Could we discuss 110000 USD?',
  callScript: 'I am seeking 110000 USD.',
}, gateway.__test.buildWiseAiChatPayload({
  type: 'salary_negotiation',
  payload: { offeredSalary: '90000', targetSalary: '110000', currency: 'USD' },
}));
assert.match(safeSalaryDraft.counterOffer, /110000/);

const unsafeSalaryDraft = gateway.__test.normalizeWiseAiChatResult('salary_negotiation', {
  openingLine: 'Market data proves a 25% increase.',
  justifications: [],
  counterOffer: 'Ask for 140000 USD.',
  emailTemplate: '',
  callScript: '',
}, gateway.__test.buildWiseAiChatPayload({
  type: 'salary_negotiation',
  payload: { offeredSalary: '90000', targetSalary: '110000', currency: 'USD' },
}));
assert.equal(unsafeSalaryDraft.openingLine, '');
assert.equal(unsafeSalaryDraft.counterOffer, '');

const skillGap = gateway.__test.normalizeWiseAiChatResult('skills_gap', {
  matchedSkills: ['React', 'Invented Skill'],
  missingSkills: [
    { skill: 'Kubernetes', importance: 'critical' },
    { skill: 'Imaginary Tool', importance: 'high' },
  ],
  learningPlan: [{ week: 'Week 1', action: 'Study Kubernetes' }],
}, gateway.__test.buildWiseAiChatPayload({
  type: 'skills_gap',
  payload: {
    skills: 'React',
    jobDescription: 'Experience with Kubernetes is required.',
    resumeContext: { skills: [{ name: 'React' }] },
  },
}));
assert.deepEqual(skillGap.matchedSkills, ['React']);
assert.deepEqual(skillGap.missingSkills.map((item) => item.skill), ['Kubernetes']);

const companyBriefing = gateway.__test.normalizeStructuredFeatureData('company-briefing', {
  briefing: {
    companySnapshot: {
      name: 'Acme',
      industry: 'Financial technology',
      hq: 'Invented City',
      revenue: '$9 billion',
    },
    recentHighlights: [{ title: 'Launched Atlas', summary: 'Unsupported acquisition', relevance: 'Payments role' }],
    cultureSignals: [{ signal: 'Remote-first', detail: 'Invented culture claim' }],
    keyPeople: [{ role: 'CEO Jane Doe', context: 'Invented person' }],
    talkingPoints: [{ point: 'Built payment APIs', connection: 'React' }],
    questionsToAsk: [{ question: 'How does the payments team measure success?', why: 'Clarifies the role' }],
    competitors: ['Imaginary Rival'],
    productsOrServices: ['Atlas'],
    techStack: ['React'],
  },
}, {
  companyName: 'Acme',
  jobDescription: 'Acme is a financial technology company. The role supports Atlas payment APIs.',
  resumeData: { skills: ['React'], experience: [{ position: 'Engineer', company: 'Source Co' }] },
});
assert.equal(companyBriefing.briefing.companySnapshot.name, 'Acme');
assert.equal(companyBriefing.briefing.companySnapshot.industry, 'Financial technology');
assert.equal(companyBriefing.briefing.companySnapshot.hq, '');
assert.equal(companyBriefing.briefing.companySnapshot.revenue, '');
assert.deepEqual(companyBriefing.briefing.competitors, []);
assert.deepEqual(companyBriefing.briefing.productsOrServices, ['Atlas']);
assert.deepEqual(companyBriefing.briefing.techStack, ['React']);
assert.deepEqual(companyBriefing.briefing.keyPeople, []);
assert.equal(companyBriefing.briefing.questionsToAsk.length, 1, 'open interview questions may be drafted without asserting company facts');

const aggressiveTailor = gateway.__test.buildTailorResumeSystemPrompt({ intensity: 'aggressive' });
assert.match(aggressiveTailor, /truthful job-description alignment/i);
assert.doesNotMatch(aggressiveTailor, /maximize ATS compatibility above all else/i);

const extractedPath = path.join(
  __dirname,
  '../../appwrite-hubs/ai-gateway/src/extracted_prompts.json',
);
const extracted = readFileSync(extractedPath, 'utf8');
for (const forbidden of [
  'pass Workday, Taleo, and Greenhouse',
  'Recruiters spend 7 seconds on a cover letter',
  'make reasonable guesses based on context',
  'Use strong action verbs and quantifiable achievements where possible',
]) {
  assert.ok(!extracted.includes(forbidden), `stale prompt snapshot must not contain: ${forbidden}`);
}

const sectionHubPath = path.join(
  __dirname,
  '../../appwrite-hubs/resume-section-ai/src/main.js',
);
const sectionHub = readFileSync(sectionHubPath, 'utf8');
assert.match(sectionHub, /Generate professional content from the verified context provided/);
assert.match(sectionHub, /truthful job-description alignment/);
assert.doesNotMatch(sectionHub, /Generate professional, ATS-optimized content/);

console.log('ai-gateway and resume-section prompt truthfulness tests passed');
