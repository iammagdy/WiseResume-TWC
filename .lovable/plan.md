

# Profile Customization Options - Implementation Plan

## Overview
This plan adds enhanced profile customization options for users after they sign in, building on the existing `EditProfileSheet` component and `profiles` table. The improvements will provide a richer personalization experience while maintaining the mobile-first design.

## Current State Analysis

The app currently has:
- Basic profile editing via `EditProfileSheet` (display name + avatar URL)
- Profile data stored in Supabase `profiles` table with `full_name` and `avatar_url` columns
- Settings page with profile section at the top
- Onboarding carousel shown for new users

## Proposed Enhancements

### 1. Expand Profile Fields
Add new profile data points that are meaningful for a resume-building app:
- **Job Title / Current Role** - For dashboard greeting personalization
- **Industry** - To improve AI tailoring suggestions  
- **Career Level** (Entry/Mid/Senior/Executive) - For template recommendations
- **Location** - For job search optimization
- **LinkedIn URL** - Quick access for resume building

### 2. Enhanced Edit Profile Sheet
Transform the basic edit sheet into a comprehensive profile customization experience:
- Add new input fields for expanded profile data
- Include profile completion indicator
- Better visual hierarchy with sections
- Avatar upload via file picker (not just URL)

### 3. Post-Sign-In Profile Setup (Optional)
For new users, after completing onboarding, prompt them to complete their profile with key information.

---

## Implementation Steps

### Step 1: Database Migration
Add new columns to the `profiles` table:

```sql
ALTER TABLE public.profiles 
ADD COLUMN job_title text,
ADD COLUMN industry text,
ADD COLUMN career_level text,
ADD COLUMN location text,
ADD COLUMN linkedin_url text,
ADD COLUMN profile_completed boolean DEFAULT false;
```

### Step 2: Update useProfile Hook
Extend `src/hooks/useProfile.ts` to include the new fields:
- Add new fields to Profile interface
- Update fetch query to select new columns
- Update `updateProfile` function to handle new fields

### Step 3: Enhance EditProfileSheet Component
Redesign `src/components/settings/EditProfileSheet.tsx`:
- Add sections: "Basic Info" and "Professional Details"
- Include inputs for job title, industry (with select), career level (segmented control), location, and LinkedIn
- Add profile completion progress bar
- Improve avatar section with file upload via Supabase Storage

### Step 4: Create Storage Bucket for Avatars
Set up Supabase Storage to handle avatar uploads:
- Create "avatars" bucket
- Add RLS policies for authenticated users
- Implement upload handler in profile sheet

### Step 5: Update Settings Page
Modify `src/pages/SettingsPage.tsx`:
- Display job title under name in profile section
- Show profile completion percentage
- Add "Complete Profile" call-to-action if incomplete

### Step 6: Create Profile Setup Modal (Optional)
Add `src/components/settings/ProfileSetupSheet.tsx`:
- Shown after onboarding for new users
- Guides users through completing their profile
- Can be skipped and accessed later from settings

---

## Technical Details

### Profile Interface (Extended)
```typescript
interface Profile {
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  industry: string | null;
  careerLevel: 'entry' | 'mid' | 'senior' | 'executive' | null;
  location: string | null;
  linkedinUrl: string | null;
  profileCompleted: boolean;
}
```

### Industry Options
Predefined list: Technology, Finance, Healthcare, Education, Marketing, Engineering, Design, Sales, Legal, Consulting, Other

### Career Level Options
- Entry Level (0-2 years)
- Mid Level (3-5 years)  
- Senior Level (6-10 years)
- Executive (10+ years)

### Storage Bucket Configuration
```sql
-- Create avatars bucket (via Supabase dashboard or migration)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- RLS policy for uploads
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policy for reading
CREATE POLICY "Public avatar access"  
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Database | Add migration for new profile columns |
| Database | Create avatars storage bucket |
| `src/hooks/useProfile.ts` | Add new profile fields |
| `src/components/settings/EditProfileSheet.tsx` | Complete redesign with new fields |
| `src/pages/SettingsPage.tsx` | Update profile section display |
| `src/components/settings/ProfileSetupSheet.tsx` | New component for post-signup setup |
| `src/pages/DashboardPage.tsx` | Optional: Show profile completion prompt |

---

## User Flow

```text
Sign Up / Sign In
      |
      v
[New User?] --Yes--> Onboarding Carousel
      |                      |
      No                     v
      |              Complete Onboarding
      |                      |
      v                      v
  Dashboard <---- Profile Setup Prompt (Optional)
      |                      |
      v                      |
Settings > Edit Profile <----+
```

---

## Benefits

1. **Personalized Experience** - Dashboard greetings, AI suggestions tailored to industry/level
2. **Better Resume Building** - Pre-fill resume contact info from profile
3. **Template Recommendations** - Suggest appropriate templates based on career level
4. **Profile Completion Gamification** - Progress indicator encourages full setup
5. **Professional Avatar Management** - Easy upload instead of URL pasting

