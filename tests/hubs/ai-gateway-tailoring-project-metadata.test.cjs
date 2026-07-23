const assert = require('node:assert/strict');
const aiGateway = require('../../appwrite-hubs/ai-gateway/src/main.js');

const sourceProjects = [
  {
    id: 'project-current',
    name: 'Atlas Console',
    role: 'Lead Developer',
    startDate: '2024-02',
    endDate: '',
    current: true,
    technologies: ['React', 'TypeScript'],
    description: 'Built an internal operations console.',
    url: 'https://example.com/atlas',
    githubUrl: 'https://github.com/example/atlas',
    backendOnlyFlag: 'must-not-leak',
  },
  {
    id: 'project-complete',
    name: 'Signal API',
    role: 'Backend Developer',
    startDate: '2022-03',
    endDate: '2023-07',
    current: false,
    technologies: ['Node.js'],
    description: 'Built an event ingestion API.',
    link: 'https://example.com/signal',
  },
];

function normalize(projects, originals = sourceProjects) {
  return aiGateway.__test.normalizeStructuredFeatureData(
    'tailor-resume',
    {
      summary: 'Tailored summary',
      skills: ['React'],
      experience: [],
      education: [],
      projects,
      certifications: [],
      awards: [],
      keyChanges: ['Tailored projects'],
    },
    {
      resume: {
        summary: 'Original summary',
        skills: ['React'],
        experience: [],
        education: [],
        projects: originals,
        certifications: [],
        awards: [],
      },
    },
  );
}

function testExactIdMetadataPreservation() {
  const result = normalize([
    {
      id: 'project-complete',
      name: 'Signal API',
      role: 'Backend Developer',
      startDate: null,
      endDate: '',
      current: true,
      technologies: [],
      description: 'Built a resilient event ingestion API for high-volume workloads.',
      url: '',
      githubUrl: undefined,
    },
    {
      id: 'project-current',
      name: 'Atlas Console',
      role: 'Lead Developer',
      startDate: undefined,
      endDate: null,
      current: false,
      technologies: ['React', 'TypeScript', 'Accessibility'],
      description: 'Led delivery of an accessible operations console.',
    },
  ]);

  assert.deepEqual(result.projects, [
    {
      id: 'project-current',
      name: 'Atlas Console',
      role: 'Lead Developer',
      startDate: '2024-02',
      endDate: '',
      current: true,
      technologies: ['React', 'TypeScript', 'Accessibility'],
      description: 'Led delivery of an accessible operations console.',
      url: 'https://example.com/atlas',
      githubUrl: 'https://github.com/example/atlas',
    },
    {
      id: 'project-complete',
      name: 'Signal API',
      role: 'Backend Developer',
      startDate: '2022-03',
      endDate: '2023-07',
      current: false,
      technologies: ['Node.js'],
      description: 'Built a resilient event ingestion API for high-volume workloads.',
      url: 'https://example.com/signal',
      githubUrl: undefined,
    },
  ]);
  assert.equal('backendOnlyFlag' in result.projects[0], false);
}

function testDeterministicFallbackAndNoAiOnlyProjects() {
  const duplicateNames = [
    {
      id: 'project-web',
      name: 'Launchpad',
      role: 'Frontend Developer',
      startDate: '2023-01',
      endDate: '2023-08',
      current: false,
      technologies: ['React'],
      description: 'Built the web application.',
    },
    {
      id: 'project-api',
      name: 'Launchpad',
      role: 'Backend Developer',
      startDate: '2023-02',
      endDate: '',
      current: true,
      technologies: ['Node.js'],
      description: 'Built the API.',
    },
  ];
  const result = normalize([
    {
      name: 'Launchpad',
      role: 'Backend Developer',
      description: 'Scaled the API for production traffic.',
      technologies: ['Node.js', 'PostgreSQL'],
    },
    {
      name: 'Launchpad',
      role: 'Frontend Developer',
      description: 'Improved the web application experience.',
      technologies: ['React', 'TypeScript'],
    },
    {
      id: 'unknown-id',
      name: 'Invented Project',
      role: 'Owner',
      description: 'This must not be added.',
      technologies: ['Unknown'],
    },
  ], duplicateNames);

  assert.deepEqual(result.projects.map((project) => project.id), ['project-web', 'project-api']);
  assert.deepEqual(result.projects.map((project) => project.description), [
    'Improved the web application experience.',
    'Scaled the API for production traffic.',
  ]);
  assert.deepEqual(result.projects.map((project) => [
    project.startDate,
    project.endDate,
    project.current,
  ]), [
    ['2023-01', '2023-08', false],
    ['2023-02', '', true],
  ]);
}

function testAmbiguousFallbackDoesNotCrossMerge() {
  const originals = [
    {
      id: 'project-a',
      name: 'Client Portal',
      role: 'Developer',
      startDate: '2021-01',
      endDate: '2021-05',
      current: false,
      technologies: ['React'],
      description: 'Original project A.',
    },
    {
      id: 'project-b',
      name: 'Client Portal',
      role: 'Developer',
      startDate: '2022-01',
      endDate: '2022-05',
      current: false,
      technologies: ['Vue'],
      description: 'Original project B.',
    },
  ];
  const result = normalize([
    {
      name: 'Client Portal',
      role: 'Developer',
      description: 'Ambiguous rewrite.',
      technologies: ['Unknown'],
    },
  ], originals);

  assert.deepEqual(result.projects.map((project) => project.description), [
    'Original project A.',
    'Original project B.',
  ]);
}

function testNoSourceMeansNoProjects() {
  const result = normalize([
    {
      id: 'ai-only',
      name: 'Invented Project',
      role: 'Developer',
      startDate: '2026-01',
      endDate: '',
      current: true,
      technologies: ['React'],
      description: 'Invented content.',
    },
  ], []);

  assert.deepEqual(result.projects, []);
}

function testMissingSourceDatesRemainMissing() {
  const result = normalize([
    {
      id: 'project-undated',
      name: 'Undated Project',
      role: 'Developer',
      startDate: '2026-01',
      endDate: '2026-06',
      current: false,
      technologies: ['React'],
      description: 'Tailored existing project content.',
    },
  ], [
    {
      id: 'project-undated',
      name: 'Undated Project',
      role: 'Developer',
      startDate: '',
      endDate: '',
      current: false,
      technologies: ['React'],
      description: 'Existing project content.',
    },
  ]);

  assert.equal(result.projects[0].startDate, '');
  assert.equal(result.projects[0].endDate, '');
}

function testPromptContainsExactProjectMetadata() {
  const schema = aiGateway.__test.schemaPrompt('tailor-resume', {});
  assert.match(schema, /"current":false/);
  assert.match(schema, /"url":""/);
  assert.match(schema, /"githubUrl":""/);

  const messages = aiGateway.__test.buildTailorMessages({
    resume: {
      contactInfo: { fullName: 'QA Candidate' },
      summary: 'Summary',
      skills: ['React'],
      experience: [],
      education: [],
      projects: sourceProjects,
      certifications: [],
      awards: [],
    },
    jobDescription: 'Build reliable frontend and backend systems for a production platform.',
  });
  const userPrompt = messages.find((message) => message.role === 'user').content;
  assert.match(userPrompt, /"startDate":"2024-02"/);
  assert.match(userPrompt, /"endDate":""/);
  assert.match(userPrompt, /"current":true/);
  assert.match(userPrompt, /"url":"https:\/\/example\.com\/atlas"/);
  assert.match(userPrompt, /"githubUrl":"https:\/\/github\.com\/example\/atlas"/);
}

testExactIdMetadataPreservation();
testDeterministicFallbackAndNoAiOnlyProjects();
testAmbiguousFallbackDoesNotCrossMerge();
testNoSourceMeansNoProjects();
testMissingSourceDatesRemainMissing();
testPromptContainsExactProjectMetadata();

console.log('ai-gateway tailoring project metadata tests passed');
