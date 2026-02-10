

# Smart URL Extraction for Job URL Parser

## Problem

When users copy a job link from LinkedIn's share feature, they get text like:
`"Check out this job at Loynova: https://www.linkedin.com/jobs/view/4353480180"`

The current `isUrl()` check uses `new URL(text)` which fails on this because it's not a pure URL -- it has surrounding text. So the component either rejects it or treats it as plain text, forcing the user to manually trim the URL.

## Solution

Add a `extractUrl` helper that uses a regex to find a URL anywhere in the pasted text. Update the input handler and parse handler to use this extraction logic.

## Technical Details

### File: `src/components/editor/tailor/JobUrlParser.tsx`

**1. Add `extractUrl` helper** (next to the existing `isUrl` function):

```typescript
const extractUrl = (text: string): string | null => {
  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0] : null;
};
```

**2. Update `setUrlInput` on change** -- when the user pastes into the URL input, extract the URL automatically:

```typescript
// In the Input onChange handler (line 92):
onChange={(e) => {
  const raw = e.target.value;
  const extracted = extractUrl(raw);
  setUrlInput(extracted || raw);
}}
```

**3. Update `handleParseUrl`** -- use `extractUrl` as a fallback before rejecting:

```typescript
const handleParseUrl = async () => {
  const url = extractUrl(urlInput) || urlInput.trim();
  if (!url || !isUrl(url)) {
    toast.error('Please enter a valid URL');
    return;
  }
  setIsParsing(true);
  try {
    const data = await parseJobUrl(url);
    // ... rest stays the same
```

**4. Update `handleInputChange`** -- also extract URL from mixed text:

```typescript
const handleInputChange = (text: string) => {
  const extracted = extractUrl(text);
  if (extracted) {
    setUrlInput(extracted);
    setShowManual(false);
  } else {
    onChange(text);
    setShowManual(true);
  }
};
```

These changes mean that pasting `"Check out this job at Loynova: https://www.linkedin.com/jobs/view/4353480180"` into either the URL input or the general input will automatically extract and use just `https://www.linkedin.com/jobs/view/4353480180`.

