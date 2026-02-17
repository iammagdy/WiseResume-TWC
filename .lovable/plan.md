

## Phone Number Keyboard and LinkedIn Auto-Complete Fix

### Problem 1: Phone field opens full keyboard on mobile
The phone input uses `type="tel"` but doesn't set `inputMode="numeric"`, so some mobile browsers still show the full letter keyboard. Additionally, the field currently accepts letters, which shouldn't be allowed.

### Problem 2: LinkedIn field requires full URL
Users have to type the entire `https://linkedin.com/in/` prefix. Instead, the field should show this prefix as fixed text and only ask the user to type their username (e.g., `johndoe`).

---

### Changes

**1. `src/components/ui/form-field.tsx`**
- Add `inputMode` prop to `InputFormFieldProps` (values like `"numeric"`, `"tel"`, `"text"`, `"url"`)
- Add `prefix` prop for showing a fixed prefix inside the input (for LinkedIn URL)
- Pass `inputMode` to the underlying `<Input>` element
- When `prefix` is provided, render it as a styled label before the input

**2. `src/components/ui/input.tsx`**
- Add `inputMode` to the forwarded props (it's already a valid HTML attribute, so this should work automatically, but we ensure it's passed through)

**3. `src/components/editor/ContactSection.tsx`**
- **Phone field**: Add `inputMode="tel"` and filter out non-digit/non-phone characters on change (only allow digits, +, -, spaces, parentheses)
- **LinkedIn field**: Replace the full URL input with a prefix-based input:
  - Show `linkedin.com/in/` as a fixed, non-editable prefix
  - Store/read only the username part
  - On save, combine prefix + username into the full URL for `contactInfo.linkedin`
  - On load, strip the prefix from existing full URLs to show just the username
  - Update validation to check the username format instead of full URL
  - Update placeholder to just `"johndoe"` instead of the full URL

### Technical Details

**Phone input filtering:**
```
onChange={(value) => {
  const filtered = value.replace(/[^0-9+\-\s()]/g, '');
  handleChange('phone', filtered);
}}
```
Combined with `inputMode="tel"` this ensures only the numeric phone keyboard opens on mobile.

**LinkedIn prefix approach:**
- A helper extracts the username: if value starts with common LinkedIn URL patterns, strip them; otherwise use as-is
- On change, store the full URL (`https://linkedin.com/in/{username}`) in the resume data
- The prefix `linkedin.com/in/` is shown as a styled, non-editable element to the left of the input
- Validation checks the username: must be 3+ characters, alphanumeric with hyphens only

