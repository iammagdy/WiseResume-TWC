# Stability improvements

**Last verified:** 2026-08-17

## A broad safety and honesty pass is ready for release (2026-08-17)

**What was the situation:** Several features worked in normal use but trusted the browser or an AI answer too much. Examples included resume links whose password check happened too late, coupons and recruiter signup paths that accepted too much caller input, AI actions that could run or spend credits without a clear user action, and match/readiness numbers that sounded more authoritative than their evidence allowed.

**What changed:** Sensitive decisions now happen on the server and are tied to the signed-in account. AI resume content is disclosed and redacted before sending, paid work starts only after an explicit action, credit and retry handling is transaction-safe, job imports reject private/internal network targets, and tailoring cannot add unsupported skills, identities, dates, or measurements. Resume readiness now means a visible local section-completion check, while job alignment means keyword overlap from the actual resume and job description; neither is advertised as a universal employer ATS score. Smart suggestions ask for verified evidence before adding outcomes or numbers, and unsupported performance statistics were removed from product and marketing copy. Onboarding, public resume sections, and PDF limits were tightened too.

**How it was checked:** The complete product run finished with 1,190 passing tests across 212 passing files (with one file skipped and one planned todo), and all 44 backend hub test files passed. One export-browser cleanup hook timed out only while the full frontend and backend suites were running together; the same eight export checks passed immediately on their own. Whole-project code linting reported 0 errors and 0 warnings, TypeScript passed, Arabic coverage passed, and the website/server built successfully without source maps. The dependency audit found 0 known vulnerabilities. Protected signed-in screens still need an isolated staging-browser smoke test because the available production browser already belonged to another user and was not safe to replace.

**What happens next:** This work is local and is not live yet. The database permission updates, backend services, website, and export API must be released together and then smoke-tested. Until that coordinated release happens, production keeps its previous behavior.

## Final trust pass removes dead actions and unsupported claims (2026-08-17)

**What was the situation:** A few remaining screens still showed controls that only said “coming soon,” a referral page advertised rewards that were not tracked, analytics described current statuses like a historical conversion rate, and several AI career tools could receive too little source information while still producing confident-looking output.

**What changed:** The remaining non-working controls and fictional rewards were removed or replaced with working actions. Analytics can now download a safe spreadsheet report and clearly labels current status data. Job-comparison details now open, company and career suggestions are limited to the information the user supplies, and AI writing/recruiter feedback is clearly described as a review estimate rather than proof. Uploaded photo links are harder to guess, old files are cleaned up safely, and the direct-link privacy behavior is disclosed.

**What you'll notice:** Buttons shown as available now perform their advertised action, analytics and AI labels are more precise, and photo sharing has a clear privacy note. This remains a local release candidate until the coordinated deployment and staging checks are completed.

## Password-protected resume links are enforced before any resume is opened (2026-08-17)

**What was the situation:** A shared-resume page checked its password in the browser, while the browser could still ask the database for the share and resume directly. Feedback used the same shortcut, so the password was not a trustworthy privacy boundary.

**What changed:** Shared resumes and their feedback now go through one protected service. It checks whether the link is genuine, still active, unexpired, and correctly unlocked before it reads resume content. New links are much harder to guess, saved link/password credentials are protected, repeated guesses are throttled, and turning off, rotating, expiring, or deleting a link closes access on the server. Owners still create and manage links after the service confirms their signed-in account.

**What you'll notice:** Public links keep the same address style. Open links work normally; protected links show the password screen and reveal neither the resume nor its feedback until the correct password is accepted. This is completed and tested locally, but it needs one coordinated backend, database-permission, and website release before it is live; no production setting or deployment was changed during this work.

## Safer and more predictable PDF downloads (2026-08-17)

**What was the situation:** Very large or unusually structured documents could make PDF generation do excessive work, one-page downloads could cut away later content, and some page-number, paper-size, and branding choices did not consistently reach every PDF path. The app also described ATS output with more certainty than any hiring system can guarantee.

**What changed:** PDF generation now has clear size and page limits, does not run document scripts, and scales the full document for one-page downloads. Letter/A4 and page-number choices now apply to cover letters too. Removing WiseResume branding is consistently a verified Premium feature, and ATS language now describes the parser-friendly design without promising every external system will accept it.

**What you'll notice:** Normal resumes and cover letters keep their expected layout, paper size, and chosen page labels. Oversized exports stop with a clear error instead of consuming unbounded work, and plan-locked branding controls accurately show what the downloaded file will contain.

## Core safety and export checks run reliably (2026-08-17)

**What was the situation:** One safety check still expected an older deployment rule, and busy test runs could make resume-export checks time out even though they passed on their own.

**What changed:** The checks now follow the current targeted-deployment rule and allow enough time for the real export screen to load during a heavily loaded full test run.

**What you'll notice:** Nothing changes in the visible product yet; the automated safety net is more dependable and less likely to report misleading failures.

## Work experience loads without a hidden crash risk (2026-08-17)

**What was the situation:** If the resume arrived after the work-experience screen first appeared, that screen could register its internal behavior in a different order and trigger a React error.

**What changed:** The work-experience screen now prepares all of its behavior consistently whether the resume is still loading or already available, and its AI actions wait for a real resume.

**What you'll notice:** Opening or refreshing the editor while resume data is loading is less likely to show a blank or broken work-experience section.

## Saved jobs stay separate between accounts (2026-08-13)

**What was the situation:** The current project record had not yet captured the completed production check proving that one person's saved-job changes do not alter another person's saved jobs.

**What changed:** The team reconciled the focused two-account production check into the living records. One account's saved job and later removal survived reloads, while the other account's saved state remained independent.

**What you'll notice:** Saving or removing a job in your account does not change another account's saved-job state. Other Jobs and sign-in checks still have their own tracked follow-up work.

## Email verification is now working in production (2026-08-13)

**What was the situation:** New accounts could request a verification email, but the email message itself had no usable subject, content, or verification link.

**What changed:** The approved WiseResume verification template was corrected in the production account service, including the required link placeholder that Appwrite fills securely for each user.

**What you'll notice:** Verification emails now arrive with a clear subject and a working confirmation button. After confirmation, the account opens its Getting Started screen and a welcome email is sent.

## More honest verification-email messages (2026-08-11)

**What changed:** The app now asks its account service to send verification emails using the supported built-in account process. It no longer builds its own verification links or sends a second verification message through a separate route.

**What you'll notice:** After signing up or asking to resend, the app says only that the request was accepted. It does not say the message reached your inbox until that can be confirmed separately.

**Verification result:** This flow is now live and confirmed end to end in production.

## Safer sign-in and job history (2026-08-11)

**What was the situation:** On short screens, the sign-up button could be out of reach, and switching accounts in one browser could show job-related history from the previous account.

**What changed:** The sign-in page can now scroll when needed, and each signed-in account keeps its own private working history. Job saves now come only from that account’s saved job records.

**What you'll notice:** The sign-up button remains reachable on smaller screens, and switching between accounts no longer mixes their saved-job or resume-working information.

## Clearer recovery messages (2026-08-11)

**What was the situation:** Some sign-in and email-verification problems could be presented as a generic failure, even when an account had already been created or sign-in had already worked.

**What changed:** The app now gives clearer next steps for account setup and verification problems, and it avoids presenting a deleted tailored resume as ready to use.

**What you'll notice:** You will see more accurate guidance when setup needs another try, and old tailoring records clearly say when their related resume is no longer available.


## Earlier email-delivery investigation (2026-08-11)

**What was found:** Earlier requests were accepted but did not reach the inbox because the verification message had no usable subject, content, or confirmation-link placeholder.

**Final result:** That historical issue is resolved. A controlled resend was delivered, the confirmation link completed verification, and the welcome email was delivered too.
