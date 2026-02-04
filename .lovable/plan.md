

# Phase 2: Inline AI Buttons & Contextual Nudges

## Overview

This phase transforms the resume editor from a passive form into an AI-first experience by:
1. Adding **Inline AI Buttons** to each section header for quick, contextual enhancements
2. Implementing **Contextual AI Nudges** that proactively suggest improvements based on resume state
3. Adding a **First-Time AI Intro** tooltip to educate new users about AI capabilities

---

## Current State

Each section (Contact, Summary, Experience, Education, Skills) currently has:
- An `AIActionBar` component at the bottom with multiple AI actions
- Section-specific headers with "Add" buttons for lists
- No proactive suggestions or inline shortcuts

The `settingsStore` already has `showAIEnhancementTips` which we'll use to control nudge visibility.

---

## New Components

### 1. InlineAIButton

A compact, eye-catching button that sits in section headers for quick AI access.

```text
┌──────────────────────────────────────────┐
│  Professional Summary            [✨ AI] │
│  ──────────────────────────────────────  │
│  [Textarea content...]                   │
└──────────────────────────────────────────┘
```

**Component: `src/components/editor/InlineAIButton.tsx`**

- Small sparkle icon with gradient background
- Opens a quick-action dropdown (no bottom sheet)
- Actions are section-specific:
  - Summary: Generate, Improve, Shorten
  - Experience: Improve, Add Metrics, ATS Optimize
  - Skills: Suggest Skills, ATS Optimize
  - Education: Suggest Coursework, Improve
  - Contact: Format & Validate

**Implementation:**
```typescript
interface InlineAIButtonProps {
  section: SectionType;
  onAction: (actionId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}
```

### 2. AIContextualNudge

Smart suggestion cards that appear based on resume quality signals.

```text
┌──────────────────────────────────────────┐
│  💡 AI Suggestion                        │
│                                          │
│  Your summary is quite short. Want AI    │
│  to expand it with relevant details?     │
│                                          │
│              [Expand]  [Dismiss]         │
└──────────────────────────────────────────┘
```

**Component: `src/components/editor/AIContextualNudge.tsx`**

**Trigger Logic (per section):**

| Section | Trigger Condition | Nudge Message |
|---------|------------------|---------------|
| Summary | Length < 50 chars | "Your summary is too short. Let AI help expand it." |
| Summary | Length > 500 chars | "Your summary is long. Want to make it more concise?" |
| Summary | No metrics detected | "Add achievement metrics to stand out." |
| Experience | Empty description | "Add a description to improve your resume." |
| Experience | No bullet points | "Break this into bullet points for better readability." |
| Skills | Less than 3 skills | "Add more skills to improve your match score." |
| Skills | Job set + missing skills | "You're missing key skills for this role." |
| Education | Empty fields | "Complete your education details." |

**Implementation:**
```typescript
interface AIContextualNudgeProps {
  show: boolean;
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}
```

### 3. AIIntroTooltip

A one-time education tooltip for first-time AI users.

```text
┌──────────────────────────────────────────┐
│         ✨ Meet Your AI Assistant        │
│                                          │
│  I can help you:                         │
│  • Tailor your resume for any job        │
│  • Score how well you match              │
│  • Improve weak sections                 │
│                                          │
│  Tap the AI buttons to get started!      │
│                                          │
│           [Got It!]                      │
└──────────────────────────────────────────┘
```

**Component: `src/components/editor/AIIntroTooltip.tsx`**

- Shows once per user (tracked in settingsStore)
- Appears after first resume is loaded in editor
- Dismisses on tap, never shows again
- Points to the AI Assistant Bar

---

## File Changes

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/editor/InlineAIButton.tsx` | Compact AI trigger in section headers |
| `src/components/editor/AIContextualNudge.tsx` | Smart suggestion cards |
| `src/components/editor/AIIntroTooltip.tsx` | First-time user education |
| `src/hooks/useResumeNudges.ts` | Logic to determine which nudges to show |

### Files to Modify

| File | Changes |
|------|---------|
| `src/store/settingsStore.ts` | Add `hasSeenAIIntro` flag |
| `src/components/editor/SummarySection.tsx` | Add InlineAIButton + nudge logic |
| `src/components/editor/ExperienceSection.tsx` | Add InlineAIButton + nudge logic |
| `src/components/editor/SkillsSection.tsx` | Add InlineAIButton + nudge logic |
| `src/components/editor/EducationSection.tsx` | Add InlineAIButton + nudge logic |
| `src/components/editor/ContactSection.tsx` | Add InlineAIButton |
| `src/pages/EditorPage.tsx` | Add AIIntroTooltip integration |

---

## Detailed Implementation

### 1. InlineAIButton Component

```typescript
// Quick-access AI button with dropdown menu
export function InlineAIButton({
  section,
  onAction,
  isLoading,
  disabled,
}: InlineAIButtonProps) {
  // Section-specific actions defined
  const actions = getActionsForSection(section);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1.5 text-primary hover:bg-primary/10"
          disabled={disabled || isLoading}
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span className="text-xs font-medium">AI</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem key={action.id} onClick={() => onAction(action.id)}>
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 2. AIContextualNudge Component

```typescript
// Contextual suggestion card with animation
export function AIContextualNudge({
  show,
  message,
  actionLabel,
  onAction,
  onDismiss,
}: AIContextualNudgeProps) {
  if (!show) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className="p-3 rounded-xl bg-primary/5 border border-primary/20"
    >
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" onClick={onAction}>{actionLabel}</Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>Dismiss</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

### 3. useResumeNudges Hook

Centralizes nudge logic across all sections:

```typescript
interface NudgeState {
  section: SectionType;
  trigger: string;
  message: string;
  actionLabel: string;
  action: ActionType;
}

export function useResumeNudges(resume: ResumeData | null, jobDescription?: string) {
  const { showAIEnhancementTips } = useSettingsStore();
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());
  
  const nudges: NudgeState[] = useMemo(() => {
    if (!resume || !showAIEnhancementTips) return [];
    
    const active: NudgeState[] = [];
    
    // Summary nudges
    if (resume.summary.length < 50 && resume.summary.length > 0) {
      active.push({
        section: 'summary',
        trigger: 'short_summary',
        message: 'Your summary is quite short. Let AI expand it with relevant details.',
        actionLabel: 'Expand',
        action: 'expand',
      });
    }
    
    // Skills nudges
    if (resume.skills.length < 3) {
      active.push({
        section: 'skills',
        trigger: 'few_skills',
        message: 'Add more skills to improve your match score.',
        actionLabel: 'Suggest Skills',
        action: 'generate',
      });
    }
    
    // ... more nudge conditions
    
    return active.filter(n => !dismissedNudges.has(n.trigger));
  }, [resume, jobDescription, showAIEnhancementTips, dismissedNudges]);
  
  const dismissNudge = (trigger: string) => {
    setDismissedNudges(prev => new Set([...prev, trigger]));
  };
  
  const getNudgeForSection = (section: SectionType) => 
    nudges.find(n => n.section === section);
  
  return { nudges, getNudgeForSection, dismissNudge };
}
```

### 4. Settings Store Update

Add `hasSeenAIIntro` to track first-time experience:

```typescript
interface SettingsState {
  // ... existing fields
  hasSeenAIIntro: boolean;
  setHasSeenAIIntro: (value: boolean) => void;
}
```

### 5. Section Header Updates

Each section header will be updated to include the InlineAIButton:

**Before:**
```tsx
<h3 className="font-display font-semibold text-lg">Professional Summary</h3>
```

**After:**
```tsx
<div className="flex items-center justify-between mb-4">
  <h3 className="font-display font-semibold text-lg">Professional Summary</h3>
  <InlineAIButton 
    section="summary" 
    onAction={handleAction} 
    isLoading={isEnhancing} 
  />
</div>
```

### 6. EditorPage Integration

Add the AIIntroTooltip as an overlay:

```tsx
export default function EditorPage() {
  const { hasSeenAIIntro, setHasSeenAIIntro } = useSettingsStore();
  
  return (
    <MobileLayout>
      {/* ... existing content */}
      
      {/* First-time AI intro */}
      <AIIntroTooltip 
        show={!hasSeenAIIntro && !!currentResume}
        onDismiss={() => setHasSeenAIIntro(true)}
      />
    </MobileLayout>
  );
}
```

---

## Nudge Trigger Matrix

| Section | Trigger | Condition | Priority |
|---------|---------|-----------|----------|
| Summary | `short_summary` | 0 < length < 50 | High |
| Summary | `long_summary` | length > 500 | Medium |
| Summary | `empty_summary` | length === 0 | High |
| Experience | `empty_description` | Any exp with no description | High |
| Experience | `no_metrics` | Description without numbers | Medium |
| Skills | `few_skills` | skills.length < 3 | High |
| Skills | `missing_job_skills` | Job set + gap analysis shows missing | High |
| Education | `incomplete_edu` | Any edu missing institution or degree | Medium |

Only ONE nudge per section will be shown (highest priority).

---

## Visual Design

### InlineAIButton States

```text
Default:   [✨ AI]  (gradient sparkle, primary text)
Hover:     [✨ AI]  (bg-primary/10)
Loading:   [⟳ AI]  (spinning loader)
Disabled:  [✨ AI]  (opacity-50, cursor-not-allowed)
```

### Nudge Card Styling

- Light primary background (`bg-primary/5`)
- Subtle border (`border-primary/20`)
- Lightbulb icon in primary color
- Staggered entrance animation
- Dismisses with fade-out + collapse

### AIIntroTooltip

- Modal overlay with backdrop blur
- Centered card with gradient accent
- List of capabilities with icons
- Single "Got It!" CTA button
- Haptic feedback on dismiss

---

## Mobile Considerations

- InlineAIButton dropdown positioned at edge (`align="end"`)
- Nudges collapse smoothly to avoid layout jumps
- All touch targets minimum 44px
- Haptic feedback on all interactions
- Nudges respect `showAIEnhancementTips` setting

---

## Implementation Order

1. **Create InlineAIButton** component with section-specific actions
2. **Create AIContextualNudge** component with animation
3. **Create useResumeNudges** hook with trigger logic
4. **Update settingsStore** with `hasSeenAIIntro`
5. **Create AIIntroTooltip** component
6. **Update SummarySection** (template for other sections)
7. **Update ExperienceSection** with inline button + nudges
8. **Update SkillsSection** with inline button + nudges
9. **Update EducationSection** with inline button
10. **Update ContactSection** with inline button
11. **Integrate AIIntroTooltip** in EditorPage

---

## Success Metrics

After implementation:
- Inline AI buttons visible in all 5 section headers
- Contextual nudges appear based on resume state
- First-time users see AI intro once
- AI tips can be toggled off in settings
- Nudges can be individually dismissed

