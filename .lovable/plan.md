
# Redesign Bottom Tab Bar Navigation

## Current State Analysis

The current 5-tab layout has logical issues:

| Tab | Current Content | Issue |
|-----|-----------------|-------|
| Home | Resume dashboard | ✓ Core feature |
| Editor | Resume editing | ✓ Core feature |
| Interview | Mock interviews | ⚠ Secondary feature (used less frequently) |
| AI | API key settings only | ❌ Misleading name - contains settings, not AI features |
| Settings | App preferences | ✓ Standard tab |

**Key Problem:** The "AI" tab only contains API key configuration, but users expect AI features there. The actual AI features (Wise AI, Tailor, Recruiter Sim, etc.) are inside the Editor.

---

## Recommended Solution: Merge AI into Settings

Consolidate the AI Settings into the main Settings page, reducing to a clean 4-tab layout that follows iOS/Android design patterns.

### New Tab Structure

```text
+------+--------+-----------+----------+
| Home | Editor | Interview | Settings |
+------+--------+-----------+----------+
   ⌂       📄        🎤         ⚙
```

| Tab | Icon | Content |
|-----|------|---------|
| **Home** | Home | Resume dashboard, quick actions |
| **Editor** | FileText | Resume editing + AI Studio tools |
| **Interview** | Mic | Mock interview practice |
| **Settings** | Settings | All settings including AI configuration |

### Settings Page Reorganization

Add a new **"AI & Voice"** section to the Settings page:

```text
Settings Page Sections:
├── Profile (existing)
├── Appearance (existing)
├── Editor Preferences (existing)
├── AI & Voice (NEW - merged from AI page)
│   ├── AI Provider (WiseResume AI / Gemini)
│   ├── Gemini API Key (if selected)
│   └── ElevenLabs API Key
├── Notifications (existing)
├── Data & Export (existing)
├── Privacy (existing - remove ElevenLabs from Integrations)
├── Account (existing)
└── About (existing)
```

---

## Technical Implementation

### Phase 1: Update BottomTabBar

**File: `src/components/layout/BottomTabBar.tsx`**

Remove the AI tab and keep 4 tabs:

```typescript
const tabs: TabItem[] = [
  { 
    path: '/dashboard', 
    icon: Home, 
    label: 'Home',
    matchPaths: ['/dashboard', '/upload']
  },
  { 
    path: '/editor', 
    icon: FileText, 
    label: 'Editor',
    matchPaths: ['/editor', '/preview']
  },
  { 
    path: '/interview', 
    icon: Mic, 
    label: 'Interview',
    matchPaths: ['/interview']
  },
  { 
    path: '/settings', 
    icon: Settings, 
    label: 'Settings',
    matchPaths: ['/settings']
  },
];
```

### Phase 2: Merge AI Settings into Settings Page

**File: `src/pages/SettingsPage.tsx`**

Add a new "AI & Voice" section between Editor Preferences and Notifications:

```tsx
{/* AI & Voice Section */}
<div>
  <h2 className="section-header">AI & Voice</h2>
  <div className="rounded-2xl glass-elevated overflow-hidden">
    <SettingsRow
      type="navigation"
      label="AI Provider"
      value={aiProvider === 'lovable' ? 'WiseResume AI' : 'Gemini'}
      icon={<Brain className="w-4 h-4" />}
      onClick={() => setAISettingsOpen(true)}
    />
    <Separator />
    <SettingsRow
      type="navigation"
      label="ElevenLabs API Key"
      description="For voice interviews"
      value={elevenlabsApiKey ? '••••••' : 'Not set'}
      icon={<Mic className="w-4 h-4" />}
      onClick={() => setElevenLabsKeyOpen(true)}
    />
  </div>
</div>
```

### Phase 3: Create AI Settings Sheet

**New File: `src/components/settings/AISettingsSheet.tsx`**

Move the AI provider selection and Gemini key management into a sheet that opens from Settings:

- Provider selection (WiseResume AI / Your Gemini Key)
- Gemini API key input (when Gemini selected)
- Key validation status
- Usage stats (for free tier)
- Tips card

### Phase 4: Update Navigation & Routes

**File: `src/lib/navigation.ts`**

Remove `/ai` from BACK_ROUTES since it no longer exists.

**File: `src/App.tsx`**

Remove the `/ai` route:

```tsx
// Remove this route
<Route path="/ai" element={
  <Suspense fallback={<AISkeleton />}>
    <AIPage />
  </Suspense>
} />
```

### Phase 5: Update References

- Remove `AIPage` import from `App.tsx`
- Update `AIProviderBadge.tsx` navigation to open sheet instead of `/ai`
- Remove `AISkeleton` from PageSkeletons

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/layout/BottomTabBar.tsx` | Modify - Remove AI tab, keep 4 tabs |
| `src/pages/SettingsPage.tsx` | Modify - Add AI & Voice section |
| `src/components/settings/AISettingsSheet.tsx` | Create - AI provider configuration sheet |
| `src/App.tsx` | Modify - Remove /ai route |
| `src/lib/navigation.ts` | Modify - Remove /ai from BACK_ROUTES |
| `src/pages/AIPage.tsx` | Delete - No longer needed |
| `src/components/layout/PageSkeletons.tsx` | Modify - Remove AISkeleton |
| `src/components/editor/ai/AIProviderBadge.tsx` | Modify - Update settings navigation |

---

## Benefits

1. **Cleaner Navigation**: 4 tabs is the iOS/Android standard for bottom navigation
2. **Logical Grouping**: AI settings belong with other settings
3. **Reduced Confusion**: No more misleading "AI" tab that only has settings
4. **Familiar Pattern**: Users expect settings in one place
5. **Better Discoverability**: AI features are already prominent in the Editor (AI Studio bar, Wise AI button)

---

## Visual Comparison

**Before (5 tabs - crowded):**
```text
┌──────┬────────┬───────────┬──────┬──────────┐
│ Home │ Editor │ Interview │  AI  │ Settings │
└──────┴────────┴───────────┴──────┴──────────┘
```

**After (4 tabs - clean):**
```text
┌────────┬──────────┬─────────────┬──────────┐
│  Home  │  Editor  │  Interview  │ Settings │
└────────┴──────────┴─────────────┴──────────┘
```
