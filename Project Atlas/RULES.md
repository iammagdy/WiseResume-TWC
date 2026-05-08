# 📜 WiseResume Developer & AI Agent Rules

To maintain the integrity of WiseResume, every agent or developer MUST follow these rules. Documentation is NOT optional.

## 1. The "Definition of Done"
A task is NOT finished until:
- The code is verified to work (no guessing).
- All regional references (e.g., "Frankfurt") are removed from user-facing UI.
- **Documentation is updated:** The relevant file in `Project Atlas/` must reflect the changes.
- **Commit & Push:** Changes are pushed to the `main` branch with a clear commit message.

## 2. No Hallucinations (Strict)
- If you don't know the root cause of an error, DO NOT guess. 
- Search the codebase, read the logs, and verify file paths.
- Every fix must address the **Root Cause**, not just the symptom.

## 3. Project Atlas Integrity
- `Project Atlas` is the source of truth. 
- If you change an architectural pattern (e.g., how AI Hub works), you MUST update `MASTER_HANDOVER_2026.md`.
- After every session, update the "Where We Stopped" section in the handover.

## 4. Technology Constraints
- **Stack:** React, Vite, Appwrite, Tailwind.
- **Auth:** Appwrite-Native (No Kinde/Supabase).
- **AI:** All AI calls go through the consolidated Appwrite AI Hub.

---
*Failure to follow these rules results in technical debt and token waste. Stick to the Atlas.*
