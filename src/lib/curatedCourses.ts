export interface CuratedCourse {
  title: string;
  platform: 'youtube' | 'coursera' | 'freecodecamp';
  url: string;
  duration?: string;
}

export const CURATED_COURSES: Record<string, CuratedCourse[]> = {
  python: [
    { title: 'Python Full Course for Beginners', platform: 'youtube', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw', duration: '4h' },
    { title: 'Scientific Computing with Python', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/scientific-computing-with-python/', duration: '300h' },
    { title: 'Python for Everybody', platform: 'coursera', url: 'https://www.coursera.org/specializations/python', duration: '8 months' },
  ],
  javascript: [
    { title: 'JavaScript Full Course', platform: 'youtube', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', duration: '3.5h' },
    { title: 'JavaScript Algorithms & Data Structures', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/', duration: '300h' },
    { title: 'HTML, CSS, and Javascript for Web Developers', platform: 'coursera', url: 'https://www.coursera.org/learn/html-css-javascript-for-web-developers', duration: '5 weeks' },
  ],
  react: [
    { title: 'React Course for Beginners', platform: 'youtube', url: 'https://www.youtube.com/watch?v=bMknfKXIFA8', duration: '12h' },
    { title: 'Front End Development Libraries', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/front-end-development-libraries/', duration: '300h' },
    { title: 'React Basics by Meta', platform: 'coursera', url: 'https://www.coursera.org/learn/react-basics', duration: '4 weeks' },
  ],
  sql: [
    { title: 'SQL Tutorial - Full Database Course', platform: 'youtube', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', duration: '4h' },
    { title: 'Relational Database', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/relational-database/', duration: '300h' },
    { title: 'Introduction to SQL', platform: 'coursera', url: 'https://www.coursera.org/learn/intro-sql', duration: '4 weeks' },
  ],
  'data analysis': [
    { title: 'Data Analysis with Python - Full Course', platform: 'youtube', url: 'https://www.youtube.com/watch?v=r-uOLxNrNk8', duration: '4.5h' },
    { title: 'Data Analysis with Python', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/data-analysis-with-python/', duration: '300h' },
    { title: 'Google Data Analytics', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/google-data-analytics', duration: '6 months' },
  ],
  'machine learning': [
    { title: 'Machine Learning Course for Beginners', platform: 'youtube', url: 'https://www.youtube.com/watch?v=NWONeJKn6kc', duration: '10h' },
    { title: 'Machine Learning with Python', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/machine-learning-with-python/', duration: '300h' },
    { title: 'Machine Learning by Stanford', platform: 'coursera', url: 'https://www.coursera.org/learn/machine-learning', duration: '11 weeks' },
  ],
  docker: [
    { title: 'Docker Tutorial for Beginners', platform: 'youtube', url: 'https://www.youtube.com/watch?v=fqMOX6JJhGo', duration: '3h' },
    { title: 'Docker Essentials', platform: 'coursera', url: 'https://www.coursera.org/learn/ibm-containers-docker-kubernetes-openshift', duration: '3 weeks' },
  ],
  aws: [
    { title: 'AWS Certified Cloud Practitioner Training', platform: 'youtube', url: 'https://www.youtube.com/watch?v=SOTamWNgDKc', duration: '14h' },
    { title: 'AWS Cloud Technical Essentials', platform: 'coursera', url: 'https://www.coursera.org/learn/aws-cloud-technical-essentials', duration: '4 weeks' },
  ],
  typescript: [
    { title: 'TypeScript Full Course for Beginners', platform: 'youtube', url: 'https://www.youtube.com/watch?v=30LWjhZzg50', duration: '8h' },
    { title: 'TypeScript for Professionals', platform: 'coursera', url: 'https://www.coursera.org/learn/typescript', duration: '3 weeks' },
  ],
  git: [
    { title: 'Git and GitHub for Beginners', platform: 'youtube', url: 'https://www.youtube.com/watch?v=RGOj5yH7evk', duration: '1h' },
    { title: 'Introduction to Git and GitHub', platform: 'coursera', url: 'https://www.coursera.org/learn/introduction-git-github', duration: '4 weeks' },
  ],
  'node.js': [
    { title: 'Node.js Full Course for Beginners', platform: 'youtube', url: 'https://www.youtube.com/watch?v=f2EqECiTBL8', duration: '7h' },
    { title: 'Back End Development and APIs', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/', duration: '300h' },
    { title: 'Server-side Development with NodeJS', platform: 'coursera', url: 'https://www.coursera.org/learn/server-side-nodejs', duration: '4 weeks' },
  ],
  css: [
    { title: 'CSS Full Course for Beginners', platform: 'youtube', url: 'https://www.youtube.com/watch?v=OXGznpKZ_sA', duration: '11h' },
    { title: 'Responsive Web Design', platform: 'freecodecamp', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', duration: '300h' },
  ],
  'project management': [
    { title: 'Project Management Full Course', platform: 'youtube', url: 'https://www.youtube.com/watch?v=uWPIsaYpY7U', duration: '4h' },
    { title: 'Google Project Management', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/google-project-management', duration: '6 months' },
  ],
  agile: [
    { title: 'Agile Project Management Full Course', platform: 'youtube', url: 'https://www.youtube.com/watch?v=thsFsPnUHRA', duration: '3h' },
    { title: 'Agile with Atlassian Jira', platform: 'coursera', url: 'https://www.coursera.org/learn/agile-atlassian-jira', duration: '3 weeks' },
  ],
  communication: [
    { title: 'Communication Skills Full Course', platform: 'youtube', url: 'https://www.youtube.com/watch?v=HAnw168huqA', duration: '2h' },
    { title: 'Improving Communication Skills', platform: 'coursera', url: 'https://www.coursera.org/learn/wharton-communication-skills', duration: '4 weeks' },
  ],
  'ui/ux design': [
    { title: 'UI/UX Design Full Course', platform: 'youtube', url: 'https://www.youtube.com/watch?v=c9Wg6Cb_YlU', duration: '14h' },
    { title: 'Google UX Design', platform: 'coursera', url: 'https://www.coursera.org/professional-certificates/google-ux-design', duration: '6 months' },
  ],
  java: [
    { title: 'Java Full Course for Beginners', platform: 'youtube', url: 'https://www.youtube.com/watch?v=GoXwIVyNvX0', duration: '12h' },
    { title: 'Java Programming and Software Engineering', platform: 'coursera', url: 'https://www.coursera.org/specializations/java-programming', duration: '5 months' },
  ],
  'c++': [
    { title: 'C++ Full Course for Beginners', platform: 'youtube', url: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y', duration: '4h' },
    { title: 'Coding for Everyone: C and C++', platform: 'coursera', url: 'https://www.coursera.org/specializations/coding-for-everyone', duration: '5 months' },
  ],
  kubernetes: [
    { title: 'Kubernetes Full Course', platform: 'youtube', url: 'https://www.youtube.com/watch?v=X48VuDVv0do', duration: '4h' },
    { title: 'Getting Started with Google Kubernetes', platform: 'coursera', url: 'https://www.coursera.org/learn/google-kubernetes-engine', duration: '3 weeks' },
  ],
  'ci/cd': [
    { title: 'CI/CD Full Course', platform: 'youtube', url: 'https://www.youtube.com/watch?v=h9K1NnqwUvE', duration: '3h' },
  ],
};

export function findCuratedCourses(skillName: string): CuratedCourse[] {
  const key = skillName.toLowerCase().trim();

  // Exact match
  if (CURATED_COURSES[key]) return CURATED_COURSES[key];

  // Partial/fuzzy match
  const match = Object.entries(CURATED_COURSES).find(
    ([k]) => key.includes(k) || k.includes(key)
  );

  return match?.[1] || [];
}
