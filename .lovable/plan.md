

# Enhanced User Flow Redesign for WiseResume

## Current Flow Analysis

### The Current Flow (Problematic)
```
Home → Upload → Editor → Preview
       ↑                    ↓
       └────────────────────┘
```

### Problems Identified

| Issue | Location | Problem | Impact |
|-------|----------|---------|--------|
| **1. No clear purpose** | Home → Upload | User clicks "Get Started" but doesn't know what will happen | Confusion |
| **2. Abrupt transition** | Upload → Editor | Jumps directly to complex editor with 5 tabs | Overwhelming |
| **3. Hidden AI features** | Editor | Analyze/Tailor are tiny buttons in scrollable bar | Low discovery |
| **4. No guidance** | Editor | User doesn't know what to do first | Lost feeling |
| **5. Back goes to Upload** | Editor back button | Why go back to Upload? User already has a resume | Illogical |
| **6. No resume list** | Entire app | Can't see saved resumes, can't manage multiple | Missing feature |
| **7. Auth feels disconnected** | Auth page | "Sign In" on home goes to standalone page | Jarring |
| **8. No onboarding** | First launch | No tutorial or guidance for new users | High abandonment |

---

## Proposed New Flow

### Core Philosophy
- **Goal-oriented**: Focus on what the user wants to achieve (get a job)
- **Guided experience**: Step-by-step with clear next actions
- **AI-first**: Put AI features front and center
- **Progressive disclosure**: Simple at first, reveal complexity when needed

### New Flow Structure
```
Splash → Home (Dashboard) → Quick Actions OR Full Editor → Preview/Export
                ↓
         Resume List (if signed in)
```

---

## New Page Structure

### 1. Home Page (Dashboard)
Instead of a marketing landing page, make it an action-oriented dashboard:

**For New Users (No Resume):**
- Large hero: "Create Your First Resume"
- Two clear paths:
  - "Upload Existing PDF" (icon + description)
  - "Start from Scratch" (icon + description)
- Feature highlights below (condensed carousel)

**For Returning Users (Has Resume in Storage):**
- Quick resume card showing last edited resume with name/date
- Primary action: "Continue Editing"
- Secondary: "Create New Resume"
- AI Actions prominently displayed:
  - "Tailor for a Job" (large card)
  - "Analyze Match Score" (large card)

### 2. Quick Start Flow (New)
A guided 3-step wizard for first-time users:

**Step 1: Input**
- Choose: Upload PDF OR Start Blank
- Clean, focused UI with one action

**Step 2: Quick Edit**
- Show only essential info (Contact + Summary)
- "Review & Continue" button
- Skip detailed editing for later

**Step 3: AI Power**
- Introduce AI features
- "Add a job description to unlock AI tailoring"
- Optional: Skip to preview

### 3. Editor Page (Redesigned)
**Key Changes:**
- **Floating AI Button**: Persistent FAB (Floating Action Button) for AI features
- **Smart Tabs**: Show completion status on each tab (checkmark)
- **Contextual Tips**: Inline hints for each section
- **Progress Indicator**: Show resume completeness at top
- **Back → Home**: Navigate to dashboard, not upload

**New Layout:**
```
┌─────────────────────────────┐
│ ← Home    Resume Score: 78% │
├─────────────────────────────┤
│ [Contact ✓] [Summary] [Work]│
│ [Education] [Skills ✓]      │
├─────────────────────────────┤
│                             │
│     Section Content         │
│                             │
├─────────────────────────────┤
│         [Preview]           │
└─────────────────────────────┘
         [🤖 AI]  ← FAB
```

### 4. AI Hub (New Bottom Sheet)
Consolidate all AI features in one accessible place:

**Triggered by FAB, shows:**
- Match Score (if job description exists)
- Quick Actions:
  - "Tailor for Job"
  - "Improve Current Section"
  - "Full Analysis"
- Recent job descriptions saved

### 5. Preview Page (Enhanced)
**Changes:**
- Template switcher visible at top (swipeable)
- Download AND share buttons equal prominence
- "Edit Section" quick links overlaid on preview
- Success celebration animation on first export

---

## Implementation Details

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Index.tsx` | Modify | Transform into action dashboard |
| `src/pages/UploadPage.tsx` | Modify | Simplify to focused upload-only |
| `src/pages/EditorPage.tsx` | Modify | Add AI FAB, progress bar, fix navigation |
| `src/pages/PreviewPage.tsx` | Modify | Add template quick-switch |
| `src/components/editor/AIFloatingButton.tsx` | Create | Persistent AI access button |
| `src/components/editor/AIHubSheet.tsx` | Create | Unified AI features sheet |
| `src/components/editor/ProgressBar.tsx` | Create | Resume completeness indicator |
| `src/components/home/ResumeCard.tsx` | Create | Quick resume preview card |
| `src/components/home/ActionCard.tsx` | Create | Large action cards for dashboard |

---

### Home Page Dashboard Implementation

**New Home Structure:**
```tsx
// Conditional rendering based on state
{hasExistingResume ? (
  <>
    <ResumeCard resume={currentResume} />
    <AIActionCards />
    <Button>Create New Resume</Button>
  </>
) : (
  <>
    <WelcomeHero />
    <ChoiceCards uploadOrBlank />
    <FeatureCarousel />
  </>
)}
```

**Resume Card Component:**
- Shows: Name, last edited date, match score (if exists)
- Tap to continue editing
- Swipe for delete option

**AI Action Cards:**
```tsx
<div className="grid grid-cols-2 gap-4">
  <ActionCard
    icon={<Target />}
    title="Tailor Resume"
    description="Customize for a specific job"
    onClick={openTailor}
  />
  <ActionCard
    icon={<Sparkles />}
    title="Score Match"
    description="Analyze job compatibility"
    onClick={openAnalysis}
  />
</div>
```

---

### Editor Improvements

**AI Floating Action Button:**
```tsx
<motion.button
  className="fixed bottom-24 right-4 w-14 h-14 rounded-full gradient-primary shadow-lg"
  whileTap={{ scale: 0.9 }}
  onClick={() => setShowAIHub(true)}
>
  <Sparkles className="w-6 h-6" />
</motion.button>
```

**Progress Bar Component:**
```tsx
function ProgressBar({ resume }) {
  const sections = [
    { name: 'contact', complete: !!resume.contactInfo.fullName },
    { name: 'summary', complete: resume.summary.length > 50 },
    { name: 'experience', complete: resume.experience.length > 0 },
    { name: 'education', complete: resume.education.length > 0 },
    { name: 'skills', complete: resume.skills.length > 0 },
  ];
  
  const progress = sections.filter(s => s.complete).length / sections.length * 100;
  
  return (
    <div className="flex items-center gap-3">
      <Progress value={progress} className="flex-1" />
      <span className="text-sm font-medium">{Math.round(progress)}%</span>
    </div>
  );
}
```

**Fixed Navigation:**
- Back button goes to "/" (Home) not "/upload"
- "Preview & Export" stays as primary CTA

---

### AI Hub Sheet

**Unified access point for all AI features:**

```tsx
<Sheet open={showAIHub} onOpenChange={setShowAIHub}>
  <SheetContent side="bottom" className="h-[60vh]">
    <SheetHeader>
      <SheetTitle>AI Assistant</SheetTitle>
    </SheetHeader>
    
    {/* Match Score Display (if available) */}
    {matchScore && <ScoreDisplay score={matchScore} />}
    
    {/* Quick Actions Grid */}
    <div className="grid grid-cols-2 gap-3 mt-4">
      <AIActionTile 
        icon={<Wand2 />}
        title="Tailor Resume"
        onClick={() => { setShowAIHub(false); setShowTailor(true); }}
      />
      <AIActionTile
        icon={<Target />}
        title="Analyze Match"
        onClick={() => { setShowAIHub(false); setShowJobSheet(true); }}
      />
      <AIActionTile
        icon={<Sparkles />}
        title="Improve Section"
        subtitle={`Current: ${activeTab}`}
        onClick={improveCurrentSection}
      />
      <AIActionTile
        icon={<FileText />}
        title="Change Template"
        onClick={() => { setShowAIHub(false); setShowTemplates(true); }}
      />
    </div>
    
    {/* Recent Job Descriptions */}
    {jobDescription && (
      <div className="mt-4 p-3 rounded-xl bg-muted">
        <p className="text-xs text-muted-foreground">Target Job</p>
        <p className="text-sm truncate">{jobDescription.slice(0, 100)}...</p>
      </div>
    )}
  </SheetContent>
</Sheet>
```

---

### Preview Quick Template Switch

**Horizontal swipeable template selector:**
```tsx
<div className="flex gap-3 overflow-x-auto px-4 py-3 snap-x snap-mandatory">
  {templates.map(template => (
    <button
      key={template.id}
      className={`flex-shrink-0 w-16 h-20 rounded-lg border-2 snap-center ${
        selectedTemplate === template.id ? 'border-primary' : 'border-transparent'
      }`}
      onClick={() => setSelectedTemplate(template.id)}
    >
      <TemplateMiniThumbnail templateId={template.id} />
    </button>
  ))}
</div>
```

---

## Animation & Polish

**Page Transitions:**
- Slide left/right for forward/back navigation
- Fade for modal opens
- Scale for FAB press

**Micro-interactions:**
- Tab completion checkmarks animate in
- Progress bar smoothly updates
- AI button pulses gently to draw attention

**Haptic Hints (Capacitor):**
- Light tap on button press
- Success vibration on export complete
- Error shake on validation failure

---

## Summary of Changes

1. **Home becomes a dashboard** - Shows current resume and quick AI actions, not just marketing
2. **AI features are prominent** - Floating button always visible in editor
3. **Progress tracking** - Visual indicator of resume completeness
4. **Logical navigation** - Back goes home, not to upload
5. **Unified AI hub** - All AI features accessible from one place
6. **Template quick-switch** - Fast template browsing in preview
7. **Goal-oriented design** - Every screen has a clear purpose and next action

