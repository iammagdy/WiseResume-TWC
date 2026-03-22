# Development & Deployment Workflow

## 1. Pre-Requisite for Agents
* You MUST read the governance files in `project-governance/` before touching any code.

## 2. Founder Context & Communication Rules
* The project owner is non-technical and depends on AI heavily.
* ALL technical decisions MUST be explained in plain, simple language.
* When multiple options exist, you MUST:
  1. Recommend the best option first.
  2. Explain trade-offs clearly.
  3. Ask before implementing something with a high impact.

## 3. Pre-Change Sequence
Before implementing ANY functionality changes or bug fixes, you MUST execute the following sequence:
1. **Sync Latest Repo State**: Pull the latest changes to ensure you have the absolute latest codebase state.
2. **Read Governance Docs**: Consult the files in `project-governance/`.
3. **Inspect Affected Files**: Inspect the actual codebase reality of the targeted files. You MUST NOT guess routes, tables, or variables.
4. **Propose Plan**: Formulate your strategy.
5. **Explain Trade-offs**: Use simple, non-technical language to explain your approach.
6. **Seek Approval**: You MUST ask for approval before high-impact implementation.

## 4. UI/UX Audit Protocol
When evaluating the user interface, categorize findings by severity:
* 🔴 **Critical**: Blocks a core user flow entirely. Fix immediately.
* 🟠 **Medium**: Confusing or broken on a subset of devices. Fix in next sprint.
* 🟡 **Low**: Cosmetic or minor gap. Polish pass.

**Issue Ticket Template**:
```markdown
- Issue ID: ISSUE-XXX
- Problem:
- Scope (pages/files/components):
- Do Not Break (required behaviors):
- Proposed Small Change:
- Notes / Edge Cases:
```

## 5. Deployment and Release Governance
* **Current Status**: Production is not yet live.
* **Domain Ecosystem**: Exists on Hostinger under `thewise.cloud`, with mini apps planned on subdomains such as `resume.thewise.cloud`.
* **Deployment Automation Target**: Hostinger shared hosting with Git-based deployment and an auto-deploy webhook is the preferred deployment path. The project MUST be prepared for fully automated deployment from GitHub to Hostinger.
  * Manual upload is NOT the long-term deployment strategy.
  * **SSH Access**: Should be preferred where available for safe pull/update workflows.
  * **FTP Access**: A fallback or emergency access path ONLY; not the primary deployment workflow.
* **CI/CD Readiness**: Any implementation affecting build output, environment variables, routing, domain/subdomain setup, or deploy path MUST preserve CI/CD readiness.
* **Documentation Rules**: Deployment documentation MUST include branch strategy, pull/update behavior, secrets handling, environment variable requirements, rollback notes, and verification steps.
