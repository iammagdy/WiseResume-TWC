# Stability Improvements — What's Getting Better Behind the Scenes

**Last verified:** 2026-04-18
**Audience:** you (the owner). No code, no jargon, no technical paths.
**Sources (governance — supreme):**
- `project-governance/CHANGELOG.md` entries dated 2026-04-18 (Stability Fixes — Phases 1 to 5)
- `project-governance/CONSTITUTION.md` §6.5–§6.6 (the rule that says every change must be documented for you, in plain English, alongside the engineering record)

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
