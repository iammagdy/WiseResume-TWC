# Stability improvements

**Last verified:** 2026-08-13

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
