# Skill: Agent Bootstrap & Initialization

**Requirement Level:** MANDATORY FOR ALL AGENT TURNS
**Skill ID:** `agent-bootstrap`
**Location:** `Project Atlas/skills/agent-bootstrap.md`

---

## Mandatory Execution Protocol

Every AI agent initialized on `iammagdy/WiseResume-TWC` MUST execute this sequence before editing any files:

### Step 1: Read Core Atlas Entry Documents
Read these documents in order:
1. **[`Project Atlas/MASTER_HANDBOOK.md`](../MASTER_HANDBOOK.md)** — Primary entry point & AI operating manual.
2. **[`Project Atlas/CURRENT_STATE.md`](../CURRENT_STATE.md)** — Verified production architecture snapshot.
3. **[`Project Atlas/WHERE_WE_STOPPED.md`](../WHERE_WE_STOPPED.md)** — Active handover state & next tasks.
4. **[`Project Atlas/RULES.md`](../RULES.md)** — Developer execution rules & definition of done.
5. **[`Project Atlas/SOURCE_OF_TRUTH_MAP.md`](../SOURCE_OF_TRUTH_MAP.md)** — Master documentation inventory map.
6. **[`Project Atlas/ATLAS_ROUTING_RULES.md`](../ATLAS_ROUTING_RULES.md)** — Document routing matrix & placement rules.

### Step 2: Select Task-Specific Skills
Consult **[`Project Atlas/skills/SKILLS_INDEX.md`](./SKILLS_INDEX.md)** and select the skill playbooks matching the assigned task (e.g. `appwrite-safe-change.md`, `ui-visual-implementation.md`).

### Step 3: Run Workspace Environment Checks
Run:
```bash
git status -sb
git branch --show-current
```

### Step 4: Identify Allowed vs Forbidden Paths
* **Forbidden Paths**: Do NOT modify `src/`, `api/`, `server/`, `appwrite-hubs/`, `.github/`, `package.json`, or config files unless explicitly authorized in the task prompt.
* **Allowed Paths**: Documentation updates MUST take place inside `Project Atlas/`.

### Step 5: Plan Before Editing
* For non-trivial tasks, formulate an implementation plan.
* Respect existing project constraints (Appwrite-native, Vercel frontend, disabled billing, Appwrite `ai-gateway`).

### Step 6: Safety Guardrails
* **No Secrets**: NEVER commit API keys, tokens, or plaintext credentials.
* **No Unapproved Deployment**: Do NOT perform Vercel or Appwrite deployments unless explicitly requested by the project owner.
* **No Archive Touch**: `Project Atlas/archive/` is historical-only. Do NOT treat archive files as current truth.

### Step 7: Validate & Close Out
* Run validation checks (`git status -sb`, `git diff --stat`, `git diff --check`).
* Follow **[`documentation-closeout.md`](./documentation-closeout.md)** to update `Project Atlas/CHANGELOG.md` and `Project Atlas/WHERE_WE_STOPPED.md`.
