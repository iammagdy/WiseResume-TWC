# 🎨 WiseResume — Google Stitch Prompts (Web App)

> Granular, self-contained prompts for generating UI mockups of every WiseResume web app screen using Google Stitch.
> Each prompt generates 1-2 screens max to prevent hallucination and ensure quality.

---

## 🎯 Design System Reference (Include in Every Prompt)

Use this color/typography block as a **prefix** for every Stitch prompt below:

```
DESIGN SYSTEM:
- Background: #0B0D17 (near-black with blue undertone)
- Surface: #12141F (cards, panels)
- Glass surface: rgba(255,255,255,0.05) with 12px blur
- Glass border: rgba(255,255,255,0.08)
- Primary: #6366F1 (indigo-violet)
- Primary glow: #818CF8 (lighter violet)
- Accent: #22D3EE (cyan/teal)
- Success: #10B981 (green)
- Warning: #F59E0B (amber)
- Error: #EF4444 (red)
- Text primary: #F8FAFC (near-white)
- Text secondary: #94A3B8 (muted blue-gray)
- Text muted: #64748B (darker gray)
- Font display: "Space Grotesk", sans-serif
- Font body: "Inter", sans-serif
- Border radius: 12px (cards), 8px (buttons), 16px (modals)
- Viewport: 375px wide (mobile-first)
- Style: Dark theme, glassmorphism, subtle gradients, space/cosmic feel
```

---

## PROMPT 1 — Auth: Email Entry + Login

```
Design a mobile-first (375px wide) dark-themed login flow for a resume builder app called "WiseResume".

SCREEN 1 — Email Entry:
- Status bar area at top (dark)
- Centered app logo: a gradient document icon (indigo to cyan) with small star sparkles
- App name "WiseResume" in Space Grotesk 24px bold, #F8FAFC
- Tagline "AI-Powered Career Platform" in Inter 14px, #94A3B8
- Email input field: glass surface background (rgba(255,255,255,0.05)), 1px border rgba(255,255,255,0.08), rounded 8px, placeholder "Enter your email"
- "Continue" button: full width, gradient background from #6366F1 to #818CF8, rounded 8px, white text
- Divider with "or" text in center
- Social login buttons row: Google icon button, Apple icon button — glass surface style
- Bottom text: "Don't have an account? Sign up" with "Sign up" in #6366F1

SCREEN 2 — Password Login:
- Back arrow at top left
- "Welcome back" heading in Space Grotesk 22px bold
- User email shown as a chip/tag below heading
- Password input field: same glass style, with eye toggle icon
- "Forgot password?" link aligned right in #6366F1 14px
- "Sign In" button: full width gradient #6366F1→#818CF8
- Biometric option: "Use Face ID / Fingerprint" button with icon, glass surface style
- Loading state: button shows spinner when tapped

[DESIGN SYSTEM block from above]
```

---

## PROMPT 2 — Auth: Signup + Reset Password

```
Design 2 mobile screens (375px wide) for a dark-themed resume builder app "WiseResume".

SCREEN 1 — Signup:
- Back arrow top left
- "Create Account" in Space Grotesk 22px bold, #F8FAFC
- "Join thousands of job seekers" in Inter 14px, #94A3B8
- Form fields (glass surface, stacked vertically, 12px gap):
  - Full name input
  - Email input
  - Password input (with strength indicator bar below: red→amber→green)
  - Confirm password input
- Checkbox: "I agree to Terms of Service and Privacy Policy" — links in #6366F1
- "Create Account" button: full width gradient #6366F1→#818CF8
- Bottom: "Already have an account? Sign in" — "Sign in" in #6366F1

SCREEN 2 — Reset Password:
- Back arrow top left
- Lock icon centered (64px, #6366F1 with glow)
- "Reset Password" in Space Grotesk 22px bold
- "Enter your email and we'll send you a reset link" in Inter 14px, #94A3B8
- Email input field (glass surface)
- "Send Reset Link" button: full width gradient
- Success state variation: show checkmark icon, "Check your email" message, "Open email app" button

[DESIGN SYSTEM block]
```

---

## PROMPT 3 — Dashboard: Main View

```
Design the main dashboard screen (375px wide, mobile-first) for "WiseResume" — a dark-themed AI resume builder.

Layout (top to bottom):
- Header bar: "WiseResume" logo left, notification bell icon right (with red dot badge), avatar circle right
- Greeting: "Good morning, Ahmed 👋" in Space Grotesk 20px bold
- Subtitle: "You have 3 resumes and 2 pending applications" in Inter 14px, #94A3B8

- Stats row (3 glass cards in horizontal scroll):
  - Card 1: "Resumes" count "3" with document icon, #6366F1 accent
  - Card 2: "Applications" count "5" with briefcase icon, #22D3EE accent
  - Card 3: "AI Credits" count "8/10" with sparkle icon, #F59E0B accent

- "Quick Actions" section label
- Action chips row (horizontal scroll): "New Resume", "Upload", "AI Studio", "Templates" — glass surface chips with icons

- "My Resumes" section with "See all" link
- Resume cards (vertical list, max 3 shown):
  - Each card: glass surface, rounded 12px
  - Left: template thumbnail (small preview)
  - Right: resume title (bold), target job (muted), last edited date
  - Right edge: 3-dot menu icon
  - Bottom of card: ATS score badge (colored pill: green if >70, amber if 50-70, red if <50)

- Bottom tab bar: 5 icons — Home (active, #6366F1), Editor, AI Studio, Applications, Settings
  - Glass surface background, each icon 24px with label below

[DESIGN SYSTEM block]
```

---

## PROMPT 4 — Dashboard: FAB Menu + Empty State

```
Design 2 mobile screens (375px wide) for "WiseResume" dark-themed dashboard.

SCREEN 1 — FAB Expanded Menu:
- Same dashboard background (dimmed/blurred overlay)
- Floating Action Button (bottom right, 56px circle, gradient #6366F1→#818CF8) is now expanded
- Expanded FAB shows a vertical menu of 4 options (appearing with stagger animation feel):
  - "Create New Resume" — document+ icon, glass card
  - "Upload Resume" — upload icon, glass card
  - "Import from LinkedIn" — LinkedIn icon, glass card
  - "Use Template" — grid icon, glass card
- Each option: glass surface pill, icon left, text right, 48px height
- Background overlay: rgba(0,0,0,0.6) with blur

SCREEN 2 — Empty State (No Resumes):
- Same header and stats area but all counts show "0"
- Center of screen: illustration area
  - Large document icon (120px) with dotted outline, #64748B color
  - Floating star sparkles around it (small, #6366F1 and #22D3EE)
- "No resumes yet" in Space Grotesk 20px bold
- "Create your first resume and let AI help you land your dream job" in Inter 14px, #94A3B8, centered
- "Create Resume" button: gradient, with sparkle icon
- "Or upload an existing resume" link below in #6366F1

[DESIGN SYSTEM block]
```

---

## PROMPT 5 — Resume Editor: Section Stepper

```
Design the resume editor screen (375px wide) for "WiseResume" showing the section stepper navigation.

Layout:
- Top bar: back arrow, "Edit Resume" title center, 3-dot menu right
- Below top bar: horizontal scrollable stepper (pill chips):
  - Sections: Contact, Summary, Experience, Education, Skills, Projects, Certifications, Awards, Publications, Volunteering, Hobbies, References, Custom
  - Active section: filled #6366F1, white text
  - Completed sections: outlined with checkmark, #10B981 border
  - Upcoming sections: glass surface, #94A3B8 text

- Main content area (currently showing "Experience" section):
  - Section header: "Work Experience" with add (+) button right
  - Experience entry card (glass surface, 12px radius):
    - Job title: "Senior Developer" in bold 16px
    - Company: "Google" in #94A3B8
    - Date range: "Jan 2022 - Present" pill badge
    - Bullet points (3): each line with drag handle left, text center, delete icon right
    - "Add bullet point" button (dashed border, + icon)
  - Second experience entry (collapsed, showing just title + company)
  - "Add Experience" button at bottom (dashed glass card, + icon centered)

- AI assist floating chip: bottom center above toolbar, "✨ AI Enhance" in small glass pill

- Bottom toolbar (fixed): 
  - Template icon, Customize icon, Preview icon, Share icon, More icon
  - Glass surface background, icons 24px, #94A3B8 default, active #6366F1

[DESIGN SYSTEM block]
```

---

## PROMPT 6 — Resume Editor: Bottom Toolbar Sheets

```
Design 2 mobile screens (375px wide) showing bottom sheets triggered from the editor toolbar.

SCREEN 1 — Template Selector Sheet:
- Bottom sheet overlay (60% screen height), rounded top corners 16px
- Glass surface background with blur
- Handle bar at top (40px wide, 4px height, rgba(255,255,255,0.2))
- "Choose Template" title in Space Grotesk 18px bold
- Filter chips row: "All", "Professional", "Creative", "Simple", "ATS-Friendly" — horizontal scroll
- Template grid (2 columns):
  - Each template: thumbnail preview (aspect ratio 1:1.4), glass border
  - Template name below thumbnail in 12px
  - Active template has #6366F1 border glow
  - "PRO" badge on premium templates (small amber pill)
- 30 templates total, scrollable

SCREEN 2 — Customize Sheet:
- Bottom sheet (70% screen height)
- Glass surface with blur
- Handle bar
- "Customize" title
- Sections (collapsible accordion):
  - **Font**: font family dropdown, size slider (small to large)
  - **Colors**: primary color circles (8 preset colors), custom color picker
  - **Spacing**: line height slider, section gap slider
  - **Layout**: columns toggle (1 or 2), section order drag list
  - **Header Style**: 3 options with preview thumbnails (classic, modern, minimal)
- "Reset to Default" text button at bottom in #EF4444
- "Apply" button: full width gradient

[DESIGN SYSTEM block]
```

---

## PROMPT 7 — Resume Preview: Zoom + Page Navigation

```
Design the resume preview screen (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, "Preview" title, share icon + download icon right
- Resume preview area (full width, white background for the resume itself):
  - A4 resume rendered at mobile width
  - The resume shows a professional template with:
    - Header: name, title, contact info
    - Summary paragraph
    - Experience section with 2 entries
    - Education section
    - Skills tags
  - Pinch-to-zoom indicator overlay (two-finger icon, fades after 2 seconds)

- Page indicator: "Page 1 of 2" centered below preview, with left/right chevrons
- Dot indicators (2 dots, first active)

- Bottom action bar (glass surface, fixed):
  - "Edit" button (outline style, left)
  - "Download PDF" button (gradient fill, center, with download icon)
  - "Share" button (outline style, right)

- Zoom controls (floating, right side): + and - buttons in vertical glass pill

[DESIGN SYSTEM block]
```

---

## PROMPT 8 — Upload: Import Zone + Progress

```
Design the upload/import screen (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, "Import Resume" title
- Tab bar: "Upload File" (active) | "Paste Text" | "LinkedIn"

- Upload zone (main content):
  - Large dashed border rectangle (glass surface inside), rounded 16px
  - Center icon: cloud upload icon (48px, #6366F1)
  - "Drop your resume here" in Space Grotesk 18px bold
  - "or tap to browse files" in Inter 14px, #94A3B8
  - Supported formats: "PDF, DOCX, TXT, PNG, JPG" in 12px badges (glass pills)
  - Max file size: "Max 10MB" in #64748B

- Upload progress state (show as variation):
  - File name shown: "resume_2024.pdf" with PDF icon
  - Progress bar: gradient fill #6366F1→#22D3EE, 60% complete
  - "Parsing document..." text with spinning icon
  - Cancel button (text, #EF4444)

- Parse complete state (show as variation):
  - Checkmark icon (green, 48px)
  - "Resume parsed successfully!"
  - Found sections list: checkmarks next to "Contact Info ✓", "Experience ✓", "Education ✓", "Skills ✓"
  - "Review & Edit" button (gradient, full width)
  - "Upload Another" text link

[DESIGN SYSTEM block]
```

---

## PROMPT 9 — AI Studio: Tool Grid

```
Design the AI Studio screen (375px wide) for "WiseResume" — the hub for all AI-powered tools.

Layout:
- Top bar: "AI Studio" title with sparkle icon, notification bell right
- AI credits banner (glass surface, full width):
  - "8 / 10 credits remaining today" with progress bar
  - Small "Upgrade for unlimited" link in #6366F1

- Search bar: glass surface input, "Search AI tools..." placeholder, magnifying glass icon

- Tool categories (tabs or chips): "All", "Resume", "Career", "Interview", "Writing"

- Tools grid (2 columns, gap 12px):
  Each tool card (glass surface, 12px radius, padding 16px):
  - Icon (32px, gradient colored)
  - Tool name in bold 14px
  - Description in 12px #94A3B8
  - Arrow right icon at bottom right

  Tools to show:
  1. "Analyze Resume" — magnifying glass icon, #6366F1 — "Get ATS score & suggestions"
  2. "Tailor Resume" — target icon, #22D3EE — "Match to job description"
  3. "Enhance Section" — sparkle icon, #818CF8 — "Improve any section with AI"
  4. "Proofread" — check-circle icon, #10B981 — "Fix grammar & clarity"
  5. "Cover Letter" — file-text icon, #F59E0B — "Generate cover letters"
  6. "Mock Interview" — mic icon, #EF4444 — "Practice with AI interviewer"
  7. "Career Path" — compass icon, #6366F1 — "Explore career options"
  8. "Ask AI" — message-circle icon, #22D3EE — "Chat about your career"

- Bottom tab bar (AI Studio tab active with #6366F1)

[DESIGN SYSTEM block]
```

---

## PROMPT 10 — Mock Interview: Chat + Voice Controls

```
Design the mock interview screen (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, "Mock Interview" title, timer "03:24" right with red dot
- Interview type badge: "Behavioral — Software Engineer" glass pill

- Chat area (scrollable, main content):
  - AI message bubble (left aligned, glass surface):
    - AI avatar (small robot icon, #6366F1)
    - "Tell me about a time you led a team through a difficult project."
    - Timestamp "2:30" in #64748B
  
  - User message bubble (right aligned, #6366F1/20% background):
    - "In my previous role at Google, I led a team of 5 engineers..."
    - Timestamp "2:45"
    - Small feedback badge: "Good structure ✓" in green

  - AI follow-up bubble:
    - "What was the biggest challenge you faced?"
    
  - Typing indicator (3 animated dots in glass bubble)

- Voice controls area (bottom, fixed):
  - Waveform visualization (horizontal bars, #6366F1 gradient, animated feel)
  - Large mic button (64px circle, gradient #6366F1→#818CF8, centered)
  - "Tap to speak" label below mic
  - Left: "Type instead" text button
  - Right: "End Interview" red text button

- When speaking: mic button has pulsing ring animation, waveform is active

[DESIGN SYSTEM block]
```

---

## PROMPT 11 — Applications: List + Filters

```
Design the job applications tracking screen (375px wide) for "WiseResume".

Layout:
- Top bar: "Applications" title, search icon + filter icon right
- Stats bar (horizontal scroll, 4 glass pills):
  - "All (12)" active #6366F1
  - "Applied (5)" #818CF8
  - "Interview (3)" #22D3EE
  - "Offered (1)" #10B981
  - "Rejected (3)" #EF4444

- Sort dropdown: "Sort by: Latest" with chevron

- Application cards (vertical list):
  Card 1:
  - Company logo (circle, 40px) left
  - Job title: "Senior Frontend Developer" bold
  - Company: "Google" in #94A3B8
  - Status badge: "Interview" pill in #22D3EE
  - Date: "Applied Jan 15" in #64748B
  - Right: chevron icon

  Card 2:
  - Company logo left
  - "Product Designer" bold
  - "Meta" in #94A3B8
  - Status: "Applied" pill in #818CF8
  - "Applied Jan 12"

  Card 3:
  - "Data Scientist"
  - "Netflix"
  - Status: "Rejected" pill in #EF4444
  - Slightly dimmed/lower opacity

- FAB (bottom right): "+" icon, gradient circle, for adding new application

- Bottom tab bar (Applications tab active)

[DESIGN SYSTEM block]
```

---

## PROMPT 12 — Job Detail

```
Design the job detail page (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, bookmark icon right (outline), share icon
- Company header card (glass surface):
  - Company logo (64px) centered
  - "Senior Frontend Developer" in Space Grotesk 20px bold
  - "Google" in 16px #94A3B8
  - Location: "Mountain View, CA · Remote" with pin icon
  - Salary: "$150k - $200k" in #10B981 with trending-up icon
  - Posted: "2 days ago" in #64748B

- Action buttons row:
  - "Apply Now" button (gradient, flex 2)
  - "Save" button (outline, flex 1)

- Tab bar: "Description" (active) | "Requirements" | "Company"

- Description content (scrollable):
  - Section: "About the role"
  - Paragraph text in Inter 14px, #F8FAFC
  - Section: "Responsibilities"
  - Bullet list with cyan dot markers
  - Section: "Required Skills"
  - Skill tags (glass pills): "React", "TypeScript", "Node.js", "GraphQL"

- Match score card (glass surface, sticky bottom):
  - "Resume Match" label
  - Score ring: 78% in #F59E0B (circular progress)
  - "Tailor Resume" button (gradient, small)

[DESIGN SYSTEM block]
```

---

## PROMPT 13 — Portfolio Editor

```
Design the portfolio editor screen (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, "Portfolio" title, "Preview" text button right in #6366F1
- Portfolio toggle (glass surface card):
  - "Portfolio Active" label left
  - Toggle switch right (on = #6366F1)
  - Public URL: "wiseresume.app/p/ahmed" with copy icon

- Username field: glass input, "ahmed" value, availability check icon (green ✓)

- Theme section:
  - "Theme" label
  - 4 theme option cards (horizontal scroll):
    - Each: small preview thumbnail, name below
    - "Minimal", "Glassmorphic", "Gradient", "Professional"
    - Active theme: #6366F1 border

- Accent color picker:
  - 8 color circles in a row, active one has ring
  - Custom color text input

- Sections toggle list:
  - Each row: drag handle, section name, toggle switch
  - Sections: About, Experience, Education, Skills, Projects, Contact
  - Glass surface cards, 8px gap

- Resume sync:
  - "Sync from Resume" dropdown selector
  - "Auto" | "Manual" toggle

- "Save Changes" button (gradient, full width, fixed bottom)

[DESIGN SYSTEM block]
```

---

## PROMPT 14 — Public Portfolio

```
Design the public portfolio page (375px wide) for "WiseResume" — this is what visitors see.

Layout:
- NO app navigation (standalone public page)
- Hero section:
  - Background: gradient from #0B0D17 to #12141F with subtle star particles
  - Avatar (80px circle) centered with glass border ring
  - Name: "Ahmed Hassan" in Space Grotesk 24px bold
  - Title: "Senior Frontend Developer" in #94A3B8
  - Location: "Cairo, Egypt" with pin icon
  - "Open to Work" badge (green pill with pulse dot)

- Social links row: GitHub, LinkedIn, Twitter, Website — icon buttons in glass circles

- Bio section:
  - Glass card, "About" header
  - Bio paragraph in Inter 14px

- Experience section:
  - Glass card, "Experience" header
  - Timeline-style entries with dots and connecting line
  - Each entry: company, title, dates, description

- Skills section:
  - Glass card, "Skills" header
  - Skill tags in glass pills with proficiency dots

- Education section:
  - Glass card, entries with degree, school, dates

- Footer:
  - "Built with WiseResume" branding (small, #64748B)
  - "Download Resume" button (gradient)

[DESIGN SYSTEM block]
```

---

## PROMPT 15 — Settings: Main + Categories

```
Design the settings screen (375px wide) for "WiseResume".

Layout:
- Top bar: "Settings" title

- Profile card (glass surface, top):
  - Avatar (48px) left
  - Name "Ahmed Hassan" bold
  - Email "ahmed@example.com" in #94A3B8
  - "Edit Profile" link right in #6366F1

- Settings categories (grouped list, glass surface cards):

  **Account**
  - "Profile" — user icon, chevron right
  - "Email & Password" — lock icon, chevron
  - "Biometric Lock" — fingerprint icon, toggle switch

  **Preferences**
  - "Default Template" — layout icon, current value "Professional" right
  - "AI Provider" — cpu icon, "Gemini" right
  - "Language" — globe icon, "English" right

  **Data**
  - "Export All Data" — download icon, chevron
  - "Import Data" — upload icon, chevron
  - "Clear Cache" — trash icon, red text

  **About**
  - "Help & FAQ" — help-circle icon, chevron
  - "Report Bug" — bug icon, chevron
  - "Request Feature" — lightbulb icon, chevron
  - "Rate App" — star icon, chevron
  - "Version" — info icon, "2.1.0" right in #64748B

- "Sign Out" button (outline red, full width, bottom)
- "Delete Account" text link (red, small, centered below sign out)

- Bottom tab bar (Settings tab active)

[DESIGN SYSTEM block]
```

---

## PROMPT 16 — Profile Editor

```
Design the profile editor screen (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, "Edit Profile" title, "Save" text button right in #6366F1

- Avatar section (centered):
  - Large avatar circle (96px) with camera overlay icon
  - "Change Photo" text link below in #6366F1

- Form fields (glass surface cards, stacked):
  - "Full Name" — text input, value "Ahmed Hassan"
  - "Job Title" — text input, value "Senior Frontend Developer"
  - "Email" — text input (disabled/dimmed), value "ahmed@example.com"
  - "Phone" — text input with country code dropdown
  - "Location" — text input with pin icon
  - "Career Level" — dropdown: Junior/Mid/Senior/Lead/Director

- Social Links section header
  - "LinkedIn" — text input with LinkedIn icon prefix
  - "GitHub" — text input with GitHub icon prefix
  - "Twitter/X" — text input with X icon prefix
  - "Website" — text input with globe icon prefix

- Industry dropdown: "Technology", "Finance", "Healthcare", etc.
- "Open to Work" toggle with description text

- "Save Changes" button (gradient, full width, sticky bottom)

[DESIGN SYSTEM block]
```

---

## PROMPT 17 — Cover Letters: List + Editor

```
Design 2 mobile screens (375px wide) for "WiseResume" cover letters feature.

SCREEN 1 — Cover Letters List:
- Top bar: back arrow, "Cover Letters" title, "+" icon right
- Empty state (if no letters): envelope icon, "No cover letters yet", "Create one with AI" button
- Cover letter cards (vertical list):
  Card:
  - Glass surface, 12px radius
  - Title: "Frontend Developer — Google" bold
  - Template style badge: "Professional" glass pill
  - Date: "Created Jan 15, 2026" in #64748B
  - Preview snippet: first 2 lines of content in #94A3B8
  - Action icons row: edit, duplicate, delete (trash in red)

- FAB: "AI Generate" with sparkle icon, gradient

SCREEN 2 — Cover Letter Editor:
- Top bar: back arrow, "Edit Cover Letter" title, "..." menu right
- Form header (glass card):
  - "Job Title" input
  - "Company" input
  - "Tone" dropdown: Professional, Friendly, Confident, Enthusiastic
- Content area:
  - Full text editor (glass surface, rounded 12px)
  - Rich text toolbar at top: Bold, Italic, Bullet list
  - Letter content with proper formatting
  - Word count in bottom right: "342 words" in #64748B

- Bottom action bar:
  - "AI Rewrite" button (outline with sparkle icon)
  - "Copy" button (outline)
  - "Export PDF" button (gradient)

[DESIGN SYSTEM block]
```

---

## PROMPT 18 — Onboarding Wizard (4 Steps)

```
Design the onboarding wizard screen (375px wide) for "WiseResume" — shown after first signup.

Show a single screen with visual indicators for a 4-step flow:

- Progress dots at top: 4 dots, step 2 active (#6366F1), step 1 completed (#10B981)
- Step indicator: "Step 2 of 4" in #94A3B8

STEP 2 CONTENT — "Tell us about your career":
- Illustration area: briefcase icon with floating skill tags around it (animated feel)
- "What's your career level?" in Space Grotesk 20px bold
- Selection cards (single select, vertical):
  - "Student / Fresh Graduate" — graduation cap icon, glass card
  - "Junior (0-2 years)" — seedling icon, glass card
  - "Mid-Level (3-5 years)" — trending-up icon, glass card (SELECTED — #6366F1 border + fill)
  - "Senior (6+ years)" — star icon, glass card
  - "Lead / Manager" — users icon, glass card

- "What industry?" dropdown (glass surface)
- "Target job title" input (glass surface)

- Bottom navigation:
  - "Back" text button left
  - "Continue" gradient button right
  - "Skip for now" text link centered below

[DESIGN SYSTEM block]
```

---

## PROMPT 19 — Templates Gallery

```
Design the templates gallery screen (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, "Templates" title, search icon right
- Filter chips (horizontal scroll):
  - "All" (active, #6366F1), "Professional", "Creative", "Simple", "ATS-Friendly", "Modern"

- Sort: "Sort by: Popular" dropdown, small

- Templates grid (2 columns, 12px gap):
  Each template card:
  - Resume thumbnail (aspect 1:1.4, white background with resume content)
  - Glass surface border, rounded 12px
  - Shadow on hover state
  - Template name: "Executive Pro" in 13px bold
  - Category: "Professional" in 11px #94A3B8
  - Rating: 4.8 ★ in 11px #F59E0B
  - "PRO" badge (small amber pill) on premium templates (top right corner of thumbnail)
  - "Free" badge (small green pill) on free templates

  Show 6 templates:
  1. "Professional" — clean single column
  2. "Modern Split" — two-column layout
  3. "Minimal" — ultra clean with lots of whitespace
  4. "Creative" — colored sidebar
  5. "Executive" — traditional with serif fonts (PRO badge)
  6. "ATS Classic" — simple, no graphics

- "Load more" button at bottom (glass surface)

[DESIGN SYSTEM block]
```

---

## PROMPT 20 — Help + FAQ

```
Design the Help & FAQ screen (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, "Help & Support" title

- Search bar: glass surface, "Search for help..." placeholder, magnifying glass icon

- Quick actions (horizontal scroll, 3 cards):
  - "Report Bug" — bug icon, glass card
  - "Request Feature" — lightbulb icon, glass card
  - "Contact Support" — headphones icon, glass card

- FAQ section:
  - "Frequently Asked Questions" header in Space Grotesk 18px bold

  Accordion items (glass surface, expandable):
  - "How do I create a resume?" — chevron-down icon
  - "What is ATS scoring?" (EXPANDED):
    - Question in bold
    - Answer text in Inter 14px, #94A3B8
    - "ATS (Applicant Tracking System) scoring analyzes your resume against job descriptions to estimate how well your resume will perform..."
    - Helpful? thumbs up / thumbs down icons
  - "How do AI credits work?"
  - "Can I export to PDF?"
  - "How do I share my portfolio?"
  - "Is my data secure?"

- Categories section:
  - "Browse by Category" header
  - Category cards (2 columns): "Getting Started", "Resume Editor", "AI Features", "Account", "Billing", "Templates"

- Bottom: "Still need help?" glass card with "Contact Us" button

[DESIGN SYSTEM block]
```

---

## PROMPT 21 — Analytics / Insights

```
Design the analytics/insights screen (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, "Insights" title, date range picker right ("Last 30 days")

- Overview stats (2x2 grid of glass cards):
  - "Resumes Created" — "7" large number, +2 this month in green
  - "Applications Sent" — "12" large, +5 this month
  - "Portfolio Views" — "234" large, trending up arrow
  - "Avg ATS Score" — "76%" large, circular mini-progress

- "Resume Performance" section:
  - Bar chart (horizontal bars, glass surface card):
    - Y-axis: resume names
    - X-axis: ATS scores
    - Bars gradient #6366F1→#22D3EE
    - Top resume highlighted

- "Application Status" section:
  - Donut chart (glass surface card):
    - Segments: Applied (blue), Interview (cyan), Offered (green), Rejected (red)
    - Center: total "12" number
    - Legend below chart

- "Activity Timeline" section:
  - Timeline list with dots and connecting line:
    - "Created resume 'Product Manager'" — 2 days ago
    - "Applied to Google" — 4 days ago
    - "Portfolio viewed 12 times" — 1 week ago

[DESIGN SYSTEM block]
```

---

## PROMPT 22 — Subscription / Pricing

```
Design the subscription/pricing screen (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, "Upgrade" title
- Header: "Unlock Your Full Potential" in Space Grotesk 22px bold, centered
- Subtitle: "Choose the plan that works for you" in #94A3B8

- Toggle: "Monthly" | "Yearly (Save 40%)" — pill toggle, yearly active with #6366F1

- Plan cards (vertical stack):

  **Free Plan** (glass surface, current):
  - "Free" in 14px
  - "$0" in Space Grotesk 32px bold
  - "forever" subtitle
  - Features list (checkmarks in #94A3B8):
    - ✓ 1 resume
    - ✓ 3 templates
    - ✓ 10 AI credits/day
    - ✗ No priority support (dimmed, with X)
  - "Current Plan" button (disabled, outline)

  **Pro Plan** (glass surface with #6366F1 border glow, RECOMMENDED badge):
  - "Pro" in 14px
  - "$9" in Space Grotesk 32px bold + "/month" small
  - "billed yearly" subtitle in #94A3B8
  - Features list (checkmarks in #10B981):
    - ✓ Unlimited resumes
    - ✓ All 30 templates
    - ✓ Unlimited AI credits
    - ✓ Priority support
    - ✓ Custom portfolio domain
  - "Upgrade to Pro" button (gradient #6366F1→#818CF8)
  - "MOST POPULAR" badge top right (amber pill)

- Guarantee: "7-day money-back guarantee" with shield icon, centered

[DESIGN SYSTEM block]
```

---

## PROMPT 23 — Referral + Achievements

```
Design 2 mobile screens (375px wide) for "WiseResume".

SCREEN 1 — Referral:
- Top bar: back arrow, "Refer & Earn" title
- Hero card (glass surface with gradient border):
  - Gift icon (48px, gradient)
  - "Give 7 days Pro, Get 7 days Pro" in Space Grotesk 18px bold
  - "Share your code and both of you get premium access" in #94A3B8
- Referral code card:
  - Code: "AHMED2026" in monospace 24px bold, #6366F1
  - "Copy" button next to it
  - QR code below (rendered, 120px)
- Share buttons row: WhatsApp, Twitter, Email, "More" — circular glass icons
- Stats:
  - "Referrals" — "3" with people icon
  - "Days Earned" — "21" with calendar icon
- Referral history list:
  - "John D." — "Joined Jan 10" — "7 days earned" green badge

SCREEN 2 — Achievements:
- Top bar: back arrow, "Achievements" title
- Level progress (glass card):
  - "Level 5 — Career Pro" in bold
  - Progress bar: 60% to Level 6
  - "240 / 400 XP" in #94A3B8
- Badge grid (3 columns):
  Each badge (glass card, 80px):
  - Icon (32px, colored if earned, #64748B if locked)
  - Badge name in 11px
  - Earned badges: full color, checkmark
  - Locked badges: dimmed with lock overlay
  
  Badges: "First Resume ✓", "AI Explorer ✓", "Template Master ✓", "Job Hunter ✓", "5 Applications ✓", "Portfolio Live", "Interview Pro 🔒", "Referral King 🔒", "Speed Builder 🔒"

[DESIGN SYSTEM block]
```

---

## PROMPT 24 — Career Path + Quiz

```
Design the career path screen (375px wide) for "WiseResume".

Layout:
- Top bar: back arrow, "Career Path" title with compass icon
- Current assessment card (glass surface):
  - "Your Career Profile" header
  - Radar/spider chart (5 axes): Technical, Leadership, Communication, Creativity, Problem Solving
  - Chart in #6366F1 with fill opacity
  - "Based on your resume and quiz" in #94A3B8

- "Recommended Paths" section:
  Career path cards (vertical list):
  Card:
  - Glass surface, 12px radius
  - Path icon (32px, gradient)
  - Title: "Senior → Staff Engineer" in bold
  - Timeline: "Estimated 2-3 years"
  - Skills needed: tag pills — "System Design", "Mentoring", "Architecture"
  - Progress: "3/8 milestones completed" with progress bar
  - Chevron right

- "Take Career Quiz" button (gradient, with quiz icon):
  - If quiz not taken: "Discover your career strengths" subtitle
  - If quiz taken: "Retake quiz" with last date

- Milestone tracker:
  - Vertical timeline with dots
  - Completed: green dot + checkmark
  - Current: #6366F1 dot + pulse
  - Upcoming: #64748B dot

[DESIGN SYSTEM block]
```

---

## PROMPT 25 — Notifications + 404

```
Design 2 mobile screens (375px wide) for "WiseResume".

SCREEN 1 — Notifications:
- Top bar: "Notifications" title, "Mark all read" text button right in #6366F1
- Filter tabs: "All" (active), "Unread (3)", "System"

- Notification list:
  Unread item (glass surface, slight #6366F1 left border):
  - Icon: sparkle (32px, #6366F1)
  - Title: "Resume analyzed successfully" bold
  - Body: "Your 'Product Manager' resume scored 82% ATS compatibility"
  - Time: "5 min ago" in #64748B
  - Blue unread dot right

  Read item (glass surface, no left border):
  - Icon: briefcase (#94A3B8)
  - Title: "Application status updated"
  - Body: "Google — Senior Developer moved to Interview stage"
  - Time: "2 hours ago"

  System item:
  - Icon: info circle
  - Title: "New templates available"
  - Body: "5 new professional templates added to the gallery"
  - Time: "Yesterday"

- Empty state (if no notifications): bell icon with slash, "All caught up!"

SCREEN 2 — 404 Page:
- Full screen, centered content
- Illustration: astronaut floating in space with broken document
- Small star particles scattered (animated feel, #6366F1 and #22D3EE)
- "Lost in Space" in Space Grotesk 28px bold
- "404 — The page you're looking for has drifted into the cosmos" in Inter 14px, #94A3B8
- "Go Home" button (gradient)
- "Report Issue" text link below

[DESIGN SYSTEM block]
```

---

## PROMPT 26 — Landing Page: Hero + Features

```
Design the landing page hero section (375px wide, mobile-first) for "WiseResume".

Layout (single scroll section):
- Navigation bar (glass surface, sticky):
  - Logo left: gradient icon + "WiseResume" text
  - Hamburger menu right (mobile)

- Hero section:
  - Background: deep space gradient #0B0D17 → #1a1a2e with animated star particles
  - Badge: "✨ AI-Powered" glass pill, centered above heading
  - Heading: "Build Resumes That Land Interviews" in Space Grotesk 32px bold, #F8FAFC
  - Subheading: "AI-powered resume builder with ATS optimization, mock interviews, and career guidance" in Inter 16px, #94A3B8
  - CTA buttons:
    - "Get Started Free" — gradient #6366F1→#818CF8, large
    - "Watch Demo" — outline glass, with play icon
  - Social proof: "Join 50,000+ job seekers" with small avatar stack (5 overlapping circles)

- Features grid (below hero):
  - "Why WiseResume?" header
  - 3 feature cards (vertical stack on mobile):
    Card (glass surface, 16px padding):
    - Icon (40px, gradient colored)
    - Title in bold 16px
    - Description in 14px #94A3B8
  
  Features:
  1. "30+ Templates" — layout icon — "Professional designs optimized for ATS"
  2. "AI Analysis" — brain icon — "Get instant feedback and ATS scoring"
  3. "Smart Tailoring" — target icon — "Customize for each job application"

[DESIGN SYSTEM block]
```

---

## PROMPT 27 — Landing Page: CTA + Footer

```
Design the bottom section of the landing page (375px wide) for "WiseResume".

Layout (continuation of landing page scroll):

- Testimonials section:
  - "What Users Say" header
  - Testimonial cards (horizontal scroll):
    Card (glass surface):
    - Quote text in italic 14px
    - 5 star rating (#F59E0B)
    - Author name bold + job title in #94A3B8
    - Small avatar circle

- Stats section (glass card, full width):
  - 3 stats in a row:
    - "50K+" — "Active Users"
    - "100K+" — "Resumes Created"
    - "85%" — "Interview Rate"

- Final CTA section:
  - Background: gradient with glass overlay
  - "Ready to Land Your Dream Job?" in Space Grotesk 24px bold
  - "Start building your ATS-optimized resume in minutes" in #94A3B8
  - "Create Free Resume" button (large, gradient, with arrow icon)
  - "No credit card required" in 12px #64748B

- Footer (darker surface):
  - Logo + tagline
  - Link columns: Product, Resources, Company, Legal
  - Social icons row: Twitter, LinkedIn, GitHub, Instagram
  - "© 2026 WiseResume. All rights reserved." in #64748B
  - "Made with ❤️ in Cairo" in #64748B

[DESIGN SYSTEM block]
```

---

## PROMPT 28 — Resignation Letters: List + Editor

```
Design 2 mobile screens (375px wide) for "WiseResume" resignation letters feature.

SCREEN 1 — Resignation Letters List:
- Top bar: back arrow, "Resignation Letters" title, "+" icon right
- Info banner (glass surface, #F59E0B/10% bg):
  - Info icon
  - "Need to resign professionally? AI can help you write the perfect letter."
  - Dismiss X

- Letter cards (vertical list):
  Card (glass surface):
  - Title: "Resignation — Google" bold
  - Company + position in #94A3B8
  - Last working day: "March 15, 2026" with calendar icon
  - Notice period badge: "2 weeks" glass pill
  - Tone badge: "Professional" glass pill
  - Created date: "Jan 20, 2026" in #64748B
  - Action icons: edit, duplicate, export, delete

- FAB: "AI Generate" with sparkle icon

SCREEN 2 — Resignation Letter Editor:
- Top bar: back arrow, "Edit Letter" title, "..." menu right
- Form section (glass cards):
  - "Recipient Name" input
  - "Company" input
  - "Position" input
  - "Last Working Day" date picker
  - "Notice Period" dropdown: 2 weeks, 1 month, 3 months
  - "Reason" dropdown: New opportunity, Personal, Relocation, Other
  - "Tone" chips: Professional (active), Grateful, Brief, Formal

- Letter content (glass surface text area):
  - Formatted letter text
  - Word count bottom right

- Checklist section (glass card):
  - "Departure Checklist" header
  - Checklist items with toggles:
    - ☑ Submit formal letter
    - ☐ Return company property
    - ☐ Complete handover documentation
    - ☐ Update LinkedIn profile

- Bottom bar: "AI Rewrite" (outline), "Export PDF" (gradient)

[DESIGN SYSTEM block]
```

---

## 📋 Usage Instructions

### How to Use These Prompts with Google Stitch

1. **Open Google Stitch** (stitch.google.com or the Stitch tool)
2. **Copy the DESIGN SYSTEM block** from the top of this file
3. **Copy the specific prompt** you want to generate
4. **Combine them**: paste the Design System block first, then the prompt
5. **Generate**: Stitch will create a visual mockup of that screen
6. **Iterate**: if the result isn't perfect, add more specific instructions about what to change
7. **Export**: download the generated image to use as reference when building

### Tips for Better Stitch Results
- Always include the Design System block for color consistency
- If Stitch ignores colors, try using "dark background #0B0D17" explicitly
- For glass effects, emphasize "semi-transparent white overlay with blur"
- Generate one screen at a time for best results
- If a prompt generates too much, split it further

### Cross-Reference
- **Design specs**: `docs/APP_BLUEPRINT.md`
- **Build prompts**: `docs/REBUILD_PROMPTS.md`
- **Inspiration sources**: `docs/INSPIRATION_WEB.md`

---

*Last updated: February 2026*
*Total prompts: 28 (generating ~38 screens)*
