
# AI Studio Enhancement: Personal Career Coach Suite

## Vision

Transform AI Studio from a "tools panel" into a **conversational career advisor** that proactively guides users through their job search journey. Think of it as having a senior career coach who:
- Does the heavy lifting automatically (Autopilot)
- Explains insights in encouraging, human language (Personal Coach)
- Unlocks hidden opportunities no other app shows (Reverse Engineering, Salary Negotiator, Recruiter Simulation)

---

## New Features Overview

### Feature 1: Recruiter Simulation ("Tough Love Mode")
**What it does:** AI role-plays as a skeptical recruiter with 15 years of experience, giving brutally honest feedback on your resume - exactly what a real recruiter would think but never say.

**User Experience:**
1. User opens AI Studio → taps "Recruiter Simulation"
2. AI "recruiter" reviews the resume in real-time with personality
3. Delivers feedback in three categories:
   - "Red Flags I'd Notice" (dealbreakers)
   - "Questions I'd Ask" (gaps/concerns)
   - "What Makes Me Want to Call You" (strengths)
4. Provides a "Hireability Score" with explanation
5. One-tap fixes: "Fix This" buttons auto-apply suggested improvements

**Unique Twist:** Different recruiter personas - "Fortune 500 HR", "Startup Founder", "Tech Recruiter", "Agency Headhunter" - each with different priorities and feedback styles.

---

### Feature 2: Salary Negotiator ("Money Coach")
**What it does:** AI analyzes your resume strength vs. market data and coaches you on exactly how to negotiate, including scripts and counter-offer strategies.

**User Experience:**
1. After tailoring for a job, "Salary Intelligence" appears
2. Shows:
   - Market salary range for the role (AI-estimated)
   - Your leverage points based on resume (ranked by impact)
   - Red flags that weaken your position
3. "Negotiation Prep" tab with:
   - Opening ask suggestion (with reasoning)
   - Counter-offer scripts for common pushbacks
   - Walk-away number recommendation
   - Benefits to negotiate if salary is capped

**Unique Twist:** "Confidence Meter" that shows how strong your negotiating position is based on your resume vs. job requirements. If low, AI suggests what to add to your resume to strengthen it.

---

### Feature 3: Reverse Engineer Success ("Learn from Winners")
**What it does:** Paste a LinkedIn profile URL of someone who GOT the job you want, and AI reverse-engineers what made them successful and shows you exactly how to bridge the gap.

**User Experience:**
1. User pastes LinkedIn URL of successful person in target role
2. AI extracts their career trajectory, skills, experience patterns
3. Side-by-side comparison: "Their Resume vs. Yours"
4. Gap analysis:
   - "They have X, you have Y - here's how to bridge it"
   - "Transferable skills you can reframe"
   - "Hidden advantages you have that they don't"
5. Auto-generate a "Career Bridge Plan" with actionable steps

**Unique Twist:** For career switchers - highlights "pivot patterns" showing how the successful person transitioned, with specific wording they likely used.

---

### Feature 4: Rejection Pattern Analyzer ("Learn from Losses")
**What it does:** Paste rejection emails (or describe what happened), and AI finds patterns across multiple rejections to identify your actual weaknesses.

**User Experience:**
1. User adds 3+ rejection emails or describes interview outcomes
2. AI analyzes for patterns:
   - Common stage of failure (resume screen, phone screen, final round?)
   - Recurring feedback themes
   - Industry/role correlations
3. Diagnosis with fixes:
   - "You're losing at X stage because of Y"
   - "Your resume is strong but your story isn't - here's how to fix it"
   - "Companies in [industry] are rejecting you for [specific reason]"

**Unique Twist:** "Rejection Recovery Plan" - one-tap action items that directly modify your resume/approach based on patterns found.

---

### Feature 5: AI Career Coach Chat ("Pocket Advisor")
**What it does:** A conversational AI coach that lives inside AI Studio, proactively offers advice, and can answer any career question based on your resume context.

**User Experience:**
- Floating chat bubble in AI Studio
- Proactive messages: "I noticed you applied to 5 tech companies but your resume doesn't mention X technology. Should I add it?"
- Can ask: "Am I ready for senior roles?", "What companies would hire me?", "How do I explain my gap year?"
- References your resume context in every answer

**Unique Twist:** Remembers your job search history and learns your preferences over time.

---

## Technical Architecture

### New Edge Functions
| Function | Purpose |
|----------|---------|
| `recruiter-simulation` | Role-play as different recruiter personas, analyze resume |
| `salary-intelligence` | Estimate salary ranges, generate negotiation scripts |
| `reverse-engineer-profile` | Parse LinkedIn profiles, generate comparison analysis |
| `analyze-rejections` | Pattern recognition across rejection emails |
| `career-coach-chat` | Conversational AI with resume context |

### New Components
| Component | Location |
|-----------|----------|
| `RecruiterSimSheet.tsx` | `src/components/editor/ai/` |
| `SalaryNegotiatorSheet.tsx` | `src/components/editor/ai/` |
| `ReverseEngineerSheet.tsx` | `src/components/editor/ai/` |
| `RejectionAnalyzerSheet.tsx` | `src/components/editor/ai/` |
| `CareerCoachChat.tsx` | `src/components/editor/ai/` |
| `AIStudioHome.tsx` | Updated main hub with new tiles |

### Database Schema (Optional - for persistence)
| Table | Purpose |
|-------|---------|
| `rejection_logs` | Store rejection emails for pattern analysis |
| `salary_negotiations` | Track negotiation outcomes for learning |
| `career_coaching_sessions` | Chat history with coach |

---

## Updated AI Hub Layout

The AI Studio sheet will be reorganized into categories:

```text
+------------------------------------------+
| AI Studio                 [Current Score] |
+------------------------------------------+
|                                          |
| [ESSENTIAL] ----------------------------- |
| [Smart Tailor]  [Job Match]  [AI Enhance] |
|                                          |
| [COMPETITIVE EDGE] ---------------------- |
| [Recruiter Sim]  [Salary Negotiator]     |
|                                          |
| [LEARNING] ------------------------------ |
| [Reverse Engineer]  [Rejection Analyzer] |
|                                          |
| [Your AI Coach is here] 💬               |
|                                          |
+------------------------------------------+
```

---

## Implementation Phases

### Phase 1: Recruiter Simulation (Highest Impact)
- Create edge function for persona-based analysis
- Build UI sheet with persona selector
- Implement one-tap fixes

### Phase 2: Salary Negotiator
- Create edge function for salary intelligence
- Build negotiation prep UI
- Add confidence meter

### Phase 3: Reverse Engineer + Rejection Analyzer
- LinkedIn profile parsing
- Pattern recognition engine
- Side-by-side comparison UI

### Phase 4: Career Coach Chat
- Conversational interface
- Context-aware responses
- Proactive nudges

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/recruiter-simulation/index.ts` | Create | Persona-based resume review |
| `supabase/functions/salary-intelligence/index.ts` | Create | Salary analysis & negotiation scripts |
| `supabase/functions/reverse-engineer-profile/index.ts` | Create | LinkedIn profile analysis |
| `supabase/functions/analyze-rejections/index.ts` | Create | Rejection pattern recognition |
| `supabase/functions/career-coach-chat/index.ts` | Create | Conversational career advisor |
| `src/components/editor/ai/RecruiterSimSheet.tsx` | Create | Recruiter simulation UI |
| `src/components/editor/ai/SalaryNegotiatorSheet.tsx` | Create | Salary negotiation UI |
| `src/components/editor/ai/ReverseEngineerSheet.tsx` | Create | Profile comparison UI |
| `src/components/editor/ai/RejectionAnalyzerSheet.tsx` | Create | Rejection analysis UI |
| `src/components/editor/ai/CareerCoachChat.tsx` | Create | Floating chat coach |
| `src/components/editor/AIHubSheet.tsx` | Modify | Add new feature tiles |
| `src/types/resume.ts` | Modify | Add new types for features |

---

## What Makes This Unique

1. **Recruiter Simulation** - No other app lets you hear the harsh truth recruiters think but never say
2. **Salary Negotiator** - Goes beyond salary data to give you actual scripts and strategies
3. **Reverse Engineering** - Learn from real people who got the job, not generic advice
4. **Rejection Analyzer** - Turn failures into actionable insights
5. **Personal Coach** - Always-on advisor that knows your full context

This positions the app as a complete "Career Intelligence Platform" rather than just a resume builder.
