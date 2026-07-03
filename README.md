# WiseResume

<p align="center">
  <strong>The AI career operating system for job seekers, recruiters, and career optimization.</strong>
</p>

<p align="center">
  <a href="https://wiseresume.app">Production App</a>
  |
  <a href="./Project%20Atlas/MASTER_HANDBOOK.md">Master Handbook (AI & Developer Operating Manual)</a>
  |
  <a href="./Project%20Atlas/RULES.md">Developer & Agent Rules</a>
  |
  <a href="./Project%20Atlas/CURRENT_STATE.md">Current Production State</a>
</p>

---

## 📌 Single Documentation Source of Truth

`Project Atlas/` is the **only** canonical documentation source of truth for WiseResume.

* **AI & Developer Entry Point:** [Project Atlas/MASTER_HANDBOOK.md](./Project%20Atlas/MASTER_HANDBOOK.md)
* **Verified Production Stack:** [Project Atlas/CURRENT_STATE.md](./Project%20Atlas/CURRENT_STATE.md)
* **System Rules & Definition of Done:** [Project Atlas/RULES.md](./Project%20Atlas/RULES.md)
* **Master Inventory Map:** [Project Atlas/SOURCE_OF_TRUTH_MAP.md](./Project%20Atlas/SOURCE_OF_TRUTH_MAP.md)

---

## 🚀 Local Development Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run local development server (http://localhost:5000)
npm run dev

# 3. Typecheck & build
npm run build
```

---

## ⚙️ Architecture Summary

* **Production URL:** `wiseresume.app`
* **Frontend:** React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI, shadcn/ui (Hosted on Vercel).
* **Backend:** Appwrite Cloud (Appwrite Databases, Appwrite Storage, Appwrite Functions).
* **Authentication:** Appwrite Auth.
* **AI Routing:** Server-side Appwrite `ai-gateway` function.

For full system documentation, governance, deployment procedures, and guidelines, consult **[Project Atlas/MASTER_HANDBOOK.md](./Project%20Atlas/MASTER_HANDBOOK.md)**.
