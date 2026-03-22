# Product Governance

## 1. Product Identity
* **Target Audience**: Job seekers, students, non-experts, and high-volume applicants.
* **Focus**: The app must remain an AI career platform and resume builder—not a general document editor. Keep the product lightweight, fast, and easy to understand for non-technical users.

## 2. Product Scope
* WiseResume is a **resume-first AI career platform**.
* Core resume sections must always exist: Header (name, title, contact), Experience, Education, Skills. Additional sections are optional.
* It features AI tools (AI Tailor, AI Section Enhancement, Interview Simulator, Career Assessment, AI Studio with BYOK), specialized templates, and multiple export choices (PDF, ATS PDF, DOCX, Plain Text).

## 3. Product Quality Rules
* **AI Outputs**: AI outputs MUST be professional, ATS-friendly, relevant, contextual, and non-generic. They MUST feel customized to the user's real background and target jobs.
* **No Fake Intelligence**: You MUST NOT implement fake demo intelligence, fake ATS scores, fake production behavior, or misleading placeholders in real user flows.
* **Trust & Polish**: The app MUST feel polished, trustworthy, production-grade, and beginner-friendly.
* **Platform & Core Quality**: 
  * Mobile-first quality is MANDATORY (fully responsive starting at `xs` / 375px; no horizontal scrolling).
  * Desktop quality is MANDATORY.
  * Accessibility is MANDATORY.
  * Performance is MANDATORY.
  * Bottom tab bar navigation is the primary in-app navigation on mobile.
  * No blank screens during data fetching — always use matching skeleton components.
* **Stable Download/Export**: The resume preview layout must stay clean and printable with no strange colors or backgrounds in export views. Export/download behavior (PDF, DOCX) must remain stable and must not be broken.
* **Scalability**: Scalability for future subscriptions, AI credits, BYOK (Bring Your Own Key), and ecosystem expansion MUST be considered in all technical decisions.
