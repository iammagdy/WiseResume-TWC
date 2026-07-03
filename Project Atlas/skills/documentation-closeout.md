# Skill: Documentation Closeout Workflow

**Skill ID:** `documentation-closeout`
**Location:** `Project Atlas/skills/documentation-closeout.md`

---

## Closeout Protocol

Before reporting a task finished to the project owner:

1. **Update Living Specs**: Update relevant feature, architecture, or operational specs in `Project Atlas/`.
2. **Update Handover State**: Update `Project Atlas/WHERE_WE_STOPPED.md` with active focus, stopped point, and commit status.
3. **Log Changelog Entry**: Add a dated entry to `Project Atlas/CHANGELOG.md` detailing changes and validation results.
4. **Clean Scratch Files**: Delete or promote temporary scratch files in `Project Atlas/temp/` or workspace `scratch/` / `tmp/`.
5. **Run Final Verification**: Run `git status -sb`, `git diff --stat`, and `git diff --check`.
