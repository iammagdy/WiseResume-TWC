# Phase 3: Master/Tailored Version Hierarchy & AI Analytics

## Overview

This phase adds:
1. **Master/Tailored Resume Hierarchy** - Resumes can be linked as variants of a "master" resume, with visual grouping in dashboard
2. **AI Feature Analytics** - Track usage of AI features to show insights and improve recommendations

---

## Completed Changes

### Database Changes

1. **Added `parent_resume_id` to resumes table**
   - Creates parent-child relationship for master/tailored versions
   - NULL = master resume, non-NULL = tailored variant
   - Foreign key with ON DELETE SET NULL

2. **Created `ai_usage_logs` table**
   - Tracks AI feature usage: action type, section, resume ID, timestamp
   - Enables usage insights and recommendations
   - RLS policies for user data isolation

### New Components & Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useAIAnalytics.ts` | Track and query AI feature usage |
| `src/components/dashboard/ResumeGroup.tsx` | Group master resumes with their tailored versions |

### Updated Components

| File | Changes |
|------|---------|
| `src/hooks/useResumes.ts` | Added `parent_resume_id` to DatabaseResume type |
| `src/components/dashboard/ResumeListCard.tsx` | Added Master/Tailored badges |
| `src/components/dashboard/CreateResumeDialog.tsx` | Support for creating tailored versions |
| `src/pages/DashboardPage.tsx` | Hierarchical resume grouping display |

---

## Dashboard Hierarchy Features

- Master resumes are displayed normally unless they have tailored versions
- Resumes with tailored versions show a collapsible group
- "Master" badge appears on parent resumes
- "Tailored" badge appears on child resumes
- Tailored versions are grouped under their parent with indentation
- Quick "Create Tailored Version" button within groups
- Orphaned tailored resumes (parent deleted) show as standalone

---

## AI Analytics Tracking

The `useAIAnalytics` hook provides:

### Actions Tracked
- `enhance` - AI enhancement of content
- `generate` - AI generation of new content  
- `tailor` - AI job tailoring
- `analyze` - AI resume analysis
- `suggest` - AI suggestions

### Statistics Available
- Total actions count
- Actions by type breakdown
- Actions by section breakdown
- Most used action
- Last week actions count

### Usage
```typescript
const { logUsage, stats } = useAIAnalytics();

// Log an AI action
logUsage({
  resumeId: 'uuid',
  actionType: 'enhance',
  section: 'summary',
  metadata: { /* optional context */ }
});

// Access statistics
console.log(stats.totalActions);
console.log(stats.mostUsedAction);
```

---

## Next Steps (Phase 4)

1. Integrate AI analytics logging into existing AI features (InlineAIButton, AIActionBar)
2. Create an AI usage insights dashboard/component
3. Add "Sync from Master" feature for tailored versions
4. Add comparison view between master and tailored versions
