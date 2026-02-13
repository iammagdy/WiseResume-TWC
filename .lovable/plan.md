
## Revamp AI & Voice Section

### Current State
The AI & Voice section has two plain `SettingsRow` items:
1. "AI Provider" — shows "WiseResume AI" or "Gemini", opens a sheet
2. "ElevenLabs API Key" — shows "Not set" or masked dots, opens a key entry sheet

Both are generic navigation rows with no explanatory context, empty states, or connected/disconnected visual feedback.

### Proposed Changes

**File: `src/pages/SettingsPage.tsx`** (lines ~328-353)

Replace the current two-row card with a richer layout containing two visual subsections:

**Subsection 1 — AI Provider (keep as-is but add helper text)**
- Keep the existing `SettingsRow` for "AI Provider"
- Add a small `Info` icon tooltip or inline helper line: "Powers resume analysis, tailoring, and enhancements"
- Show a green dot or "Recommended" badge next to "WiseResume AI" when that's selected

**Subsection 2 — ElevenLabs Voice (conditional empty/connected state)**

*If key is NOT set:*
- Show an empty state block inside the card:
  - Mic icon with muted styling
  - Text: "Connect ElevenLabs to enable realistic voice interviews"
  - A "Connect" `Button` (size="sm", variant="outline") that opens the existing `ElevenLabsKeySheet`

*If key IS set:*
- Show a connected state row:
  - Green check icon + "ElevenLabs Connected" label
  - Small muted text: "Used for speech-to-text in mock interviews"
  - A "Manage" button (size="sm", variant="ghost") that opens the existing sheet

### Technical Detail

Replace lines ~335-352 with:

```tsx
<div className="rounded-2xl glass-elevated overflow-hidden">
  {/* AI Provider row */}
  <SettingsRow
    type="navigation"
    label="AI Provider"
    description="Powers analysis, tailoring, and enhancements"
    value={aiProvider === 'wiseresume' ? 'WiseResume AI' : 'Gemini'}
    icon={<Brain className="w-4 h-4" />}
    onClick={() => setAISettingsOpen(true)}
  />
  <Separator className="bg-border/30" />

  {/* ElevenLabs Voice subsection */}
  {elevenlabsApiKey ? (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
        <Mic className="w-4 h-4 text-emerald-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">ElevenLabs Connected</p>
        <p className="text-xs text-muted-foreground">
          Used for speech-to-text in mock interviews
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setElevenLabsKeyOpen(true)}
        className="text-xs"
      >
        Manage
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
        <Mic className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">
          ElevenLabs Voice
        </p>
        <p className="text-xs text-muted-foreground">
          Connect to enable realistic voice interviews
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setElevenLabsKeyOpen(true)}
        className="shrink-0"
      >
        Connect
      </Button>
    </div>
  )}
</div>
```

### Additional Change — AI Provider description
Add `description` prop to the existing AI Provider `SettingsRow` (the component already supports it). This gives users context on what the AI engine actually does.

### What Stays the Same
- The `AISettingsSheet` and `ElevenLabsKeySheet` components remain unchanged
- The sheet open/close state logic remains unchanged
- No new imports needed (all icons already imported)

### Files Modified
- `src/pages/SettingsPage.tsx` — replace AI & Voice card content (~18 lines replaced with ~45 lines)
