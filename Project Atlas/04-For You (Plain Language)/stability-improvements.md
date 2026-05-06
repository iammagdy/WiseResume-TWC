# Stability Improvements — What's Getting Better Behind the Scenes

**Last verified:** 2026-05-06 (Task #36 — validate-tailor)

## Your job match score is now independently verified before saving (2026-05-06)

**What was the situation:** When you clicked "Apply" on a tailored resume, the match score that appeared on the success screen and got saved with your new resume came from the same AI process that created the tailoring — in other words, the AI was essentially grading its own homework. This made it possible for the score to be optimistic or inconsistent, because the same system that rewrote your resume was also deciding how well the rewrite matched the job.

**What changed:** There is now a second, independent check that runs the moment you click Apply. It re-reads the final resume — exactly as it will be saved — and counts how many of the job's required keywords are actually present. This count uses a rule-based algorithm (not another AI guess), so the score is deterministic and consistent. An AI layer also reviews the result for things like made-up skills or weak bullet language. The score shown on the success screen and stored in your resume now comes from this independent verification step. You'll see a small "✓ Verified" badge next to the score when verification succeeded, or "~ Estimated" when it fell back to the original score (for example, if the check timed out). If any keywords are still missing after tailoring, they'll appear as chips below the score so you know exactly what to address.

---

## The AI model picker in the admin tools now shows the real, live list of available models (2026-05-05)

**What was the situation:** The admin DevKit panel has an "AI Keys" section where you can see all nine configured AI test slots (three for OpenRouter, three for Groq, three for DeepSeek) and choose which specific AI model each slot should use when the "Send test request" button is pressed. Each slot has a dropdown menu that should show the current live catalogue of available models from each provider. That dropdown was only showing six items — a short, hardcoded fallback list that was baked into the code months ago and never updated. Several of those six models were no longer even offered by their providers. The real reason for this is that the system was supposed to automatically refresh the catalogue every night at 3:17 AM by calling out to OpenRouter, Groq, and DeepSeek and asking for their current model lists. That nightly task had been configured twice before but had silently failed to schedule itself both times, because it was waiting for two database settings to be pre-configured before it would do anything — and those settings were never actually filled in.

**What changed:** Four separate problems were fixed at once. First, the nightly scheduling task was rewritten so it no longer depends on those two pre-configured settings — it figures out what it needs on its own the first time it runs, including automatically generating and storing a private security key. Second, the limit on how many OpenRouter models could appear in the list was raised from 15 to 50, because OpenRouter alone has over 30 free-tier models worth offering. Third, the fallback list (used when the live fetch fails) was updated with models that are actually available today — including the newest Llama 4 and Qwen 3 models. Fourth, a filter was added so that non-chat models (audio transcription, text-to-speech, image generation, embedding tools) are automatically excluded — those models don't work with the test-request button and were just cluttering the list.

**What you'll notice:** The model dropdown in the AI Keys section of the admin panel now shows the full, current list from each provider — 50 from OpenRouter, 11 from Groq, and 2 from DeepSeek as of today. The list refreshes automatically every night. Free-tier models appear at the top. The models that failed silently before (audio, image-generation, etc.) no longer appear in the list.

---

## DevKit deployment panel and email verification restored on live site (2026-05-05)

**What was the situation:** Several backend improvements from the previous two tasks existed only in the development code — they had never been pushed to the live Supabase backend where the app actually runs. Additionally, two environment settings were missing from the live Supabase project: the site URL (causing email verification to fail with a 503 error), and the GitHub access token (causing the DevKit admin panel's "Deployment" tab to show an error instead of commit history).

**What changed:** All 73 backend functions were pushed live to Supabase. The two missing environment secrets were configured. Two leftover "ghost" backend function slots (`career-path-advisor` and `one-page-optimizer`, which had been deleted from the codebase but were still occupying deployment slots) were cleaned up from the live project. The deployment audit allowlist was updated to accurately reflect four retired functions that intentionally return a "410 Gone" response redirecting callers to the unified editor-ai router. A full live smoke test confirmed 68/68 checks passing.

**What you'll notice:** Email verification links work correctly again (no more 503 errors). The DevKit admin panel's Deployment tab shows live commit history. All backend auth enforcement from the previous two tasks is now active on the live domain.

---

## The AI editor engine is now leaner and fully consolidated (2026-05-04)

**What was the situation:** The platform has a hard limit of 100 deployable backend functions (think of them as small servers that handle specific tasks). Four of those slots were occupied by backend functions that had already been retired in a previous update — `analyze-resume`, `recruiter-simulation`, `suggest-template`, and `optimize-for-linkedin`. Since the previous update (v3.11.0), all the work those four functions used to do had been silently handed off to a single unified "editor-ai" router. The four original slots were still sitting there, deployed and taking up space, but receiving no real traffic.

**What changed:** The four retired slots have been formally removed from the live deployment. Their source code is kept in the repository's history (so we can always look back or restore them if needed), but the files themselves have been replaced with clear "retired" markers. A database cleanup migration also removed the four leftover configuration rows for the retired functions from the AI routing table. The internal admin DevKit panel was updated so it no longer shows the four retired names in the AI routing control — only the five active functions appear now. Four legacy test entries in the admin smoke-test runner were also removed (replaced by the newer `editor-ai-*` tests that were added in the previous update).

**What you'll notice:** Nothing visible — this is purely a backend housekeeping improvement. The AI editor features (resume analysis, recruiter simulation, template suggestion, LinkedIn optimisation) work exactly as before, still powered by the same consolidated router. What changed is that the platform now has 30 free deployment slots (up from 26), giving more room for future features. The admin routing panel is also cleaner — no retired or ghost entries.

---

## The sign-in page is reachable again — and now lives on its own branded address (2026-05-03)

**What was the situation:** For a short window today, anyone visiting `resume.thewise.cloud` was sent straight to the Kinde-hosted, custom-themed sign-in page — no landing page, no marketing copy, no way back. Worse, the sign-in page itself showed the message *"Sorry, we don't see a way to authenticate you at the moment"* with no sign-in buttons (no Email, no Google) visible. The site was effectively unusable for new visitors. The reason was a DNS configuration: Kinde's "Custom Domain" feature lets you serve their branded sign-in page from a subdomain of your own domain (so users see your domain in the address bar instead of `kinde.com`), but that subdomain has to be a **dedicated** one used only for sign-in. By accident, the same subdomain that hosted the WiseResume app — `resume.thewise.cloud` — was given to Kinde as that custom domain. From the moment that DNS change went live, every request to `resume.thewise.cloud` was answered by Kinde instead of by Hostinger (where the React app lives), and the React app became unreachable from that address. The "no way to authenticate" message appeared because Kinde was being asked to render its sign-in page at the bare domain root with no application context — Kinde had no way to tell which application's sign-in options it was supposed to show, so it showed none.

**What changed:** The two roles were split onto two separate subdomains, the way Kinde intends. `resume.thewise.cloud` was pointed back at Hostinger so the React app is reachable again, and a **new** dedicated subdomain — `auth.thewise.cloud` — was created and pointed at Kinde. Kinde provisioned a fresh SSL certificate for the new subdomain. The build pipeline was updated to tell the React app that the sign-in page now lives at `auth.thewise.cloud`, and a fresh deploy was rolled out so the change is baked into the version of the app that visitors download.

**What you'll notice:** The site works again exactly as it did before the incident. When you visit `resume.thewise.cloud` you see the landing page. When you click **Sign in** or **Sign up**, the browser briefly takes you to `auth.thewise.cloud` (your branded Kinde sign-in page, "Powered by Kinde", same look you designed), you sign in, and Kinde sends you back to the app. The address bar momentarily showing `auth.thewise.cloud` instead of `resume.thewise.cloud` during the sign-in step is normal and intentional — it's the convention used by Stripe, Slack, Notion, and most other products with branded sign-in pages. No accounts were affected and no data was lost; the only impact was that, for the time the misconfiguration was live, visitors couldn't reach the app or sign in.

**Follow-up — typo fix (later the same day):** Right after the auth-domain split was rolled out, clicking Sign in started landing visitors on a blank Kinde page. The cause was a one-character typo in the saved auth-domain value: it had been written as `auth.thewise.cloud.` with an extra dot at the end, instead of `auth.thewise.cloud`. The internet's address book (DNS) treats a hostname the same with or without that trailing dot, which is why the browser still reached Kinde's servers — but Kinde's web routing is literal and only recognises the version without the dot, so it fell through to a generic empty page instead of the branded sign-in form. The dot was removed and a fresh deploy was rolled out. Sign-in works end-to-end again.

---

## Your code on Replit and your code on GitHub are back in sync (2026-05-03)

**What was the situation:** The version of the codebase living on Replit (where the actual development happens) and the backup copy living on GitHub had drifted apart over the past few weeks. Replit had moved forward with 161 internal-improvement commits — the four "router" consolidations that freed up backend slots, the Phase 2 audit reconciliation, the Phase 3 edge-function polish, and the Phase 4 continuous drift-detection scaffolding. Meanwhile, GitHub had its own thread of work that had been pushed there directly — mobile build wiring, the WiseHire landing-page readability fixes, and an admin function restoration. Neither side was wrong; they were just two parallel forks of the same project. The standard "push my changes to GitHub" command kept being rejected because GitHub had commits Replit didn't, and the standard "pull GitHub's changes first" command was blocked by the Replit sandbox's safety rules. Two earlier attempts (Tasks #69 and the first run of #70) hit the same wall and had to be parked.

**What changed:** The sync was completed by going around the blocked commands entirely. Local Replit's commits were first pushed up to GitHub as a brand-new branch (which the sandbox does allow, because creating a new branch is a "safe" operation that adds history without overwriting anything). Then GitHub's own merge facility was used directly through its REST API to combine the two histories into a single merge commit, with both sides preserved as parents — meaning you can still see and reach every individual commit from either side via the GitHub history viewer. Five files conflicted between the two sides; all five were resolved in favour of the Replit version, which was the correct call because the Replit side carried the more recent audit-confirmed reality of which backend functions are actually deployed (the GitHub side had a stale comment claiming four of them weren't deployed, which had been disproven by a fresh Supabase Management API audit).

**What you'll notice:** Nothing visible — this is purely a source-control housekeeping fix. The actual files in the codebase are unchanged. What changed is that the GitHub copy now matches the Replit copy file-for-file, so the next time anyone (you, an agent, or a future contributor) looks at the GitHub repository, they see the latest state instead of one that's weeks behind. A safety-net branch called `sync-from-replit-2026-05-03` was left on GitHub holding the pre-merge snapshot — you can delete it from the GitHub website any time, but there's no rush.

---

## The admin panel no longer guesses whether it's in production (2026-05-02)

**What was the situation:** The internal admin DevKit panel needed to know whether it was running in our live production environment or in a development copy, because it shows different things in each — including a yellow "you're in dev" banner and a slightly more relaxed view of which secret credentials are expected to be present locally. To figure this out, it was relying on the presence of a hidden technical marker that our hosting provider sets behind the scenes. That marker has always been present in production today, so the check has always been correct in practice. But it's an internal implementation detail of the hosting platform — not something the platform officially promises to keep around. If they ever changed how their service is built, the admin panel would silently flip into "development mode" on the live site, with no warning and no obvious failure.

**What changed:** A new explicit setting called `WISE_ENV` is now the panel's primary source of truth for which environment it's in — set to `production` on the live site and `dev` on development copies. The old behind-the-scenes marker is still consulted as a safety net so a fresh deployment that forgot to set the new value doesn't break, but it's no longer the official answer. The change is documented so future deployments remember to set the explicit value.

**What you'll notice:** Nothing visible — this is an internal correctness fix for the admin tools. It removes a quiet long-term risk that the admin panel could one day misidentify the environment without anyone catching it.

---

## The platform just got room to breathe — and 8 hidden features are now live (2026-04-30)

**What was the situation:** The platform runs on a backend service with a hard limit of 100 deployable features ("edge functions"). We had hit the ceiling exactly — 100 out of 100 slots used. Any new feature, fix, or experiment that needed a new backend endpoint was completely blocked. Nothing new could go live until something was removed.

**What changed:** Twelve separate backend functions that had been running independently were consolidated into three — grouped by what they do together. Nothing was removed or simplified: every feature those twelve functions delivered still works exactly the same way. The code was restructured so they share a single deployment slot each, controlled by a simple instruction like "run the analytics task" or "send the email actions task."

This freed 9 slots. Those 9 newly available slots were immediately put to use: 8 backend functions that had been written and sitting in the codebase but never actually deployed (meaning users couldn't reach them) were finally activated. These include features like bulk candidate screening in WiseHire, CV anonymisation for blind hiring, resume reminder emails, and the admin hard-purge tool.

**What you'll notice:**
- Everything continues to work exactly as before — no features were changed or removed.
- WiseHire users can now use bulk candidate screening and CV masking features if they were previously hitting errors.
- The platform now has 1 free slot, meaning the next new backend feature can go live without any cleanup needed first.

---

## Editor polish and accessibility improvements — now live as v3.6.3 (2026-04-26)

**What was the situation:** Four small but real issues had been sitting in the editor since earlier phases of development.

The first was about how the editor responds to keyboard shortcuts. Internally, the code that tracks whether a software keyboard is open on mobile was set up in a way that made every component using it re-render more than necessary — even components that didn't care about keyboard state. This had the potential to cause sluggishness on low-end devices and made the codebase harder to reason about.

The second was a leftover mobile-layout wrapper in the editor that wasn't doing anything useful anymore. After earlier improvements to how the editor adapts to small screens, this wrapper became empty scaffolding. It was still there in the code, creating an extra layer in the page structure that occasionally caused a flicker or a double-scroll effect on phones.

The third and fourth were accessibility issues in two editor sections: Awards and Projects. The text labels sitting above each input field — "Award Title", "Issuing Organization", "Project Name", "Role", and so on — were visually present but not technically linked to their fields. Screen readers couldn't tell which label belonged to which box, so they would skip the label or announce the field with no description. Browser auto-fill had the same problem: it saw a text box but didn't know what the label said, so it couldn't suggest anything.

There was also a minor internal issue: some internal diagnostic messages were printing in the browser's developer-tools console on the live site — not a user-visible problem, but it made the console noisier and made it harder to spot genuine errors.

**What changed:** Each issue was resolved in v3.6.3. The keyboard-state code was split so each part of the app subscribes only to what it actually needs, reducing unnecessary work. The empty mobile-layout wrapper was removed. Every label in the Awards section and every label in the Projects section is now formally linked to its input, so screen readers announce them correctly and browsers can suggest auto-fill values where appropriate. The internal diagnostic messages are now restricted to local development builds and never appear on the live site.

**What you'll notice:** The Awards and Projects sections in the editor now work correctly with screen readers and browser auto-fill. On low-end phones the editor should feel a little snappier. The flicker/double-scroll on the mobile editor layout is gone. For everyone else nothing looks different — these were polish and correctness fixes, not visual changes.

---

## The deploy no longer shows a false failure when the upload actually worked (2026-04-26)

**What was the situation:** After uploading a new version of the site to Hostinger, the deploy process was checking whether the live site actually served the new version. It was doing this check for about 60 seconds and then giving up with a red failure if the new files weren't visible yet. The upload itself was always succeeding — Hostinger just took longer than 60 seconds to make newly-uploaded files available on the web. So two deploys in a row (runs for v3.6.1 and the initial v3.6.3 attempt) reported failure in CI even though the site was actually updating correctly — just on a slightly longer timeline.

**What changed:** The check now runs for up to 6 minutes (18 attempts, 20 seconds apart) instead of 60 seconds. The reason for the longer window, and the specific evidence from those two deploys, is recorded in the deploy workflow file so the next person investigating a "why did this fail?" question has the answer immediately.

**What you'll notice:** Deploys should no longer show red failures when the upload worked. The workflow takes slightly longer on the verification step, but the extra time is just waiting for Hostinger to finish propagating the files rather than doing unnecessary work.

---

## Every PDF download is now text-selectable, no matter where you start it (2026-04-23)

**What was the situation:** Two different PDF download mechanisms had been quietly running side-by-side in the app. The newer one — used when you download from inside the editor (Share, Tailor, the One-Page wizard, Cover Letter) — produces a real text-based PDF: recruiters and applicant-tracking systems can select your text, copy it, and parse it with their automated tools. The older one, used only when you download from the dashboard's Applications view, was producing what is essentially a *picture* of your resume baked into a PDF wrapper. The picture looked correct, but no recruiter could highlight a phrase, no parser could read the words, and the file was both larger and slower to generate. The two paths existed because the migration to the new pipeline had been done four out of five places already; the dashboard list row was the last holdout. Most users would never notice the difference until a recruiter mentioned that one of their downloads "wasn't a real PDF" — by which point the damage was done.

**What changed:** The dashboard list row now uses the same text-based pipeline that the rest of the app already uses. The way it does this is to render your resume invisibly, off-screen, using exactly the same template, fonts, colours, and customisations you'd see on screen — wait for everything to fully draw — and then send that to the same server-side PDF generator that powers every other download in the product. There's a built-in safety net: if the off-screen render fails to paint within four seconds (e.g. the user's connection drops mid-export), the download fails with a clear error message instead of producing a blank PDF and pretending it worked. The off-screen workspace is always cleaned up afterwards, even on failure, so nothing lingers in the page. The old picture-PDF code path was removed entirely, so it is impossible for any future change to accidentally route a download back through it.

**What you'll notice:** Resumes downloaded from the dashboard's Applications sheet are now real text PDFs — recruiters can select and copy text from them, and applicant-tracking systems can parse them. Visually they should look identical to what you saw on screen, with the same fonts, colours, and layout. The download itself is also slightly faster than before because the new pipeline doesn't have to take a high-resolution snapshot of the page. If a download ever fails for a connection reason, you'll see an explicit error rather than a silently-broken file.

---

## The editor's "ATS Score" panel now honestly says it measures keyword match against the job description (2026-04-23)

**What was the situation:** The editor's prominent score bar — and the matching badge in several other places — had been called "ATS Score" with copy implying it predicted whether external applicant-tracking systems (Jobscan, Resumeworded, Greenhouse parser, Workday parser, etc.) would accept your resume. It does not. The score measures only one thing: how well the words and content in your resume overlap with the job description you pasted in. It has no way of seeing whether a particular template's two-column layout will confuse a real ATS, no way of knowing whether your photo header will be silently downgraded, and no calibration against any third-party scoring tool. Two real risks followed from the misleading label. A user seeing 87 might submit the resume confident an external ATS would let it through, then be silently rejected on layout grounds. A user seeing 42 might assume the *template* was the problem and switch styles — when in reality the score reflected only that the resume was missing keywords from the job description, fixable in five minutes by editing bullets.

**What changed:** Across every place the score appears in the editor — the Tools sheet entry, the dedicated Job Analysis sheet, the ATS Scan sheet, the inline keyword suggestions beside Experience and Education bullets, the Tailor toast and progress steps, and the AI Enhance dialog title — the language now consistently says what the score actually measures. The Tools-sheet entry is renamed "Job Match Analysis" with the subtitle "Keyword & content match vs your job description". The score header is renamed "Keyword Match Score" with a one-line plain-language footnote underneath. The breakdown card formerly titled "ATS Score" is renamed "ATS Keywords". Inline keyword suggestions now carry a small caption noting the suggestions reflect keyword overlap, not layout problems. Every Tailor and AI Enhance touchpoint that previously surfaced "ATS score" wording is updated to "Keyword match score" or "ATS Keyword Optimization". The score number, the maths behind it, and the layout of the panels are unchanged — only the labels and explanatory copy.

**What you'll notice:** The same score, the same colour-coded bar, the same suggestions — but now it is impossible to mistake the metric for what it isn't. The dashboard widgets and Multi-Job Compare / AI Studio comparison sheets are not yet updated; that follow-up is tracked separately and will land in a later pass.

---

## The editor remembers exactly where you were after a refresh, and the dashboard loads instantly from cache (2026-04-21)

**What was the situation:** Two small but constant friction points on the busiest pages.

The first was the editor: every time the page refreshed — whether you reloaded by accident, your browser auto-reloaded, or the silent-recovery refresh from the fix described below kicked in — you'd land back on the very first step (Contact) at the top of the page, with every AI dialog you had open closed. Your *resume content* was always safe, but your *editing spot* was lost. To make this worse, the browser would also pop up a generic "Are you sure you want to leave?" prompt every time you tried to refresh, even though refreshing was completely safe.

The second was the dashboard: every time you came back to the dashboard cold (closing the tab and reopening, hard refresh, etc.), you'd see a skeleton-loader animation for a beat or two while the app re-fetched your resume list and re-scored each card from scratch — even when nothing had changed since your last visit.

**What changed:** The editor now quietly remembers, per resume, which step you were on, where you'd scrolled to inside that step, which entry card you had expanded (an Experience role, an Education entry, a Project, etc.), and which AI dialog (Tailor, Recruiter Sim, Career Path, Customize, etc.) you had open. When you refresh, you land back exactly where you left off, with the same card expanded and the same dialog open if there was one. There's a 24-hour expiry on this memory so a stale session from days ago never auto-opens anything, and an escape hatch: adding `?fresh=1` to the editor URL wipes the memory and reboots from defaults — useful if anything ever gets stuck. The "are you sure you want to leave?" prompt now skips itself when you press F5 or Ctrl/Cmd+R (since refreshing is safe and you'll land back where you were), but it still appears for genuine departures like closing the tab or navigating to another website if you have unsaved changes — your safety net for "wait, I didn't mean to leave" is intact.

The dashboard now keeps its previous resume list and scores in your browser, so the next time you load the dashboard cold the cards paint immediately from that snapshot while the app quietly checks for any updates in the background. Anything that changed gets refreshed seamlessly — you don't see the skeleton flash for resumes that haven't changed since your last visit. When you sign out, all of this cached information is cleared, so the next person to use the same browser never sees anything from your account.

**What you'll notice:** Refreshing the editor (or the silent-recovery refresh kicking in) now lands you back on exactly the same step, scrolled to the same place, with the same dialog still open. The dashboard cards appear instantly when you come back to the app instead of showing a loading skeleton, while updates trickle in quietly in the background. Sign-out still wipes everything, so accounts on shared devices stay private.

---

## The "Retrying in 5 seconds" red screen on first visit after a deploy is gone (2026-04-21)

**What was the situation:** Visitors who had previously used the site (specifically: anyone who had it open back when it was offered as an installable app) had a small piece of the old version invisibly cached in their browser. On their first visit after a new release went live, that cached piece would try to load a small file from the old release that no longer existed on the server, and the page would crash into a red "Retrying in 5 seconds…" screen before refreshing itself. The most painful version of this happened right after sign-in: users saw a red error countdown the very moment they reached the dashboard. A separate self-healing piece was already in place to clean things up after the refresh — it's why the second visit always worked — but the user had to *see* the red screen and the countdown to get there. There was no useful information on that screen; the entire "fix" was just the refresh.

**What changed:** The app now detects this exact category of failure earlier and quietly refreshes the page itself, with no red screen and no countdown. From the user's perspective the page just blinks once and loads correctly. A safety guard prevents this from ever turning into an endless refresh loop: only one silent refresh is allowed per browsing session, and if anything is genuinely broken after that, the original red recovery screen still kicks in as a safety net so the user always has a clear "Reload" button to fall back on. The guard automatically resets after a few seconds of stable use, so a future visit that runs into the same kind of problem (for example, after another release) gets its own fresh chance to self-heal silently.

**What you'll notice:** First visits after a release no longer show a red error countdown. The dashboard, the editor, and every other page load straight to their content — even on browsers that still have a leftover piece of the old release cached. Returning users get the new version with no visible interruption, no questions, and no "what just happened" moment.

---

## Sign-in works on the live site again (2026-04-21, late afternoon)

**What was the situation:** Earlier today's deploy fix finally let your latest version reach the live site for the first time in days — and that immediately surfaced a separate, latent issue: signing in showed a "Sign-in incomplete" card and never finished. The reason is a mismatch between how the app was built to talk to its backend in development vs in production. In development, every backend call goes through a small helper server we run locally, which verifies your sign-in and forwards the request. On the live site, that helper server doesn't exist — the live site is just static files served by Hostinger. So when the app tried to call the helper, Hostinger returned the home page instead, the app couldn't make sense of the home-page HTML, and concluded the sign-in had failed. This pattern was actually already present in the previous version too, but nobody ever saw it because that version never genuinely reached the live site (the deploy looked successful but kept the older code in place — that's the bug we fixed earlier today).

**What changed:** Every backend call now knows which environment it's running in. In development it still goes through the local helper exactly as before, so nothing changes for working on the app. On the live site it talks directly to Supabase (which is the actual backend the helper was just forwarding to anyway), bypassing the missing helper entirely. The auth setup is built for this — Supabase is happy to receive the call directly, the encryption is the same, and the security checks all still happen on Supabase's side. We considered adding a forwarding rule to Hostinger instead, but that depends on optional Apache features that Hostinger sometimes disables, and it would have added a slower, more brittle middle hop for no real benefit.

**What you'll notice:** Sign-in on the live site works. The "Sign-in incomplete" card no longer appears. AI features (resume tailoring, scoring, enhancement, the question bank, the template advisor, the AI health check), the public portfolio chat widget and contact form, portfolio analytics, and short-link redirects also work — they were all relying on the same helper and were silently broken too. The local development experience is completely unchanged.

---

---

## The deploy now uses a more reliable connection to the live website (2026-04-21)

**What was the situation:** Earlier today the deploy started hanging for 30+ minutes when trying to upload your new version. We traced this to the door it was knocking on: the live-hosting service has a security feature that occasionally locks out the network address the deploy comes from, and once locked out, no amount of retrying or waiting helps — the door simply won't open at all. We confirmed this by checking from a different network: the secure-shell door (the one we'd been using) wasn't answering, but the regular file-transfer door (a completely separate one on the same server, with the same security) was answering instantly.

**What changed:** The deploy now uses the file-transfer door instead of the secure-shell door. Same credentials, same encryption while files are being sent, same destination — but a completely different lock that isn't subject to the same lockout. Both doors have always been available; we just needed to switch which one we use. The deploy also now refuses to wait more than 15 minutes total before giving up and reporting a clear error, so a future hang can never silently eat hours of CI time again.

**What you'll notice:** Deploys complete in 1–3 minutes instead of hanging. The retry behaviour from earlier today is still in place as a safety net, but it almost never needs to fire on the new connection. The "I clicked Run and it just sat there forever" experience goes away.

---

## A flaky upload to the live site no longer fails the whole deploy (2026-04-21)

**What was the situation:** A deploy you ran failed roughly an hour after a successful one — same project, same settings, same destination. Looking at the logs, the connection to the live-hosting service did open, but the next handshake step never got a reply, so after a few short retries the upload gave up. The hosting service does this sometimes: when too many connections come from the same network in a short window (and the network the deploy runs on is shared with other projects), it temporarily blocks the source for a minute or two as a safety measure. There is nothing wrong with your account, your password, or your code — the block clears itself in about 30–120 seconds. But because the deploy only retried for about 20 seconds before giving up, every brief hiccup turned into a red failure that you had to re-trigger by hand.

**What changed:** The deploy now waits much longer for each connection attempt and, if a whole attempt fails, automatically tries again up to four times in total — pausing 45, then 90, then 135 seconds between attempts to give the temporary block plenty of time to clear. Almost every deploy will succeed on the first attempt; the rare ones that hit a block will silently recover on the second or third try without you having to do anything. If all four attempts genuinely fail (very unlikely), the deploy will tell you exactly what happened, who to contact, and which network address to mention so the issue can be resolved in one short message.

**What you'll notice:** Many fewer red failures on deploys you trigger. The deploy may occasionally take a minute or two longer than usual when it's recovering from a brief block, but it will succeed on its own. The "I have to keep clicking Run again" loop you were stuck in goes away.

---

## "I deployed but the live site still looks old" can no longer happen quietly (2026-04-21)

**What was the situation:** A recent upload of the new v3.5 release to the live website appeared to succeed, but visitors kept seeing v3.4 — the old version. Probing the site directly showed every file was still timestamped two days earlier, meaning the upload simply never overwrote anything. The most likely cause is the file-upload tool used either targeted the wrong folder or quietly skipped some files (in particular the small invisible config file that controls security headers and cache rules — many upload tools hide it by default). The deploy process had no way to notice this: it reported "done" the moment the upload command finished, regardless of whether anything actually changed on the live site.

**What changed:** The deploy process now runs a verification check against the real live website immediately after every upload. The check reads the version number off the live site, compares it to the version we just tried to publish, and confirms that the new security and cache rules are actually being served. If any of those checks fail, the deploy is marked as failed instead of green — so a future silent stale-deploy is impossible to miss. A standalone version of the same check can also be run by hand from a laptop after any manual upload. A full written record of the diagnosis (with the exact evidence we used to confirm the root cause) is filed under the operations notes so the next person hitting a similar symptom has a head start.

**What you'll notice:** When the new release is genuinely live, you'll see v3.5 in Settings within a few minutes of the deploy, and the "AI features require server configuration" banner some users were seeing should disappear (it was a side-effect of the old version of the app talking to the new version of the back end). When a deploy fails, it will fail visibly — no more "we shipped it" claims that turn out to be untrue.

---

## DevTools is now boring to anyone trying to peek at the code (2026-04-21)

**What was the situation:** Anyone could open browser developer tools (F12) on the live site and find a few things that should not have been visible. The biggest issue: maps that let an attacker reconstruct the original, un-minified source code of the app were being shipped alongside the production build — meaning private logic, comments, and variable names were one URL guess away from being readable. The console also printed a steady stream of internal status messages that, while harmless individually, made it easier to understand how the app's pieces fit together. And a handful of standard browser security headers that defend against well-known attack patterns (man-in-the-middle downgrades, MIME-type tricks, cross-window data leaks) were missing.

**What changed:** Source maps are no longer emitted by the build at all unless an explicit error-tracking key is set, and even if a mistake re-introduced them, the web server now refuses to serve any map file. The build itself fails loudly if a map file ever sneaks into the release folder, so this can't quietly regress. Routine debug messages no longer print in production — but the genuine error and warning messages that error-tracking depends on still do. Three industry-standard security headers (HTTP Strict Transport Security, content-type sniffing block, and cross-origin opener policy) are now sent on every response. The existing security headers were left untouched.

**What you'll notice:** Nothing day-to-day — login, AI features, exports, sharing all behave exactly as before. The change is invisible by design: a hostile visitor with developer tools open now sees only what's meant to be public (network calls, the public anonymous keys that have to be there for the app to work, and minified code that can't be reversed back to source).

---

## Photo resumes no longer break the PDF export, and we tell you when a photo may hurt your application (2026-04-21)

**What was the situation:** Two of the resume styles put your profile photo in the header. Two quiet bugs were lurking there. First, if your photo was hosted somewhere with strict sharing rules, the PDF export would simply crash and you'd get nothing back — no warning, no fallback. Second, one of those styles told the browser it could load the photo "later", which meant the PDF snapshot was sometimes taken before the photo had even appeared, leaving a blank circle where your face should have been. On top of that, photos themselves are a known scoring penalty in several large applicant-tracking systems used in the US and UK, and we never mentioned it.

**What changed:** Both photo-header styles now ask the browser to load the photo in a way the export tool can capture, and the "lazy" instruction was removed so the photo is always painted before the snapshot. When you pick either of those two styles in the template chooser, you now see a small amber note explaining that photos can lower your score in markets like the US and UK and suggesting a photo-free alternative if that's where you're applying. Separately, a stylesheet that was meant to clean up the printed page but had been doing nothing for months (it was waiting for a signal that nothing in the app ever sent) was removed, so the next person reading the code isn't misled into thinking it's protecting them.

**What you'll notice:** PDF exports of the photo-based styles now work reliably and the photo actually appears. Choosing one of those styles shows you a one-line heads-up about ATS scoring before you commit. Nothing else about how the resume looks changes.

---

**Audience:** you (the owner). No code, no jargon, no technical paths.
**Sources (governance — supreme):**
- `project-governance/CHANGELOG.md` entries dated 2026-04-18 (Stability Fixes — Phases 1 to 6)
- `project-governance/CONSTITUTION.md` §6.5–§6.6 (the rule that says every change must be documented for you, in plain English, alongside the engineering record)

---

## Reviewed every "unused" database index — kept them all for now (2026-04-21)

**What was the situation:** A health check on the database flagged 32 indexes as never used, suggesting they could be removed to make writes faster. Removing the wrong ones, however, would silently slow down lookups — like the share-link resolver, coupon validation, and the new WiseHire candidate / pipeline screens.

**What changed:** Each flagged index was reviewed against the actual tables and the queries that rely on it. The verdict: every single one is justified. Most of them belong to the brand-new WiseHire product that only launched the day before the audit, so they haven't had time to be used yet. The rest sit on tables that currently hold only a handful of rows — small enough that the database always reads the table directly and skips the index. As the data grows, the indexes will quietly start doing their job. A written record of the review is kept so the next audit doesn't have to redo the analysis from scratch.

**What you'll notice:** Nothing immediately, by design. The decision avoids a class of "feature suddenly got slow" bugs that would have hit recruiters using WiseHire as soon as their pipelines filled up. The audit will be revisited once the affected tables have grown enough for "unused" to actually mean unused.

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
