

# Smarter Bug Report Dialog — Auto-Detect Error Location

## Current Problem

The bug report dialog already receives the route path and pre-selects a screen from a dropdown, but it still **asks the user** "Which screen is affected?" — making them do work that the system should handle automatically. The dialog doesn't feel intelligent; it just shows a raw error string and a manual dropdown.

## Solution

Make the dialog **visually communicate** that it already knows where the error happened, what type of error it is, and what the user was likely doing. Remove the manual screen selector and replace it with an auto-detected "smart context" card.

### Changes

**1. Auto-Detect and Display Context (no dropdown)**

Replace the "Which screen is affected?" dropdown with a read-only **detected context card** that shows:
- **Screen**: Auto-matched from route (e.g., "Resume Editor", "AI Studio")
- **Error Category**: Parsed from the error message (Network, AI, Rendering, Save, General)
- **Action hint**: Parsed from the `context` string passed to `reportBug()` (e.g., "while saving resume", "while generating AI content")

This info is shown as a compact glass card with icons, not as form fields the user has to fill.

**2. Smarter Error Categorization**

Add a `categorizeError()` function in `bugReport.ts` that classifies errors:
- **Network**: messages containing "fetch", "network", "timeout", "CORS", "502", "503"
- **AI**: messages containing "AI", "generate", "Gemini", "OpenAI", "credit"  
- **Save**: messages containing "save", "update", "insert", "sync"
- **PDF/Export**: messages containing "PDF", "export", "download"
- **Auth**: messages containing "auth", "session", "token", "sign"
- **General**: everything else

Each category gets its own icon and color in the detected context card.

**3. Update BugReportData to carry richer context**

Add an optional `action` field to `BugReportData` so callers can describe what the user was doing:

```text
interface BugReportData {
  errorMessage: string;
  errorStack?: string;
  componentStack?: string;
  route: string;
  action?: string;  // NEW: e.g. "saving resume", "generating AI content"
}
```

The `reportBug()` convenience function already accepts a `context` string — pipe it into `action`.

**4. Updated Dialog Layout**

```text
[Icon] We Detected an Issue
"We've captured the details automatically."

+--------------------------------------+
| [MapPin] Resume Editor               |
| [Zap]    AI Error                     |
| [Info]   "while generating summary"   |
+--------------------------------------+

[Textarea] Anything else? (optional)

[Send Report]
```

The detected card replaces both the old "Error detected" box and the screen dropdown, making the dialog shorter and smarter.

---

## File Changes

| File | Changes |
|---|---|
| `src/lib/bugReport.ts` | Add `action?: string` to `BugReportData`; pipe context into action in `reportBug()`; add `categorizeError()` utility |
| `src/components/BugReportDialog.tsx` | Remove screen dropdown; add auto-detected context card with screen, category, and action; update payload to include `error_category` and `action` |

## Technical Details

### categorizeError function

```text
type ErrorCategory = 'network' | 'ai' | 'save' | 'export' | 'auth' | 'general';

function categorizeError(message: string): { category: ErrorCategory; label: string; icon: LucideIcon } {
  const m = message.toLowerCase();
  if (/fetch|network|timeout|cors|50[234]|load failed/i.test(m))
    return { category: 'network', label: 'Network Issue', icon: Wifi };
  if (/\bai\b|generat|gemini|openai|credit|enhance|tailor/i.test(m))
    return { category: 'ai', label: 'AI Feature', icon: Sparkles };
  // ... etc
}
```

### Detected Context Card

```text
<div className="glass-surface rounded-2xl p-3 space-y-2">
  <div className="flex items-center gap-2">
    <MapPin className="w-3.5 h-3.5 text-primary" />
    <span className="text-xs font-medium">{screenLabel}</span>
  </div>
  <div className="flex items-center gap-2">
    <CategoryIcon className="w-3.5 h-3.5 text-warning" />
    <span className="text-xs text-muted-foreground">{categoryLabel}</span>
  </div>
  {action && (
    <div className="flex items-center gap-2">
      <Info className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground italic">{action}</span>
    </div>
  )}
</div>
```

This replaces ~60 lines of dropdown UI with a compact, auto-populated card that feels intelligent and requires zero user effort.
