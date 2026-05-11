import type { SectionType } from '@/components/editor/InlineAIButton';

/**
 * Returns true when a resume section has no meaningful content to improve.
 *
 * Used as a pre-flight gate before firing AI "improve/enhance" actions so
 * the gateway never receives a call it cannot answer. Generate and suggest
 * actions bypass this check — they are designed to work on blank sections.
 */
export function isSectionContentEmpty(section: SectionType, content: unknown): boolean {
  if (content === null || content === undefined) return true;

  switch (section) {
    case 'summary':
      return typeof content !== 'string' || !content.trim();

    case 'experience': {
      if (!Array.isArray(content) || content.length === 0) return true;
      return content.every((e: unknown) => {
        if (!e || typeof e !== 'object') return true;
        const exp = e as Record<string, unknown>;
        const desc = typeof exp.description === 'string' ? exp.description.trim() : '';
        const ach = Array.isArray(exp.achievements)
          ? exp.achievements.filter((a): a is string => typeof a === 'string' && a.trim() !== '')
          : [];
        return !desc && ach.length === 0;
      });
    }

    case 'education': {
      if (!Array.isArray(content) || content.length === 0) return true;
      return content.every((e: unknown) => {
        if (!e || typeof e !== 'object') return true;
        const edu = e as Record<string, unknown>;
        const degree = typeof edu.degree === 'string' ? edu.degree.trim() : '';
        const institution = typeof edu.institution === 'string' ? edu.institution.trim() : '';
        return !degree && !institution;
      });
    }

    case 'skills': {
      if (!Array.isArray(content) || content.length === 0) return true;
      return content.every((s: unknown) => {
        if (typeof s === 'string') return !s.trim();
        if (!s || typeof s !== 'object') return true;
        const skill = s as Record<string, unknown>;
        const name = typeof skill.name === 'string' ? skill.name.trim() : '';
        return !name;
      });
    }

    case 'contact': {
      if (!content || typeof content !== 'object') return true;
      const c = content as Record<string, unknown>;
      const fullName = typeof c.fullName === 'string' ? c.fullName.trim() : '';
      const email = typeof c.email === 'string' ? c.email.trim() : '';
      const phone = typeof c.phone === 'string' ? c.phone.trim() : '';
      return !fullName && !email && !phone;
    }

    case 'awards':
    case 'projects':
    case 'publications':
    case 'volunteering':
    case 'certifications':
    case 'languages':
      return !Array.isArray(content) || content.length === 0;

    default:
      return false;
  }
}

/**
 * Returns true for actions that are valid on empty sections — i.e. they
 * generate or suggest content from scratch. All other actions (improve,
 * shorten, ats_optimize, add_metrics, etc.) require existing content.
 */
export function isGenerativeAction(actionId: string): boolean {
  return (
    actionId === 'generate' ||
    actionId === 'generate_bullets' ||
    actionId.startsWith('suggest_')
  );
}

/**
 * Returns a user-friendly empty-content message for a section.
 */
export function emptySectionToastMessage(section: SectionType): string {
  switch (section) {
    case 'summary':
      return 'Write a summary first — then AI can improve it.';
    case 'experience':
      return 'Add a description or bullet points first — then AI can improve them.';
    case 'education':
      return 'Add at least one education entry first.';
    case 'skills':
      return 'Add some skills first — then AI can improve and reorder them.';
    case 'contact':
      return 'Fill in your name or email first.';
    default:
      return 'Add some content first — then AI can improve it.';
  }
}
