# Spec Kit — Spec-Driven Development (SDD) Skill

## What is this skill?

This skill teaches you to follow **Spec-Driven Development (SDD)** when planning and building features for WiseResume. SDD flips the traditional development order: you write a clear specification first, then a detailed plan, then a granular task list — and only then do you write code.

This skill activates whenever:
- A new feature is being designed or planned
- A user asks you to plan out a significant change
- You're in Plan mode preparing tasks for implementation
- You're asked to create a spec, plan, or task list for any feature

---

## The Three-Phase Workflow

```
User Idea → [SPEC] → [PLAN] → [TASKS] → Implementation
```

### Phase 1 — Spec (`specs/<###-feature-name>/spec.md`)
Define *what* to build, entirely in product language. No technical decisions here.
- User stories ordered by priority (P1, P2, P3…), each independently testable
- Functional requirements (FR-001, FR-002…)
- Success criteria (measurable outcomes)
- Assumptions and edge cases

**Template**: `.agents/skills/spec-kit/templates/spec-template.md`

### Phase 2 — Plan (`specs/<###-feature-name>/plan.md`)
Define *how* to build it, technically. Written after the spec is approved.
- Technical context (stack, storage, constraints)
- Constitution check (must pass before proceeding)
- Project structure (which files/directories)
- Complexity tracking (justify any deviations from the constitution)

**Template**: `.agents/skills/spec-kit/templates/plan-template.md`

### Phase 3 — Tasks (`specs/<###-feature-name>/tasks.md`)
Break the plan into ordered, independently completable implementation tasks.
- Each task maps to a specific user story
- Tasks marked `[P]` can run in parallel (different files, no dependencies)
- MVP first: implement User Story 1, validate, then proceed

**Template**: `.agents/skills/spec-kit/templates/tasks-template.md`

---

## WiseResume-Specific Rules

### Project Constitution
The WiseResume constitution lives at `project-governance/CONSTITUTION.md`. Read it before writing any plan — the constitution check in the plan template refers to this file. Every plan must pass the constitution check before Phase 2 is approved.

### Where specs live
All feature specifications go in the `specs/` directory at the root of the repo:
```
specs/
├── 001-portfolio-themes/
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
├── 002-ai-tailoring/
│   └── spec.md
```

### Naming convention
Use a zero-padded number prefix followed by a kebab-case feature name:
`specs/042-admin-audit-log/`

### Existing governance docs to reference
These docs inform specs and plans — always check them when relevant:
- `project-governance/ARCHITECTURE.md` — system architecture decisions
- `project-governance/DECISIONS.md` — recorded past decisions
- `project-governance/BRANDING.md` — UI/UX constraints
- `project-governance/PRODUCT.md` — product principles

### Database changes
Any spec that involves DB schema changes must note that migrations use `npm run db:push` (never hand-written SQL) and that schema lives in `shared/schema.ts`.

### Edge functions
Any spec touching Supabase edge functions must note that shared utilities live in `supabase/functions/_shared/` and that every new endpoint needs auth middleware (`requireAuth`) and bot guard (`botGuard.ts`).

---

## Checklist & Constitution Templates

For pre-launch or pre-merge quality gates, use:
- **Checklist template**: `.agents/skills/spec-kit/templates/checklist-template.md`
- **Constitution template**: `.agents/skills/spec-kit/templates/constitution-template.md`

---

## Quick Reference

| You're asked to…         | What to do                                      |
|---------------------------|-------------------------------------------------|
| Plan a new feature        | Create spec.md → plan.md → tasks.md in `specs/` |
| Write a spec              | Use spec-template.md, focus on user stories     |
| Write a plan              | Use plan-template.md, run constitution check first |
| Break work into tasks     | Use tasks-template.md, MVP-first ordering       |
| Create a quality checklist | Use checklist-template.md                      |
| Amend the constitution    | Edit `project-governance/CONSTITUTION.md`       |

---

## Key Principles (from spec-driven.md)

1. **Spec is the source of truth** — code is its expression, not the other way around
2. **Each user story must be independently testable** — if you implement only P1, you still have a working, deployable slice
3. **Constitution check is a hard gate** — no plan proceeds without passing it
4. **MVP first** — implement the highest-priority story, validate it, then expand
5. **Specs live in version control** — they evolve alongside code in branches and PRs
