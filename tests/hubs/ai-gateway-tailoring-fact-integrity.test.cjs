const assert = require('node:assert/strict');
const aiGateway = require('../../appwrite-hubs/ai-gateway/src/main.js');

function normalize(raw, resume) {
  return aiGateway.__test.normalizeStructuredFeatureData(
    'tailor-resume',
    raw,
    { resume },
  );
}

const sourceResume = {
  summary: 'Software engineer with 5 years of experience.',
  skills: ['React', 'TypeScript'],
  experience: [{
    id: 'exp-1',
    company: 'Source Corp',
    position: 'Senior Engineer',
    account: 'Source Account',
    startDate: '2020-01',
    endDate: '',
    current: true,
    description: 'Built customer-facing applications.',
    achievements: ['Built a customer portal.', 'Improved load time by 50%.'],
    responsibilities: ['Owned frontend delivery.'],
  }],
  education: [{
    id: 'edu-1',
    institution: 'Source University',
    degree: 'BS',
    field: 'Computer Science',
    startDate: '2015-09',
    endDate: '2019-05',
    gpa: '3.8',
    description: 'Completed a capstone with a 4-person team.',
  }],
  projects: [{
    id: 'project-1',
    name: 'Source Project',
    role: 'Lead Developer',
    startDate: '2022-01',
    endDate: '2022-12',
    current: false,
    technologies: ['React', 'TypeScript'],
    description: 'Built an internal dashboard.',
    url: 'https://example.com/source',
    githubUrl: 'https://github.com/example/source',
  }],
  certifications: [{
    id: 'cert-1',
    name: 'Cloud Practitioner',
    issuer: 'Source Institute',
    date: '2023-06',
    expiryDate: '2026-06',
    credentialId: 'SOURCE-123',
  }],
  awards: [{
    id: 'award-1',
    title: 'Engineering Award',
    issuer: 'Source Corp',
    date: '2024-01',
    description: 'Recognized for 2 successful launches.',
  }],
};

function testSourceFactsAreAuthoritative() {
  const result = normalize({
    summary: 'Engineering leader with 99 years of experience.',
    skills: ['Kubernetes', 'TypeScript'],
    experience: [
      {
        id: 'ai-only-experience',
        company: 'Invented Company',
        position: 'Chief Architect',
        startDate: '2025-01',
        endDate: '',
        current: true,
        description: 'Invented role.',
        achievements: ['Invented achievement.'],
      },
      {
        id: 'exp-1',
        company: 'Changed Company',
        position: 'Changed Title',
        account: 'Changed Account',
        startDate: '1999-01',
        endDate: '2099-01',
        current: false,
        description: 'Led ATS-aligned application delivery.',
        achievements: ['Claimed an unsupported 99% gain.', 'Accelerated load time by 50%.'],
        responsibilities: ['Invented responsibility.'],
      },
    ],
    education: [{
      id: 'edu-1',
      institution: 'Invented University',
      degree: 'PhD',
      field: 'Astrophysics',
      startDate: '2025-01',
      endDate: '2026-01',
      gpa: '4.0',
      description: 'Delivered a capstone with a 4-person team.',
    }],
    projects: [
      {
        id: 'project-1',
        name: 'Renamed Project',
        role: 'Invented Owner',
        startDate: '2099-01',
        endDate: '',
        current: true,
        technologies: ['Kubernetes', 'React'],
        description: 'Delivered a job-relevant internal dashboard.',
        url: 'https://attacker.example',
        githubUrl: 'https://attacker.example/repo',
      },
      {
        id: 'ai-only-project',
        name: 'Invented Project',
        role: 'Owner',
        technologies: ['Kubernetes'],
        description: 'Invented project.',
      },
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'Invented Certification',
        issuer: 'Invented Issuer',
        date: '2099-01',
      },
      {
        id: 'ai-certification',
        name: 'AI-only Certification',
        issuer: 'AI',
        date: '2026-01',
      },
    ],
    awards: [{
      id: 'award-1',
      title: 'Invented Award',
      issuer: 'Invented Issuer',
      date: '2099-01',
      description: 'Honored for 2 successful launches.',
    }],
    bulletTransformations: [{
      experienceId: 'exp-1',
      bulletIndex: 1,
      originalBullet: 'Attacker-controlled original',
      enhancedBullet: 'Invented a 999% improvement.',
      metricsAdded: true,
    }],
  }, sourceResume);

  assert.equal(result.summary, sourceResume.summary, 'unsupported summary metrics must fall back');
  assert.deepEqual(result.skills, ['TypeScript', 'React'], 'only source skills may be reordered');
  assert.equal(result.experience.length, 1, 'AI-only experience must be dropped');
  assert.deepEqual(
    {
      id: result.experience[0].id,
      company: result.experience[0].company,
      position: result.experience[0].position,
      account: result.experience[0].account,
      startDate: result.experience[0].startDate,
      endDate: result.experience[0].endDate,
      current: result.experience[0].current,
      responsibilities: result.experience[0].responsibilities,
    },
    {
      id: 'exp-1',
      company: 'Source Corp',
      position: 'Senior Engineer',
      account: 'Source Account',
      startDate: '2020-01',
      endDate: '',
      current: true,
      responsibilities: ['Owned frontend delivery.'],
    },
  );
  assert.equal(result.experience[0].description, 'Led ATS-aligned application delivery.');
  assert.deepEqual(result.experience[0].achievements, [
    'Built a customer portal.',
    'Accelerated load time by 50%.',
  ]);

  assert.deepEqual(
    {
      id: result.education[0].id,
      institution: result.education[0].institution,
      degree: result.education[0].degree,
      field: result.education[0].field,
      startDate: result.education[0].startDate,
      endDate: result.education[0].endDate,
      gpa: result.education[0].gpa,
      description: result.education[0].description,
    },
    {
      id: 'edu-1',
      institution: 'Source University',
      degree: 'BS',
      field: 'Computer Science',
      startDate: '2015-09',
      endDate: '2019-05',
      gpa: '3.8',
      description: 'Delivered a capstone with a 4-person team.',
    },
  );
  assert.deepEqual(result.projects, [{
    ...sourceResume.projects[0],
    description: 'Delivered a job-relevant internal dashboard.',
  }]);
  assert.deepEqual(result.certifications, sourceResume.certifications);
  assert.deepEqual(result.awards, [{
    ...sourceResume.awards[0],
    description: 'Honored for 2 successful launches.',
  }]);
  assert.deepEqual(result.bulletTransformations, [{
    experienceId: 'exp-1',
    bulletIndex: 1,
    originalBullet: 'Improved load time by 50%.',
    enhancedBullet: 'Accelerated load time by 50%.',
    improvement: 'Rephrased for ATS relevance using source-supported facts.',
    metricsAdded: false,
  }]);
}

function testUniqueNoIdFallbackKeepsSourceOrder() {
  const source = {
    ...sourceResume,
    experience: [
      sourceResume.experience[0],
      {
        id: 'exp-2',
        company: 'Second Corp',
        position: 'Engineer',
        startDate: '2018-01',
        endDate: '2019-12',
        current: false,
        description: 'Maintained APIs.',
        achievements: ['Improved API reliability.'],
      },
    ],
  };
  const result = normalize({
    summary: source.summary,
    skills: source.skills,
    experience: [
      {
        company: 'Second Corp',
        position: 'Engineer',
        description: 'Strengthened API reliability.',
        achievements: ['Strengthened API reliability.'],
      },
      {
        company: 'Source Corp',
        position: 'Senior Engineer',
        description: 'Delivered customer-facing applications.',
        achievements: ['Delivered a customer portal.', 'Improved load time by 50%.'],
      },
      {
        id: 'unknown-id',
        company: 'Invented Corp',
        position: 'Owner',
        description: 'AI-only.',
        achievements: ['AI-only.'],
      },
    ],
  }, source);

  assert.deepEqual(result.experience.map((item) => item.id), ['exp-1', 'exp-2']);
  assert.deepEqual(result.experience.map((item) => item.description), [
    'Delivered customer-facing applications.',
    'Strengthened API reliability.',
  ]);
}

function testSameLengthIsNotIdentity() {
  const result = normalize({
    summary: sourceResume.summary,
    skills: sourceResume.skills,
    experience: [{
      company: 'Different Corp',
      position: 'Different Role',
      description: 'Must not cross-merge.',
      achievements: ['Must not cross-merge.'],
    }],
  }, sourceResume);

  assert.equal(result.experience[0].description, sourceResume.experience[0].description);
  assert.deepEqual(result.experience[0].achievements, sourceResume.experience[0].achievements);
}

function testPromptCarriesGroundingEvidenceAndImmutableRules() {
  const messages = aiGateway.__test.buildTailorMessages({
    resume: sourceResume,
    jobDescription: 'Build accessible React products.',
    intensity: 'moderate',
  });
  const systemPrompt = messages.find((message) => message.role === 'system').content;
  const userPrompt = messages.find((message) => message.role === 'user').content;

  assert.match(systemPrompt, /PROTECTED FACTS/i);
  assert.match(systemPrompt, /same source bullet/i);
  assert.match(systemPrompt, /exact source technology list/i);
  assert.match(userPrompt, /Source Account/);
  assert.match(userPrompt, /Owned frontend delivery/);
  assert.match(userPrompt, /"gpa":"3\.8"/);
  assert.match(userPrompt, /"credentialId":"SOURCE-123"/);
}

testSourceFactsAreAuthoritative();
testUniqueNoIdFallbackKeepsSourceOrder();
testSameLengthIsNotIdentity();
testPromptCarriesGroundingEvidenceAndImmutableRules();

console.log('ai-gateway tailoring fact-integrity tests passed');
