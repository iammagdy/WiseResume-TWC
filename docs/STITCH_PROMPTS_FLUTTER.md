# 📱 WiseResume — Google Stitch Prompts (Flutter / Mobile App)

> Granular, self-contained prompts for generating UI mockups of every WiseResume Flutter app screen using Google Stitch.
> Each prompt generates 1-2 screens max. Adapted for native mobile conventions (status bar, system nav, safe areas, bottom sheets).

---

## 🎯 Design System Reference (Include in Every Prompt)

Use this block as a **prefix** for every Stitch prompt below:

```
DESIGN SYSTEM (Mobile Native):
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
- Border radius: 12px (cards), 8px (buttons), 24px (bottom sheets)
- Viewport: 390x844 (iPhone 14 / standard Android)
- Style: Dark theme, glassmorphism, subtle gradients, space/cosmic feel
- NATIVE: Include status bar (light text on dark), safe area padding, system navigation bar area at bottom
- NATIVE: Use Material 3 patterns (NavigationBar, FAB, BottomSheet, etc.)
```

---

## PROMPT 1 — Splash Screen: Animated Logo + Stars

```
Design a mobile splash screen (390x844) for a native app called "WiseResume".

Layout:
- Full screen dark background: gradient from #0B0D17 (top) to #12141F (bottom)
- Status bar: light text (white icons)
- Center of screen:
  - App icon: a gradient document icon (indigo #6366F1 to cyan #22D3EE) with rounded corners
  - Small star sparkles floating around the icon (4-6 stars, varying sizes, #6366F1 and #22D3EE)
  - The icon has a subtle glow/shadow underneath
- Below icon (24px gap):
  - "WiseResume" in Space Grotesk 28px bold, #F8FAFC
  - "AI-Powered Career Platform" in Inter 14px, #94A3B8
- Loading indicator: thin horizontal progress bar at bottom (48px from bottom), gradient #6366F1→#22D3EE, subtle animation feel
- System nav bar area: dark, matches background

Feel: premium, calm, space-themed. The stars give a cosmic/aspirational feel.

[DESIGN SYSTEM block]
```

---

## PROMPT 2 — Auth: Email Entry + Login

```
Design 2 mobile screens (390x844, native app) for "WiseResume" authentication.

SCREEN 1 — Email Entry:
- Status bar: light text on dark
- Safe area padding top
- Centered app logo (gradient document icon) with star sparkles, 80px
- "WiseResume" in Space Grotesk 24px bold, #F8FAFC
- "AI-Powered Career Platform" in Inter 14px, #94A3B8
- 32px gap
- Email text field: Material 3 OutlinedTextField style, glass surface fill, rounded 8px, "Enter your email" label
- 16px gap
- "Continue" button: full width, gradient #6366F1→#818CF8, rounded 12px, 48px height, white text
- 24px gap
- Divider with "or" text centered
- Social login row: Google icon button, Apple icon button — circular glass surface, 48px each
- Bottom: "Don't have an account? Sign up" — "Sign up" in #6366F1
- System nav bar area at bottom

SCREEN 2 — Password Login:
- Status bar, back arrow (←) top left in safe area
- "Welcome back" in Space Grotesk 22px bold
- User email chip: glass pill showing "ahmed@example.com"
- Password text field: glass surface, obscured, eye toggle icon right
- "Forgot password?" aligned right, #6366F1, 14px
- "Sign In" button: full width gradient
- "Use Biometric" button: fingerprint icon, glass surface outline button
- System nav bar area

[DESIGN SYSTEM block]
```

---

## PROMPT 3 — Auth: Signup + Reset Password

```
Design 2 mobile screens (390x844, native app) for "WiseResume".

SCREEN 1 — Signup:
- Status bar, back arrow top left
- "Create Account" in Space Grotesk 22px bold
- "Join thousands of job seekers" in Inter 14px, #94A3B8
- Form fields (glass surface text fields, 12px gap):
  - Full name (person icon prefix)
  - Email (mail icon prefix)
  - Password (lock icon prefix, eye toggle suffix) with strength bar below (red→amber→green)
  - Confirm password
- Checkbox: "I agree to Terms of Service and Privacy Policy" (links in #6366F1)
- "Create Account" button: full width gradient
- Bottom: "Already have an account? Sign in"
- System nav bar

SCREEN 2 — Reset Password:
- Status bar, back arrow
- Lock icon centered (64px, #6366F1 with glow effect)
- "Reset Password" in Space Grotesk 22px bold
- Description text in #94A3B8
- Email text field (glass surface)
- "Send Reset Link" button: full width gradient
- Success variation: checkmark icon (green 64px), "Check your email" text, "Open Email App" button (outline)
- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 4 — Dashboard: Main View with FAB

```
Design the main dashboard screen (390x844, native mobile) for "WiseResume".

Layout (top to bottom):
- Status bar (light text)
- App bar: "WiseResume" logo left, notification bell (with red badge dot) + avatar circle right
- "Good morning, Ahmed 👋" in Space Grotesk 20px bold
- "3 resumes · 2 pending applications" in Inter 14px, #94A3B8

- Stats cards (horizontal scroll, 3 glass cards):
  - "Resumes" — "3" large — document icon — #6366F1 accent line top
  - "Applications" — "5" — briefcase icon — #22D3EE accent
  - "AI Credits" — "8/10" — sparkle icon — #F59E0B accent

- "Quick Actions" label
- Action chips (horizontal scroll): "New Resume" ✨, "Upload" ↑, "AI Studio" 🧠, "Templates" 📋 — glass pills

- "My Resumes" section header + "See all" link right
- Resume cards (vertical list):
  Card (glass surface, 12px radius):
  - Left: tiny template preview thumbnail
  - Center: title bold, target job muted, "Edited 2h ago"
  - Right: 3-dot menu
  - Bottom: ATS score badge pill (green >70, amber 50-70, red <50)

- Material 3 FAB (bottom right): "+" icon, 56px, gradient #6366F1→#818CF8, elevated shadow

- Bottom NavigationBar (Material 3):
  - 5 items: Home (active, #6366F1 filled icon), Editor, AI Studio, Applications, Settings
  - Glass surface background, labels below icons

- System nav bar area

[DESIGN SYSTEM block]
```

---

## PROMPT 5 — Dashboard: Empty State + Quick Actions

```
Design the dashboard empty state (390x844, native mobile) for "WiseResume".

Layout:
- Same app bar as dashboard (logo, bell, avatar)
- "Good morning, Ahmed 👋"
- Stats all showing "0"
- Center content:
  - Large document icon (120px) with dotted outline, #64748B
  - Floating star sparkles (small, #6366F1 and #22D3EE)
  - "No resumes yet" in Space Grotesk 20px bold
  - "Create your first resume and let AI help you land your dream job" in Inter 14px, #94A3B8, centered
  - "Create Resume" button (gradient, sparkle icon left)
  - "Upload Existing Resume" text link in #6366F1 below

- FAB expanded state overlay (show as variation):
  - Background dimmed (rgba(0,0,0,0.6) blur)
  - FAB transforms into 4 stacked options (bottom up):
    - "Create New" — document+ icon, glass pill
    - "Upload Resume" — upload icon, glass pill
    - "Import LinkedIn" — LinkedIn icon, glass pill
    - "Use Template" — grid icon, glass pill

- Bottom NavigationBar
- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 6 — Resume Editor: Section Stepper + Toolbar

```
Design the resume editor screen (390x844, native mobile) for "WiseResume".

Layout:
- Status bar
- Top app bar: back arrow, "Edit Resume" center, 3-dot overflow menu right
- Section stepper (horizontal scroll, below app bar):
  - Pill chips: Contact, Summary, Experience, Education, Skills, Projects, Certifications, Awards, Publications, Volunteering, Hobbies, References, Custom
  - Active: filled #6366F1, white text
  - Completed: outlined #10B981 border, checkmark prefix
  - Upcoming: glass surface, #94A3B8 text

- Content area (showing "Experience"):
  - "Work Experience" header + "Add +" button right (#6366F1)
  - Experience card (glass surface):
    - "Senior Developer" in bold
    - "Google" in #94A3B8
    - "Jan 2022 - Present" date pill
    - Bullet points with drag handles left, delete icons right
    - "Add bullet point" dashed button
  - Collapsed second entry
  - "Add Experience" dashed glass card with + icon

- AI floating chip: "✨ Enhance with AI" — small glass pill, floating above toolbar

- Bottom toolbar (fixed, glass surface):
  - 5 icons in row: Template, Customize, Preview (eye), Share, More
  - Active icon #6366F1, inactive #94A3B8

- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 7 — Resume Editor: Bottom Sheets (Template, Customize, Export)

```
Design 3 mobile bottom sheet overlays (390x844) for the "WiseResume" editor.

SCREEN 1 — Template Selector Bottom Sheet:
- Editor screen dimmed behind
- Bottom sheet: 60% height, rounded top 24px, glass surface with blur
- Handle bar (40px wide, 4px height, centered)
- "Choose Template" in Space Grotesk 18px bold
- Filter chips: "All", "Professional", "Creative", "Simple", "ATS-Friendly"
- Grid (2 columns): template thumbnails with names, active has #6366F1 border glow
- "PRO" amber badges on premium ones

SCREEN 2 — Customize Bottom Sheet:
- 70% height bottom sheet
- "Customize" title
- Accordion sections:
  - Font: family dropdown + size slider
  - Colors: 8 preset circles + custom picker
  - Spacing: line height + section gap sliders
  - Layout: 1-col / 2-col toggle
  - Header Style: 3 thumbnail options
- "Reset" text button (#EF4444), "Apply" gradient button

SCREEN 3 — Export Bottom Sheet:
- 40% height bottom sheet
- "Export Resume" title
- Export options (vertical list, glass cards):
  - "Download PDF" — PDF icon, chevron right
  - "Download DOCX" — Word icon, chevron
  - "Share Link" — link icon, chevron
  - "Print" — printer icon, chevron
- Quality selector: "Standard" | "High" toggle

[DESIGN SYSTEM block]
```

---

## PROMPT 8 — Resume Preview: InteractiveViewer + Page Nav

```
Design the resume preview screen (390x844, native mobile) for "WiseResume".

Layout:
- Status bar
- Top app bar: back arrow, "Preview" center, share icon + download icon right
- Preview area:
  - A4 resume on white background, rendered within the dark frame
  - Shows a professional template: header, summary, experience (2 entries), education, skills
  - Pinch-to-zoom hint overlay: two-finger spread icon, "Pinch to zoom" text, fades

- Page navigation:
  - "Page 1 of 2" centered below preview
  - Left/right chevron arrows
  - 2 dot indicators (first active #6366F1)

- Bottom action bar (glass surface, fixed above system nav):
  - "Edit" button (outline, left)
  - "Download PDF" button (gradient center, download icon)
  - "Share" button (outline, right)

- Floating zoom controls (right edge, vertical glass pill): + and − buttons

- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 9 — Upload: File Picker + Parse Progress

```
Design the upload screen (390x844, native mobile) for "WiseResume".

Layout:
- Top app bar: back arrow, "Import Resume"
- Tab bar (Material 3): "Upload File" (active) | "Paste Text" | "LinkedIn"

- Upload zone:
  - Large dashed border rectangle, glass surface inside, rounded 16px
  - Cloud upload icon (48px, #6366F1) centered
  - "Tap to select a file" in Space Grotesk 18px bold
  - "PDF, DOCX, TXT, PNG, JPG" in glass pill badges
  - "Max 10MB" in #64748B

- Parse progress variation:
  - File: "resume_2024.pdf" with PDF icon
  - Progress bar: gradient #6366F1→#22D3EE, 60%
  - "Parsing document..." with spinner
  - "Cancel" in #EF4444

- Parse complete variation:
  - Green checkmark (48px)
  - "Resume parsed!"
  - Found sections: ✓ Contact, ✓ Experience, ✓ Education, ✓ Skills
  - "Review & Edit" gradient button
  - "Upload Another" link

- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 10 — AI Studio: Tool Grid + Chat Bar

```
Design the AI Studio screen (390x844, native mobile) for "WiseResume".

Layout:
- Status bar
- App bar: "AI Studio" with sparkle icon
- Credits banner (glass card):
  - "8/10 credits today" with thin progress bar
  - "Upgrade" link in #6366F1

- Search bar: glass surface, "Search AI tools..."
- Category tabs: "All", "Resume", "Career", "Interview", "Writing"

- Tool grid (2 columns, 12px gap):
  Each card (glass surface, 16px padding):
  - Gradient icon (32px)
  - Tool name bold 14px
  - Description 12px #94A3B8
  - Arrow → bottom right

  Tools:
  1. "Analyze Resume" — magnifying glass — #6366F1 — "ATS score & suggestions"
  2. "Tailor Resume" — target — #22D3EE — "Match to job description"
  3. "Enhance Section" — sparkle — #818CF8 — "Improve with AI"
  4. "Proofread" — check-circle — #10B981 — "Fix grammar & clarity"
  5. "Cover Letter" — file-text — #F59E0B — "Generate letters"
  6. "Mock Interview" — mic — #EF4444 — "Practice interviews"
  7. "Career Path" — compass — #6366F1 — "Explore careers"
  8. "Ask AI" — message — #22D3EE — "Chat about career"

- Bottom: "Ask AI" floating bar (glass surface, "Ask anything..." placeholder, send icon)

- Bottom NavigationBar (AI Studio active)
- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 11 — Mock Interview: Voice Chat + Waveform

```
Design the mock interview screen (390x844, native mobile) for "WiseResume".

Layout:
- Status bar
- App bar: back arrow, "Mock Interview", timer "03:24" with red recording dot
- Interview type pill: "Behavioral — Software Engineer" glass badge

- Chat messages (scrollable):
  - AI bubble (left, glass surface):
    - Robot avatar (24px, #6366F1)
    - "Tell me about a time you led a team through a difficult project."
    - "2:30" timestamp
  - User bubble (right, #6366F1/15% background):
    - "In my previous role at Google, I led a team of 5 engineers..."
    - "2:45" timestamp
    - Feedback mini-badge: "Good ✓" in green
  - AI follow-up bubble:
    - "What was the biggest challenge?"
  - Typing indicator: 3 dots in glass bubble

- Voice area (bottom, fixed):
  - Audio waveform visualization: horizontal bars in #6366F1 gradient
  - Large mic button: 64px circle, gradient, centered
  - "Tap to speak" below mic
  - Left: "Type" text button
  - Right: "End" red text button
  - When active: pulsing ring around mic, waveform animated

- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 12 — Applications: List + Status Filters

```
Design the applications tracking screen (390x844, native mobile) for "WiseResume".

Layout:
- Status bar
- App bar: "Applications", search icon + filter icon right
- Status chips (horizontal scroll):
  - "All (12)" active #6366F1
  - "Applied (5)" #818CF8
  - "Interview (3)" #22D3EE
  - "Offered (1)" #10B981
  - "Rejected (3)" #EF4444

- Sort: "Latest" dropdown

- Application cards:
  Card 1 (glass surface):
  - Company logo circle (40px) left
  - "Senior Frontend Developer" bold
  - "Google" in #94A3B8
  - "Interview" cyan pill badge
  - "Applied Jan 15" in #64748B
  - Chevron right

  Card 2:
  - "Product Designer" — "Meta" — "Applied" purple pill

  Card 3 (dimmed):
  - "Data Scientist" — "Netflix" — "Rejected" red pill

- Material 3 FAB: "+" gradient for new application

- Bottom NavigationBar (Applications active)
- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 13 — Application Detail + Job Detail

```
Design 2 mobile screens (390x844) for "WiseResume".

SCREEN 1 — Application Detail:
- App bar: back arrow, "Application", edit icon right
- Status card (glass surface):
  - Company logo (48px) + "Google" + "Senior Frontend Developer"
  - Status: "Interview" large cyan pill
  - Applied date: "January 15, 2026"
  - Deadline: "February 28, 2026" with calendar icon
- Timeline (vertical):
  - ✅ Applied — Jan 15
  - ✅ Resume Reviewed — Jan 20
  - 🔵 Interview Scheduled — Feb 5 (current, #6366F1 pulse)
  - ⬜ Decision — pending
- Resume used: card showing linked resume with "View" link
- Cover letter: linked card or "Generate" button
- Notes text area (glass surface)
- "View Job Posting" button (outline)
- URL link in #6366F1

SCREEN 2 — Job Detail:
- App bar: back arrow, bookmark icon, share icon
- Company card (glass surface):
  - Logo 64px centered
  - "Senior Frontend Developer" bold 20px
  - "Google" 16px #94A3B8
  - "Mountain View, CA · Remote" pin icon
  - "$150k-$200k" in #10B981
- "Apply Now" gradient button + "Save" outline button row
- Tabs: "Description" | "Requirements" | "Company"
- Content: paragraphs, bullet list with cyan dots, skill tags
- Match card (glass, sticky bottom): score ring 78%, "Tailor Resume" button
- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 14 — Portfolio Editor: Toggle + Theme Picker

```
Design the portfolio editor (390x844, native mobile) for "WiseResume".

Layout:
- App bar: back arrow, "Portfolio", "Preview" text button right in #6366F1
- Portfolio toggle card (glass surface):
  - "Portfolio Active" + toggle switch (#6366F1 when on)
  - URL: "wiseresume.app/p/ahmed" with copy icon
- Username field (glass surface, green ✓ availability)
- Theme section:
  - "Theme" label
  - 4 theme cards (horizontal scroll): preview thumbnails with names
  - Active theme: #6366F1 border
- Accent color: 8 circles + custom input
- Sections (drag-reorderable list):
  - Rows: drag handle | section name | toggle
  - About, Experience, Education, Skills, Projects, Contact
- Resume sync: dropdown + "Auto"/"Manual" toggle
- "Save Changes" gradient button (sticky bottom)
- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 15 — Public Portfolio: Standalone Page

```
Design the public portfolio page (390x844) for "WiseResume" — visitor view, no app chrome.

Layout:
- Status bar
- NO bottom navigation bar (standalone page)
- Hero: gradient background with stars
  - Avatar (80px) with glass ring
  - "Ahmed Hassan" Space Grotesk 24px bold
  - "Senior Frontend Developer" #94A3B8
  - "Cairo, Egypt" pin icon
  - "Open to Work" green pill with pulse dot
- Social icons row: GitHub, LinkedIn, Twitter, Website — glass circles
- About section (glass card): bio paragraph
- Experience (glass card): timeline with dots + line
- Skills (glass card): tag pills with proficiency dots
- Education (glass card): degree, school, dates
- Footer: "Built with WiseResume" in #64748B, "Download Resume" button

[DESIGN SYSTEM block]
```

---

## PROMPT 16 — Settings: Categories + Rows

```
Design the settings screen (390x844, native mobile) for "WiseResume".

Layout:
- App bar: "Settings"
- Profile card (glass surface): avatar 48px, name bold, email #94A3B8, "Edit" link
- Category groups (glass surface cards with rows):

  **Account**:
  - Profile — user icon, chevron
  - Email & Password — lock icon, chevron
  - Biometric Lock — fingerprint, toggle

  **Preferences**:
  - Default Template — layout icon, "Professional" value
  - AI Provider — cpu icon, "Gemini"
  - Language — globe, "English"

  **Data**:
  - Export All Data — download, chevron
  - Import Data — upload, chevron
  - Clear Cache — trash, red text

  **About**:
  - Help & FAQ — help icon, chevron
  - Report Bug — bug icon
  - Request Feature — lightbulb
  - Version — info, "2.1.0" #64748B

- "Sign Out" outline red button
- "Delete Account" small red link

- Bottom NavigationBar (Settings active)
- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 17 — Profile Editor: Avatar + Form

```
Design the profile editor (390x844, native mobile) for "WiseResume".

Layout:
- App bar: back arrow, "Edit Profile", "Save" in #6366F1 right
- Avatar: 96px circle centered, camera icon overlay, "Change Photo" link
- Form (glass surface cards):
  - Full Name — "Ahmed Hassan"
  - Job Title — "Senior Frontend Developer"
  - Email — disabled/dimmed
  - Phone — with country code dropdown
  - Location — pin icon
  - Career Level — dropdown (Junior/Mid/Senior/Lead)
- Social Links header:
  - LinkedIn — with icon prefix
  - GitHub — icon prefix
  - Twitter/X — icon prefix
  - Website — globe prefix
- Industry dropdown
- "Open to Work" toggle
- "Save Changes" gradient button (sticky bottom)
- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 18 — Cover Letters: List + Generator

```
Design 2 mobile screens (390x844) for "WiseResume" cover letters.

SCREEN 1 — List:
- App bar: back arrow, "Cover Letters", "+" right
- Cards (glass surface):
  - Title: "Frontend Developer — Google" bold
  - Style badge: "Professional"
  - Date: "Jan 15, 2026"
  - Preview: 2-line snippet #94A3B8
  - Actions: edit, duplicate, delete
- FAB: "AI Generate" sparkle

SCREEN 2 — Editor:
- App bar: back arrow, "Edit Cover Letter", "..." menu
- Form header (glass card): Job Title, Company, Tone dropdown
- Content editor (glass surface): formatted text, toolbar (Bold, Italic, List)
- Word count: "342 words" #64748B
- Bottom bar: "AI Rewrite" outline, "Copy" outline, "Export PDF" gradient

[DESIGN SYSTEM block]
```

---

## PROMPT 19 — Resignation Letters: List + Generator

```
Design 2 mobile screens (390x844) for "WiseResume" resignation letters.

SCREEN 1 — List:
- App bar: back arrow, "Resignation Letters", "+"
- Info banner: amber glass, tip about professional resignation
- Cards: title, company, last day date, notice period pill, tone pill, actions
- FAB: "AI Generate"

SCREEN 2 — Editor:
- App bar: back, "Edit Letter", "..."
- Form (glass cards): Recipient, Company, Position, Last Working Day (date picker), Notice Period dropdown, Reason dropdown, Tone chips
- Content area (glass): formatted letter
- Checklist (glass card): "Departure Checklist" with toggles
- Bottom: "AI Rewrite" + "Export PDF"

[DESIGN SYSTEM block]
```

---

## PROMPT 20 — Onboarding: 4-Step PageView

```
Design the onboarding screen (390x844) for "WiseResume" — shown after signup.

Layout:
- Status bar
- Progress: 4 dots top, step 2 active (#6366F1), step 1 completed (#10B981)
- "Step 2 of 4" in #94A3B8

- Content (PageView feel):
  - Illustration: briefcase icon with floating skill tags
  - "What's your career level?" Space Grotesk 20px bold
  - Selection cards (single-select):
    - "Student / Fresh Graduate" — 🎓
    - "Junior (0-2 years)" — 🌱
    - "Mid-Level (3-5 years)" — 📈 (SELECTED, #6366F1 border + fill)
    - "Senior (6+ years)" — ⭐
    - "Lead / Manager" — 👥
  - "Industry" dropdown
  - "Target job title" text field

- Bottom:
  - "Back" left, "Continue" gradient right
  - "Skip for now" link centered below

- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 21 — Templates Gallery: Grid + Filters

```
Design the templates gallery (390x844, native mobile) for "WiseResume".

Layout:
- App bar: back arrow, "Templates", search icon
- Filter chips: "All" (active), "Professional", "Creative", "Simple", "ATS-Friendly"
- Sort: "Popular" dropdown

- Grid (2 columns):
  Each card (glass border, 12px radius):
  - Template thumbnail (1:1.4 ratio, white bg)
  - Name: "Executive Pro" bold 13px
  - Category: "Professional" 11px #94A3B8
  - Rating: 4.8 ★ #F59E0B
  - "PRO" amber badge or "Free" green badge

  6 templates shown

- "Load more" glass button at bottom
- System nav bar

[DESIGN SYSTEM block]
```

---

## PROMPT 22 — Help + FAQ: Accordion Search

```
Design the Help & FAQ screen (390x844, native mobile) for "WiseResume".

Layout:
- App bar: back arrow, "Help & Support"
- Search bar: glass surface, "Search for help..."
- Quick action cards (horizontal scroll): "Report Bug", "Request Feature", "Contact Support"
- "FAQ" header
- Accordion (glass surface, expandable):
  - "How do I create a resume?" — closed
  - "What is ATS scoring?" — OPEN: answer text + thumbs up/down
  - "How do AI credits work?" — closed
  - "Can I export to PDF?" — closed
  - More items
- Categories grid (2 cols): "Getting Started", "Resume Editor", "AI Features", "Account", "Billing", "Templates"
- "Still need help?" glass card with "Contact Us" button

[DESIGN SYSTEM block]
```

---

## PROMPT 23 — Analytics: Charts + Stats

```
Design the analytics screen (390x844, native mobile) for "WiseResume".

Layout:
- App bar: back arrow, "Insights", date range picker "Last 30 days"
- Stats grid (2x2 glass cards):
  - "Resumes" — "7" + green "+2"
  - "Applications" — "12" + "+5"
  - "Portfolio Views" — "234" ↑
  - "Avg ATS" — "76%" circular mini
- Bar chart (glass card): resume names vs ATS scores, gradient bars
- Donut chart (glass card): application statuses, center total "12"
- Activity timeline: dot + line, recent events with dates

[DESIGN SYSTEM block]
```

---

## PROMPT 24 — Subscription: Plan Cards

```
Design the subscription screen (390x844) for "WiseResume".

Layout:
- App bar: back arrow, "Upgrade"
- "Unlock Your Full Potential" heading centered
- Toggle: "Monthly" | "Yearly (Save 40%)" — pill, yearly active
- Free plan card (glass, current): $0, features with ✓/✗
- Pro plan card (glass, #6366F1 glow border, "MOST POPULAR" badge):
  - "$9/month" billed yearly
  - All features ✓ in green
  - "Upgrade to Pro" gradient button
- "7-day money-back guarantee" shield icon

[DESIGN SYSTEM block]
```

---

## PROMPT 25 — Referral: Code + QR + Rewards

```
Design the referral screen (390x844) for "WiseResume".

Layout:
- App bar: back arrow, "Refer & Earn"
- Hero card (glass + gradient border): gift icon, "Give 7 days Pro, Get 7 days Pro"
- Code card: "AHMED2026" monospace bold #6366F1, copy button, QR code 120px below
- Share row: WhatsApp, Twitter, Email, More — glass circles
- Stats: "3 Referrals" people icon, "21 Days Earned" calendar
- History list: name, date, "7 days" green badge

[DESIGN SYSTEM block]
```

---

## PROMPT 26 — Achievements: Badge Grid

```
Design the achievements screen (390x844) for "WiseResume".

Layout:
- App bar: back arrow, "Achievements"
- Level card (glass): "Level 5 — Career Pro", progress bar 60%, "240/400 XP"
- Badge grid (3 columns, glass cards 80px each):
  - Earned: full color icon + checkmark, name below
  - Locked: dimmed + lock overlay
  Badges: "First Resume ✓", "AI Explorer ✓", "Template Master ✓", "Job Hunter ✓", "5 Applications ✓", "Portfolio Live", "Interview Pro 🔒", "Referral King 🔒", "Speed Builder 🔒"

[DESIGN SYSTEM block]
```

---

## PROMPT 27 — Career Path: Roadmap + Quiz

```
Design the career path screen (390x844) for "WiseResume".

Layout:
- App bar: back arrow, "Career Path" compass icon
- Assessment card (glass): radar chart 5 axes, "Based on your resume & quiz"
- Recommended paths (cards):
  - "Senior → Staff Engineer" — "2-3 years" — skill tags — "3/8 milestones" progress
- "Take Career Quiz" gradient button
- Milestone timeline: green ✅ completed, #6366F1 🔵 current (pulse), gray ⬜ upcoming

[DESIGN SYSTEM block]
```

---

## PROMPT 28 — Notifications: List + Empty State

```
Design the notifications screen (390x844) for "WiseResume".

Layout:
- App bar: "Notifications", "Mark all read" right in #6366F1
- Tabs: "All", "Unread (3)", "System"
- Notifications:
  Unread (glass, #6366F1 left border):
  - Sparkle icon, "Resume analyzed" bold, snippet, "5 min ago", blue dot
  Read (glass, no border):
  - Briefcase icon, "Application updated", "2 hours ago"
  System:
  - Info icon, "New templates", "Yesterday"
- Empty state variation: bell-slash icon, "All caught up!"

[DESIGN SYSTEM block]
```

---

## PROMPT 29 — 404: Space Theme Error

```
Design a 404 error screen (390x844, native mobile) for "WiseResume".

Layout:
- Full screen, centered
- Illustration: astronaut floating in space with broken/torn document
- Star particles (various sizes, #6366F1 and #22D3EE)
- Planet/moon in corner (subtle)
- "Lost in Space" Space Grotesk 28px bold
- "404 — The page you're looking for has drifted into the cosmos" Inter 14px #94A3B8
- "Go Home" gradient button
- "Report Issue" text link

[DESIGN SYSTEM block]
```

---

## PROMPT 30 — Guides: List + Detail

```
Design 2 mobile screens (390x844) for "WiseResume" guides feature.

SCREEN 1 — Guides List:
- App bar: back arrow, "Guides & Tips"
- Search bar
- Category chips: "All", "Resume Writing", "Interview", "Career", "Job Search"
- Guide cards (glass surface):
  - Thumbnail image (gradient placeholder)
  - Title: "How to Write a Winning Summary" bold
  - Category pill + reading time "5 min read"
  - Preview text 2 lines

SCREEN 2 — Guide Detail:
- App bar: back arrow, bookmark icon, share icon
- Hero: gradient header with title overlay
- "How to Write a Winning Summary" Space Grotesk 22px bold
- Author: "WiseResume Team" + date
- Content: markdown-style body with headers, paragraphs, bullet lists
- Tip boxes (glass cards with #22D3EE left border)
- "Was this helpful?" thumbs up/down
- "Related Guides" section with 2 horizontal cards

[DESIGN SYSTEM block]
```

---

## 📋 Usage Instructions

### How to Use These Prompts with Google Stitch

1. **Copy the DESIGN SYSTEM (Mobile Native) block** from above
2. **Copy the specific prompt** you want
3. **Combine**: Design System block first, then the prompt
4. **Generate** in Stitch — one prompt at a time
5. **Iterate** as needed for refinements

### Key Differences from Web Prompts
- Viewport is **390x844** (not 375px web)
- All screens include **status bar** and **system navigation bar**
- Uses **Material 3** component vocabulary
- Bottom sheets instead of modals where appropriate
- **NavigationBar** (Material 3) instead of custom tab bar
- Splash screen (Prompt 1) — web doesn't have this
- Native patterns: safe areas, gesture navigation, platform-specific details

### Cross-Reference
- **Design specs**: `docs/APP_BLUEPRINT_FLUTTER.md`
- **Build prompts**: `docs/REBUILD_PROMPTS_FLUTTER.md`
- **Inspiration sources**: `docs/INSPIRATION_FLUTTER.md`

---

*Last updated: February 2026*
*Total prompts: 30 (generating ~40 screens)*
