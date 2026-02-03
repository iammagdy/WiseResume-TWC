
# Multi-Resume Dashboard Implementation Plan

## Overview

Transform WiseResume from a single-resume local-storage app into a cloud-synced multi-resume management platform where users can:
- Save unlimited resumes to their account
- Give each resume a custom name/title
- Tag resumes for specific job applications
- Track job match scores per resume
- Quick-duplicate and version resumes

---

## Database Schema

### Tables to Create

**1. profiles** - User profile data
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**2. resumes** - Store resume data
```sql
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Resume',
  contact_info JSONB NOT NULL DEFAULT '{}',
  summary TEXT DEFAULT '',
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  template_id TEXT DEFAULT 'modern',
  target_job_title TEXT,
  target_company TEXT,
  job_match_score INTEGER,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user queries
CREATE INDEX idx_resumes_user_id ON public.resumes(user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**3. RLS Policies** - Secure access
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Resumes: users can only CRUD their own
CREATE POLICY "Users can view own resumes" ON public.resumes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes" ON public.resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes" ON public.resumes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes" ON public.resumes
  FOR DELETE USING (auth.uid() = user_id);
```

---

## New Pages & Components

### 1. Dashboard Page (`src/pages/DashboardPage.tsx`)

A dedicated page for managing multiple resumes:

**Features:**
- Grid/list view of all user's resumes
- Each card shows: title, target job, match score, last updated
- Quick actions: Edit, Duplicate, Delete, Set as Primary
- Create new resume button
- Search/filter by title or target job
- Sort by date, score, or title

**UI Structure:**
```
┌─────────────────────────────────────────┐
│ ← My Resumes                    [+ New] │
├─────────────────────────────────────────┤
│ Search resumes...              [Filter] │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ★ Software Engineer Resume          │ │
│ │ Target: Google • 85% match          │ │
│ │ Updated 2 hours ago     [•••]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Product Manager Resume               │ │
│ │ Target: Meta • 72% match            │ │
│ │ Updated 3 days ago      [•••]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ General Resume (Master)              │ │
│ │ No target job set                    │ │
│ │ Updated 1 week ago      [•••]       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2. Resume Card Component (`src/components/dashboard/ResumeListCard.tsx`)

Enhanced card for dashboard showing:
- Resume title (editable inline)
- Target job/company if set
- Match score badge (color-coded)
- Template thumbnail preview
- Completion percentage
- Last updated relative time
- Dropdown menu (Edit, Duplicate, Delete, Set Primary)

### 3. Create Resume Dialog (`src/components/dashboard/CreateResumeDialog.tsx`)

Modal for creating new resume:
- Title input
- Option to duplicate from existing
- Option to upload PDF
- Option to start blank
- Template quick-select

---

## Hooks & Data Layer

### 1. Auth Hook (`src/hooks/useAuth.ts`)
```typescript
// Track auth state, provide user, loading, signOut
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(...)
    return () => subscription.unsubscribe();
  }, []);
  
  return { user, loading, signOut };
}
```

### 2. Resumes Query Hook (`src/hooks/useResumes.ts`)
```typescript
// Fetch all user resumes using React Query
export function useResumes() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
```

### 3. Resume Mutations (`src/hooks/useResumeMutations.ts`)
```typescript
export function useResumeMutations() {
  const queryClient = useQueryClient();
  
  const createResume = useMutation({...});
  const updateResume = useMutation({...});
  const deleteResume = useMutation({...});
  const duplicateResume = useMutation({...});
  
  return { createResume, updateResume, deleteResume, duplicateResume };
}
```

---

## Updated Flow

### Navigation Changes

**Routes to add:**
```typescript
<Route path="/dashboard" element={<DashboardPage />} />
```

**Index page behavior:**
- If user logged in → redirect to `/dashboard`
- If not logged in → show current welcome/upload screen

**Editor page changes:**
- Load resume from database by ID: `/editor/:resumeId`
- Auto-save changes to database (debounced)
- Show "Saving..." indicator
- Keep local zustand store for editing session

### Auth Flow Updates

**After login:**
1. Check if user has resumes in database
2. If yes → navigate to `/dashboard`
3. If no → show onboarding (create first resume)

**After signup:**
1. Profile auto-created by trigger
2. Navigate to upload/create first resume
3. After first resume saved → go to dashboard

---

## Store Updates

### Update `resumeStore.ts`

Add fields for current editing session:
```typescript
interface ResumeState {
  // ... existing fields
  currentResumeId: string | null;  // ID from database
  isSaving: boolean;
  lastSavedAt: Date | null;
  
  // New methods
  loadResume: (resumeId: string) => Promise<void>;
  saveToCloud: () => Promise<void>;
}
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/DashboardPage.tsx` | **NEW** | Multi-resume management page |
| `src/components/dashboard/ResumeListCard.tsx` | **NEW** | Enhanced resume card |
| `src/components/dashboard/CreateResumeDialog.tsx` | **NEW** | Create/duplicate dialog |
| `src/components/dashboard/EmptyState.tsx` | **NEW** | Empty dashboard state |
| `src/hooks/useAuth.ts` | **NEW** | Auth state management |
| `src/hooks/useResumes.ts` | **NEW** | Resume CRUD operations |
| `src/pages/Index.tsx` | **UPDATE** | Add auth redirect logic |
| `src/pages/EditorPage.tsx` | **UPDATE** | Load from DB, auto-save |
| `src/store/resumeStore.ts` | **UPDATE** | Add cloud sync |
| `src/App.tsx` | **UPDATE** | Add dashboard route |

---

## Security Considerations

1. **RLS Policies**: All resume operations restricted to owner
2. **No public access**: Anonymous users cannot read any resumes
3. **Cascade deletes**: When user deleted, all their resumes deleted
4. **JSONB validation**: Resume content validated on client before save

---

## User Experience Flow

**New User:**
```
Landing → Sign Up → Email Confirm → Create First Resume → Dashboard
```

**Returning User:**
```
Landing → Sign In → Dashboard → Select Resume → Editor
```

**Guest User (no account):**
```
Landing → Upload/Create → Editor → Preview → Export (local only)
                                          ↓
                              "Sign up to save this resume"
```

---

## Implementation Order

1. **Phase 1: Database Setup**
   - Create profiles table with trigger
   - Create resumes table with RLS
   - Test policies

2. **Phase 2: Auth Integration**
   - Create useAuth hook
   - Update AuthPage with redirects
   - Add auth checks to Index

3. **Phase 3: Dashboard**
   - Create DashboardPage
   - Create ResumeListCard
   - Create CreateResumeDialog
   - Add route

4. **Phase 4: Cloud Sync**
   - Create useResumes hooks
   - Update EditorPage for DB loading
   - Implement auto-save
   - Add save indicator

5. **Phase 5: Polish**
   - Add duplicate functionality
   - Add search/filter
   - Add empty states
   - Prompt guests to sign up
