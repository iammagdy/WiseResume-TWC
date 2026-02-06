
# Add Photo Support to Templates with Smart Prompts

## Overview

When using templates that have a photo/avatar area (like Creative), the app will detect this and prompt the user to either:
1. Use their profile photo from Settings
2. Upload a new photo
3. Keep the initials placeholder

## Current State Analysis

### Templates with Photo Placeholders
- **Creative**: Has a circular area showing initials (line 21-23) - perfect for photo
- **Professional**: Could support a photo in the header area

### Templates without Photo Areas
- Modern, Minimal, Classic, Developer, Executive - text-only layouts

### Data Structure
- `ContactInfo` type in `src/types/resume.ts` doesn't have a photo field
- User's profile has `avatarUrl` in the profiles table
- Need to add `photoUrl` to resume data

---

## Implementation Plan

### Step 1: Extend Resume Data Types
**File:** `src/types/resume.ts`

Add `photoUrl` field to `ContactInfo`:
```typescript
export interface ContactInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
  photoUrl?: string;  // NEW: Optional photo for templates that support it
}
```

### Step 2: Define Template Photo Support
**File:** `src/lib/templateConfig.ts`

Add `supportsPhoto` property to template configs:
```typescript
export interface TemplateConfig {
  // ... existing fields ...
  supportsPhoto: boolean;
}
```

Templates that support photos:
- Creative: `supportsPhoto: true`
- All others: `supportsPhoto: false`

### Step 3: Create Photo Prompt Sheet Component
**File:** `src/components/editor/ResumePhotoSheet.tsx`

A bottom sheet that appears when:
- User switches to a photo-supporting template
- Resume has no photo set

UI Design:
```
+------------------------------------------+
|         Add Photo to Resume              |
|------------------------------------------|
|                                          |
|  This template supports a profile photo  |
|  to make your resume stand out!          |
|                                          |
|  +--------+  +--------+  +--------+      |
|  |  Use   |  | Upload |  |  Keep  |      |
|  |Profile |  |  New   |  |Initials|      |
|  | Photo  |  | Photo  |  |        |      |
|  +--------+  +--------+  +--------+      |
|                                          |
|  [ ] Don't ask again for this resume     |
+------------------------------------------+
```

Features:
- "Use Profile Photo" - Uses `profile.avatarUrl` from Settings
- "Upload New Photo" - Opens file picker → AvatarCropSheet → AI headshot option
- "Keep Initials" - Dismisses without adding photo
- Checkbox to suppress future prompts for this resume

### Step 4: Update Creative Template to Display Photo
**File:** `src/components/templates/CreativeTemplate.tsx`

Modify the avatar area to show photo when available:
```typescript
{resume.contactInfo.photoUrl ? (
  <img 
    src={resume.contactInfo.photoUrl} 
    alt={resume.contactInfo.fullName}
    className="w-16 h-16 rounded-full object-cover"
  />
) : (
  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
    <span className="text-2xl font-bold">{initials}</span>
  </div>
)}
```

### Step 5: Integrate Photo Prompt in Preview Page
**File:** `src/pages/PreviewPage.tsx`

Add logic to show the photo prompt sheet:
```typescript
const [showPhotoSheet, setShowPhotoSheet] = useState(false);

// Check if template supports photos and resume has no photo
useEffect(() => {
  const config = getTemplateConfig(selectedTemplate);
  if (config.supportsPhoto && !currentResume?.contactInfo.photoUrl) {
    // Check if user has dismissed this before
    const dismissed = localStorage.getItem(`photo-prompt-${currentResume?.id}`);
    if (!dismissed) {
      setShowPhotoSheet(true);
    }
  }
}, [selectedTemplate, currentResume]);
```

### Step 6: Add Photo Field to Contact Section (Optional Edit)
**File:** `src/components/editor/ContactSection.tsx`

Add an optional photo upload button at the top of the contact section for templates that support it:
```
+------------------------------------------+
|  [Photo placeholder with upload button]  |
|  "Add a photo for Creative template"     |
|------------------------------------------|
|  Full Name: [__________]                 |
|  Email: [__________]                     |
|  ...                                     |
+------------------------------------------+
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types/resume.ts` | Modify | Add `photoUrl` to ContactInfo |
| `src/lib/templateConfig.ts` | Modify | Add `supportsPhoto` to TemplateConfig |
| `src/components/editor/ResumePhotoSheet.tsx` | Create | Photo prompt dialog |
| `src/components/templates/CreativeTemplate.tsx` | Modify | Display photo when available |
| `src/pages/PreviewPage.tsx` | Modify | Show photo prompt for photo templates |
| `src/hooks/useProfile.ts` | Read only | Get profile photo URL |
| `src/store/resumeStore.ts` | Already supports | Uses updateResume for contactInfo |

---

## User Flow

```
User switches to Creative template
              ↓
App detects: Creative supports photos
              ↓
Resume has no photo? → Show ResumePhotoSheet
              ↓
     +--------+--------+--------+
     ↓        ↓        ↓
Use Profile  Upload   Keep
   Photo      New    Initials
     ↓        ↓        ↓
Save to    Open Crop  Close
resume     Sheet      Sheet
     ↓        ↓        
Photo shows on template
```

---

## Technical Details

### Getting Profile Photo
```typescript
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

const { user } = useAuth();
const { profile } = useProfile(user?.id, user);

// Use profile.avatarUrl if available
```

### Saving Photo to Resume
```typescript
const { updateResume } = useResumeStore();

const handleUseProfilePhoto = () => {
  if (profile?.avatarUrl) {
    updateResume({
      contactInfo: {
        ...currentResume.contactInfo,
        photoUrl: profile.avatarUrl,
      }
    });
    setShowPhotoSheet(false);
  }
};
```

### Dismissing for This Resume
```typescript
const handleKeepInitials = (dontAskAgain: boolean) => {
  if (dontAskAgain && currentResume?.id) {
    localStorage.setItem(`photo-prompt-${currentResume.id}`, 'true');
  }
  setShowPhotoSheet(false);
};
```

---

## Expected Results

1. When user selects Creative template, they're prompted to add a photo
2. User can easily use their profile photo from Settings
3. User can upload a new photo with cropping and AI enhancement
4. User can dismiss the prompt and keep initials
5. The photo displays correctly on the Creative template
6. The photo is included in the exported PDF
