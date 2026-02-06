
# Edit Profile Sheet Enhancement

## Issues Identified

### 1. Progress Calculation Bug
The `calculateProfileCompletion` function only counts 6 fields but ignores `linkedinUrl`. When user fills in LinkedIn, the percentage doesn't reflect it.

**Current fields counted:**
- fullName
- avatarUrl
- jobTitle
- industry
- careerLevel
- location

**Missing:** linkedinUrl

### 2. Save Button Not Visible
The footer with Cancel/Save buttons exists (lines 446-461), but the sheet's internal layout may be causing it to render outside the visible area. The `h-[85vh]` height combined with `flex flex-col` and `flex-1` on ScrollArea should work, but the nested `pt-4` wrapper in the Sheet component adds extra padding.

### 3. Basic Visual Design
The form fields use plain inputs without visual grouping or modern card-based design. The sections lack polish compared to the rest of the app.

---

## Solution

### Part 1: Fix Progress Calculation

**File: `src/hooks/useProfile.ts`**

Update `calculateProfileCompletion` to include `linkedinUrl`:

```typescript
export function calculateProfileCompletion(profile: Profile | null): number {
  if (!profile) return 0;
  const fields = [
    profile.fullName,
    profile.avatarUrl,
    profile.jobTitle,
    profile.industry,
    profile.careerLevel,
    profile.location,
    profile.linkedinUrl,  // ADD THIS
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}
```

This changes from 6 fields to 7 fields:
- 2 filled / 7 total = 29% (previously 33%)
- 3 filled / 7 total = 43% (with LinkedIn filled)

### Part 2: Fix Save Button Visibility

**File: `src/components/settings/EditProfileSheet.tsx`**

The issue is the SheetContent has `p-0` but the internal structure needs to ensure the footer stays visible. We need to:

1. Add `overflow-hidden` to the SheetContent to prevent scroll issues
2. Ensure the footer has proper safe area padding for mobile
3. Make the ScrollArea properly constrained

```tsx
<SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 overflow-hidden">
  {/* Header stays fixed */}
  <SheetHeader>...</SheetHeader>
  
  {/* ScrollArea takes remaining space with explicit overflow */}
  <ScrollArea className="flex-1 min-h-0 px-6">
    {/* Form content */}
  </ScrollArea>
  
  {/* Footer stays fixed at bottom with safe area */}
  <div className="flex gap-3 p-6 pb-safe border-t border-border bg-background shrink-0">
    ...
  </div>
</SheetContent>
```

Key fixes:
- Add `min-h-0` to ScrollArea (flex items need this to shrink below content size)
- Add `shrink-0` to footer to prevent compression
- Add `pb-safe` for device safe area on mobile
- Add `overflow-hidden` to SheetContent

### Part 3: Enhanced Visual Design

Transform the basic form into a more polished, card-based layout:

**Input Field Cards**
Wrap each input in a subtle card-like container:

```tsx
<div className="space-y-4">
  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
    Basic Info
  </h3>
  
  {/* Card wrapper for field group */}
  <div className="rounded-xl bg-card/50 border border-border overflow-hidden">
    <div className="p-4 space-y-4">
      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-xs text-muted-foreground">
          Display Name
        </Label>
        <Input
          id="fullName"
          placeholder="Enter your name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="bg-background"
        />
      </div>
      
      {/* Location - with icon inline */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          Location
        </Label>
        <Input
          id="location"
          placeholder="City, Country"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="bg-background"
        />
      </div>
    </div>
  </div>
</div>
```

**Visual Improvements:**
- Group related fields in subtle card containers (`bg-card/50`)
- Use smaller, uppercase section headers with tracking
- Add consistent vertical rhythm with `space-y-4`
- Use `bg-background` on inputs to create layered depth
- Add visual icons inline with labels
- Add subtle dividers between groups

**Progress Bar Enhancement**
Add color gradient and animation:

```tsx
<div className="mt-4 space-y-2">
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">Profile completion</span>
    <span className="font-semibold text-primary flex items-center gap-1">
      {completionPercentage}%
      {completionPercentage === 100 && (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      )}
    </span>
  </div>
  <div className="relative">
    <Progress value={completionPercentage} className="h-2" />
    {/* Optional: Add milestone markers */}
  </div>
  {completionPercentage < 100 && (
    <p className="text-xs text-muted-foreground">
      Complete your profile to get personalized AI suggestions
    </p>
  )}
</div>
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/hooks/useProfile.ts` | Add `linkedinUrl` to completion calculation |
| `src/components/settings/EditProfileSheet.tsx` | Fix layout to ensure footer visibility, enhance visual design with card groups, improve spacing and typography |

---

## Visual Outcome

### Before
- Plain inputs with basic styling
- Progress shows 33% even with 3 fields filled
- Save button may be cut off
- Generic appearance

### After
- Polished card-based field groups
- Progress correctly shows filled fields including LinkedIn
- Save button always visible with safe area padding
- Premium, consistent design matching the rest of the app
- Helpful prompt encouraging profile completion
