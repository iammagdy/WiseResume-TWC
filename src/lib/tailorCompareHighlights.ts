import { compareSkills, diffText, normalizeSkill } from '@/lib/diffUtils';
import type { BulletTransformation, ResumeData, SuperTailorResult } from '@/types/resume';

export type CompareHighlightSide = 'before' | 'after';

export interface CompareHighlightOptions {
  side?: CompareHighlightSide;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function diffToAfterHtml(original: string, tailored: string): string {
  if (original.trim() === tailored.trim()) return escapeHtml(tailored);
  return diffText(original, tailored)
    .map((part) => {
      const safe = escapeHtml(part.text);
      if (part.type === 'added') {
        return `<mark class="jmw-tailor-mark jmw-tailor-mark--added">${safe}</mark>`;
      }
      if (part.type === 'removed') return '';
      return safe;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function diffToBeforeHtml(original: string, tailored: string): string {
  if (original.trim() === tailored.trim()) return escapeHtml(original);
  return diffText(original, tailored)
    .map((part) => {
      const safe = escapeHtml(part.text);
      if (part.type === 'removed') {
        return `<mark class="jmw-tailor-mark jmw-tailor-mark--removed">${safe}</mark>`;
      }
      if (part.type === 'added') return '';
      return safe;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function diffToHtml(original: string, tailored: string, side: CompareHighlightSide): string {
  return side === 'before'
    ? diffToBeforeHtml(original, tailored)
    : diffToAfterHtml(original, tailored);
}

function clearHighlights(root: HTMLElement) {
  root.querySelectorAll('.jmw-tailor-mark').forEach((el) => {
    el.classList.remove('jmw-tailor-mark', 'jmw-tailor-mark--added', 'jmw-tailor-mark--removed');
  });
  root.querySelectorAll('[data-tailor-skill]').forEach((el) => {
    el.removeAttribute('data-tailor-skill');
  });
}

function skillMatchesNode(text: string, skill: string): boolean {
  const nodeNorm = normalizeSkill(text);
  const skillNorm = normalizeSkill(skill);
  if (!nodeNorm || !skillNorm) return false;
  return nodeNorm === skillNorm;
}

function renderSkillListHtml(skills: string[], classFor: (skill: string) => string | null): string {
  return skills
    .map((skill) => {
      const markClass = classFor(skill);
      const safe = escapeHtml(skill);
      if (markClass) {
        return `<mark class="jmw-tailor-mark ${markClass}">${safe}</mark>`;
      }
      return safe;
    })
    .join(', ');
}

function highlightSkillsSection(
  section: HTMLElement,
  original: ResumeData,
  tailored: ResumeData,
  side: CompareHighlightSide,
) {
  const diff = compareSkills(original.skills ?? [], tailored.skills ?? []);
  const removedSet = new Set(diff.removed.map((s) => normalizeSkill(s)));
  const addedSet = new Set(diff.added.map((s) => normalizeSkill(s)));

  const classFor = (skill: string): string | null => {
    const norm = normalizeSkill(skill);
    if (side === 'before' && removedSet.has(norm)) return 'jmw-tailor-mark--removed';
    if (side === 'after' && addedSet.has(norm)) return 'jmw-tailor-mark--added';
    return null;
  };

  const skillSpans = section.querySelectorAll(':scope span, :scope li');
  let matchedSpan = false;
  skillSpans.forEach((node) => {
    const text = (node.textContent || '').trim();
    if (!text || node.closest('h2, h3')) return;
    const skillList = side === 'before' ? (original.skills ?? []) : (tailored.skills ?? []);
    const hit = skillList.find((s) => skillMatchesNode(text, s));
    if (!hit) return;
    matchedSpan = true;
    const markClass = classFor(hit);
    if (markClass) node.classList.add('jmw-tailor-mark', markClass);
  });

  if (matchedSpan) return;

  const paragraphs = section.querySelectorAll(':scope p');
  paragraphs.forEach((p) => {
    if (p.closest('h2, h3')) return;
    const skills = side === 'before' ? (original.skills ?? []) : (tailored.skills ?? []);
    if (!skills.length) return;
    p.innerHTML = renderSkillListHtml(skills, classFor);
  });
}

function findExperienceBlock(section: HTMLElement, index: number): Element | null {
  const blocks = section.querySelectorAll('[data-break-avoid]');
  if (blocks[index]) return blocks[index];
  const children = Array.from(section.children).filter((el) => !/^H[1-6]$/i.test(el.tagName));
  return children[index] ?? null;
}

function findExperienceMatch(
  tailoredExp: ResumeData['experience'][number],
  originalList: ResumeData['experience'],
  index: number,
): ResumeData['experience'][number] | undefined {
  const byId = originalList.find((e) => e.id && e.id === tailoredExp.id);
  if (byId) return byId;
  const company = (tailoredExp.company || '').trim().toLowerCase();
  const position = (tailoredExp.position || '').trim().toLowerCase();
  const byRole = originalList.find((e) =>
    (e.company || '').trim().toLowerCase() === company &&
    (e.position || '').trim().toLowerCase() === position,
  );
  if (byRole) return byRole;
  return originalList[index];
}

function highlightExperienceSection(
  section: HTMLElement,
  original: ResumeData,
  tailored: ResumeData,
  side: CompareHighlightSide,
) {
  const list = side === 'before' ? original.experience : tailored.experience;
  const otherList = side === 'before' ? tailored.experience : original.experience;

  list.forEach((exp, index) => {
    const block = findExperienceBlock(section, index);
    if (!block) return;

    const orig = side === 'before'
      ? exp
      : findExperienceMatch(exp, original.experience, index);
    const tail = side === 'after'
      ? exp
      : findExperienceMatch(exp, tailored.experience, index) ?? otherList[index];

    if (!orig || !tail) return;

    const desc = block.querySelector('p[data-break-child], p');
    if (desc) {
      const beforeDesc = orig.description || '';
      const afterDesc = tail.description || '';
      if (beforeDesc.trim() !== afterDesc.trim()) {
        desc.innerHTML = diffToHtml(beforeDesc, afterDesc, side);
      }
    }

    const lis = block.querySelectorAll('li');
    const origBullets = orig.achievements ?? [];
    const tailBullets = tail.achievements ?? [];
    const max = Math.max(lis.length, origBullets.length, tailBullets.length);

    for (let i = 0; i < max; i += 1) {
      const li = lis[i];
      const before = origBullets[i] ?? '';
      const after = tailBullets[i] ?? '';
      if (!li || (!before.trim() && !after.trim())) continue;
      if (before.trim() === after.trim()) continue;
      li.innerHTML = diffToHtml(before, after, side);
    }
  });
}

function highlightSummarySection(
  section: HTMLElement,
  original: ResumeData,
  tailored: ResumeData,
  side: CompareHighlightSide,
) {
  const block = section.querySelector('p, [data-break-child]');
  if (!block) return;
  const before = original.summary || '';
  const after = tailored.summary || '';
  if (before.trim() === after.trim()) return;
  block.innerHTML = diffToHtml(before, after, side);
}

function highlightProjectsSection(
  section: HTMLElement,
  original: ResumeData,
  tailored: ResumeData,
  side: CompareHighlightSide,
) {
  const list = side === 'before' ? (original.projects ?? []) : (tailored.projects ?? []);
  list.forEach((proj, index) => {
    const block = findExperienceBlock(section, index);
    if (!block) return;
    const orig = original.projects?.find((p) => p.id === proj.id)
      ?? original.projects?.find((p) => p.name === proj.name)
      ?? original.projects?.[index];
    const tail = tailored.projects?.find((p) => p.id === proj.id)
      ?? tailored.projects?.find((p) => p.name === proj.name)
      ?? tailored.projects?.[index];
    if (!orig || !tail) return;

    const desc = block.querySelector('p[data-break-child], p');
    if (desc && (orig.description || '') !== (tail.description || '')) {
      desc.innerHTML = diffToHtml(orig.description || '', tail.description || '', side);
    }
  });
}

export function applyTailorCompareHighlights(
  root: HTMLElement | null,
  original: ResumeData,
  tailored: ResumeData,
  tailorResult?: SuperTailorResult | null,
  options: CompareHighlightOptions = {},
) {
  if (!root) return;
  const side = options.side ?? 'after';
  clearHighlights(root);

  const summarySection = root.querySelector('[data-section="summary"]');
  if (summarySection instanceof HTMLElement) {
    highlightSummarySection(summarySection, original, tailored, side);
  }

  const skillsSection = root.querySelector('[data-section="skills"]');
  if (skillsSection instanceof HTMLElement) {
    highlightSkillsSection(skillsSection, original, tailored, side);
  }

  const experienceSection = root.querySelector('[data-section="experience"]');
  if (experienceSection instanceof HTMLElement) {
    highlightExperienceSection(experienceSection, original, tailored, side);
  }

  const projectsSection = root.querySelector('[data-section="projects"]');
  if (projectsSection instanceof HTMLElement) {
    highlightProjectsSection(projectsSection, original, tailored, side);
  }

  void tailorResult;
}
