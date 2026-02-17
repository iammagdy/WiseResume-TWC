

## Sign-Up Page Enhancements and Password Eye Icon Fix

### Two Issues to Fix

**Issue 1: Sign-up needs additional fields**
Currently, both sign-in and sign-up share the same form with just email and password. The sign-up flow needs to collect the user's full name and phone number, and save them to their profile automatically after account creation.

**Issue 2: Eye icon disappears on password field**
The `InputFormField` component has built-in logic that shows a checkmark icon or a clear (X) button when the user types, which overrides the eye/eye-off toggle passed via `rightElement`. This causes the password visibility toggle to vanish as soon as the user starts typing.

---

### Changes

**1. Add `phone_number` column to profiles table**
A database migration adds a nullable `phone_number` text column to the existing `profiles` table so we can store the user's phone number.

**2. Update `src/components/ui/form-field.tsx` -- Fix eye icon priority**
Change the rendering logic so that when a `rightElement` is provided (like the eye icon), it always takes priority over the built-in checkmark and clear button. The clear button and valid-check icon will not render when `rightElement` is present.

**3. Update `src/pages/AuthPage.tsx` -- Add sign-up fields**
- Add `fullName` and `phoneNumber` state variables
- Show "Full Name" and "Phone Number" input fields only when mode is `signup`
- Add validation: name is required on sign-up, phone is optional but validated if provided
- After successful sign-up, save `full_name` and `phone_number` to the `profiles` table using an upsert
- Sign-in form remains unchanged (just email + password)

**4. Update `src/hooks/useProfile.ts` -- Support phone number**
- Add `phoneNumber` to the `Profile` interface
- Include `phone_number` in the fetch query select and in the update mutation mapping

---

### Technical Details

**Database migration:**
```sql
ALTER TABLE public.profiles ADD COLUMN phone_number text;
```

**form-field.tsx logic change (lines 133-153):**
Current priority: checkmark > clear button > rightElement
New priority: rightElement > checkmark > clear button

When `rightElement` is provided, skip rendering both the checkmark and clear button entirely, so the eye icon always stays visible.

**AuthPage.tsx sign-up form:**
- Two new fields appear above email when mode is `signup`: "Full Name" (required, User icon) and "Phone Number" (optional, Phone icon)
- After `supabase.auth.signUp()` succeeds and returns a session, upsert into `profiles` with `full_name` and `phone_number`
- If sign-up returns no session (email confirmation required), store name/phone in `signUp()` `options.data` metadata so the `handle_new_user` trigger can populate the profile later

**Profile hook update:**
- `phoneNumber` field mapped to `phone_number` DB column in both read and write paths

