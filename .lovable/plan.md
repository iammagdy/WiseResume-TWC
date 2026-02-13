

## Guest-Friendly Wise AI Chat

### Problem
When unauthenticated users open the Wise AI chat and send a message, they get a 401 error because the edge function requires authentication. There's no indication that sign-in is required.

### Solution
Add an auth check to the `AgenticChatSheet`. When the user is not signed in, replace the chat interface with a **showcase screen** that highlights Wise AI's capabilities and prompts sign-in.

### Changes

**File: `src/components/editor/AgenticChatSheet.tsx`**

1. **Import `useAuth`** from `@/hooks/useAuth` and `LogIn` icon from lucide-react

2. **Add auth check** at the top of the component:
   ```tsx
   const { isAuthenticated } = useAuth();
   ```

3. **Replace the empty-state / chat area** with a guest showcase when not authenticated. Instead of showing the chat input and suggestion buttons, render:

   - The Wise AI icon and title (same branding)
   - A headline: "Your AI Resume Assistant"
   - A **capabilities showcase** with 4-5 feature cards showing what Wise AI can do:
     - "Edit your resume by chatting" -- describe, update summary, add experience
     - "Smart proofreading" -- fix grammar and improve wording automatically
     - "Add skills intelligently" -- suggest and merge relevant skills
     - "Before/After suggestions" -- review AI proposals before applying
     - "Thinking Mode" -- complex career reasoning with Pro mode
   - Each card has an icon and a short description
   - A prominent **"Sign In to Start Chatting"** button that navigates to `/auth`
   - A subtle note: "Free to use after signing in"

4. **Disable the input area for guests** -- hide the text input and send button entirely when not authenticated, so they can't trigger the 401

### Layout of Guest View

```
[Bot Icon]
Wise AI - Your Resume Assistant

What Wise AI can do:

[MessageSquare] Edit by Chatting
  "Update my summary" or "Add React to skills"
  -- changes apply instantly

[Wrench] Auto-Apply Changes  
  Wise AI edits your resume directly,
  no copy-pasting needed

[GitCompare] Review Suggestions
  See before/after diffs and accept
  or reject each change

[Brain] Thinking Mode
  Complex career reasoning with
  deeper analysis

[Shield] Private & Secure
  Your data stays yours

[ Sign In to Start Chatting ] (button)
"Free to use after signing in"
```

### Technical Details

- Uses `useAuth()` hook already available in the project
- Navigation to `/auth` via `useNavigate()` from react-router-dom
- No new components or files needed -- all changes within `AgenticChatSheet.tsx`
- The sheet header still shows (with title/branding) but the Thinking Mode toggle and Clear button are hidden for guests
- Icons used: `MessageSquare`, `Wrench`, `GitCompareArrows` (or `GitCompare`), `Brain`, `Shield`, `LogIn` from lucide-react
