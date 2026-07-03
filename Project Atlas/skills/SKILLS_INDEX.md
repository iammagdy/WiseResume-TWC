# AI Agent Skills Index & Selection Guide

**Last Verified:** 2026-07-03
**Status:** Canonical Skill Selection Matrix
**Location:** `Project Atlas/skills/SKILLS_INDEX.md`

---

## 1. Skill Selection Matrix

| Task Assignment / Intent | Primary Required Skill | Secondary Recommended Skill |
|---|---|---|
| **Initializing Any Agent Turn** | [`agent-bootstrap.md`](./agent-bootstrap.md) (**MANDATORY**) | N/A |
| **Building or Refactoring UI Components** | [`ui-visual-implementation.md`](./ui-visual-implementation.md) | [`new-code-quality.md`](./new-code-quality.md) |
| **Modifying Appwrite Schemas or Functions** | [`appwrite-safe-change.md`](./appwrite-safe-change.md) | [`security-review.md`](./security-review.md) |
| **Modifying AI Gateway or Model Fallbacks** | [`ai-gateway-safe-change.md`](./ai-gateway-safe-change.md) | [`appwrite-safe-change.md`](./appwrite-safe-change.md) |
| **Implementing Full-Stack Features** | [`feature-implementation.md`](./feature-implementation.md) | [`qa-validation.md`](./qa-validation.md) |
| **Writing or Fixing Vitest / Playwright Tests** | [`qa-validation.md`](./qa-validation.md) | [`new-code-quality.md`](./new-code-quality.md) |
| **Auditing Auth, OTP, or Security** | [`security-review.md`](./security-review.md) | [`appwrite-safe-change.md`](./appwrite-safe-change.md) |
| **Closing Out a Task & Handover** | [`documentation-closeout.md`](./documentation-closeout.md) | N/A |
| **Optional Tooling Configuration** | [`skillkit-optional-setup.md`](./skillkit-optional-setup.md) | N/A |

---

## 2. Execution Principles

1. **Bootstrap Mandatory**: Always run `agent-bootstrap.md` first.
2. **Follow Safeguards**: Respect forbidden paths, deployment restrictions, and zero-data-loss rules.
3. **Atlas Updated Last**: Always run `documentation-closeout.md` before reporting completion to the owner.
