

## Performance Optimization -- Faster Screen Loading

### Root Causes Identified

1. **EditorPage eagerly imports all section components** (Contact, Summary, Experience, Education, Skills, Awards, Projects, etc.) even though only ONE tab is visible at a time. This forces the browser to download and parse all section code upfront.

2. **Heavy hooks run before resume data is ready** -- `useProofread`, `useUndoRedo`, and `useOfflineSync` all execute on every render even during the loading/guard phase, wasting CPU cycles.

3. **DashboardPage eagerly imports several sheet/dialog components** (`LinkedInImportSheet`, `AnalyzeJobSheet`, `AlertDialog` pieces) that are only needed on user interaction.

4. **EditorPage has 15+ lazy-loaded sheet components** that each create a separate chunk. While individually lazy, the sheer number of `lazy()` calls adds overhead to module resolution.

### Optimization Plan

**1. Lazy-load section components in EditorPage** (Biggest impact)

Convert the 8+ section components (ContactSection, SummarySection, ExperienceSection, EducationSection, SkillsSection, AwardsSection, ProjectsSection, PublicationsSection, VolunteeringSection, HobbiesSection, ReferencesSection, CertificationsSection, LanguagesSection) from eager imports to lazy imports. Since only one tab renders at a time, the user only pays for the active section.

```text
Before: import { ContactSection } from './ContactSection';
After:  const ContactSection = lazy(() => import('./ContactSection').then(m => ({ default: m.ContactSection })));
```

Each section in `renderEditorContent()` will be wrapped in a `<Suspense fallback={<SectionSkeleton />}>` with a lightweight skeleton placeholder.

**2. Defer heavy hooks until resume is loaded**

Move `useProofread`, `useUndoRedo`, and `useOfflineSync` calls below the guard checks by extracting the post-guard editor UI into a separate `EditorContent` component. This prevents these hooks from running during auth checks and loading states.

```text
EditorPage (guards only)
  |-- EditorContent (all hooks + UI, only mounts when resume is ready)
```

**3. Lazy-load DashboardPage dialog imports**

Convert `LinkedInImportSheet` and `AnalyzeJobSheet` from eager imports to lazy, matching the existing pattern used for `CreateResumeDialog`.

**4. Group related lazy sheet imports in EditorPage**

Consolidate the 15 individual `lazy()` sheet imports into 2-3 logical groups using a barrel file pattern, reducing module resolution overhead:
- AI sheets group (RecruiterSim, AIDetector, LinkedIn, OnePage)
- Content sheets group (ContentLibrary, VersionHistory, CareerPath)
- Editor sheets group (Tailor, JobAnalysis, Templates, Customize, Proofread)

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Lazy-load section components, extract `EditorContent` component, group sheet imports |
| `src/pages/DashboardPage.tsx` | Lazy-load `LinkedInImportSheet` and `AnalyzeJobSheet` |
| `src/components/layout/PageSkeletons.tsx` | Add a lightweight `SectionSkeleton` component for section tab fallbacks |

### Expected Impact

- **Editor initial load**: ~40% faster (sections load on-demand instead of all at once)
- **Dashboard initial load**: ~15% faster (fewer eager imports)
- **Memory usage**: Lower baseline since only active section code is in memory
- **Perceived speed**: Immediate skeleton feedback while sections load

