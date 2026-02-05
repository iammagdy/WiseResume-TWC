
# Pre-fill Resume Contact Info from Profile

## Overview
When users create a new blank resume, their profile data (name, location, LinkedIn URL) will be automatically pre-filled into the resume's contact information section. This saves time and ensures consistency across resumes.

## Field Mapping

| Profile Field | Resume Contact Field |
|--------------|---------------------|
| `fullName` | `fullName` |
| `location` | `location` |
| `linkedinUrl` | `linkedin` |

Note: Email and phone are not stored in the profile, so these will remain empty for the user to fill in manually.

## Implementation Steps

### Step 1: Update CreateResumeDialog Component
Modify `src/components/dashboard/CreateResumeDialog.tsx` to:
1. Import the `useProfile` hook
2. Fetch the user's profile when the dialog opens
3. Pre-fill contact info when creating a blank resume

### Step 2: Update the handleStartBlank Function
When a user creates a blank resume, populate the `contactInfo` object with profile data:

```typescript
const handleStartBlank = async () => {
  if (!title.trim()) return;
  
  setIsCreating(true);
  try {
    const newResume = await createResume.mutateAsync({
      resume: {
        contactInfo: { 
          fullName: profile?.fullName || '', 
          email: '', 
          phone: '', 
          location: profile?.location || '',
          linkedin: profile?.linkedinUrl || '',
        },
        // ... rest of resume data
      },
      title: title.trim(),
    });
    // ... rest of handler
  }
};
```

## User Experience Flow

```text
User clicks "Create New Resume"
         |
         v
  Selects "Start from Scratch"
         |
         v
    Enters resume title
         |
         v
   Clicks "Create" button
         |
         v
+----------------------------------+
|  Resume created with pre-filled  |
|  contact info from profile:      |
|  - Full Name                     |
|  - Location                      |
|  - LinkedIn URL                  |
+----------------------------------+
         |
         v
  Opens Editor Page with 
  Contact Section partially filled
```

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/CreateResumeDialog.tsx` | Import `useProfile`, fetch profile, pre-fill contact info |

### Code Changes

The dialog component will:
1. Call `useProfile(user?.id)` to get the current user's profile
2. Use profile data in the `handleStartBlank` function
3. Only use profile values if they exist (fallback to empty strings)

### Edge Cases Handled
- **Profile not loaded yet**: Use empty strings as fallback
- **Profile fields are null**: Use empty strings as fallback
- **User not authenticated**: No pre-fill (existing behavior)
- **Duplicate resume**: Uses source resume data (no change needed)
- **Tailored version**: Uses parent resume data (no change needed)

## Benefits

1. **Time Saving** - Users don't need to re-enter basic info for each resume
2. **Consistency** - Same name and contact details across all resumes
3. **Profile Value** - Encourages users to complete their profile
4. **Seamless UX** - Works automatically without any extra user action
