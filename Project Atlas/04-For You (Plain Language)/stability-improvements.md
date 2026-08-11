# Stability improvements

**Last verified:** 2026-08-11

## Safer sign-in and job history (2026-08-11)

**What was the situation:** On short screens, the sign-up button could be out of reach, and switching accounts in one browser could show job-related history from the previous account.

**What changed:** The sign-in page can now scroll when needed, and each signed-in account keeps its own private working history. Job saves now come only from that account’s saved job records.

**What you'll notice:** The sign-up button remains reachable on smaller screens, and switching between accounts no longer mixes their saved-job or resume-working information.

## Clearer recovery messages (2026-08-11)

**What was the situation:** Some sign-in and email-verification problems could be presented as a generic failure, even when an account had already been created or sign-in had already worked.

**What changed:** The app now gives clearer next steps for account setup and verification problems, and it avoids presenting a deleted tailored resume as ready to use.

**What you'll notice:** You will see more accurate guidance when setup needs another try, and old tailoring records clearly say when their related resume is no longer available.

## Email verification needs its sending service connected (2026-08-11)

**What was the situation:** The sign-up improvements were released, but the email sending service does not currently have the required sender details.

**What changed:** The release was checked safely and the missing setup was identified without changing any account, sender, or domain settings automatically.

**What you'll notice:** Verification-email testing will resume once the sending service details are supplied. Until then, the app should not be considered proven to deliver sign-up or resend emails.
