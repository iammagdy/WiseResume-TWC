import { ResumeData, Experience, Education } from '@/types/resume';
import { RedFlag } from '@/types/aiStudio';

interface TargetContent {
  section: 'summary' | 'experience' | 'education' | 'skills' | 'contact';
  id?: string;
  content: string | Experience | Education | string[];
}

export function findTargetContent(resume: ResumeData, redFlag: RedFlag): TargetContent | null {
  const { fixType, quote } = redFlag;

  // 1. Summary
  if (fixType === 'summary') {
    return {
      section: 'summary',
      content: resume.summary,
    };
  }

  // 2. Skills
  if (fixType === 'skills') {
    return {
      section: 'skills',
      content: resume.skills,
    };
  }

  // 3. Experience
  if (fixType === 'experience') {
    // If quote is N/A or too short, we can't safely target a specific job.
    // However, if the user really wants to fix "experience", we need a match.
    if (!quote || quote === 'N/A' || quote.length < 5) {
      return null;
    }

    // Try to find the job containing the quote
    const targetJob = resume.experience.find(exp => {
      // Check description
      if (exp.description && exp.description.includes(quote)) return true;
      // Check achievements
      if (exp.achievements && exp.achievements.some(ach => ach.includes(quote))) return true;
      // Check position/company as fallback context
      if (`${exp.position} at ${exp.company}`.includes(quote)) return true;

      // Fuzzy match: check if the quote is a substring of the job content (normalized)
      const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
      const normalizedDesc = (exp.description || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const normalizedAch = (exp.achievements || []).join(' ').toLowerCase().replace(/\s+/g, ' ').trim();

      return normalizedDesc.includes(normalizedQuote) || normalizedAch.includes(normalizedQuote);
    });

    if (targetJob) {
      return {
        section: 'experience',
        id: targetJob.id,
        content: targetJob,
      };
    }
  }

  // 4. Education
  if (fixType === 'education') {
    if (!quote || quote === 'N/A' || quote.length < 5) {
      return null;
    }

    const targetEdu = resume.education.find(edu => {
      if (`${edu.degree} in ${edu.field} - ${edu.institution}`.includes(quote)) return true;

      // Fuzzy match
      const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
      const normalizedEdu = `${edu.degree} ${edu.field} ${edu.institution}`.toLowerCase().replace(/\s+/g, ' ').trim();

      return normalizedEdu.includes(normalizedQuote);
    });

    if (targetEdu) {
      return {
        section: 'education',
        id: targetEdu.id,
        content: targetEdu,
      };
    }
  }

  // 5. Contact (Explicitly handled elsewhere, but for completeness)
  if (fixType === 'contact') {
    return null; // We don't auto-fix contact
  }

  return null;
}
