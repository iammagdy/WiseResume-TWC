# Project Atlas — Visual Assets Directory

**Last Verified:** 2026-07-03
**Status:** Canonical Visual Asset Storage
**Location:** `Project Atlas/assets/`

---

## 1. What Belongs Here

* Official WiseResume brand logos, icons, and typography assets.
* Verified system architecture diagrams (SVG, PNG, Mermaid files).
* Production UI screenshots and responsive design targets.
* Product flow diagrams and UI/UX mockups.

---

## 2. What Does NOT Belong Here

* Executable web assets (CSS/JS bundle files, fonts used in app build — place in `src/assets/` or `public/`).
* Raw binary build artifacts or node_modules.
* Temporary scratch screenshots (place in `Project Atlas/temp/`).

---

## 3. Storage & Formatting Guidelines

* Use clean, lowercase filenames separated by hyphens (e.g. `wiseresume-architecture-2026.png`).
* Image files added to documentation MUST be referenced using relative paths (e.g. `![Architecture](./assets/diagrams/wiseresume-architecture.png)`).
* Never hardcode local machine paths (`file://` or `C:\...`).
