

## Fix: Template Not Syncing to Actual Resume Template

### Problem

When a resume is loaded in the editor, the `selectedTemplate` in the Zustand store is never updated from the database resume's actual `template_id`. The editor hydration (line 130-131 of `EditorPage.tsx`) sets `currentResume` but does not call `setSelectedTemplate()`. As a result:

- The live preview always renders with the stale/default template (`modern`)
- The template badge on the Resume Detail page shows the correct DB value, but the editor preview shows the wrong template
- If the user never manually picks a template, the auto-save writes `templateId: 'modern'` back to the DB, overwriting whatever template was previously set

### Fix

**File: `src/pages/EditorPage.tsx`** (1 change)

In the hydration `useEffect` (around line 130), after setting `currentResume`, also sync `selectedTemplate` from the DB resume's `template_id`:

```typescript
if (!currentResume) {
  useResumeStore.getState().setCurrentResume(dbToResumeData(resumeFromDb));
  useResumeStore.getState().setSelectedTemplate(
    (resumeFromDb.template_id || 'modern') as TemplateId
  );
}
```

This ensures the live preview, template selector, and PDF export all use the correct template from the database -- not a stale default.

### Summary

| Item | Detail |
|------|--------|
| Root cause | Editor hydration sets `currentResume` but not `selectedTemplate` |
| Effect | Live preview and exports always use stale/default "Modern" template |
| Fix | Sync `selectedTemplate` from DB during hydration |
| Files changed | `EditorPage.tsx` (1 line added) |
| Risk | None -- additive change, no existing behavior altered |

