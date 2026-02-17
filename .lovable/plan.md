

## Portfolio UX Improvements

Three issues to fix in the Public Portfolio section on the Profile page:

### 1. Resume Selector Dropdown

Add a `Select` dropdown labeled "Source Resume" above the Bio section. It lists all the user's resumes by title. The selected resume is used as the data source for AI bio generation instead of silently picking the primary/first resume.

- Add a `selectedResumeId` state initialized to the primary resume's ID (or first resume)
- Render a `Select` component from shadcn with options mapped from `resumes`
- Update `handleGenerateBio` to use the selected resume's data instead of hardcoded `resumes.find(r => r.is_primary) || resumes[0]`

### 2. Username Availability Indicator

After the user types a valid username (passes format validation), run a debounced check against the database to see if the username is taken.

- Add `usernameAvailable` state (`null | boolean`) and `checkingUsername` state
- After `validateUsername` passes (no format error, length >= 3), debounce a query: `supabase.from('profiles').select('id').eq('username', clean).neq('user_id', user.id).maybeSingle()`
- Show a small indicator below the input:
  - Spinner while checking
  - Green checkmark + "Available" if no match found
  - Red X + "Taken" if match found
- Disable Save button if username is taken

### 3. Smarter Bio Generation Validation

Instead of blocking with an error toast when the selected resume has no data, show a softer warning and still allow generation if the profile has a job title. The current logic already checks `profile?.jobTitle` but the user's profile says "Add a job title" meaning it's null -- so the real fix is ensuring the resume selector points to a resume that actually has data, and the error message guides the user to pick a different resume or fill in their profile.

- Update validation message to say: "The selected resume has no summary or experience. Please choose a different resume or add details first."

---

### Technical Details

**File: `src/pages/ProfilePage.tsx`**

New state variables:
```
const [selectedResumeId, setSelectedResumeId] = useState<string>('');
const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
const [checkingUsername, setCheckingUsername] = useState(false);
```

Initialize `selectedResumeId` in a `useEffect` when `resumes` loads (pick primary or first).

Username availability check with `useEffect` + `setTimeout` debounce (500ms) on `username` changes, only when format validation passes.

Resume selector: shadcn `Select` component placed between the Username field and the Bio section.

**No database changes needed** -- we're querying the existing `profiles.username` column.

**Files Modified:**
- `src/pages/ProfilePage.tsx` -- add resume selector, username availability check, update bio generation logic

