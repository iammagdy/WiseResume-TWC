
# Update Demo Data to "Wise Megz"

## Overview

Replace all demo/sample resume data with the name "Wise Megz" and update related placeholder information to be consistent.

---

## Files to Update

| File | Current Name | New Name |
|------|--------------|----------|
| `src/components/landing/TemplateGallery.tsx` | Alex Johnson | Wise Megz |
| `src/components/settings/DefaultTemplateSheet.tsx` | Alex Johnson | Wise Megz |
| `src/components/editor/TemplateSelector.tsx` | John Doe | Wise Megz |

---

## Detailed Changes

### 1. `src/components/landing/TemplateGallery.tsx`

**Current:**
```typescript
const sampleResume: ResumeData = {
  contactInfo: {
    fullName: 'Alex Johnson',
    email: 'alex@example.com',
    ...
  },
  experience: [{ company: 'Tech Corp', ... }],
  education: [{ institution: 'University of Technology', ... }],
  ...
};
```

**Updated:**
```typescript
const sampleResume: ResumeData = {
  contactInfo: {
    fullName: 'Wise Megz',
    email: 'megz@wiseuniverse.ai',
    ...
  },
  experience: [{ company: 'Wise Universe', position: 'AI Navigator', ... }],
  education: [{ institution: 'Cosmic Academy', degree: 'B.S.', field: 'Space Engineering', ... }],
  ...
};
```

---

### 2. `src/components/settings/DefaultTemplateSheet.tsx`

**Current:**
```typescript
const sampleResume: ResumeData = {
  contactInfo: {
    fullName: 'Alex Johnson',
    email: 'alex@email.com',
    ...
  },
  experience: [{ company: 'Tech Corp', ... }],
  education: [{ institution: 'State University', ... }],
  ...
};
```

**Updated:**
```typescript
const sampleResume: ResumeData = {
  contactInfo: {
    fullName: 'Wise Megz',
    email: 'megz@wiseuniverse.ai',
    ...
  },
  experience: [{ company: 'Wise Universe', position: 'AI Navigator', ... }],
  education: [{ institution: 'Cosmic Academy', ... }],
  ...
};
```

---

### 3. `src/components/editor/TemplateSelector.tsx`

**Current:**
```typescript
const previewResume = currentResume || {
  contactInfo: {
    fullName: 'John Doe',
    email: 'john@example.com',
    ...
  },
  experience: [{ company: 'Tech Corp', ... }],
  education: [{ institution: 'State University', ... }],
  ...
};
```

**Updated:**
```typescript
const previewResume = currentResume || {
  contactInfo: {
    fullName: 'Wise Megz',
    email: 'megz@wiseuniverse.ai',
    ...
  },
  experience: [{ company: 'Wise Universe', position: 'AI Navigator', ... }],
  education: [{ institution: 'Cosmic Academy', ... }],
  ...
};
```

---

## Summary of Data Updates

| Field | Old Value | New Value (Space Theme) |
|-------|-----------|-------------------------|
| Full Name | Alex Johnson / John Doe | Wise Megz |
| Email | alex@example.com | megz@wiseuniverse.ai |
| Location | San Francisco, CA | Wise Universe HQ |
| Company | Tech Corp | Wise Universe |
| Position | Senior Developer | AI Navigator |
| Institution | State University | Cosmic Academy |
| Field | Computer Science | Space Engineering |
| Skills | JS, React, Node | AI Systems, Cosmic Navigation, Starship UI, Quantum Computing |

---

## Implementation

3 files will be updated with consistent "Wise Megz" demo data that aligns with the space/Wise Universe theme.
