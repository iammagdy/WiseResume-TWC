

# Fix: What's New Dialog - Empty Items and Auth Redirect

## Two Bugs Identified

### Bug 1: Empty bullet point text
The changelog JSON uses `title` and `description` fields for each item, but `WhatsNewDialog` tries to render `item.text` which doesn't exist. This is why the three bullet points show red dots but no text.

**JSON structure:**
```json
{ "title": "Star-field splash background", "description": "Thirty softly twinkling stars..." }
```

**Component expects:**
```typescript
items: { text: string; tag?: string }[]
```

### Bug 2: "View full changelog" redirects to login
The dialog renders globally (outside ProtectedRoute), so unauthenticated users can see it. But clicking "View full changelog" navigates to `/settings`, which is a protected route -- sending unauthenticated users to the auth page.

---

## Fix Plan

### File: `src/components/WhatsNewDialog.tsx`

1. **Fix the interface** to match the actual changelog JSON shape -- items have `title` and `description`, not `text`.

2. **Fix the item rendering** to display `item.title` (or `item.title + description`) instead of `item.text`.

3. **Guard the "View full changelog" link** -- only navigate to `/settings` if the user is authenticated. If not authenticated, simply close the dialog (or hide the link entirely).

### Technical Details

- Update the `ChangelogEntry` interface:
  ```typescript
  items: { title: string; description: string; tag?: string }[];
  ```

- Update the list rendering to show `item.title`:
  ```typescript
  <span>{item.title}</span>
  ```

- Import `useAuth` and conditionally show/route the changelog link:
  ```typescript
  const { user } = useAuth();
  // Only show "View full changelog" if authenticated
  ```

No other files need changes.

