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

## Email sending setup has been rechecked (2026-08-11)

**What was the situation:** The email sending details were completed, but the test inbox service is not available in the current testing environment.

**What changed:** The email service was redeployed safely and checked without viewing any private settings.

**What you'll notice:** The remaining sign-up email test will continue as soon as a permitted test inbox is available.

## Verification emails need delivery tracing (2026-08-11)

**What was the situation:** A new account and a resend request both said they were sent, but the monitored inbox did not receive either message.

**What changed:** The issue was recorded without changing email, domain, or account settings automatically.

**What you'll notice:** The next step is a safe check of the email delivery records to identify where the messages stopped before any setting is changed.
