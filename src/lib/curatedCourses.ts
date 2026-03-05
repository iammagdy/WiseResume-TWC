export interface CuratedCourse {
  title: string;
  platform: 'coursera' | 'freecodecamp';
  url: string;
  duration?: string;
}

export const CURATED_COURSES: Record<string, CuratedCourse[]> = {
  python: [
    { title: 'Scientific Computing with Python', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/scientific-computing-with-python/', duration: '300h' },
    { title: 'Python for Everybody', platform: 'coursera', url: 'https://www.coursera.org/specializations/python', duration: '8 months' },
  ],
  javascript: [
    { title: 'JavaScript Algorithms & Data Structures', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/', duration: '300h' },
    { title: 'HTML, CSS, and Javascript for Web Developers', platform: 'coursera', url: 'https://www.coursera.org/learn/html-css-javascript-for-web-developers', duration: '5 weeks' },
  ],
  react: [
    { title: 'Front End Development Libraries', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/front-end-development-libraries/', duration: '300h' },
    { title: 'React Basics by Meta', platform: 'coursera', url: 'https://www.coursera.org/learn/react-basics', duration: '4 weeks' },
  ],
  sql: [
    { title: 'Relational Database', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/relational-database/', duration: '300h' },
    { title: 'Introduction to SQL', platform: 'coursera', url: 'https://www.coursera.org/learn/intro-sql', duration: '4 weeks' },
  ],
  'data analysis': [
    { title: 'Data Analysis with Python', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/data-analysis-with-python/', duration: '300h' },
    { title: 'Google Data Analytics', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/google-data-analytics', duration: '6 months' },
  ],
  'machine learning': [
    { title: 'Machine Learning with Python', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/machine-learning-with-python/', duration: '300h' },
    { title: 'Machine Learning by Stanford', platform: 'coursera', url: 'https://www.coursera.org/learn/machine-learning', duration: '11 weeks' },
  ],
  docker: [
    { title: 'Docker Essentials', platform: 'coursera', url: 'https://www.coursera.org/learn/ibm-containers-docker-kubernetes-openshift', duration: '3 weeks' },
  ],
  aws: [
    { title: 'AWS Cloud Technical Essentials', platform: 'coursera', url: 'https://www.coursera.org/learn/aws-cloud-technical-essentials', duration: '4 weeks' },
  ],
  typescript: [
    { title: 'TypeScript for Professionals', platform: 'coursera', url: 'https://www.coursera.org/learn/typescript', duration: '3 weeks' },
  ],
  git: [
    { title: 'Introduction to Git and GitHub', platform: 'coursera', url: 'https://www.coursera.org/learn/introduction-git-github', duration: '4 weeks' },
  ],
  'node.js': [
    { title: 'Back End Development and APIs', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/', duration: '300h' },
    { title: 'Server-side Development with NodeJS', platform: 'coursera', url: 'https://www.coursera.org/learn/server-side-nodejs', duration: '4 weeks' },
  ],
  css: [
    { title: 'Responsive Web Design', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', duration: '300h' },
  ],
  'project management': [
    { title: 'Google Project Management', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/google-project-management', duration: '6 months' },
  ],
  agile: [
    { title: 'Agile with Atlassian Jira', platform: 'coursera', url: 'https://www.coursera.org/learn/agile-atlassian-jira', duration: '3 weeks' },
  ],
  communication: [
    { title: 'Improving Communication Skills', platform: 'coursera', url: 'https://www.coursera.org/learn/wharton-communication-skills', duration: '4 weeks' },
  ],
  'ui/ux design': [
    { title: 'Google UX Design', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/google-ux-design', duration: '6 months' },
  ],
  java: [
    { title: 'Java Programming and Software Engineering', platform: 'coursera', url: 'https://www.coursera.org/specializations/java-programming', duration: '5 months' },
  ],
  'c++': [
    { title: 'Coding for Everyone: C and C++', platform: 'coursera', url: 'https://www.coursera.org/specializations/coding-for-everyone', duration: '5 months' },
  ],
  kubernetes: [
    { title: 'Getting Started with Google Kubernetes', platform: 'coursera', url: 'https://www.coursera.org/learn/google-kubernetes-engine', duration: '3 weeks' },
  ],
};

export function findCuratedCourses(skillName: string): CuratedCourse[] {
  const key = skillName.toLowerCase().trim();
  if (CURATED_COURSES[key]) return CURATED_COURSES[key];
  const match = Object.entries(CURATED_COURSES).find(
    ([k]) => key.includes(k) || k.includes(key)
  );
  return match?.[1] || [];
}
