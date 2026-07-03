# Skill: Code Quality & TypeScript Standards

**Skill ID:** `new-code-quality`
**Location:** `Project Atlas/skills/new-code-quality.md`

---

## Code Quality Rules

* **TypeScript Strictness**: Always run `npx tsc --noEmit` before proposing code changes. Do not introduce implicit `any` types.
* **ESLint Hygiene**: Run `npm run lint` when modifying frontend code.
* **No Console Logs in Production**: Use diagnostic `console.warn` or DevKit logging when tracing in production; avoid raw `console.log` statements stripped by Vite minification.
* **Preserve Docstrings & Comments**: Retain existing code comments and JSDoc annotations unless updating code logic.
