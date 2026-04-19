# Stability Improvements — What's Getting Better Behind the Scenes

**Last verified:** 2026-04-19 (landing perf + scroll-stack fixes added)
**Audience:** you (the owner). No code, no jargon, no technical paths.
**Sources (governance — supreme):**
- `project-governance/CHANGELOG.md` entries dated 2026-04-18 (Stability Fixes — Phases 1 to 6)
- `project-governance/CONSTITUTION.md` §6.5–§6.6 (the rule that says every change must be documented for you, in plain English, alongside the engineering record)

---

## The landing page now loads in under a second instead of 5–16 seconds (2026-04-19)

**What was the situation:** Visitors to the main site (both WiseResume and WiseHire) were waiting 5 to 16 seconds before they could see the headline, the call-to-action button, or any text at all. The background colour appeared first, then the text appeared about one second later in a jarring sequence. This was silently happening because a crash-reporting library was being loaded at the very start of the page, before anything could be shown.

**What changed:** The crash-reporting library is now loaded quietly in the background after the page has already painted and the user has read the hero. The hero text, CTA button, and trust badges now all appear at the same time on first paint, with no staggered sequence. Any errors that happen before the library is ready are captured and replayed automatically so nothing is missed.

**What you'll notice:** The landing page now feels instant. First paint is measured at around 820 milliseconds (rated "good" by Google's standards), down from a previous worst-case of over 16 seconds.

---

## Scroll-stack cards on the landing page: fixed zoom, clipping, and internal animation (2026-04-19)

**What was the situation:** The stacked-card scroll section on both the WiseResume and WiseHire landing pages had three issues: (1) on mobile, tapping a card could accidentally trigger the browser's zoom-in gesture, making the whole page zoom out of control; (2) the cards were taller than the screen on common laptop screen sizes, so the bottom of each card was cut off and users couldn't see the full demo; (3) as a user scrolled, content inside each card would slide or drift — text, images, and demo screenshots would animate inside the card in a distracting way.

**What changed:** The touch-zoom behaviour was disabled on the scroll-stack area so tapping a card never triggers an accidental zoom. The card height was reduced on both the WiseResume feature cards and the WiseHire demo cards so the full card fits on screen at typical laptop sizes. The internal drift animation was removed — card content is now static inside each card; only the card itself moves when stacking.

**What you'll notice:** Scroll-stack cards behave as expected on both desktop and mobile — no accidental zoom on tap, full card visible without scrolling down inside it, and no distracting motion happening inside the card as you scroll.

---

## Credits are now always returned when an AI feature fails (2026-04-19)

**What was the situation:** When any of the app's 24 AI tools encountered an error — a timeout, a model failure, or an unreadable AI response — the credit was already deducted and was simply lost. The user paid for something they never received.

**What changed:** Every AI tool now automatically returns the credit the moment it detects a failure, regardless of the type of failure. This includes cases where the AI responds with something unparseable, where the AI service is temporarily unavailable, and even where the resume parser falls back to a basic local algorithm because the AI was unreachable. The refund is instant and requires no action from the user.

**What you'll notice:** Users will no longer complain about losing credits when AI features don't work. Their credit balance stays accurate.

---

## Switching accounts no longer briefly shows the previous user's AI chat sessions (2026-04-19)

**What was the situation:** If two different users signed in one after the other in the same browser tab without a full page refresh, the second user could briefly see the first user's Wise AI Chat session list during the first 30 seconds of their session, before the cache refreshed.

**What changed:** The chat session list is now tied directly to the signed-in user's account ID in the app's data cache. Switching accounts immediately loads only the correct user's sessions with no bleed-over period. Separately, deleting a resume version now only refreshes the version list for that specific resume, rather than all resumes the user has open at once.

**What you'll notice:** No visible change in normal single-user use. Multi-user scenarios on the same browser are now safe.

---

## Generated letters are now saved automatically so users can revisit them (2026-04-18)

**What was the situation:** When a user generated an AI cover letter or resignation letter, the result was shown on screen but never saved. Closing the tab, navigating away, or refreshing the page meant the letter was gone forever.

**What changed:** Both the cover-letter generator and the resignation-letter generator now save every generation to the user's account the moment it is produced. The saved letter is immediately retrievable from the user's letter history. The backend schema was updated with owner-only access controls so only the user who generated a letter can read, edit, or delete it.

**What you'll notice:** Users can now return to previously generated letters at any time without having to regenerate them. Each generation lands in the user's letter history and can be re-opened from there.

---

## Portfolio analytics now survive a username rename (2026-04-18)

**What was the situation:** If an admin changed a user's portfolio username (the public URL slug), all of that user's analytics history — visit counts, countries, referrers, interest clicks — was silently orphaned. The new username would start from zero, as if the portfolio was brand new.

**What changed:** The three analytics tables now record the portfolio's internal ID (a permanent identifier) alongside the username. When an admin renames a portfolio, the analytics stay attached to the same portfolio ID and are not lost. The old username column is still kept as a safety fallback during the current release.

**What you'll notice:** Renaming a user's portfolio slug in the admin panel no longer wipes their analytics history.

---

## Database safety: race conditions eliminated, data integrity enforced (2026-04-18)

**What was the situation:** Several database tables had no protection against a rare but possible scenario where two actions happened at exactly the same time — for example, two simultaneous sign-ups could have theoretically created duplicate subscription rows for the same user, which would cause billing confusion later. There was also no guarantee that a user couldn't end up with two "primary" resumes at once.

**What changed:** Database-level constraints were added to make these race conditions impossible, not just unlikely. Each user is now guaranteed to have at most one subscription row, one AI-credit row, and one primary resume — enforced by the database itself, independently of application logic. Cover-letter and resignation-letter generation results are now also stored in dedicated tables with the correct access controls.

**What you'll notice:** Nothing visible changes in normal use. These are guardrails that prevent edge-case data corruption from ever occurring.

---

## All backend changes have been applied and redeployed (2026-04-19)

**What was the situation:** Several months of backend improvements existed as code in the repository but had not yet been pushed to GitHub or applied to the live Supabase backend.

**What changed:** All changes were pushed to the GitHub repository, all three database migrations were applied to the live database, and seven updated backend services were redeployed. The codebase and production environment are now fully in sync.

**What you'll notice:** The live site now reflects all the stability, analytics, and letter-persistence improvements described above.

---

## Phase 6 — The admin control panel is now fully hardened against crashes and silent failures (2026-04-18)

**What was the situation:** The internal admin panel (DevKit) had grown large over time. It had a handful of hidden problems: if any one section crashed, the whole panel would go blank and you'd lose your session. Background tasks kept running quietly in the background even when you weren't looking at them. Most importantly, if an admin action (changing someone's plan, saving a note, revoking a session) hit an error, the failure would often disappear silently — no message, no clue that anything went wrong.

**What changed:** Three rounds of hardening were applied across all 15+ admin sections:

- A crash in any one section now shows a small "Try again" card in just that section. Everything else — the sidebar, the session, the other tabs — stays completely unaffected.
- All background polling (auto-refreshing activity feeds, health checks, analytics) now pauses automatically when you switch away from the browser tab, and resumes when you come back. This stops unnecessary work from running while you're not watching.
- Every single action that talks to the backend (changing plans, granting trials, suspending accounts, saving notes, deleting users, etc.) now correctly reports the outcome. Errors surface as clear messages instead of disappearing. If you close a panel mid-action, no phantom state updates happen in the background.
- The Users section's detail drawer — the one that shows an individual user's history, notes, and identity — now shows a proper warning if any of those tabs fail to load, instead of simply appearing empty.
- When bulk-applying plan changes or suspensions to multiple users, a dialog now appears after the action listing every user with a clear OK or Failed badge, so you can see exactly who was affected and why any failures occurred.

**What you'll notice:** The admin panel feels more solid. Actions either succeed visibly or fail with a clear message. No more empty tabs with no explanation. No more phantom background activity.

---

## The marketing site is now visible to AI agents (2026-04-18)

**What was the situation:** When AI agents like ChatGPT, Claude, or Cloudflare's own assistants tried to read our site, they couldn't tell what it was, what pages existed, how to log in, or what they were allowed to do. An automated "is your site ready for AI agents?" scan gave us 17 out of 100.

**What changed:** We published all the standard "directory" files that AI agents look for — a sitemap of every public page, a machine-readable list of what AI is allowed to do with our content, an OAuth/sign-in description, an MCP "calling card", an agent skills index, and a small public API documentation page. We also taught the homepage to return a clean text version of itself when an AI agent specifically asks for one (regular browsers still get the normal page). Finally, we added a tiny set of "tools" the page exposes — open pricing, open examples, start a new resume, switch to the WiseHire view — so an AI assistant on a user's device can offer those as one-click actions.

**What you'll notice:** Nothing visually. Existing visitors see the exact same site. But the next time someone asks an AI assistant "what's on resume.thewise.cloud" or "start a resume for me", the AI can actually answer accurately and even drive the page on the user's behalf.

---

## The landing page now opens noticeably faster, especially on phones (2026-04-18)

**What was the situation:** The landing page was downloading a heavy animation library before the very first text could appear, even for visitors who never triggered any animation. Cards on the homepage clipped over each other in some scroll positions. Two different versions of the database client were being loaded, double-counting bytes. The Sign In button got visually outshouted by the "Individuals / Enterprises" toggle next to it. The page also ran two background blur effects that made some phones stutter while scrolling.

**What changed:** We moved every heavy animation out of the first download — they only arrive after the page is on screen, and not at all for visitors who have "reduce motion" turned on. We rebuilt the product toggle to use the browser's own CSS animations (no library at all). We deleted the duplicate database client. We restored Sign In as the most prominent button and toned down the toggle so the eye lands on Sign In first. We dropped the two stuttery blur effects, fixed the card clipping, and switched fonts from Google's servers to ones bundled with the app so the first text appears faster.

**What you'll notice:** The landing page paints text about a second sooner on a fresh visit. Scroll feels smoother on phones, especially on the WiseHire dark variant where the largest piece of content now appears in under three seconds (it used to take over five). The Sign In button is the first thing your eye lands on in the top-right.

---

## Why this page exists

We have a stability initiative running across five phases — some already shipped, some still in flight. None of these changes add a new feature you can click on. They make the platform faster, safer, cheaper to run, and less likely to break. This page tells you what you'll notice.

---

## Phase 1 — A more careful database

We tightened the rules the database uses to keep your data tidy. Specifically:

- When an account is deleted, everything that belonged to that account (resumes, applications, audit history) is deleted with it — instead of being orphaned and left behind.
- Every "show me this user's stuff" lookup is now indexed. You won't notice this at first, but as more people use the platform, lists like "my resumes" and "my applications" stay fast instead of getting slower over time.

You will not see anything visually different. You'll just see less weirdness later (no ghost rows, no slow lists).

---

## Phase 2 — A snappier resume editor and a faster homepage

Three pieces of work, all aimed at how the app *feels*:

- **Typing in the resume editor is now instant.** Previously the live preview could lag a fraction of a second behind your keystrokes on long resumes. We fixed that by only re-rendering the parts of the preview that actually changed.
- **The dashboard handles big lists without slowing down.** If you have 50 or more resumes, the list now scrolls smoothly instead of stuttering.
- **Failed page loads recover by themselves.** If your network blips while a page is loading, the app now retries automatically instead of showing a broken screen.
- **The first page loads faster.** We removed an animation library from the parts of the app that don't actually animate, so the initial download is smaller.

---

## Phase 3 — The platform stops working when you're not looking

Some background tasks were running 24/7 even when nobody had the tab open, wasting electricity, AI quota, and processor time. We fixed that:

- The little "AI is healthy" indicator no longer pings the AI servers when you're on a different tab.
- Uploading a PDF or running text recognition on an image no longer freezes the editor while it works — the heavy lifting now happens off to the side.
- The resume scoring check waits until you stop typing for a moment before running, instead of running on every single keystroke.

The net effect: smoother editing, less wasted AI quota, and lower hosting costs.

---

## Phase 4 — When an AI provider has a bad day, we don't make you wait for it

We use multiple AI providers as a fallback chain — if one is down, we try the next one. The problem: when a provider was having an outage, *every single AI request* would still try the broken provider first and wait for it to fail before moving on. That added up to 30 seconds of waiting per request.

The fix:

- We now remember when a provider is broken and skip it for a minute, then try once to see if it's back. If you're using the platform during an AI outage, your requests now succeed in seconds instead of half a minute.
- A bug that occasionally refunded credits to the wrong day's bucket (when an AI call straddled midnight) is fixed.
- If you're using your own AI key (BYOK) and it fails, the error message now tells you *why* (wrong key, out of quota, or the provider is down) instead of a generic "AI failed".

---

## Phase 5 — Old analytics data is now cleaned up automatically

Three internal tables — anonymous portfolio visits, error logs, and audit logs — were growing forever. Left alone, they'd eventually slow the database down and balloon storage costs.

The fix:

- **Portfolio visits** are now kept for **90 days**, then automatically deleted.
- **Error logs** are kept for **30 days**.
- **Audit logs** are kept for **365 days** (a full year, for compliance).
- A small cleanup job runs once a day to do this. The team can see the latest run from the admin panel.

These windows can be changed without a code release if we ever need to keep more (or less) history.

---

## What you should *not* expect to see

- No new buttons, no new pages, no new pricing.
- No re-training needed — every workflow you already use works exactly the same way.
- The in-app "What's New" page (the one your end users see) is **not** updated for any of this. That page is reserved for product features your users care about, not internal hardening.

For the engineering version of any of this, the matching cards live under `Project Atlas/01-Currently Implemented/stability-fixes/` one folder up.

---

## Security Fix — Portfolio passwords are now enforced on the server, not in the browser

**What was wrong:** When a visitor tried to open a password-protected portfolio, the app would hand the *locked file cabinet key* to the visitor's browser and say "check it yourself." A technical visitor could bypass the gate entirely by calling the back-end directly, without ever seeing the password prompt.

**What changed:**

1. **The password check now happens on the server.** When a visitor types a password, the raw text goes to the server over a secure connection. The server does the comparison and either opens the portfolio or sends back a "wrong password" response — the password hash never leaves the server.

2. **"Local-Only Mode" has been removed from Settings.** The toggle in Settings → Privacy claimed data would stay on your device when switched on. In practice, the app was syncing to the cloud the whole time. Rather than leave a label that promises something the platform doesn't do, the toggle has been removed. If true offline / local-only mode is a feature you want, it can be built properly in a future release.

**What you'll notice:** Nothing visible changes. Portfolios you've already protected with a password still work. Visitors who set passwords before this update don't need to re-enter them.

**Fully deployed as of 2026-04-18.** The database was updated to enforce password checking server-side. Existing protected portfolios had their stored password values automatically upgraded to a stronger hashing format (bcrypt with a random salt) — no action needed from portfolio owners.

---

## Free trial resumes are now cleaned up automatically (2026-04-26)

**What was the situation:** When a user used the 24-hour free trial resume feature, their trial resume stayed in the database forever — even after it expired. Over time this would fill up the database with useless rows that nobody can open anymore.

**What changed:** Every day, the platform now automatically deletes trial resumes that expired more than 3 days ago. The 3-day gap is intentional — it gives users a short window to see the expired resume on their dashboard and decide to upgrade before it disappears completely.

**What you'll notice:** Nothing changes for users. Expired trials still show as read-only for 3 days, then they disappear. The admin panel now shows a count of how many trial resumes were deleted in the last cleanup run.

---

## The AI provider settings page now updates instantly (2026-04-18)

**What was the situation:** In WiseHire settings, the list showing which AI providers you have connected was only refreshed when you closed the settings window. If you added or removed a key while the window was still open, the list wouldn't update until you closed it and reopened it.

**What changed:** The list now updates the moment you save or remove a key — no need to close anything. The change happens in less than a second.

**What you'll notice:** When you manage AI keys in the WiseHire settings, the connected-provider summary reflects your changes immediately.

---

## The admin tools are now crash-proof and clearer when something goes wrong (2026-04-18)

**What was the situation:** The admin's behind-the-scenes tools (15 different tabs the team uses to look up users, run bulk actions, check email delivery, see audit logs, etc.) had a few rough edges. If any single tab hit an unexpected error it could blank out the whole admin window. Some tabs would show empty lists with no explanation if a background request failed. And when an admin selected dozens of users to change at once, the result was a single line saying "27 succeeded, 3 failed" — without telling them *which* three failed or why.

**What changed:**
- Each tab now has a safety boundary so a problem in one tab can't take the whole admin window down — the admin sees a small "Try again" card scoped to just that tab and the rest stays usable.
- Background requests on every admin tab now show a clear error message instead of leaving the admin staring at an empty screen.
- When the admin runs a bulk action on multiple users (change plan, suspend, unsuspend, grant trial), a results window now opens afterwards listing each user with a green check or red X, plus the exact reason any failures happened.
- Background polling on the admin tabs now pauses when the admin switches to another browser tab, so we don't burn API quota on data nobody is looking at.

**What you'll notice:** Nothing changes for end users. Admins get a much more reliable, transparent control panel.
