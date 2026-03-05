export interface CuratedCourse {
  title: string;
  platform: 'coursera' | 'freecodecamp' | 'udemy' | 'edx';
  url: string;
  duration?: string;
}

export const CURATED_COURSES: Record<string, CuratedCourse[]> = {
  // === Languages ===
  python: [
    { title: 'Scientific Computing with Python', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/scientific-computing-with-python/', duration: '300h' },
    { title: 'Python for Everybody', platform: 'coursera', url: 'https://www.coursera.org/specializations/python', duration: '8 months' },
    { title: 'Introduction to Computer Science (CS50)', platform: 'edx', url: 'https://www.edx.org/course/introduction-computer-science-harvardx-cs50x', duration: '12 weeks' },
    { title: 'Complete Python Bootcamp', platform: 'udemy', url: 'https://www.udemy.com/course/complete-python-bootcamp/', duration: '22h' },
  ],
  javascript: [
    { title: 'JavaScript Algorithms & Data Structures', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/', duration: '300h' },
    { title: 'HTML, CSS, and Javascript for Web Developers', platform: 'coursera', url: 'https://www.coursera.org/learn/html-css-javascript-for-web-developers', duration: '5 weeks' },
    { title: 'The Complete JavaScript Course', platform: 'udemy', url: 'https://www.udemy.com/course/the-complete-javascript-course/', duration: '69h' },
  ],
  typescript: [
    { title: 'TypeScript for Professionals', platform: 'coursera', url: 'https://www.coursera.org/learn/typescript', duration: '3 weeks' },
    { title: 'Understanding TypeScript', platform: 'udemy', url: 'https://www.udemy.com/course/understanding-typescript/', duration: '15h' },
  ],
  java: [
    { title: 'Java Programming and Software Engineering', platform: 'coursera', url: 'https://www.coursera.org/specializations/java-programming', duration: '5 months' },
    { title: 'Software Construction in Java', platform: 'edx', url: 'https://www.edx.org/course/software-construction-in-java', duration: '10 weeks' },
  ],
  'c++': [
    { title: 'Coding for Everyone: C and C++', platform: 'coursera', url: 'https://www.coursera.org/specializations/coding-for-everyone', duration: '5 months' },
    { title: 'Beginning C++ Programming', platform: 'udemy', url: 'https://www.udemy.com/course/beginning-c-plus-plus-programming/', duration: '46h' },
  ],
  'c#': [
    { title: 'Introduction to C# Programming', platform: 'coursera', url: 'https://www.coursera.org/learn/introduction-programming-unity', duration: '4 weeks' },
    { title: 'Complete C# Masterclass', platform: 'udemy', url: 'https://www.udemy.com/course/complete-csharp-masterclass/', duration: '45h' },
  ],
  go: [
    { title: 'Programming with Google Go', platform: 'coursera', url: 'https://www.coursera.org/specializations/google-golang', duration: '3 months' },
  ],
  rust: [
    { title: 'Rust Programming', platform: 'coursera', url: 'https://www.coursera.org/learn/rust-programming', duration: '4 weeks' },
  ],
  swift: [
    { title: 'iOS App Development with Swift', platform: 'coursera', url: 'https://www.coursera.org/specializations/app-development', duration: '5 months' },
    { title: 'iOS & Swift - The Complete iOS App Development', platform: 'udemy', url: 'https://www.udemy.com/course/ios-13-app-development-bootcamp/', duration: '55h' },
  ],
  kotlin: [
    { title: 'Kotlin for Java Developers', platform: 'coursera', url: 'https://www.coursera.org/learn/kotlin-for-java-developers', duration: '5 weeks' },
  ],
  php: [
    { title: 'Building Web Applications in PHP', platform: 'coursera', url: 'https://www.coursera.org/learn/web-applications-php', duration: '4 weeks' },
  ],
  ruby: [
    { title: 'Ruby on Rails Web Development', platform: 'coursera', url: 'https://www.coursera.org/specializations/ruby-on-rails', duration: '6 months' },
  ],
  r: [
    { title: 'R Programming', platform: 'coursera', url: 'https://www.coursera.org/learn/r-programming', duration: '4 weeks' },
    { title: 'Data Science: R Basics', platform: 'edx', url: 'https://www.edx.org/course/data-science-r-basics', duration: '8 weeks' },
  ],
  scala: [
    { title: 'Functional Programming in Scala', platform: 'coursera', url: 'https://www.coursera.org/specializations/scala', duration: '7 months' },
  ],
  dart: [
    { title: 'Flutter & Dart - The Complete Guide', platform: 'coursera', url: 'https://www.coursera.org/learn/flutter', duration: '4 weeks' },
    { title: 'Flutter & Dart - The Complete Guide', platform: 'udemy', url: 'https://www.udemy.com/course/learn-flutter-dart-to-build-ios-android-apps/', duration: '42h' },
  ],

  // === Frameworks / Libraries ===
  react: [
    { title: 'Front End Development Libraries', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/front-end-development-libraries/', duration: '300h' },
    { title: 'React Basics by Meta', platform: 'coursera', url: 'https://www.coursera.org/learn/react-basics', duration: '4 weeks' },
    { title: 'React - The Complete Guide', platform: 'udemy', url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/', duration: '68h' },
  ],
  angular: [
    { title: 'Single Page Web Apps with AngularJS', platform: 'coursera', url: 'https://www.coursera.org/learn/single-page-web-apps-with-angularjs', duration: '5 weeks' },
    { title: 'Angular - The Complete Guide', platform: 'udemy', url: 'https://www.udemy.com/course/the-complete-guide-to-angular-2/', duration: '37h' },
  ],
  'vue.js': [
    { title: 'Vue.js Fundamentals', platform: 'coursera', url: 'https://www.coursera.org/search?query=vue.js', duration: '4 weeks' },
  ],
  django: [
    { title: 'Django for Everybody', platform: 'coursera', url: 'https://www.coursera.org/specializations/django', duration: '3 months' },
  ],
  flask: [
    { title: 'Developing AI Applications with Python and Flask', platform: 'coursera', url: 'https://www.coursera.org/learn/python-project-for-ai-application-development', duration: '1 week' },
  ],
  'spring boot': [
    { title: 'Spring Framework Specialization', platform: 'coursera', url: 'https://www.coursera.org/specializations/spring-framework', duration: '4 months' },
  ],
  '.net': [
    { title: 'Create Your First Web App with ASP.NET', platform: 'coursera', url: 'https://www.coursera.org/learn/asp-dot-net-core', duration: '3 weeks' },
  ],
  'next.js': [
    { title: 'Meta Front-End Developer', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/meta-front-end-developer', duration: '7 months' },
  ],
  'express.js': [
    { title: 'Back End Development and APIs', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/', duration: '300h' },
    { title: 'Server-side Development with NodeJS', platform: 'coursera', url: 'https://www.coursera.org/learn/server-side-nodejs', duration: '4 weeks' },
  ],
  'node.js': [
    { title: 'Back End Development and APIs', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/', duration: '300h' },
    { title: 'Server-side Development with NodeJS', platform: 'coursera', url: 'https://www.coursera.org/learn/server-side-nodejs', duration: '4 weeks' },
  ],
  fastapi: [
    { title: 'APIs with FastAPI', platform: 'coursera', url: 'https://www.coursera.org/search?query=fastapi', duration: '3 weeks' },
  ],

  // === Cloud / DevOps ===
  aws: [
    { title: 'AWS Cloud Technical Essentials', platform: 'coursera', url: 'https://www.coursera.org/learn/aws-cloud-technical-essentials', duration: '4 weeks' },
    { title: 'AWS Certified Solutions Architect', platform: 'udemy', url: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/', duration: '27h' },
    { title: 'AWS Developer: Building on AWS', platform: 'edx', url: 'https://www.edx.org/course/aws-developer-building-on-aws', duration: '6 weeks' },
  ],
  azure: [
    { title: 'Microsoft Azure Fundamentals', platform: 'coursera', url: 'https://www.coursera.org/learn/microsoft-azure-cloud-services', duration: '4 weeks' },
    { title: 'Azure Fundamentals (AZ-900)', platform: 'udemy', url: 'https://www.udemy.com/course/az900-azure/', duration: '11h' },
  ],
  gcp: [
    { title: 'Google Cloud Fundamentals', platform: 'coursera', url: 'https://www.coursera.org/learn/gcp-fundamentals', duration: '2 weeks' },
  ],
  docker: [
    { title: 'Docker Essentials', platform: 'coursera', url: 'https://www.coursera.org/learn/ibm-containers-docker-kubernetes-openshift', duration: '3 weeks' },
    { title: 'Docker & Kubernetes: The Practical Guide', platform: 'udemy', url: 'https://www.udemy.com/course/docker-kubernetes-the-practical-guide/', duration: '24h' },
  ],
  kubernetes: [
    { title: 'Getting Started with Google Kubernetes', platform: 'coursera', url: 'https://www.coursera.org/learn/google-kubernetes-engine', duration: '3 weeks' },
    { title: 'Introduction to Kubernetes', platform: 'edx', url: 'https://www.edx.org/course/introduction-to-kubernetes', duration: '14 weeks' },
  ],
  terraform: [
    { title: 'HashiCorp Terraform', platform: 'coursera', url: 'https://www.coursera.org/search?query=terraform', duration: '3 weeks' },
  ],
  'ci/cd': [
    { title: 'Continuous Integration and Delivery', platform: 'coursera', url: 'https://www.coursera.org/learn/continuous-integration', duration: '4 weeks' },
  ],
  devops: [
    { title: 'IBM DevOps and Software Engineering', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/devops-and-software-engineering', duration: '3 months' },
  ],
  linux: [
    { title: 'Introduction to Linux', platform: 'coursera', url: 'https://www.coursera.org/learn/linux', duration: '4 weeks' },
  ],
  ansible: [
    { title: 'Ansible for Network Engineers', platform: 'coursera', url: 'https://www.coursera.org/search?query=ansible', duration: '3 weeks' },
  ],
  git: [
    { title: 'Introduction to Git and GitHub', platform: 'coursera', url: 'https://www.coursera.org/learn/introduction-git-github', duration: '4 weeks' },
  ],

  // === Data / AI ===
  sql: [
    { title: 'Relational Database', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/relational-database/', duration: '300h' },
    { title: 'Introduction to SQL', platform: 'coursera', url: 'https://www.coursera.org/learn/intro-sql', duration: '4 weeks' },
    { title: 'The Complete SQL Bootcamp', platform: 'udemy', url: 'https://www.udemy.com/course/the-complete-sql-bootcamp/', duration: '9h' },
  ],
  'data analysis': [
    { title: 'Data Analysis with Python', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/data-analysis-with-python/', duration: '300h' },
    { title: 'Google Data Analytics', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/google-data-analytics', duration: '6 months' },
    { title: 'Data Analysis and Visualization with Python', platform: 'edx', url: 'https://www.edx.org/course/data-analysis-and-visualization-with-python', duration: '5 weeks' },
  ],
  'machine learning': [
    { title: 'Machine Learning with Python', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/machine-learning-with-python/', duration: '300h' },
    { title: 'Machine Learning by Stanford', platform: 'coursera', url: 'https://www.coursera.org/learn/machine-learning', duration: '11 weeks' },
    { title: 'Machine Learning A-Z', platform: 'udemy', url: 'https://www.udemy.com/course/machinelearning/', duration: '44h' },
    { title: 'Machine Learning with Python', platform: 'edx', url: 'https://www.edx.org/course/machine-learning-with-python-from-linear-models-to', duration: '5 weeks' },
  ],
  'deep learning': [
    { title: 'Deep Learning Specialization', platform: 'coursera', url: 'https://www.coursera.org/specializations/deep-learning', duration: '5 months' },
    { title: 'Deep Learning A-Z', platform: 'udemy', url: 'https://www.udemy.com/course/deeplearning/', duration: '23h' },
  ],
  nlp: [
    { title: 'Natural Language Processing', platform: 'coursera', url: 'https://www.coursera.org/specializations/natural-language-processing', duration: '4 months' },
  ],
  'data engineering': [
    { title: 'IBM Data Engineering', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/ibm-data-engineer', duration: '5 months' },
  ],
  'big data': [
    { title: 'Big Data Specialization', platform: 'coursera', url: 'https://www.coursera.org/specializations/big-data', duration: '6 months' },
  ],
  'computer vision': [
    { title: 'Computer Vision Basics', platform: 'coursera', url: 'https://www.coursera.org/learn/computer-vision-basics', duration: '4 weeks' },
  ],
  statistics: [
    { title: 'Statistics with Python', platform: 'coursera', url: 'https://www.coursera.org/specializations/statistics-with-python', duration: '3 months' },
  ],
  'power bi': [
    { title: 'Microsoft Power BI Data Analyst', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/microsoft-power-bi-data-analyst', duration: '5 months' },
  ],
  tableau: [
    { title: 'Data Visualization with Tableau', platform: 'coursera', url: 'https://www.coursera.org/specializations/data-visualization', duration: '5 months' },
  ],
  excel: [
    { title: 'Excel Skills for Business', platform: 'coursera', url: 'https://www.coursera.org/specializations/excel', duration: '6 months' },
  ],

  // === Web / CSS ===
  css: [
    { title: 'Responsive Web Design', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', duration: '300h' },
  ],

  // === Security ===
  cybersecurity: [
    { title: 'Google Cybersecurity', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/google-cybersecurity', duration: '6 months' },
    { title: 'Cybersecurity Fundamentals', platform: 'edx', url: 'https://www.edx.org/course/cybersecurity-fundamentals', duration: '8 weeks' },
  ],
  'ethical hacking': [
    { title: 'Ethical Hacking Essentials', platform: 'coursera', url: 'https://www.coursera.org/learn/ethical-hacking-essentials', duration: '4 weeks' },
  ],
  'network security': [
    { title: 'Network Security & Database Vulnerabilities', platform: 'coursera', url: 'https://www.coursera.org/learn/network-security-database-vulnerabilities', duration: '3 weeks' },
  ],

  // === Soft Skills ===
  leadership: [
    { title: 'Foundations of Everyday Leadership', platform: 'coursera', url: 'https://www.coursera.org/learn/everyday-leadership-foundation', duration: '4 weeks' },
  ],
  communication: [
    { title: 'Improving Communication Skills', platform: 'coursera', url: 'https://www.coursera.org/learn/wharton-communication-skills', duration: '4 weeks' },
  ],
  teamwork: [
    { title: 'Teamwork Skills', platform: 'coursera', url: 'https://www.coursera.org/learn/teamwork-skills', duration: '4 weeks' },
  ],
  'problem solving': [
    { title: 'Creative Problem Solving', platform: 'coursera', url: 'https://www.coursera.org/learn/creative-problem-solving', duration: '4 weeks' },
  ],
  'critical thinking': [
    { title: 'Introduction to Logic and Critical Thinking', platform: 'coursera', url: 'https://www.coursera.org/specializations/logic-critical-thinking-duke', duration: '4 months' },
  ],
  'time management': [
    { title: 'Work Smarter, Not Harder: Time Management', platform: 'coursera', url: 'https://www.coursera.org/learn/work-smarter-not-harder', duration: '3 weeks' },
  ],
  'public speaking': [
    { title: 'Introduction to Public Speaking', platform: 'coursera', url: 'https://www.coursera.org/learn/public-speaking', duration: '4 weeks' },
  ],
  negotiation: [
    { title: 'Successful Negotiation', platform: 'coursera', url: 'https://www.coursera.org/learn/negotiation-skills', duration: '7 weeks' },
  ],

  // === Project Management ===
  'project management': [
    { title: 'Google Project Management', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/google-project-management', duration: '6 months' },
  ],
  agile: [
    { title: 'Agile with Atlassian Jira', platform: 'coursera', url: 'https://www.coursera.org/learn/agile-atlassian-jira', duration: '3 weeks' },
  ],

  // === Design ===
  'ui/ux design': [
    { title: 'Google UX Design', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/google-ux-design', duration: '6 months' },
  ],

  // === Other Tech ===
  'rest api': [
    { title: 'APIs by Meta', platform: 'coursera', url: 'https://www.coursera.org/learn/apis', duration: '4 weeks' },
  ],
  graphql: [
    { title: 'GraphQL Fundamentals', platform: 'coursera', url: 'https://www.coursera.org/search?query=graphql', duration: '3 weeks' },
  ],
  microservices: [
    { title: 'Microservices Architecture', platform: 'coursera', url: 'https://www.coursera.org/search?query=microservices', duration: '4 weeks' },
  ],
  'system design': [
    { title: 'Software Design and Architecture', platform: 'coursera', url: 'https://www.coursera.org/specializations/software-design-architecture', duration: '4 months' },
  ],
  testing: [
    { title: 'Software Testing and Automation', platform: 'coursera', url: 'https://www.coursera.org/specializations/software-testing-automation', duration: '4 months' },
  ],
  'mobile development': [
    { title: 'Meta React Native', platform: 'coursera', url: 'https://www.coursera.org/learn/react-native-course', duration: '4 weeks' },
  ],
  blockchain: [
    { title: 'Blockchain Specialization', platform: 'coursera', url: 'https://www.coursera.org/specializations/blockchain', duration: '4 months' },
  ],
  'cloud computing': [
    { title: 'Cloud Computing Specialization', platform: 'coursera', url: 'https://www.coursera.org/specializations/cloud-computing', duration: '6 months' },
  ],
};

// Aliases for fuzzy matching
const SKILL_ALIASES: Record<string, string> = {
  'ml': 'machine learning',
  'ai': 'machine learning',
  'artificial intelligence': 'machine learning',
  'dl': 'deep learning',
  'neural networks': 'deep learning',
  'natural language processing': 'nlp',
  'rest apis': 'rest api',
  'api design': 'rest api',
  'api development': 'rest api',
  'restful': 'rest api',
  'continuous integration': 'ci/cd',
  'continuous delivery': 'ci/cd',
  'continuous deployment': 'ci/cd',
  'pipeline': 'ci/cd',
  'amazon web services': 'aws',
  'google cloud': 'gcp',
  'google cloud platform': 'gcp',
  'microsoft azure': 'azure',
  'k8s': 'kubernetes',
  'js': 'javascript',
  'ts': 'typescript',
  'node': 'node.js',
  'nodejs': 'node.js',
  'express': 'express.js',
  'expressjs': 'express.js',
  'nextjs': 'next.js',
  'vue': 'vue.js',
  'vuejs': 'vue.js',
  'react.js': 'react',
  'reactjs': 'react',
  'react native': 'mobile development',
  'flutter': 'dart',
  'csharp': 'c#',
  'golang': 'go',
  'rails': 'ruby',
  'ruby on rails': 'ruby',
  'spring': 'spring boot',
  'dotnet': '.net',
  'asp.net': '.net',
  'data science': 'data analysis',
  'data visualization': 'tableau',
  'infosec': 'cybersecurity',
  'information security': 'cybersecurity',
  'security': 'cybersecurity',
  'penetration testing': 'ethical hacking',
  'pentesting': 'ethical hacking',
  'qa': 'testing',
  'quality assurance': 'testing',
  'unit testing': 'testing',
  'test automation': 'testing',
  'scrum': 'agile',
  'kanban': 'agile',
  'version control': 'git',
  'github': 'git',
  'gitlab': 'git',
  'containers': 'docker',
  'containerization': 'docker',
  'ux': 'ui/ux design',
  'ui design': 'ui/ux design',
  'ux design': 'ui/ux design',
  'user experience': 'ui/ux design',
  'user interface': 'ui/ux design',
  'presentation skills': 'public speaking',
  'interpersonal skills': 'communication',
  'collaboration': 'teamwork',
  'databases': 'sql',
  'database': 'sql',
  'nosql': 'sql',
  'mongodb': 'sql',
  'postgresql': 'sql',
  'mysql': 'sql',
  'html': 'css',
  'web development': 'javascript',
  'frontend': 'react',
  'front-end': 'react',
  'backend': 'node.js',
  'back-end': 'node.js',
};

export function findCuratedCourses(skillName: string): CuratedCourse[] {
  const key = skillName.toLowerCase().trim();

  // Direct match
  if (CURATED_COURSES[key]) return CURATED_COURSES[key];

  // Alias match
  const aliasKey = SKILL_ALIASES[key];
  if (aliasKey && CURATED_COURSES[aliasKey]) return CURATED_COURSES[aliasKey];

  // Partial match on catalog keys
  const partialMatch = Object.entries(CURATED_COURSES).find(
    ([k]) => key.includes(k) || k.includes(key)
  );
  if (partialMatch) return partialMatch[1];

  // Partial match on alias keys
  const aliasPartial = Object.entries(SKILL_ALIASES).find(
    ([alias]) => key.includes(alias) || alias.includes(key)
  );
  if (aliasPartial && CURATED_COURSES[aliasPartial[1]]) return CURATED_COURSES[aliasPartial[1]];

  return [];
}
