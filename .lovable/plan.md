

# Make the Tailor Feature Legendary

## Current State Analysis

The existing tailor feature provides:
- Basic job description input
- AI-powered resume rewriting
- Simple diff comparison
- Apply/discard workflow

**What's missing for a "legendary" experience:**
1. No real-time streaming feedback
2. No granular control (all-or-nothing changes)
3. No job URL parsing (users must copy-paste)
4. No tailor history or versioning
5. No per-section selective application
6. No suggested missing skills to add
7. Limited visual feedback during processing
8. No match score preview before/after

---

## The Legendary Tailor Experience

### Feature 1: Smart Job Input with URL Parsing

Instead of just a textarea, add intelligent job input:

```
┌─────────────────────────────────────────────────────┐
│  🔗 Paste job URL or description                    │
│  ┌───────────────────────────────────────────────┐  │
│  │ https://linkedin.com/jobs/view/12345...       │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [Parse Job Posting]  or  [Paste Manually ↓]       │
│                                                     │
│  ✓ LinkedIn  ✓ Indeed  ✓ Glassdoor  ✓ Any URL     │
└─────────────────────────────────────────────────────┘
```

- Auto-detect if input is URL vs text
- Extract job details (title, company, requirements)
- Cache parsed job data for reuse

### Feature 2: Live Streaming with Step-by-Step Progress

Replace static "AI is working..." with animated progress:

```
┌─────────────────────────────────────────────────────┐
│  ✨ Tailoring Your Resume                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✓ Analyzing job requirements           [Complete] │
│  ✓ Matching your experience                [Done]  │
│  ● Rewriting summary...                  [Active]  │
│  ○ Optimizing skills                     [Pending] │
│  ○ Enhancing achievements                [Pending] │
│  ○ Generating recommendations            [Pending] │
│                                                     │
│  ────────────────────────────────── 45%            │
│                                                     │
│  💡 Found 8 matching keywords to add               │
│  📊 Projected match score: 78% → 92%               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Feature 3: Section-by-Section Selective Apply

Allow users to accept/reject changes per section:

```
┌─────────────────────────────────────────────────────┐
│  📋 Review Changes                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [✓] Summary                     ⬆️ +15pts   │   │
│  │     "Results-driven developer..." → Preview │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [✓] Skills                      ⬆️ +12pts   │   │
│  │     +5 added  -2 removed        → Preview   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [ ] Experience                  ⬆️ +8pts    │   │
│  │     3 bullet points rewritten   → Preview   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ────────────────────────────────────────────────  │
│  Apply selected: +27 points → Score: 89%           │
│  [Apply Selected] [Apply All]                      │
└─────────────────────────────────────────────────────┘
```

### Feature 4: Before/After Match Score Comparison

Show immediate impact of changes:

```
┌─────────────────────────────────────────────────────┐
│  📊 Impact Preview                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│    BEFORE            AFTER                         │
│   ┌──────┐         ┌──────┐                        │
│   │  62  │   →→→   │  91  │                        │
│   │  %   │         │  %   │                        │
│   └──────┘         └──────┘                        │
│   Average          Excellent                       │
│                                                     │
│  Improvements:                                     │
│  ├─ Skills Match:      55% → 95%  (+40)           │
│  ├─ Keywords:          48% → 88%  (+40)           │
│  ├─ Experience:        72% → 90%  (+18)           │
│  └─ ATS Compatibility: 75% → 92%  (+17)           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Feature 5: Missing Skills Suggestions with One-Click Add

Suggest skills from job that aren't on resume:

```
┌─────────────────────────────────────────────────────┐
│  💡 Skills Gap Analysis                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Required by job but missing from resume:          │
│                                                     │
│  [+ Add] Kubernetes       - mentioned 4x in job    │
│  [+ Add] CI/CD            - mentioned 3x in job    │
│  [+ Add] Agile/Scrum      - mentioned 2x in job    │
│                                                     │
│  You have these but not emphasized:                │
│  [⬆ Boost] Docker         - move to top           │
│  [⬆ Boost] AWS            - add more context      │
│                                                     │
│  [Add All Suggested Skills]                        │
└─────────────────────────────────────────────────────┘
```

### Feature 6: Tailor History & Quick Revert

Save previous tailored versions:

```
┌─────────────────────────────────────────────────────┐
│  📜 Tailor History                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Today                                             │
│  ├─ Senior Developer @ Google        Score: 91%   │
│  │   [Restore] [Compare]                          │
│  └─ Frontend Lead @ Meta             Score: 85%   │
│      [Restore] [Compare]                          │
│                                                     │
│  Yesterday                                         │
│  └─ Full Stack @ Startup             Score: 78%   │
│      [Restore] [Compare]                          │
│                                                     │
│  [Clear History]                                   │
└─────────────────────────────────────────────────────┘
```

### Feature 7: Cover Letter Generator (Bonus)

One-click cover letter from tailored resume:

```
┌─────────────────────────────────────────────────────┐
│  ✉️ Bonus: Generate Cover Letter                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Based on your tailored resume, generate a         │
│  matching cover letter for this position.          │
│                                                     │
│  Tone: [Professional ▾]                            │
│  Length: [Standard ▾]                              │
│                                                     │
│  [Generate Cover Letter]                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### New Types

```typescript
// src/types/resume.ts additions
export interface TailorHistory {
  id: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  tailorResult: TailorResult;
  scoreBeforeAfter: { before: number; after: number };
  appliedSections: string[];
  createdAt: string;
}

export interface SectionChange {
  sectionId: 'summary' | 'skills' | 'experience' | 'education';
  enabled: boolean;
  impactScore: number;
  preview: string;
  original: unknown;
  tailored: unknown;
}

export interface SkillSuggestion {
  skill: string;
  reason: string;
  frequency: number; // times mentioned in job
  action: 'add' | 'boost';
}

export interface TailorProgress {
  step: 'analyzing' | 'matching' | 'rewriting_summary' | 'optimizing_skills' | 
        'enhancing_experience' | 'generating_recs' | 'complete';
  progress: number;
  message: string;
}
```

### Enhanced Edge Function Response

```typescript
// supabase/functions/tailor-resume/index.ts - enhanced response
interface EnhancedTailorResult {
  // Existing fields
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  keyChanges: string[];
  
  // New legendary features
  sectionScores: {
    summary: { before: number; after: number };
    skills: { before: number; after: number };
    experience: { before: number; after: number };
    education: { before: number; after: number };
  };
  overallScore: { before: number; after: number };
  missingSkills: SkillSuggestion[];
  boostableSkills: SkillSuggestion[];
  jobParsed: {
    title: string;
    company: string;
    keyRequirements: string[];
    niceToHaves: string[];
  };
  coverLetterPrompt?: string; // Pre-built prompt for cover letter
}
```

### New Components

| Component | Purpose |
|-----------|---------|
| `TailorSheet.tsx` | Complete rewrite with new features |
| `TailorProgress.tsx` | Animated step-by-step progress indicator |
| `SectionChangeCard.tsx` | Selectable section with toggle + preview |
| `SkillSuggestionList.tsx` | Missing/boost skill suggestions |
| `ScoreComparison.tsx` | Before/after score visualization |
| `TailorHistorySheet.tsx` | History list with restore/compare |
| `CoverLetterGenerator.tsx` | Cover letter generation modal |
| `JobUrlParser.tsx` | Smart job input with URL detection |

### Store Updates

```typescript
// src/store/resumeStore.ts additions
interface ResumeState {
  // Existing...
  
  // New tailor state
  tailorHistory: TailorHistory[];
  addTailorHistory: (entry: TailorHistory) => void;
  clearTailorHistory: () => void;
  restoreTailorVersion: (id: string) => void;
}
```

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/resume.ts` | Modify | Add new tailor-related types |
| `src/store/resumeStore.ts` | Modify | Add tailor history state |
| `src/lib/aiTailor.ts` | Modify | Add streaming support, new response types |
| `src/components/editor/TailorSheet.tsx` | Rewrite | Complete redesign with all features |
| `src/components/editor/tailor/TailorProgress.tsx` | Create | Animated progress component |
| `src/components/editor/tailor/SectionChangeCard.tsx` | Create | Selectable section card |
| `src/components/editor/tailor/SkillSuggestionList.tsx` | Create | Skill suggestions UI |
| `src/components/editor/tailor/ScoreComparison.tsx` | Create | Before/after score viz |
| `src/components/editor/tailor/TailorHistorySheet.tsx` | Create | History management |
| `src/components/editor/tailor/CoverLetterGenerator.tsx` | Create | Cover letter modal |
| `src/components/editor/tailor/JobUrlParser.tsx` | Create | Smart job input |
| `supabase/functions/tailor-resume/index.ts` | Modify | Enhanced AI prompts, streaming, richer response |
| `supabase/functions/parse-job-url/index.ts` | Create | URL parsing edge function |
| `supabase/functions/generate-cover-letter/index.ts` | Create | Cover letter generation |
| `supabase/config.toml` | Modify | Add new functions |

---

## User Flow

```
User clicks "Tailor Resume"
     ↓
┌──────────────────────┐
│ Smart Job Input      │ ← Paste URL or text
└──────────────────────┘
     ↓
[Tailor My Resume]
     ↓
┌──────────────────────┐
│ Live Progress Steps  │ ← Animated checklist
│ + Score Preview      │
└──────────────────────┘
     ↓
┌──────────────────────┐
│ Section-by-Section   │ ← Toggle sections to apply
│ Review Panel         │
│ + Skill Suggestions  │
│ + Score Comparison   │
└──────────────────────┘
     ↓
[Apply Selected Changes]
     ↓
┌──────────────────────┐
│ Success + History    │ ← Saved to history
│ + Cover Letter CTA   │
└──────────────────────┘
```

---

## Visual Polish

### Animations
- Progress steps slide in sequentially
- Score numbers animate up (counting animation)
- Section cards have subtle hover effects
- Toggle switches have satisfying spring physics
- Success state has confetti/sparkle burst

### Color Coding
- Green: Improvements, additions, high scores
- Blue: Neutral changes, information
- Orange: Warnings, things to review
- Purple: AI suggestions, premium features

---

## Impact

This legendary tailor feature will:

1. **Increase engagement** - Interactive section selection keeps users involved
2. **Build trust** - Transparent score comparison shows real value
3. **Save time** - URL parsing eliminates copy-paste friction
4. **Provide control** - Per-section apply gives users agency
5. **Add value** - Cover letter generation is a major bonus
6. **Enable iteration** - History allows A/B testing different approaches

