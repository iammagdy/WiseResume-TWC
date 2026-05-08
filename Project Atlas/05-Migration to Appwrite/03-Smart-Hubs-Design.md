# 03 - Smart Hubs Design

**Objective:** Consolidate 84 micro-functions into 7 specialized Hubs.

## 1. AI-Gateway Hub
- **Handles:** `agentic-chat`, `tailor-resume`, `analyze-resume`, `score-resume`, etc.
- **Core Logic:** Provider pool (OpenRouter, Groq, DeepSeek), routing, and fallback.

## 2. Auth-Master Hub
- **Handles:** `me`, `token-exchange`, `verify-email`, `send-password-reset`.
- **Core Logic:** User profile management, permissions, and identity.

## 3. Doc-Generator Hub
- **Handles:** `generate-cover-letter`, `export-resume-pdf`, `generate-resignation-letter`.

## 4. Admin-Core Hub
- **Handles:** All `admin-*` functions (DevKit logic).

## 5. Job-Tailor Hub
- **Handles:** `parse-job`, `parse-resume`, `smart-fit-rewrite`.

## 6. Portfolio-Manager Hub
- **Handles:** `portfolio-public`, `ask-portfolio`, `generate-portfolio-bio`.

## 7. WiseHire-Hub
- **Handles:** All `wisehire-*` specific recruiter functions.
