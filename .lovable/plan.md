
# Fix: "Launch Your Resume" Navigation Loop

## Problem Identified

When clicking "Launch Your Resume", the app enters an infinite loop:

1. User clicks button → navigates to `/editor`
2. `EditorPage` checks `if (!currentResume)` → redirects to `/`
3. User lands on Index → clicks button again → loop repeats

The issue is that **no new resume is created** before navigating to the editor.

## Root Cause

In `src/components/landing/HeroSection.tsx`:
```typescript
const handleLaunch = () => {
  triggerHaptic.medium();
  navigate('/editor');  // ← No resume created!
};
```

In `src/pages/EditorPage.tsx`:
```typescript
if (!currentResume) {
  navigate('/');  // ← Redirects back to landing
  return null;
}
```

## Solution

Modify `handleLaunch` in `HeroSection.tsx` to create a new blank resume before navigating to the editor.

## Implementation

### File: `src/components/landing/HeroSection.tsx`

**Changes:**
1. Import `useResumeStore` from the store
2. Update `handleLaunch` to:
   - Create a new blank resume using `setCurrentResume`
   - Clear any existing resume ID (new resume, not saved yet)
   - Then navigate to `/editor`

**Updated code:**
```typescript
import { useResumeStore } from '@/store/resumeStore';

export function HeroSection() {
  const navigate = useNavigate();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();

  const handleLaunch = () => {
    triggerHaptic.medium();
    // Create a new blank resume before navigating
    setCurrentResume({
      contactInfo: {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        portfolio: '',
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      templateId: 'modern',
    });
    setCurrentResumeId(null); // New resume, not saved to cloud yet
    navigate('/editor');
  };
  // ... rest unchanged
}
```

## Technical Details

| Aspect | Detail |
|--------|--------|
| Files changed | 1 (`src/components/landing/HeroSection.tsx`) |
| Risk level | Low - simple state initialization |
| Testing | Click "Launch Your Resume" → should open editor with blank form |
