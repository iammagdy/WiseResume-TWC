const fs = require('fs');
const file = 'src/components/dashboard/ResumeGroup.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `  // Check for orphaned tailored resumes (parent was deleted)
  Object.entries(tailoredByParent).forEach(([parentId, tailored]) => {
    const parentExists = masterResumes.some((m) => m.id === parentId);
    if (!parentExists) {
      // Promote orphaned resumes to master level
      orphanTailored.push(...tailored);
    }
  });`;

const newCode = `  // ⚡ Bolt: Replace O(N²) nested loop with O(1) Set lookup
  const masterIds = new Set(masterResumes.map(m => m.id));

  // Check for orphaned tailored resumes (parent was deleted)
  Object.entries(tailoredByParent).forEach(([parentId, tailored]) => {
    const parentExists = masterIds.has(parentId);
    if (!parentExists) {
      // Promote orphaned resumes to master level
      orphanTailored.push(...tailored);
    }
  });`;

if (content.includes(oldCode)) {
  fs.writeFileSync(file, content.replace(oldCode, newCode), 'utf8');
  console.log('Patched successfully');
} else {
  console.log('Could not find code to patch');
}
