# Skill: Documentation Closeout Workflow

**Skill ID:** `documentation-closeout`
**Location:** `Project Atlas/skills/documentation-closeout.md`

---

## Closeout Protocol

Before reporting a task finished to the project owner:

1. **Update Living Specs**: Update relevant feature, architecture, or operational specs in `Project Atlas/`.
2. **Evaluate What's New Eligibility (MANDATORY GATE)**: Every product, feature, or bug fix closeout MUST evaluate release eligibility according to [`Project Atlas/skills/whats-new-maintenance.md`](./whats-new-maintenance.md) and record an explicit decision:
   * **`WHATS_NEW_REQUIRED`**: Customer-visible capability, UX change, or significant user problem fix that is merged and verified in production. Verify the release item is added to `src/data/whatsNewData.ts` (when authorized) or explicitly queued with verified evidence.
   * **`WHATS_NEW_NOT_REQUIRED`**: Internal, backend-only, CI/CD, DevKit, or documentation-only work. Record a short, factual justification for why public notes are not needed.
   * **`WHATS_NEW_DEFER_UNTIL_PRODUCTION`**: User-facing change is implemented and merged, but production deployment and live browser QA are pending. Explicitly record what deployment or runtime evidence is still missing before publication.
   > A task may NOT be reported fully closed without an explicit What's New decision recorded in the session handover.
3. **Update Handover State**: Update `Project Atlas/WHERE_WE_STOPPED.md` with active focus, stopped point, commit status, and the mandatory What's New decision block.
4. **Log Changelog Entry**: Add a dated entry to `Project Atlas/CHANGELOG.md` detailing changes, validation results, and release notes status.
5. **Clean Scratch Files**: Delete or promote temporary scratch files in `Project Atlas/temp/` or workspace `scratch/` / `tmp/`.
6. **Run Final Verification**: Run `git status -sb`, `git diff --stat`, and `git diff --check`.
