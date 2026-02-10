import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KeywordHeatmapProps {
  jobDescription: string;
  resumeSkills: string[];
  resumeText: string;
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'we', 'you',
  'they', 'he', 'she', 'it', 'i', 'me', 'my', 'your', 'our', 'their',
  'this', 'that', 'these', 'those', 'not', 'no', 'all', 'each', 'every',
  'any', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too',
  'very', 'just', 'about', 'above', 'after', 'again', 'also', 'am', 'an',
  'because', 'before', 'between', 'both', 'during', 'here', 'how', 'if',
  'into', 'its', 'let', 'like', 'make', 'many', 'much', 'new', 'now',
  'only', 'over', 'own', 'same', 'so', 'then', 'there', 'through', 'under',
  'up', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'work', 'working', 'ability', 'experience', 'including', 'within', 'well',
  'strong', 'excellent', 'required', 'preferred', 'etc', 'role', 'position',
  'company', 'team', 'join', 'looking', 'seeking', 'candidate', 'ideal',
]);

function extractKeywords(text: string): string[] {
  // Extract meaningful multi-word and single-word terms
  const words = text.toLowerCase().replace(/[^a-z0-9\s\-\/\+\#\.]/g, ' ').split(/\s+/);
  
  const keywords = new Set<string>();
  
  // Single words (3+ chars, not stop words)
  for (const word of words) {
    if (word.length >= 3 && !STOP_WORDS.has(word)) {
      keywords.add(word);
    }
  }
  
  // Common tech/skill bigrams
  const fullText = text.toLowerCase();
  const bigramPatterns = [
    /machine learning/gi, /deep learning/gi, /data science/gi, /project management/gi,
    /user experience/gi, /full stack/gi, /front end/gi, /back end/gi, /cloud computing/gi,
    /problem solving/gi, /cross functional/gi, /ci\/cd/gi, /rest api/gi, /unit test/gi,
    /agile methodology/gi, /product management/gi, /business intelligence/gi,
    /natural language/gi, /computer vision/gi, /software engineering/gi,
  ];
  
  for (const pattern of bigramPatterns) {
    if (pattern.test(fullText)) {
      const match = fullText.match(pattern);
      if (match) keywords.add(match[0].toLowerCase());
    }
  }
  
  return Array.from(keywords);
}

type MatchStatus = 'found' | 'partial' | 'missing';

function checkKeywordInResume(keyword: string, resumeText: string, resumeSkills: string[]): MatchStatus {
  const lowerResume = resumeText.toLowerCase();
  const lowerSkills = resumeSkills.map(s => s.toLowerCase());
  
  // Exact match in skills or resume text
  if (lowerSkills.some(s => s === keyword || s.includes(keyword)) || lowerResume.includes(keyword)) {
    return 'found';
  }
  
  // Partial match (word stems, abbreviations)
  const stem = keyword.slice(0, Math.max(4, keyword.length - 2));
  if (lowerResume.includes(stem) || lowerSkills.some(s => s.includes(stem))) {
    return 'partial';
  }
  
  return 'missing';
}

export function KeywordHeatmap({ jobDescription, resumeSkills, resumeText }: KeywordHeatmapProps) {
  const analysis = useMemo(() => {
    if (!jobDescription.trim()) return null;
    
    const keywords = extractKeywords(jobDescription);
    // Limit to top 25 most relevant
    const topKeywords = keywords.slice(0, 25);
    
    const results = topKeywords.map(keyword => ({
      keyword,
      status: checkKeywordInResume(keyword, resumeText, resumeSkills),
    }));
    
    const found = results.filter(r => r.status === 'found').length;
    const partial = results.filter(r => r.status === 'partial').length;
    const missing = results.filter(r => r.status === 'missing').length;
    const total = results.length;
    const matchPercent = total > 0 ? Math.round(((found + partial * 0.5) / total) * 100) : 0;
    
    return { results, found, partial, missing, total, matchPercent };
  }, [jobDescription, resumeSkills, resumeText]);
  
  if (!analysis || analysis.total === 0) return null;
  
  const getStatusStyles = (status: MatchStatus) => {
    switch (status) {
      case 'found':
        return 'bg-success/15 text-success border-success/30';
      case 'partial':
        return 'bg-warning/15 text-warning border-warning/30';
      case 'missing':
        return 'bg-destructive/15 text-destructive border-destructive/30';
    }
  };
  
  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Keyword Match</h4>
        <span className={cn(
          'text-sm font-bold',
          analysis.matchPercent >= 70 ? 'text-success' :
          analysis.matchPercent >= 40 ? 'text-warning' : 'text-destructive'
        )}>
          {analysis.found}/{analysis.total} found ({analysis.matchPercent}%)
        </span>
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {analysis.results.map(({ keyword, status }) => (
          <Badge
            key={keyword}
            variant="outline"
            className={cn('text-[11px] px-2 py-0.5', getStatusStyles(status))}
          >
            {keyword}
          </Badge>
        ))}
      </div>
      
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success" /> Found ({analysis.found})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" /> Partial ({analysis.partial})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-destructive" /> Missing ({analysis.missing})
        </span>
      </div>
    </div>
  );
}
