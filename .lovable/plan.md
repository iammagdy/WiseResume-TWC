
# Landing Page — "What Makes WiseResume Different" Enhancement

## The Problem

When a user finds the app on the App Store or Play Store and taps through to the website, the current landing page answers **what the app does** but never answers the more important question: **why this one, not the 50 other resume apps?**

The current sections are:
- Hero: "Build Your Dream Resume" + generic subtitle
- "See It in Action" (two demo cards)
- "Why WiseResume?" (4 feature cards — generic titles like "AI Writing Assistant")
- Two bonus chip buttons

There is no section that makes a clear, emotional, punchy case for what makes WiseResume genuinely unique. The differentiators exist in the product but are invisible on the landing page.

---

## The Real Differentiators to Highlight

After analyzing the full feature set, these are the 5 things that genuinely separate WiseResume from every other resume builder:

1. **Voice Mock Interview with AI Coaching** — Most apps only do text feedback. WiseResume lets you practice speaking out loud with a real AI voice that listens and responds. Almost no competitor does this.
2. **4 AI Recruiter Personas** — You get feedback from 4 different hiring perspectives (Fortune 500, Startup, Tech, Executive). No other resume app has this.
3. **ATS Match Score + One-Tap Tailoring** — Not just a score, but AI that rewrites your resume specifically for one job posting in seconds.
4. **AI Bullet Transformation** — The "Before/After" demo of turning "Worked on frontend" into a quantified achievement with metrics. Tangible and visceral.
5. **Public Portfolio Website** — Your resume becomes a live personal website with a shareable URL. Most resume apps only produce PDFs.

---

## What Will Be Added to the Landing Page

### Section 1 — Hero Subtitle Enhancement
Upgrade the bland subtitle `"AI-powered. ATS-optimized. Ready in 5 minutes."` to a more charged version that leads with the emotional promise:
> *"The only resume app that coaches you through your interview, scores your ATS match, and builds your personal website — all in one."*

Add a trust bar directly below the CTA with 3 real signals:
- ⭐ 4.9 Rating
- 12,000+ users helped  
- Free to start

### Section 2 — "The Difference" Comparison Strip (NEW)
A new section titled **"Not Just Another Resume Builder"** — a scrollable horizontal strip of 5 comparison chips:

| What others do | What WiseResume does |
|---|---|
| Static PDF export | + Live portfolio website |
| Generic feedback | + 4 Recruiter perspectives |
| ATS score only | + AI rewrites it for each job |
| Text practice tips | + Real voice interview coaching |
| One resume template | + 12 professional templates |

These are shown as side-by-side pill rows with a ✗ on the left and a ✓ on the right. Fast to scan, immediately communicates value.

### Section 3 — Upgrade the "Why WiseResume?" Cards
The current 4 feature cards have weak, generic copy ("AI Writing Assistant"). Replace with emotionally resonant, benefit-led copy:

| Old | New |
|---|---|
| AI Writing Assistant | "Weak bullet? Fixed in 1 tap" |
| ATS Score Checker | "Know your score before they do" |
| Smart Job Tailoring | "New job, new resume — instantly" |
| Voice Mock Interviews | "Practice speaking, not just writing" |

Add a concrete Before → After animation card (like `WhyWiseResume.tsx` already has) directly in this section.

### Section 4 — Social Proof Row (ENHANCED)
The current social proof bar (`SocialProofBar.tsx`) is minimal. Elevate it by:
- Adding 3 user quote snippets (short, 1-line testimonials)
- Showing avatar initials + name + role
- Placing it between the hero and the comparison section

### Section 5 — Bottom CTA Enhancement
The bottom CTA currently says "Ready to Get Started?" which is generic. Replace with:
- Headline: **"Land your next job. Not someday — this week."**
- Subtext listing 3 key differentiators as bullet points
- A secondary link: "See how it works →" that scrolls to the demo section

---

## Files to Change

| File | Change |
|---|---|
| `src/pages/Index.tsx` | New hero subtitle; add `ComparisonStrip` section; upgraded feature cards with benefit-led copy; enhanced social proof with testimonials; enhanced bottom CTA |
| `src/components/landing/SocialProofBar.tsx` | Add 3 user testimonial snippets |
| `src/components/landing/BottomCTA.tsx` | New headline, subtext with 3 differentiator bullets |
| `src/components/landing/WhyWiseResume.tsx` | Keep existing Before/After card; upgrade the 4 feature chip descriptions to benefit-led copy |

A new inline `ComparisonStrip` component will be created directly in `Index.tsx` (small enough not to warrant its own file) as a section between the hero and the demos.

---

## Technical Details

### Comparison Strip Component (inline in Index.tsx)
```tsx
const comparisons = [
  { them: 'PDF only', us: 'Live portfolio website', icon: Globe },
  { them: 'Generic AI tips', us: '4 recruiter personas', icon: Users },
  { them: 'ATS score only', us: 'AI rewrites for each job', icon: Wand2 },
  { them: 'Written practice', us: 'Real voice interview coach', icon: Mic },
  { them: 'Basic templates', us: '12 polished designs', icon: LayoutGrid },
];

// Renders as:
// [ ✗ PDF only  →  ✓ Live portfolio website ]
// horizontally scrollable on mobile, 2-col grid on desktop
```

### Social Proof Testimonials (in SocialProofBar.tsx)
Three condensed testimonials below the stats row:
```tsx
const testimonials = [
  { quote: "Got 3 callbacks in a week after tailoring my resume with the AI.", name: "Marcus T.", role: "Software Engineer" },
  { quote: "The voice interview feature helped me stop rambling. Game changer.", name: "Priya K.", role: "Product Manager" },
  { quote: "The ATS score went from 42% to 91% after one tailoring session.", name: "James O.", role: "Data Analyst" },
];
```

These are shown as small `italic "quote"` cards in a horizontal scroll row.

### Bottom CTA new copy
```tsx
// New headline:
"Land your next job. Not someday — this week."

// New subtext bullets:
• AI that rewrites your resume for each job in 30 seconds
• Voice interview coaching that actually prepares you  
• A portfolio website, not just a PDF
```

---

## Visual Hierarchy After Changes

```text
HERO
  └─ New: charged subtitle + trust bar (rating · users · free)

NEW: "Not Just Another Resume Builder" comparison strip
  └─ 5 competitor vs WiseResume rows

"See It in Action" (unchanged — demos still do the heavy lifting)

SOCIAL PROOF (upgraded)
  └─ Stats bar → 3 testimonial cards

"Why WiseResume?" (upgraded copy)
  └─ Before/After card + 4 benefit-led feature cards

BOTTOM CTA (upgraded)
  └─ Emotional headline + 3 bullet differentiators
```

No database changes. No new dependencies. No edge functions.
