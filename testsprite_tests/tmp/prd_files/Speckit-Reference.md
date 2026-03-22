# Speckit Reference – WiseResume / مرجع Speckit

This document contains both English and Arabic references for Speckit commands.
يحتوي هذا الملف على المرجع باللغتين الإنجليزية والعربية لأوامر Speckit.

- [English Reference](#english-reference)
- [المحتوى العربي (Arabic Reference)](#arabic-reference)

---

## English Reference

This section explains the core Speckit commands and how we use them inside the WiseResume project, with quick examples for each case.

**Always:**
- Follow `project-governance/CONSTITUTION.md` and the governance files.
- Treat `legacy-docs/enhancements-for-vibe-coding/` as historical context only.
- Auth = Kinde only, Backend = Supabase only, Branding = WiseResume / Wise AI / The Wise Cloud.

### `/speckit.constitution`

**What is this?**
A command to create or update the project constitution (the hard rules: branding, auth, backend, workflow, etc.). This is the highest layer that governs everything else.

**When do I use it?**
When starting a new project, or when a major general rule changes (e.g., changing the auth method, or adding an important governance law).

```text
/speckit.constitution Update the project constitution to define how legacy-docs/enhancements-for-vibe-coding/ is treated as historical documentation only, without affecting current Kinde-only auth and Supabase-only backend rules.
```

### `/speckit.clarify`

**What is this?**
Helps you understand a problem or feature before writing a Spec for it by asking questions, gathering requirements, and removing ambiguity.

**When do I use it?**
When you have a general idea or an unclear problem (a new feature, a major improvement, a flow change) and you need to define the details.

```text
/speckit.clarify I want to add a Voice Resume Recording feature to WiseResume so users can record audio answers as part of their profile. Help me clarify scope and requirements based on our governance.
```

### `/speckit.specify`

**What is this?**
Produces an organized feature specification (Spec) for a single feature or part of the product, acting like a mini-PRD for that specific feature.

**When do I use it?**
After Clarify has finished asking questions and the requirements are clear, or when you already understand the feature perfectly and just want a structured Spec document.

```text
/speckit.specify Using the clarification for Voice Resume Recording, create a complete feature spec for adding Voice Resume Recording to WiseResume, following our project-governance and PRD.
```

### `/speckit.plan`

**What is this?**
Converts a Spec into a high-level implementation plan consisting of major steps, phases, and the order of work.

**When do I use it?**
When you have a Spec for a large feature or important change, and you want to break the work down into clear architectural phases before turning it into code or tasks.

```text
/speckit.plan Create an implementation plan for the Voice Resume Recording feature spec, broken into logical phases while respecting WiseResume architecture (Kinde auth, Supabase backend).
```

### `/speckit.tasks`

**What is this?**
Converts a Plan into a set of small, specific tasks (execution tickets) that can be implemented directly or assigned to developers.

**When do I use it?**
After you are satisfied with the Implementation Plan, and you want clear task lists to use with Antigravity or GitHub Issues.

```text
/speckit.tasks Generate detailed tasks from the Voice Resume Recording implementation plan, including frontend, backend, and testing tasks, aligned with our governance files.
```

### `/speckit.implement`

**What is this?**
Uses the Spec + Plan + Tasks to actually write the code step-by-step. Often runs as an interactive sequence (executes a task, explains it, moves to the next).

**When do I use it?**
When you are ready to jump into writing or modifying the code based on the clearly defined Spec and Plan.

```text
/speckit.implement Implement the first set of tasks for the Voice Resume Recording feature, starting with data model and API integration, while keeping the existing resume editor behavior intact.
```

### `/speckit.analyze`

**What is this?**
Performs an analysis of the code or a feature, helping you understand its current shape, potential problems, and risks before you start editing.

**When do I use it?**
Before a major refactor, before solving a complex bug, or when you feel a specific area has become complicated and you don't fully understand it.

```text
/speckit.analyze Analyze the current authentication flow in WiseResume (Kinde + Supabase integration) and explain how it works today, highlighting any risks or inconsistencies with our governance.
```

### `/speckit.checklist`

**What is this?**
Builds a checklist for a specific event: before a release, before a major merge, before a refactor, etc.

**When do I use it?**
When you want an "Ensure that..." list for a specific domain (e.g., before making a Release, or before changing Auth).

```text
/speckit.checklist Create a pre-release checklist for WiseResume covering auth, Supabase migrations, AI credit limits, and UI smoke tests, following our governance.
```

### `/speckit.taskstoissues`

**What is this?**
Converts the Tasks generated by `/speckit.tasks` into GitHub Issues (or a format that can be easily pasted manually into GitHub).

**When do I use it?**
After producing tasks for a large feature, when you want to make each task an independent Issue on GitHub.

```text
/speckit.taskstoissues Convert the tasks for the Voice Resume Recording feature into GitHub issue descriptions, grouped by milestone, ready to paste into the WiseResume repo.
```

### How to choose which command

**If I have a small, clear bug:**
You usually don't need the full Speckit suite. Use the `01-bug-issue-template.md` in `wise-templates/` and let Antigravity fix it directly.

**If I have a new feature or major change:**
1. `/speckit.clarify` → Understand the requirements thoroughly.
2. `/speckit.specify` → Write a clear spec.
3. `/speckit.plan` → Create a phased plan.
4. `/speckit.tasks` → Turn it into tasks.
5. `/speckit.implement` → Execute step-by-step.

**If I want an Audit or Test Strategy:**
Use the ready-made templates in `wise-templates/` specifically `11-full-governance-audit-template.md` through `14-unit-integration-test-template.md`.

### One-line examples

**Spec for a new feature:**
```text
/speckit.specify Create a feature spec for <FEATURE NAME> following WiseResume governance and PRD.
```

**Clarify a vague problem:**
```text
/speckit.clarify Help me clarify the problem and scope for <AREA / FEATURE> in WiseResume.
```

**Plan from an existing spec:**
```text
/speckit.plan Create an implementation plan for the existing spec of <FEATURE NAME>.
```

**Tasks from a Plan:**
```text
/speckit.tasks Generate detailed tasks from the implementation plan for <FEATURE NAME>.
```

**Implement specific tasks:**
```text
/speckit.implement Implement the first batch of tasks for <FEATURE NAME> without breaking existing behavior.
```

**Analyze a sensitive area:**
```text
/speckit.analyze Analyze the current <AREA, e.g. "AI credits system"> in WiseResume and explain how it works compared to our governance.
```

**Example: I want Unit Tests for Authentication:**
If your goal is to focus on Tests and not a full Spec, you can use Template 14 in `wise-templates/`, or do a one-liner like this:
```text
Use our existing test setup to write focused unit/integration tests for the Kinde + Supabase authentication flow in WiseResume. Cover successful login, failed login, and access control (user cannot see other users’ data), following project-governance and architecture rules.
```

If you want to use the Speckit approach before the tests:
1. `/speckit.analyze` on the auth flow.
2. `/speckit.checklist` to create a simple Testing Checklist.
3. Then use `14-unit-integration-test-template.md` to actually write the tests.

---

## Arabic Reference

هذا القسم يشرح أوامر Speckit الأساسية وكيف نستخدمها داخل مشروع WiseResume، مع أمثلة سريعة لكل حالة.

**Always:**
- اتبع `project-governance/CONSTITUTION.md` وملفات الحوكمة.
- اعتبر `legacy-docs/enhancements-for-vibe-coding/` سياق تاريخي فقط.
- Auth = Kinde فقط، Backend = Supabase فقط، Branding = WiseResume / Wise AI / The Wise Cloud.

### `/speckit.constitution`

**إيه ده؟**
أمر لإنشاء أو تحديث دستور المشروع (القواعد الثابتة: البراند، الـ auth، الـ backend، طريقة الشغل، إلخ). هو أعلى طبقة تحكم كل حاجة بعد كده.

**أستخدمه إمتى؟**
عند بدء مشروع جديد، أو عندما تتغيّر قاعدة عامة كبيرة (مثلاً تغيير طريقة الـ auth، إضافة قانون مهم للحوكمة).

```text
/speckit.constitution Update the project constitution to define how legacy-docs/enhancements-for-vibe-coding/ is treated as historical documentation only, without affecting current Kinde-only auth and Supabase-only backend rules.
```

### `/speckit.clarify`

**إيه ده؟**
يساعدك تفهم المشكلة أو الميزة قبل ما تكتب لها Spec. يسأل أسئلة، يجمع المتطلبات، يزيل الغموض.

**أستخدمه إمتى؟**
لما تكون عندك فكرة عامة أو مشكلة مش واضحة التفاصيل (Feature جديدة، تحسين كبير، تغيير في Flow).

```text
/speckit.clarify I want to add a Voice Resume Recording feature to WiseResume so users can record audio answers as part of their profile. Help me clarify scope and requirements based on our governance.
```

### `/speckit.specify`

**إيه ده؟**
ينتج ملف مواصفات (Spec) منظم لميزة واحدة أو جزء معيّن من المنتج (يشبه PRD مصغّر لهذه الميزة).

**أستخدمه إمتى؟**
بعد ما Clarify خلّص أسئلة والمتطلبات بقت واضحة، أو لما تكون أنت أصلاً فاهم الميزة كويس وعايز Spec مرتب.

```text
/speckit.specify Using the clarification for Voice Resume Recording, create a complete feature spec for adding Voice Resume Recording to WiseResume, following our project-governance and PRD.
```

### `/speckit.plan`

**إيه ده؟**
يحوّل Spec لخطّة تنفيذ عالية المستوى: خطوات رئيسية، مراحل، ترتيب العمل.

**أستخدمه إمتى؟**
لما يكون عندك Spec لميزة كبيرة أو تغيير مهم، وعايز تقسّم العمل لمراحل واضحة قبل ما تحوّله لتاسكات وكود.

```text
/speckit.plan Create an implementation plan for the Voice Resume Recording feature spec, broken into logical phases while respecting WiseResume architecture (Kinde auth, Supabase backend).
```

### `/speckit.tasks`

**إيه ده؟**
يحوّل الـ Plan لمجموعة Tasks صغيرة ومحددة (تذاكر تنفيذ) يمكن تطبيقها أو تعيينها لمطورين.

**أستخدمه إمتى؟**
بعد ما تكون راضي عن الـ Plan، وعايز قوائم Tasks واضحة لتستخدمها مع Antigravity أو GitHub Issues.

```text
/speckit.tasks Generate detailed tasks from the Voice Resume Recording implementation plan, including frontend, backend, and testing tasks, aligned with our governance files.
```

### `/speckit.implement`

**إيه ده؟**
يستخدم Spec + Plan + Tasks عشان يكتب الكود فعليًا خطوة بخطوة، غالبًا تسلسل تفاعلي (ينفّذ تاسك، يشرح، ينتقل للي بعده).

**أستخدمه إمتى؟**
لما تكون جاهز تدخل في كتابة الكود أو تعديل الكود بناءً على Spec وPlan واضحين.

```text
/speckit.implement Implement the first set of tasks for the Voice Resume Recording feature, starting with data model and API integration, while keeping the existing resume editor behavior intact.
```

### `/speckit.analyze`

**إيه ده؟**
يعمل تحليل للكود أو للـ Feature: يفهم شكلها الحالي، المشاكل المحتملة، المخاطر، قبل ما تبدأ تعديل.

**أستخدمه إمتى؟**
قبل refactor كبير، قبل حل Bug معقّد، أو لما تحس إن منطقة معينة بقت معقدة ومش فاهمها.

```text
/speckit.analyze Analyze the current authentication flow in WiseResume (Kinde + Supabase integration) and explain how it works today, highlighting any risks or inconsistencies with our governance.
```

### `/speckit.checklist`

**إيه ده؟**
يبني Checklist (قائمة مراجعة) لشيء معيّن: قبل release، قبل merge كبير، قبل refactor، إلخ.

**أستخدمه إمتى؟**
لما تكون عايز قائمة “تأكد أن…” لمجال معيّن (مثلاً: قبل ما نعمل Release، قبل ما نغيّر في Auth).

```text
/speckit.checklist Create a pre-release checklist for WiseResume covering auth, Supabase migrations, AI credit limits, and UI smoke tests, following our governance.
```

### `/speckit.taskstoissues`

**إيه ده؟**
يحوّل الـ Tasks اللي أنتجها `/speckit.tasks` لـ GitHub Issues (أو صيغة يمكن تلصيقها يدويًا في GitHub).

**أستخدمه إمتى؟**
بعد ما تطلع Tasks لميزة كبيرة، وعايز تخلي كل واحدة Issue مستقلة في GitHub.

```text
/speckit.taskstoissues Convert the tasks for the Voice Resume Recording feature into GitHub issue descriptions, grouped by milestone, ready to paste into the WiseResume repo.
```

### How to choose which command (كيف أختار ماذا أستخدم؟)

**لو عندي Bug صغير واضح:**
غالبًا مش محتاج Speckit كامل. استخدم Template `01-bug-issue-template.md` في `wise-templates/` وخلّي Antigravity يصلحه مباشرة.

**لو عندي Feature جديدة أو تغيير كبير:**
1. `/speckit.clarify` → نفهم المطلوب كويس.
2. `/speckit.specify` → نكتب spec واضح.
3. `/speckit.plan` → نعمل خطة مراحل.
4. `/speckit.tasks` → نحولها لتاسكات.
5. `/speckit.implement` → ننفّذ خطوة بخطوة.

**لو عايز Audit أو Test Strategy:**
استخدم Templates الجاهزة في `wise-templates/11-14` (Full Governance Audit, UI Analyze, Testing Strategy, Unit/Integration Tests).

### One-line examples (أمثلة سريعة في سطر واحد)

**Spec لميزة جديدة:**
```text
/speckit.specify Create a feature spec for <FEATURE NAME> following WiseResume governance and PRD.
```

**Clarify لمشكلة غامضة:**
```text
/speckit.clarify Help me clarify the problem and scope for <AREA / FEATURE> in WiseResume.
```

**Plan من Spec موجود:**
```text
/speckit.plan Create an implementation plan for the existing spec of <FEATURE NAME>.
```

**Tasks من Plan:**
```text
/speckit.tasks Generate detailed tasks from the implementation plan for <FEATURE NAME>.
```

**Implement تاسكات محددة:**
```text
/speckit.implement Implement the first batch of tasks for <FEATURE NAME> without breaking existing behavior.
```

**Analyze لمنطقة حساسة:**
```text
/speckit.analyze Analyze the current <AREA, e.g. "AI credits system"> in WiseResume and explain how it works compared to our governance.
```

**مثال: عايز Unit Tests للـ Authentication:**
لو هدفك تركز على الـ Tests مش Spec كاملة، تقدر تستخدم Template رقم 14 في `wise-templates/`، أو تعمل سطر واحد زي ده:
```text
Use our existing test setup to write focused unit/integration tests for the Kinde + Supabase authentication flow in WiseResume. Cover successful login, failed login, and access control (user cannot see other users’ data), following project-governance and architecture rules.
```

ولو عايز تمشي بأسلوب Speckit قبل الـ tests:

1. `/speckit.analyze` على auth flow.
2. `/speckit.checklist` لعمل Testing Checklist بسيطة.
3. ثم تستخدم `14-unit-integration-test-template.md` لكتابة الـ tests فعليًا.

---

بهذا الملف، عندك الآن **مرجع واحد بسيط** يشرح:
- كل أمر رئيسي في Speckit.
- إمتى تستخدمه.
- جملة واحدة سريعة كمثال لكل أمر (تنسخها وتعدّل بس اسم الميزة).

تقدر تضيف الملف في `project-governance/` أو `docs/`، وأي وقت تنسى، تفتحه بدل ما تسأل الـ AI من جديد.
