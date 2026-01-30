
# Enhanced Templates with Accurate PDF Export

## Overview
Add new resume templates including a **Programmer/Developer template** with code-inspired styling, plus additional creative templates. Most critically, **completely rewrite the PDF generator** to accurately render each template's unique design in the exported PDF - not just a generic layout.

---

## Current Problem

The existing `pdfGenerator.ts` uses a single generic layout for all templates. It only changes the accent color based on template ID. This means:
- The preview shows different layouts (Modern, Classic, Professional, etc.)
- But the downloaded PDF looks nearly identical regardless of template
- Users see a "fake preview" that doesn't match their export

---

## Solution: Template-Specific PDF Generators

Create individual PDF rendering functions for each template that match their HTML/CSS preview designs exactly.

---

## New Templates to Add

### 1. Developer/Programmer Template
A code-inspired design that's still professional and ATS-readable:
- **Preview styling**: Monospace font (Courier), dark header like a terminal, syntax-highlighting colors for section headers
- **Skills displayed as "tech stack"**: Categories like Languages, Frameworks, Tools
- **GitHub/Portfolio links prominently featured**
- **Code-comment style section dividers**: `// Experience`, `/* Skills */`

### 2. Creative Template
- Bold asymmetric layout with accent sidebar
- Large initials as a design element
- Colorful skill bars/tags

### 3. Executive Template  
- Elegant, serif fonts
- Minimal color usage (black/gold accents)
- Emphasis on achievements and metrics

---

## Implementation Plan

### Phase 1: Type Updates

**File: `src/types/resume.ts`**
- Update `TemplateId` type to include new templates: `'developer' | 'creative' | 'executive'`

### Phase 2: Create New Template Components

**New Files:**
1. `src/components/templates/DeveloperTemplate.tsx`
   - Monospace font styling
   - Terminal-inspired dark header with name as "command prompt"
   - Section headers styled like code comments
   - Skills grouped by category (Languages, Frameworks, Databases, Tools)
   - GitHub icon and link in header
   - Experience bullet points prefixed with `>`

2. `src/components/templates/CreativeTemplate.tsx`
   - Left sidebar with skills and contact
   - Large decorative initial letter
   - Colorful accent elements

3. `src/components/templates/ExecutiveTemplate.tsx`
   - Elegant serif typography
   - Minimal, sophisticated layout
   - Achievement-focused sections

### Phase 3: Complete PDF Generator Rewrite

**File: `src/lib/pdfGenerator.ts`**

Create template-specific rendering functions:

```text
generatePDF(resume, templateId)
  ├── generateModernPDF()     - Purple accents, clean sections, skill badges
  ├── generateClassicPDF()    - Centered header, serif feel, traditional
  ├── generateMinimalPDF()    - Lots of whitespace, subtle typography
  ├── generateProfessionalPDF() - Two-column layout, dark header bar
  ├── generateDeveloperPDF()  - Monospace font, code-style headers
  ├── generateCreativePDF()   - Sidebar layout, colorful elements
  └── generateExecutivePDF()  - Elegant, serif, achievement-focused
```

Key PDF features per template:

**Developer Template PDF:**
- Embed Courier font for monospace look
- Dark gray header rectangle with white text
- Section headers: `// EXPERIENCE` with green color (like code comments)
- Skills rendered as `[JavaScript] [Python] [React]` inline tags
- Clean bullet points with `>` prefix

**Professional Template PDF:**
- Draw full-width dark header rectangle
- Two-column layout: sidebar (1/3) + main content (2/3)
- Skills as bullet list in sidebar
- Education in sidebar

**Modern Template PDF:**
- Purple accent color (#7C3AED)
- Underline below name
- Skills as small rounded rectangles (simulated with text + background)

### Phase 4: Update Template Selector

**File: `src/components/editor/TemplateSelector.tsx`**
- Add new templates to the selection grid
- Create mini preview icons that hint at layout style
- Group templates: "Professional", "Tech", "Creative"

### Phase 5: Update Preview Page

**File: `src/pages/PreviewPage.tsx`**
- Import new template components
- Add to TemplateComponent mapping

### Phase 6: Update Resume Store

**File: `src/store/resumeStore.ts`**
- Update default template if desired
- Ensure new template IDs work with persistence

---

## Developer Template Design Details

```text
┌─────────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████████████│
│ █  > John_Doe                                          █│
│ █  Full Stack Developer                                █│
│ █  📧 john@dev.io | 📱 555-0123 | 🔗 github.com/john  █│
│ ████████████████████████████████████████████████████████│
│                                                         │
│ // ABOUT                                                │
│ ─────────────────────────────────────────────────────   │
│ Passionate developer with 5+ years building scalable   │
│ web applications...                                    │
│                                                         │
│ // TECH_STACK                                          │
│ ─────────────────────────────────────────────────────   │
│ Languages:   JavaScript • TypeScript • Python • Go     │
│ Frontend:    React • Vue • Next.js • Tailwind         │
│ Backend:     Node.js • Express • PostgreSQL • Redis   │
│ Tools:       Git • Docker • AWS • CI/CD               │
│                                                         │
│ // EXPERIENCE                                          │
│ ─────────────────────────────────────────────────────   │
│ > Senior Developer @ TechCorp          2022 - Present  │
│   Built microservices architecture handling 1M+ req/d  │
│                                                         │
│ > Developer @ StartupXYZ                  2019 - 2022  │
│   Led frontend team, reduced load time by 40%          │
│                                                         │
│ // EDUCATION                                           │
│ ─────────────────────────────────────────────────────   │
│ > B.S. Computer Science @ MIT                    2019  │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Approach for PDF Matching

### Font Embedding
- Use `StandardFonts.Courier` for Developer template
- Use `StandardFonts.TimesRoman` for Classic/Executive templates
- Use `StandardFonts.Helvetica` for Modern/Professional

### Layout Rendering
- Calculate exact positions to match CSS layouts
- Use `page.drawRectangle()` for colored headers/sidebars
- Use `page.drawLine()` for dividers matching border styles

### Color Accuracy
- Define exact RGB values matching Tailwind colors:
  - Purple-600: `rgb(0.486, 0.227, 0.929)`
  - Gray-900: `rgb(0.067, 0.067, 0.078)`
  - Green-500: `rgb(0.133, 0.773, 0.369)` for developer accents

---

## Files to Create
1. `src/components/templates/DeveloperTemplate.tsx`
2. `src/components/templates/CreativeTemplate.tsx`
3. `src/components/templates/ExecutiveTemplate.tsx`

## Files to Modify
1. `src/types/resume.ts` - Add new template IDs
2. `src/lib/pdfGenerator.ts` - Complete rewrite with template-specific renderers
3. `src/components/editor/TemplateSelector.tsx` - Add new templates to grid
4. `src/pages/PreviewPage.tsx` - Import and map new templates
5. `src/store/resumeStore.ts` - Ensure compatibility

---

## Mobile Optimization
- Template selector shows 2x3 grid (6 templates visible)
- Scrollable if more templates added
- Clear visual distinction between template styles in thumbnails
I want also these templates to be ats friendly and if it not just add a badge for the user to educate him
