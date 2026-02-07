

# Fix Plan: Interview Mode UI Overlap & Voice Detection Issues

## Problems Identified

Based on the screenshot and code analysis, there are **two main issues**:

### Issue 1: Text Overlapping Below the Mic Button

Looking at your screenshot, I can see two text labels colliding in the same area:
- **"Listening..."** - the status label positioned at `-bottom-6` of the InterviewToggle
- **"Tap the mic when you're done"** - hint text rendered separately in InterviewPage

These both appear in the same visual space, causing the overlap you see ("Listening" and "you're done" overlapping).

### Issue 2: Voice Input Not Being Detected Until Typing

The voice flow has a **user experience gap**:

1. When Wise AI finishes speaking, status changes to `'ready'`
2. User sees "Tap to answer" golden prompt
3. **User must manually tap the mic button** to start voice recording
4. If user doesn't tap but starts speaking, nothing is recorded

The issue is that after the countdown (3-2-1) and beep, the system goes to `'ready'` state but does **NOT automatically start listening**. Many users expect the mic to be "hot" after the beep.

---

## Proposed Fixes

### Fix 1: Remove Duplicate Status Labels

**Current problem:** Both `InterviewToggle` and `InterviewPage` display status-related text below the button.

**Solution:** Consolidate all status hints into `InterviewToggle` component only. Remove the redundant hints from `InterviewPage` to prevent overlap.

| Change | File |
|--------|------|
| Remove lines 255-282 (status hints in InterviewPage) | `src/pages/InterviewPage.tsx` |
| Add all status hints inside InterviewToggle | `src/components/interview/InterviewToggle.tsx` |

### Fix 2: Auto-Start Listening After AI Speaks

**Current problem:** After countdown + beep, status becomes `'ready'` but mic is not active.

**Solution:** Automatically call `startListening()` after the beep plays, so the user can immediately speak without tapping.

| Change | File |
|--------|------|
| After `playBeep()` completes, call `startListening()` directly instead of just setting status to 'ready' | `src/hooks/useVoiceInterview.ts` |
| Keep 'ready' state briefly (visual feedback) then transition to 'listening' | Same file |

### Fix 3: Improve Visual Hierarchy for Status Text

Update the InterviewToggle to handle all status messaging with proper positioning that doesn't overlap with page-level hints.

---

## Technical Details

### File: `src/hooks/useVoiceInterview.ts`

**Current speak() function (lines 211-219):**
```typescript
utterance.onend = async () => {
  for (let i = 3; i >= 1; i--) {
    setCountdown(i);
    await new Promise(r => setTimeout(r, 1000));
  }
  setCountdown(null);
  await playBeep();
  setStatus('ready');  // ← Problem: just sets status, doesn't start mic
  resolve();
};
```

**New logic:**
```typescript
utterance.onend = async () => {
  for (let i = 3; i >= 1; i--) {
    setCountdown(i);
    await new Promise(r => setTimeout(r, 1000));
  }
  setCountdown(null);
  await playBeep();
  // Auto-start listening after beep (user's turn)
  startListeningAfterSpeakRef.current?.();
  resolve();
};
```

We'll need a ref to hold the startListening callback since it's defined after speak.

### File: `src/pages/InterviewPage.tsx`

**Remove this block (lines 255-282):**
```typescript
{status === 'ready' && (
  <motion.p ...>Your turn — tap the mic to answer</motion.p>
)}
{silenceDetected && status === 'listening' && (
  <motion.p ...>Sending soon…</motion.p>
)}
{status === 'listening' && !silenceDetected && (
  <motion.p ...>Tap the mic when you're done</motion.p>
)}
```

### File: `src/components/interview/InterviewToggle.tsx`

**Update status label (line 143-150) to include all hints:**

Add props for `silenceDetected` and update the label:
```typescript
<motion.span className="absolute -bottom-6 text-xs ...">
  {isListening && silenceDetected
    ? 'Sending soon…'
    : isListening
    ? 'Listening... tap when done'
    : isThinking
    ? 'Wise AI is thinking...'
    : isSpeaking
    ? 'Wise AI speaking...'
    : isReady
    ? 'Starting mic...'  // Brief state before auto-listen
    : 'Tap to speak'}
</motion.span>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useVoiceInterview.ts` | Auto-start listening after beep instead of just setting 'ready' status |
| `src/pages/InterviewPage.tsx` | Remove redundant status hint texts (lines 255-282) |
| `src/components/interview/InterviewToggle.tsx` | Add `silenceDetected` prop, consolidate all status messaging |

---

## Expected Result

After these changes:
1. **No more text overlap** - all status hints will be in one place with proper layout
2. **Voice input works automatically** - after AI finishes speaking and countdown + beep plays, mic starts recording immediately
3. **Clearer user experience** - users can simply start talking after the beep without needing to tap

