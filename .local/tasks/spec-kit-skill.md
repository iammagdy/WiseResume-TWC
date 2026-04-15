---
  title: Install spec-kit as a custom agent skill
  ---
  # Task: Install spec-kit as a Custom Agent Skill

  ## Objective
  Fetch the Spec-Driven Development (SDD) methodology and templates from https://github.com/github/spec-kit
  and install them as a proper agent skill at .agents/skills/spec-kit/ so the agent follows SDD
  when planning features for WiseResume. Commit and push to GitHub when done.

  ## Steps

  ### 1. Fetch raw content from GitHub using curl
  Fetch these from https://raw.githubusercontent.com/github/spec-kit/main/:
  - AGENTS.md
  - spec-driven.md
  - templates/spec-template.md
  - templates/plan-template.md
  - templates/tasks-template.md
  - templates/checklist-template.md
  - templates/constitution-template.md

  ### 2. Create .agents/skills/spec-kit/SKILL.md
  A SKILL.md that:
  - Explains what SDD is and when to activate (any time a new feature is planned)
  - Describes the Spec -> Plan -> Tasks workflow
  - References templates stored in .agents/skills/spec-kit/templates/
  - WiseResume-specific: constitution is at project-governance/CONSTITUTION.md, feature specs go in specs/ at root

  Directory structure:
  .agents/skills/spec-kit/
    SKILL.md
    templates/
      spec-template.md
      plan-template.md
      tasks-template.md
      checklist-template.md
      constitution-template.md

  ### 3. Create specs/.gitkeep at project root

  ### 4. Commit and push
  - git add .agents/skills/spec-kit/ specs/
  - git commit -m "feat: install spec-kit SDD skill and create specs/ directory"
  - git push https://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@github.com/iammagdy/wiseresume-74945019 main

  ## Acceptance Criteria
  - .agents/skills/spec-kit/SKILL.md exists and is well-structured
  - All 5 template files in .agents/skills/spec-kit/templates/
  - specs/.gitkeep exists
  - Committed and pushed to GitHub
  - npm run build passes
  