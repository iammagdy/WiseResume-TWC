# 3-Tier AI Enhancement Plan — WiseResume Editor

**Created:** 2026-05-20  
**Status:** Approved — ready for implementation  
**Authored by:** Planning session (context-window boundary, plan approved by user)

---

## Context

The AI assist buttons across the editor currently produce generic, context-blind output because:
1. **The backend receives a raw 1000-char JSON dump** of the resume instead of a structured profile block — the LLM doesn't know what to prioritise.
2. **No clarifying-questions flow exists outside Projects** — sparse entries in Summary, Skills, or Experience get weak AI output with no way for the user to guide it.
3. **No job-description-aware actions exist** — there's no "Tailor to Job", "Find Skill Gaps", or smart certification suggestions, even though the job description is already stored in the resume store.

The smart tech suggestions we built for Projects (`suggest_technologies` → questions dialog → `suggest_technologies_with_answers`) proved the pattern works. This plan scales it to every editor section.

---

## Tier 1 — Universal Context Enrichment (Backend Only)

**Goal:** All AI actions receive a meaningful resume profile instead of a raw JSON dump.

### File: `appwrite-hubs/resume-section-ai/src/main.js`

**Add `buildResumeContextBlock(resume)` function** (replace the `resumeStr.slice(0, 1000)` approach):

```js
function buildResumeContextBlock(resume) {
  if (!resume) return 'No resume context available.';
  const name = resume.contactInfo?.name || resume.contactInfo?.fullName || '';
  const title = resume.contactInfo?.title || resume.contactInfo?.headline || '';
  const recentExp = Array.isArray(resume.experience) && resume.experience.length > 0
    ? `${resume.experience[0].position} at ${resume.experience[0].company}`
    : '';
  const topSkills = Array.isArray(resume.skills)
    ? resume.skills.slice(0, 10).map(s => (typeof s === 'string' ? s : s.name || '')).filter(Boolean).join(', ')
    : '';
  const edu = Array.isArray(resume.education) && resume.education.length > 0
    ? `${resume.education[0].degree || ''} ${resume.education[0].field || ''} — ${resume.education[0].school || ''}`
    : '';
  const lines = [
    name && `Candidate: ${name}`,
    title && `Current title: ${title}`,
    recentExp && `Most recent role: ${recentExp}`,
    topSkills && `Core skills: ${topSkills}`,
    edu && `Education: ${edu.trim()}`,
  ].filter(Boolean);
  return lines.join('\n');
}
```

**Update `buildEnhanceMessages`**: Replace the last `userPrompt +=` block:

```js
// BEFORE (line ~111):
if (context?.resume) {
  const resumeStr = JSON.stringify(context.resume);
  userPrompt += `\n\nRESUME CONTEXT (for coherence): ${resumeStr.slice(0, 1000)}`;
}

// AFTER:
if (context?.resume) {
  userPrompt += `\n\nCANDIDATE PROFILE:\n${buildResumeContextBlock(context.resume)}`;
}
```

**Also update `buildSuggestTechUserPrompt`** to use `buildResumeContextBlock` in addition to `extractKnownStack()` for richer domain/purpose context.

**Impact:** Every section (summary, experience, skills, education, awards, etc.) benefits immediately with zero frontend changes.

---

## Tier 2 — Clarifying Questions for Sparse Context

**Goal:** When a user triggers an AI action on sparse content (empty summary, blank skill list, experience with no description), the AI returns 2–3 targeted questions rather than hallucinating output. The user answers, then gets a high-quality result.

### Step 2.1 — Generalise the Questions Dialog Component

**New file: `src/components/editor/ai/AIQuestionsDialog.tsx`**

Generalise `ProjectAIQuestionsDialog.tsx` by replacing the `projectName` prop with a generic `contextLabel`:

```typescript
interface AIQuestionsDialogProps {
  isOpen: boolean;
  contextLabel: string;           // e.g. "Summary", "Marketing Lead at Acme", "Skills"
  questions: string[];
  onSubmit: (answers: Record<string, string>) => void;
  onClose: () => void;
  isLoading?: boolean;
}
```

Keep the same textarea-per-question UI, skip button, and submit-enabled-if-1-answered logic.

**Update `ProjectsSection.tsx`** to import `AIQuestionsDialog` with `contextLabel={proj.name}` and remove the now-redundant `ProjectAIQuestionsDialog.tsx` (or keep it as a thin re-export for backward compatibility).

---

### Step 2.2 — Backend: Question Builders for New Sections

**File: `appwrite-hubs/resume-section-ai/src/main.js`**

Add question-response builders for sparse situations:

```js
function buildSummaryQuestionsResponse() {
  return {
    type: 'questions',
    questions: [
      'What is your current job title or the role you are targeting?',
      'What are your 2–3 most important professional strengths or achievements?',
      'Who is the audience for this resume — a specific industry, company, or role level?',
    ],
  };
}

function buildSkillsQuestionsResponse() {
  return {
    type: 'questions',
    questions: [
      'What is your primary field or domain? (e.g. front-end engineering, data science, product management)',
      'What level are you at — junior, mid, senior, or lead/director?',
      'Are there specific technologies or tools you want to highlight or avoid?',
    ],
  };
}

function buildAddMetricsQuestionsResponse() {
  return {
    type: 'questions',
    questions: [
      'What was the scale of the team, project, or budget you managed?',
      'Did this work lead to measurable outcomes — faster delivery, cost savings, revenue, user growth?',
      'Over what time period did these results occur?',
    ],
  };
}
```

**Add `*_with_answers` action routes** in the main handler (in the `enhance` aiAction block):

```js
if (action === 'generate_with_answers') {
  const messages = buildEnhanceMessages(section, 'generate', currentContent, context);
  // ... callLLM + parseEnhanceResponse
}
if (action === 'add_metrics_with_answers') {
  const messages = buildEnhanceMessages(section, 'add_metrics', currentContent, context);
  // ... callLLM + parseEnhanceResponse
}
```

**Add sparsity checks** before the normal `buildEnhanceMessages` call:

```js
// summary → generate: ask questions if summary is very short
if (section === 'summary' && action === 'generate') {
  const summaryText = typeof currentContent === 'string' ? currentContent : '';
  if (summaryText.trim().length < 50) {
    return res.json(buildSummaryQuestionsResponse());
  }
}

// skills → generate: ask questions if skill list has fewer than 3 items
if (section === 'skills' && action === 'generate') {
  const skillCount = Array.isArray(currentContent) ? currentContent.length : 0;
  if (skillCount < 3) {
    return res.json(buildSkillsQuestionsResponse());
  }
}

// experience → add_metrics: ask questions if description is short
if (section === 'experience' && action === 'add_metrics') {
  const desc = (currentContent && currentContent.description) || '';
  if (desc.trim().length < 60) {
    return res.json(buildAddMetricsQuestionsResponse());
  }
}
```

---

### Step 2.3 — Extend `ActionType` in `useAIEnhance.ts`

**File: `src/hooks/useAIEnhance.ts` — line 21**

```typescript
// BEFORE:
export type ActionType = 'generate' | 'improve' | 'ats_improve' | 'ats_optimize' | 'shorten' | 'expand' | 'add_metrics' | 'generate_bullets' | 'suggest_technologies' | 'generate_with_answers' | 'suggest_technologies_with_answers';

// AFTER:
export type ActionType =
  | 'generate' | 'improve' | 'ats_improve' | 'ats_optimize'
  | 'shorten' | 'expand' | 'add_metrics' | 'generate_bullets'
  | 'suggest_technologies' | 'suggest_technologies_with_answers'
  | 'generate_with_answers' | 'add_metrics_with_answers'
  | 'tailor_to_job' | 'find_skill_gaps' | 'suggest_certifications';
```

---

### Step 2.4 — Wire Questions Flow into `SectionAIAction.tsx`

**File: `src/components/editor/SectionAIAction.tsx`**

Add state:

```typescript
const [pendingQuestionsResult, setPendingQuestionsResult] = useState<{
  questions: string[];
  action: ActionType;
  contextLabel: string;
} | null>(null);
const [questionsLoading, setQuestionsLoading] = useState(false);
```

In `handleAction()`, after `const data = await enhance(...)`:

```typescript
if (data && typeof data === 'object' && (data as any).type === 'questions') {
  const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1);
  setPendingQuestionsResult({
    questions: (data as any).questions,
    action: actionId as ActionType,
    contextLabel: sectionLabel,
  });
  return; // Don't open the diff dialog
}
```

Add handlers:

```typescript
const handleQuestionsSubmit = async (answers: Record<string, string>) => {
  if (!pendingQuestionsResult) return;
  setQuestionsLoading(true);
  const answerText = Object.values(answers).filter(Boolean).join('\n');
  const withAnswersAction = `${pendingQuestionsResult.action}_with_answers` as ActionType;
  const data = await enhance(withAnswersAction, contentMap[section], currentResume, answerText);
  setQuestionsLoading(false);
  setPendingQuestionsResult(null);
  if (data && !(data as any).type) {
    latestPayloadRef.current = data.improved;
    setShowDialog(true);
  }
};

const handleQuestionsSkip = async () => {
  if (!pendingQuestionsResult) return;
  setPendingQuestionsResult(null);
  const data = await enhance(pendingQuestionsResult.action, contentMap[section], currentResume, jobDescription);
  if (data && !(data as any).type) {
    latestPayloadRef.current = data.improved;
    setShowDialog(true);
  }
};
```

Render `<AIQuestionsDialog>` in component return (alongside existing `<AIEnhanceDialog>`).

---

### Step 2.5 — Fix `ExperienceSection.tsx` jobDescription Bug + Add Questions Flow

**File: `src/components/editor/ExperienceSection.tsx`**

**Fix 1 — Pass jobDescription** (currently missing, line ~191):

```typescript
// BEFORE:
const data = await enhance(actionId, { description, position, company, account }, currentResume);

// AFTER:
const jobDescription = useJobDescriptionStore.getState().jobDescription;
const data = await enhance(actionId, { description, position, company, account }, currentResume, jobDescription || undefined);
```

**Fix 2 — Add questions flow state + handlers** (same pattern as SectionAIAction step 2.4). Intercept `{ type: 'questions' }` in `handleAIAction()`, store in `pendingExpQuestions`, render `<AIQuestionsDialog>` with `contextLabel={exp.position} at {exp.company}`.

---

## Tier 3 — New High-Value Actions

**Goal:** Add job-description-aware actions. Gate them in the UI — disabled with tooltip when no JD is present.

### New Actions

| Action ID | Sections | Description |
|---|---|---|
| `tailor_to_job` | summary, experience | Rewrite using JD keywords and terminology. Preserve all facts. |
| `find_skill_gaps` | skills | Append ONLY skills the candidate is missing from the JD. Never delete existing skills. |
| `suggest_certifications` | certifications | Suggest certifications relevant to the JD and candidate background. |

---

### Step 3.1 — Backend

**File: `appwrite-hubs/resume-section-ai/src/main.js`**

Add to `ACTION_INSTRUCTIONS`:

```js
tailor_to_job:          'Rewrite this resume section to closely match the target job description, using its exact keywords and terminology. Preserve all facts.',
find_skill_gaps:        'Analyse the job description and return ONLY the skills the candidate is missing that are strongly required for the role. Do not modify existing skills.',
suggest_certifications: 'Suggest the most relevant professional certifications for this candidate based on their background and the job description.',
```

For `find_skill_gaps`, inject into the system prompt:
```
CRITICAL: Return ONLY skills the candidate does NOT already have. Return an empty array if all required skills are present.
```

---

### Step 3.2 — InlineAIButton.tsx

**File: `src/components/editor/InlineAIButton.tsx`**

Add prop `hasJobDescription?: boolean`. Mark new actions with `requiresJD: true`. Render disabled + tooltip when `!hasJobDescription`:

```
"Add a job description first to use this action"
```

New actions added per section:
- **summary**: `tailor_to_job` (Tailor to Job)
- **experience**: `tailor_to_job` (Tailor to Job)
- **skills**: `find_skill_gaps` (Find Gaps)
- **certifications**: `suggest_certifications` (From Job Post)

---

### Step 3.3 — SectionAIAction.tsx

- Derive `hasJobDescription = !!jobDescription?.trim()` and pass to `<InlineAIButton>`.
- In `handleApplyFromDialog`, add `find_skill_gaps` append-only branch:

```typescript
if (section === 'skills' && currentAction === 'find_skill_gaps') {
  const existing = Array.isArray(currentResume.skills) ? currentResume.skills : [];
  const newSkills = Array.isArray(improved) ? improved : [];
  const merged = [...existing, ...newSkills.filter(s => !existing.includes(s))];
  updateResume({ skills: merged });
  return;
}
```

### Step 3.4 — ExperienceSection.tsx

Derive `hasJobDescription` from store and pass to `<InlineAIButton>` (same as step 3.3).

---

## Implementation Sequence

| Phase | Work | Files |
|---|---|---|
| 1 | Tier 1 backend context enrichment | `resume-section-ai/src/main.js` |
| 2 | Tier 2 backend question builders + sparse checks | `resume-section-ai/src/main.js` |
| 3 | Generic `AIQuestionsDialog.tsx` + update `ProjectsSection.tsx` | New file, `ProjectsSection.tsx` |
| 4 | Extend `ActionType` + wire questions into `SectionAIAction` | `useAIEnhance.ts`, `SectionAIAction.tsx` |
| 5 | Fix ExperienceSection JD bug + add questions flow | `ExperienceSection.tsx` |
| 6 | Tier 3 new actions (backend + InlineAIButton + apply handlers) | `main.js`, `InlineAIButton.tsx`, `SectionAIAction.tsx`, `ExperienceSection.tsx` |
| 7 | Update Atlas + CHANGELOG | `Project Atlas/CHANGELOG.md` |
| 8 | Deploy `resume-section-ai` | `deploy_hubs.cjs` (delete old tar first) |

---

## Critical Files

| File | Change |
|---|---|
| `appwrite-hubs/resume-section-ai/src/main.js` | `buildResumeContextBlock`, question builders, sparse checks, 3 new action instructions |
| `src/hooks/useAIEnhance.ts` | Extend `ActionType` union |
| `src/components/editor/SectionAIAction.tsx` | Questions flow state + handlers + dialog render, `find_skill_gaps` merge, `hasJobDescription` gate |
| `src/components/editor/ExperienceSection.tsx` | Fix jobDescription bug, add questions flow |
| `src/components/editor/InlineAIButton.tsx` | New actions with `requiresJD` flag, `hasJobDescription` prop |
| `src/components/editor/ai/AIQuestionsDialog.tsx` | NEW generic dialog |
| `src/components/editor/ai/ProjectAIQuestionsDialog.tsx` | Update to import from `AIQuestionsDialog` |
| `Project Atlas/CHANGELOG.md` | Dated entry for all 3 tiers |

---

## Reusable Patterns (Do Not Rewrite)

- **Questions flow**: `ProjectsSection.tsx` — `questionsAction` state, `handleQuestionsSubmit`, `handleQuestionsSkip`
- **Answers via jobDescription slot**: `buildSuggestTechWithAnswersMessages` passes answers via `context.jobDescription`
- **Resume tech extraction**: `extractKnownStack()` in `resume-section-ai/src/main.js`
- **Sparsity check pattern**: `const hasRichContext = desc.length >= 80 || ...` in `suggest_technologies` handler
- **ID-based merge**: `mergeObjectById` in `SectionAIAction.tsx`

---

## Verification

### Tier 1
1. Network tab: confirm `context.resume` payload is a structured block, not a JSON dump.
2. AI output references candidate name, title, or most recent role.

### Tier 2
1. Blank summary → "Generate Summary" → questions dialog appears.
2. Answer + submit → AI result reflects answers.
3. Skip → AI runs with original content.
4. Experience with short description → "Add Metrics" → questions dialog appears.
5. Skills list < 3 items → "Suggest Skills" → questions dialog appears.

### Tier 3
1. No JD → `tailor_to_job`, `find_skill_gaps`, `suggest_certifications` disabled with tooltip.
2. JD present → actions enabled, output reflects JD keywords.
3. `find_skill_gaps` apply → existing skills preserved, new skills appended.
4. `npx tsc --noEmit` — zero new errors.

### Deploy
- Delete `resume-section-ai.tar.gz` before running `deploy_hubs.cjs`.
- Verify function health in Appwrite dashboard.
- Smoke-test via DevKit health check.
