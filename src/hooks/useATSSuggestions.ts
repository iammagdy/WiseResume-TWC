import { useMemo, useCallback, useRef, useState } from 'react';
import { ResumeData, SectionId } from '@/types/resume';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

export interface ATSSuggestion {
  id: string;
  type: 'missing_keyword' | 'weak_verb' | 'add_metrics' | 'formatting';
  message: string;
  section: SectionId;
  priority: 'high' | 'medium' | 'low';
  autoFix?: string;
}

// Common English stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','shall','should','may','might','can','could',
  'this','that','these','those','it','its','we','our','you','your','they',
  'their','he','she','his','her','i','my','me','us','them','not','no','so',
  'if','then','than','as','about','up','out','also','into','over','after',
  'such','each','any','all','both','more','most','other','some','only',
  'very','just','must','able','who','what','which','when','where','how',
  'per','via','etc','within','across','between','during','through','including',
  'based','using','work','working','new','well','strong','least','experience',
  'required','preferred','looking','join','team','role','position','company',
  'responsibilities','requirements','qualifications','years','ability',
]);

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9#+.]/g, '');
}

function extractKeywords(text: string): Map<string, number> {
  const words = text.split(/[\s,;:()\[\]{}"'\/\\|]+/);
  const freq = new Map<string, number>();

  for (const raw of words) {
    const w = normalizeWord(raw);
    if (w.length < 2 || STOP_WORDS.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  // Extract bigrams for technical terms (e.g. "machine learning", "react.js")
  const cleaned = text.toLowerCase();
  const bigramMatches = cleaned.match(/[a-z0-9#+.]+\s+[a-z0-9#+.]+/g) || [];
  for (const bigram of bigramMatches) {
    const parts = bigram.split(/\s+/).map(normalizeWord);
    if (parts.some(p => STOP_WORDS.has(p) || p.length < 2)) continue;
    const key = parts.join(' ');
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  return freq;
}

function getSectionContent(resume: ResumeData, section: SectionId): string {
  switch (section) {
    case 'summary':
      return resume.summary || '';
    case 'experience':
      return (resume.experience || [])
        .map(e => `${e.position} ${e.company} ${e.description} ${(e.achievements || []).join(' ')}`)
        .join(' ');
    case 'education':
      return (resume.education || [])
        .map(e => `${e.degree} ${e.field} ${e.institution}`)
        .join(' ');
    case 'skills':
      return (resume.skills || []).join(' ');
    case 'certifications':
      return (resume.certifications || []).map(c => `${c.name} ${c.issuer}`).join(' ');
    case 'projects':
      return (resume.projects || [])
        .map(p => `${p.name} ${p.description} ${(p.technologies || []).join(' ')}`)
        .join(' ');
    case 'awards':
      return (resume.awards || []).map(a => `${a.title} ${a.description || ''}`).join(' ');
    case 'publications':
      return (resume.publications || []).map(p => `${p.title} ${p.description || ''}`).join(' ');
    case 'volunteering':
      return (resume.volunteering || []).map(v => `${v.role} ${v.organization} ${v.description}`).join(' ');
    case 'languages':
      return (resume.languages || []).map(l => l.name).join(' ');
    default:
      return '';
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return String(hash);
}

export interface DeepResult {
  improved: unknown;
  changes: string[];
  suggestions?: string[];
}

export function useATSSuggestions(resume: ResumeData | null, jobDescription: string) {
  const [deepSuggestions, setDeepSuggestions] = useState<Record<string, ATSSuggestion[]>>({});
  const [deepResults, setDeepResults] = useState<Record<string, DeepResult>>({});
  const [analyzingSections, setAnalyzingSections] = useState<Set<string>>(new Set());
  const cacheRef = useRef<Record<string, { suggestions: ATSSuggestion[]; result: DeepResult }>>({});
  // Client-side keyword analysis
  const suggestions = useMemo(() => {
    if (!resume || !jobDescription.trim()) return {} as Record<SectionId, ATSSuggestion[]>;

    const jdKeywords = extractKeywords(jobDescription);
    const result: Partial<Record<SectionId, ATSSuggestion[]>> = {};
    const sections: SectionId[] = ['summary', 'experience', 'education', 'skills', 'certifications', 'projects'];

    for (const section of sections) {
      const content = getSectionContent(resume, section).toLowerCase();
      const missing: ATSSuggestion[] = [];

      // Sort keywords by frequency (most important first)
      const sorted = [...jdKeywords.entries()].sort((a, b) => b[1] - a[1]);

      for (const [keyword, freq] of sorted) {
        if (content.includes(keyword)) continue;
        if (missing.length >= 5) break; // Cap at 5 per section

        const priority: ATSSuggestion['priority'] = freq >= 3 ? 'high' : freq >= 2 ? 'medium' : 'low';

        missing.push({
          id: `${section}-kw-${keyword}`,
          type: 'missing_keyword',
          message: `Add keyword: ${keyword}`,
          section,
          priority,
          autoFix: section === 'skills' ? keyword : undefined,
        });
      }

      if (missing.length > 0) {
        result[section] = missing;
      }
    }

    return result as Record<SectionId, ATSSuggestion[]>;
  }, [resume, jobDescription]);

  const getSuggestions = useCallback((section: SectionId): ATSSuggestion[] => {
    // Merge client-side + deep suggestions, deduplicating by id
    const clientSide = suggestions[section] || [];
    const deep = deepSuggestions[section] || [];
    const ids = new Set(clientSide.map(s => s.id));
    return [...clientSide, ...deep.filter(s => !ids.has(s.id))];
  }, [suggestions, deepSuggestions]);

  const clearDeepResult = useCallback((section: SectionId) => {
    setDeepResults(prev => {
      const next = { ...prev };
      delete next[section];
      return next;
    });
  }, []);

  const fetchDeepSuggestions = useCallback(async (section: SectionId) => {
    if (!resume || !jobDescription) return;

    const cacheKey = `${section}-${hashString(jobDescription)}`;
    if (cacheRef.current[cacheKey]) {
      const cached = cacheRef.current[cacheKey];
      setDeepSuggestions(prev => ({ ...prev, [section]: cached.suggestions }));
      setDeepResults(prev => ({ ...prev, [section]: cached.result }));
      return;
    }

    setAnalyzingSections(prev => new Set(prev).add(section));
    try {
      const currentContent = getSectionContent(resume, section);
      const { data, error } = await supabase.functions.invoke('enhance-section', {
        body: {
          section,
          action: 'ats_optimize',
          currentContent,
          context: { resume, jobDescription },
        },
      });

      if (error) throw error;

      // Store full result for apply/discard UI
      const result: DeepResult = {
        improved: data?.improved,
        changes: Array.isArray(data?.changes) ? data.changes : [],
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
      };

      // Parse suggestions (may be plain strings) into ATSSuggestion objects
      const aiSuggestions: ATSSuggestion[] = [];
      if (result.suggestions) {
        for (const s of result.suggestions) {
          const msg = typeof s === 'string' ? s : (s as Record<string, unknown>)?.message || String(s);
          aiSuggestions.push({
            id: `deep-${section}-${aiSuggestions.length}`,
            type: 'missing_keyword',
            message: String(msg),
            section,
            priority: 'medium',
          });
        }
      }

      cacheRef.current[cacheKey] = { suggestions: aiSuggestions, result };
      setDeepSuggestions(prev => ({ ...prev, [section]: aiSuggestions }));
      setDeepResults(prev => ({ ...prev, [section]: result }));
    } catch (err) {
      console.error('Deep ATS analysis failed:', err);
      const msg = err instanceof Error ? err.message : 'Deep analysis failed';
      toast.error(msg);
    } finally {
      setAnalyzingSections(prev => { const next = new Set(prev); next.delete(section); return next; });
    }
  }, [resume, jobDescription]);

  // Full-resume scan summary
  const scanSummary = useMemo(() => {
    if (!resume || !jobDescription.trim()) return null;

    const jdKeywords = extractKeywords(jobDescription);
    const allContent = getSectionContent(resume, 'summary') + ' ' +
      getSectionContent(resume, 'experience') + ' ' +
      getSectionContent(resume, 'education') + ' ' +
      getSectionContent(resume, 'skills') + ' ' +
      getSectionContent(resume, 'projects') + ' ' +
      getSectionContent(resume, 'certifications');

    const lower = allContent.toLowerCase();
    let matched = 0;
    let total = 0;
    for (const [keyword] of jdKeywords) {
      total++;
      if (lower.includes(keyword)) matched++;
    }

    const matchPercentage = total > 0 ? Math.round((matched / total) * 100) : 0;

    const perSection: { section: SectionId; label: string; missing: number }[] = [];
    const sectionLabels: Record<string, string> = {
      summary: 'Summary', experience: 'Experience', education: 'Education',
      skills: 'Skills', projects: 'Projects', certifications: 'Certifications',
    };

    for (const [section, label] of Object.entries(sectionLabels)) {
      const count = (suggestions[section as SectionId] || []).length;
      if (count > 0) {
        perSection.push({ section: section as SectionId, label, missing: count });
      }
    }

    return { matchPercentage, perSection, totalKeywords: total, matchedKeywords: matched };
  }, [resume, jobDescription, suggestions]);

  const isAnalyzingSection = useCallback((section: SectionId) => analyzingSections.has(section), [analyzingSections]);

  return { getSuggestions, isAnalyzingSection, fetchDeepSuggestions, scanSummary, suggestions, deepResults, clearDeepResult };
}
