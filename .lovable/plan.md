

# Enhanced Settings Page - Comprehensive Options

## Overview

Add powerful new settings sections to give users full control over their data, notifications, privacy, and editor preferences. This transforms the Settings page into a comprehensive control center that respects user autonomy while enhancing the app experience.

---

## New Features Summary

Based on your preferences, we'll implement:

| Category | Features |
|----------|----------|
| **Data Export** | Export all resumes as JSON, export individual resume as JSON |
| **Notifications** | AI enhancement tips toggle, auto-save notification toggle |
| **Privacy** | Delete all data, analytics opt-out, local-only mode |
| **Editor Preferences** | Default template picker, PDF export defaults |

---

## User Experience

### Settings Page Layout (Updated)

```text
┌──────────────────────────────────────────┐
│         Settings                         │
├──────────────────────────────────────────┤
│  [Avatar]  John Doe                   >  │
│            john@email.com                │
├──────────────────────────────────────────┤
│  APPEARANCE                              │
│  [Light] [Dark] [System]                 │
├──────────────────────────────────────────┤
│  EDITOR PREFERENCES               [NEW]  │
│  > Default Template           Modern  >  │
│  > PDF Export Settings               >   │
├──────────────────────────────────────────┤
│  NOTIFICATIONS                    [NEW]  │
│  Auto-save toasts           [Switch]     │
│  AI enhancement tips        [Switch]     │
├──────────────────────────────────────────┤
│  DATA & EXPORT                    [NEW]  │
│  > Export All Resumes                >   │
│  > Export Current Resume             >   │
├──────────────────────────────────────────┤
│  PRIVACY                          [NEW]  │
│  Local-only mode            [Switch]     │
│  Analytics                  [Switch]     │
├──────────────────────────────────────────┤
│  ACCOUNT                                 │
│  > Reset Onboarding                      │
│  > Delete All Data          [Red]        │
│  > Sign Out                 [Red]        │
├──────────────────────────────────────────┤
│  ABOUT                                   │
│  WiseResume v1.0.0                       │
└──────────────────────────────────────────┘
│  [Home] [Editor] [New] [Settings]        │
└──────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Create Settings Store

A new Zustand store to persist user preferences locally:

**File: `src/store/settingsStore.ts`**

```typescript
interface SettingsState {
  // Notifications
  showAutoSaveToasts: boolean;
  showAIEnhancementTips: boolean;
  
  // Privacy
  localOnlyMode: boolean;
  analyticsEnabled: boolean;
  
  // Editor Preferences
  defaultTemplate: TemplateId;
  pdfDefaults: {
    showPageNumbers: boolean;
    pageNumberFormat: 'simple' | 'full';
    showBranding: boolean;
  };
  
  // Actions
  setShowAutoSaveToasts: (value: boolean) => void;
  setShowAIEnhancementTips: (value: boolean) => void;
  setLocalOnlyMode: (value: boolean) => void;
  setAnalyticsEnabled: (value: boolean) => void;
  setDefaultTemplate: (template: TemplateId) => void;
  setPdfDefaults: (defaults: Partial<PDFOptions>) => void;
}
```

Uses `persist` middleware for localStorage persistence.

---

### 2. Editor Preferences Section

#### Default Template Picker

A bottom sheet showing all 7 templates with thumbnails:
- Uses existing `TemplateThumbnail` component
- Horizontal scroll or 2-column grid
- Checkmark on selected template
- Selection persisted to settings store

**Component: `src/components/settings/DefaultTemplateSheet.tsx`**

```text
┌──────────────────────────────────────────┐
│            ━━━━                          │
│  Select Default Template                 │
│                                          │
│  ┌────────┐  ┌────────┐  ┌────────┐     │
│  │ Modern │  │ Classic│  │Minimal │     │
│  │   ✓    │  │        │  │        │     │
│  └────────┘  └────────┘  └────────┘     │
│                                          │
│  ┌────────┐  ┌────────┐  ┌────────┐     │
│  │  Prof  │  │  Dev   │  │Creative│     │
│  │        │  │        │  │        │     │
│  └────────┘  └────────┘  └────────┘     │
│                                          │
│  ┌────────┐                              │
│  │  Exec  │                              │
│  │        │                              │
│  └────────┘                              │
└──────────────────────────────────────────┘
```

#### PDF Export Defaults

A bottom sheet with toggle switches for default PDF options:

**Component: `src/components/settings/PDFDefaultsSheet.tsx`**

```text
┌──────────────────────────────────────────┐
│            ━━━━                          │
│  PDF Export Defaults                     │
│                                          │
│  Show page numbers          [Switch]     │
│                                          │
│  Page number format                      │
│  [Simple (1)]  [Full (Page 1 of 3)]      │
│                                          │
│  Show WiseResume branding   [Switch]     │
│                                          │
│  These settings will apply to all new    │
│  PDF exports by default.                 │
│                                          │
│          ┌──────────────────┐            │
│          │       Done       │            │
│          └──────────────────┘            │
└──────────────────────────────────────────┘
```

---

### 3. Notifications Section

Simple toggle switches with immediate effect:

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-save toasts | Show "Changes saved" notifications | ON |
| AI enhancement tips | Proactive suggestions for resume improvement | ON |

Implementation:
- Modify `useResumes.ts` to check `showAutoSaveToasts` before showing save confirmation
- Create hook `useAITips` that periodically checks resume quality and shows contextual tips when enabled

---

### 4. Data Export Section

#### Export All Resumes

Button that:
1. Fetches all user's resumes from database
2. Formats as JSON with metadata
3. Triggers download as `wiseresume-backup-{date}.json`
4. Includes contact info, all resume versions, and settings

**Export Format:**
```json
{
  "exportVersion": "1.0",
  "exportDate": "2026-02-04T10:30:00Z",
  "profile": {
    "fullName": "John Doe",
    "email": "john@example.com"
  },
  "resumes": [
    {
      "id": "uuid",
      "title": "Software Engineer Resume",
      "contactInfo": {...},
      "summary": "...",
      "experience": [...],
      "education": [...],
      "skills": [...],
      "certifications": [...],
      "templateId": "modern",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "settings": {
    "defaultTemplate": "modern",
    "pdfDefaults": {...}
  }
}
```

#### Export Current Resume

- Available when a resume is loaded in the editor
- Quick JSON download of single resume
- Useful for sharing resume data or manual backup

**Component: `src/components/settings/DataExportSheet.tsx`**

---

### 5. Privacy Section

#### Local-Only Mode

When enabled:
- Resume changes saved to localStorage only
- No sync to cloud database
- Warning banner shows "Local mode - not synced"
- Useful for sensitive resumes users don't want in cloud

**Implementation:**
- Check `localOnlyMode` in `useResumes` mutations
- If true, save to Zustand store (localStorage) instead of Supabase
- Show indicator in dashboard header

#### Analytics Opt-Out

- Toggle to disable any future analytics
- Respects user privacy preferences
- Persisted locally

#### Delete All Data

Destructive action with confirmation:
1. User taps "Delete All Data"
2. Confirmation dialog with warning
3. Type "DELETE" to confirm
4. Removes:
   - All resumes from database
   - Profile data
   - Local storage
   - Signs user out

**Component: `src/components/settings/DeleteDataDialog.tsx`**

```text
┌──────────────────────────────────────────┐
│  Delete All Data                         │
│                                          │
│  ⚠️ This will permanently delete:        │
│                                          │
│  • All your resumes (5 resumes)          │
│  • Your profile information              │
│  • All local data and preferences        │
│                                          │
│  This action cannot be undone.           │
│                                          │
│  Type DELETE to confirm:                 │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─────────────┐  ┌─────────────────────┐│
│  │   Cancel    │  │   Delete Forever    ││
│  └─────────────┘  └─────────────────────┘│
└──────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/store/settingsStore.ts` | Zustand store for all user preferences |
| `src/components/settings/DefaultTemplateSheet.tsx` | Template picker bottom sheet |
| `src/components/settings/PDFDefaultsSheet.tsx` | PDF options bottom sheet |
| `src/components/settings/DataExportSheet.tsx` | Export options bottom sheet |
| `src/components/settings/DeleteDataDialog.tsx` | Confirmation dialog for data deletion |
| `src/components/settings/SettingsRow.tsx` | Reusable row component for settings items |
| `src/lib/dataExport.ts` | Utility functions for JSON export |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/SettingsPage.tsx` | Add all new sections and integrate sheets |
| `src/hooks/useResumes.ts` | Check `showAutoSaveToasts` before showing notifications |
| `src/pages/EditorPage.tsx` | Use `defaultTemplate` from settings for new resumes |
| `src/components/editor/ExportOptionsSheet.tsx` | Pre-fill with `pdfDefaults` from settings |

---

## Technical Considerations

### Mobile-Optimized Interactions

- All new settings use bottom sheets for editing (consistent with existing patterns)
- Toggle switches for binary options (no modals needed)
- Large touch targets (min 44px)
- Haptic feedback on all interactions
- Staggered entrance animations for visual polish

### Data Safety

- Export includes full backup capability
- Delete confirmation requires typing "DELETE"
- Local-only mode clearly indicated
- No data loss without explicit user action

### Performance

- Settings store uses localStorage (instant access)
- Lazy-load export functionality (not needed on initial load)
- No database reads for displaying settings (all local)

---

## Settings Store Integration

The new settings will be used throughout the app:

```typescript
// In any component
import { useSettingsStore } from '@/store/settingsStore';

const { 
  showAutoSaveToasts, 
  defaultTemplate,
  pdfDefaults 
} = useSettingsStore();

// Check before showing toast
if (showAutoSaveToasts) {
  toast.success('Changes saved');
}

// Use default template for new resumes
const newResume = { ...defaultResume, templateId: defaultTemplate };

// Pre-fill PDF export options
generatePDF(resume, templateId, element, breaks, pdfDefaults);
```

---

## Migration & Defaults

For existing users:
- All notification settings default to ON (current behavior)
- Analytics defaults to ON
- Local-only mode defaults to OFF
- Default template defaults to 'modern'
- PDF defaults: page numbers ON, full format, branding ON

No database migration needed - all settings are stored in localStorage via Zustand persist middleware.

