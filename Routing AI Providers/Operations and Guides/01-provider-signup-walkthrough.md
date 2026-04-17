# 01 — Provider Sign-Up Walkthrough

> **Audience:** You (non-technical). Designed to be read once, top to bottom, while you're sitting in front of the computer with your email and a browser open.
>
> **What you'll get out of it:** Three working API keys (Gemini, Groq, OpenRouter), each saved as a Replit Secret with the exact name the system expects. After this, the routing project has everything it needs to call AI providers on your behalf.
>
> **Time:** ~20 minutes for all three. The longest part is verifying your email.

---

## Before you start: what an "API key" is

An API key is a long, secret password that lets a piece of software (in our case, your WiseResume backend) talk to another company's service (Gemini, Groq, OpenRouter) on your behalf, with billing and usage attributed to your account.

Three things to remember:

1. **Treat it like a password.** Anyone who has the key can spend money on your account or use your free quota. **Never paste a key into a chat, an email, a screenshot, or a public document.**
2. **You will paste each key into one place only:** Replit's Secrets manager, under the exact name shown for each provider below. From there, the backend reads it directly and you never need to see it again.
3. **Each key has a name like `OPENROUTER_API_KEY` or `GEMINI_API_KEY`.** That's the **environment variable name** — the slot the backend looks in. The name is fixed; do not invent your own.

---

## Provider 1 — Google Gemini (the most important one to set up)

**Why:** Gemini is the new managed provider this project is adding. Without this key, the routing layer falls back to OpenRouter and Groq for everything, which works but loses Gemini's strengths (long-context PDF parsing, vision, premium reasoning).

**Cost:** Free tier is plenty for launch. See `../03-providers-and-models.md` for exact daily limits.

### Steps

1. **Open** [https://aistudio.google.com](https://aistudio.google.com) in your browser.
2. **Sign in** with the Google account you want to associate with billing later. (Use a work or dedicated Google account, not a personal Gmail you share.)
3. **Accept the terms** when prompted. You may also see a "country" selector — pick yours honestly.
4. In the left-hand menu, click **"Get API key"** (it sometimes appears as a key icon, sometimes as a button labeled exactly "Get API key").
5. Click **"Create API key"**. You'll be asked to choose or create a Google Cloud **project** — pick "Create new project" and name it something memorable like `wiseresume-prod`.
6. After a few seconds, the page will show your key. It looks like `AIzaSy...` (about 39 characters).
7. **Copy the entire key** to your clipboard. Do not click anywhere else first.
8. **Switch to your Replit project tab.** In the left sidebar, look for the lock icon labeled "Secrets" (sometimes called "Tools → Secrets").
9. Click **"+ New Secret"**.
10. In the **Key** field, type exactly: `GEMINI_API_KEY` (uppercase, with underscores, no spaces).
11. In the **Value** field, paste the key you copied.
12. Click **"Add Secret"**.
13. **Back in AI Studio**, you'll see your key listed. **Click the trash/eye icon to hide it from view.** You don't need to see it again — Replit has the only copy that matters.

### How to verify it worked

After implementation begins, the engineer (or AI agent) will run a one-line test that calls Gemini with the new key. If it returns "hello world", the key is live. You don't need to test it yourself.

### Things to know

- **Free tier may use your prompts for product improvement.** Google says so explicitly. This is acceptable for launch (decision D6 in `../09-decisions-log.md`). If you want to opt out, enable billing on the Google Cloud project (step 5 above) — this flips a setting that prevents Google from using your data for training. No code change needed.
- **The key is tied to one Google Cloud project.** If you ever want to rotate it (revoke and reissue), see runbook section 02-A in this folder.

---

## Provider 2 — Groq

**Why:** Groq is the fastest inference provider in the world. It's our default for chat, bullet rewriting, and anything where speed is felt by the user.

**Cost:** Free tier with daily limits — see `../03-providers-and-models.md`.

### Steps

1. **Open** [https://console.groq.com](https://console.groq.com).
2. Click **"Sign up"**. You can use Google sign-in or email + password.
3. Verify your email if prompted.
4. Once logged in, look in the left sidebar for **"API Keys"**.
5. Click **"Create API Key"**.
6. Give it a name like `wiseresume-prod` so you can identify it later.
7. The key will be shown **once**. It starts with `gsk_...` (about 56 characters).
8. **Copy the entire key.**
9. Switch to your Replit project, open **Secrets**, click **"+ New Secret"**.
10. **Key:** `GROQ_API_KEY` (uppercase, with underscore).
11. **Value:** paste the key.
12. Click **"Add Secret"**.

### Things to know

- **You will not be able to view the key again** in the Groq console. If you lose it, you create a new one — the old one is fine to leave behind, just delete it later.
- **Daily limits reset at UTC midnight.** Plan accordingly — the dashboard surfaces a "Reset in" countdown per `../08-admin-dashboard-spec.md` section 2.
- This secret already exists in many WiseResume environments. If you see `GROQ_API_KEY` already in your Replit Secrets list, **do not overwrite it without asking the engineer first** — it may be in active use.

---

## Provider 3 — OpenRouter

**Why:** OpenRouter is an aggregator. With one key you get access to hundreds of free and paid AI models. Our routing uses it as the universal safety-net fallback.

**Cost:** Free tier gives you 50 requests per day. **One-time recommendation:** add **$10 of credit** to your account (a single payment, not a subscription). This permanently raises the free-tier daily limit from 50 to 1,000 requests/day. This is the single highest-leverage spend in this entire project.

### Steps

1. **Open** [https://openrouter.ai](https://openrouter.ai).
2. Click **"Sign in"** in the top right. You can use Google, GitHub, or Metamask. Google is easiest.
3. Once signed in, click your **account icon** (top right) → **"Keys"** (or go directly to [https://openrouter.ai/keys](https://openrouter.ai/keys)).
4. Click **"Create Key"**.
5. Give it a name like `wiseresume-prod`.
6. **Optional but strongly recommended:** set a credit limit on this specific key (e.g. `$5/month`) so a runaway bug can't drain your account. You can edit this later.
7. The key will be shown **once**. It starts with `sk-or-v1-...` (about 73 characters).
8. **Copy it.**
9. In Replit Secrets, **+ New Secret**:
   - **Key:** `OPENROUTER_API_KEY`
   - **Value:** the key you copied
10. Click **"Add Secret"**.

### The $10 credit upgrade (do this now)

11. Back in OpenRouter, go to [https://openrouter.ai/credits](https://openrouter.ai/credits).
12. Click **"Add Credits"** and choose **$10**. Pay with a card.
13. Once the payment shows up in your balance (usually instantly), your daily free-tier limit is permanently raised from 50 → 1,000 requests/day.

The $10 is **not used up** by free models — they remain free. The $10 just sits there as a one-time gate. Paid models (which we don't use by default) would draw from it.

### Things to know

- **This secret may already exist** in your Replit environment. Same caution as with Groq: don't overwrite without asking.
- **Free model availability shifts.** OpenRouter sometimes adds or removes free models. The shared client (`aiClient.ts`) already discovers available free models dynamically — you don't need to do anything when this happens.

---

## After all three keys are saved

You should now have **three new (or already-existing-and-confirmed) entries** in your Replit Secrets, with these exact names:

| Secret name | Provider | Key prefix it starts with |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini | `AIzaSy...` |
| `GROQ_API_KEY` | Groq | `gsk_...` |
| `OPENROUTER_API_KEY` | OpenRouter | `sk-or-v1-...` |

That's all the routing project needs from you to begin Phase 1.

---

## Other secrets the project uses (for reference — you don't create these)

These already exist in your Replit project. The routing work doesn't change them, but the runbook (doc 02 in this folder) refers to them, so it's useful to know what each one is.

| Secret name | Purpose | Set by |
|---|---|---|
| `SUPABASE_URL` | URL of your Supabase backend | Already configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend access to your database | Already configured |
| `API_KEY_ENCRYPTION_SECRET` | Used to encrypt user-supplied (BYOK) keys at rest | Already configured |
| `DEV_KIT_PASSWORD` | Logs you into the DevKit admin area | Already configured |
| `ADMIN_EMAILS` | Comma-separated list of emails allowed into DevKit | Already configured |
| `SENTRY_DSN` (optional) | Sends backend errors to Sentry for monitoring | Optional |

---

## Common mistakes to avoid

- **Pasting the key into the wrong field.** Replit Secrets has a "Key" field (the name) and a "Value" field (the actual secret). The Key is `GEMINI_API_KEY`. The Value is the long `AIzaSy...` string. Don't swap them.
- **Adding extra whitespace.** When you copy a key, make sure you don't grab a trailing space or newline. If a key mysteriously doesn't work, this is the first thing to check.
- **Sharing a screenshot of the key.** If you ever need to show someone (including an AI agent) that the secret exists, share the **name** only, never the value. The runbook (doc 02) covers how to rotate a leaked key.
- **Using the same Google account for personal Gmail and your Gemini key.** Use a dedicated work account if you can — when you eventually upgrade to paid Gemini, billing is attached to the Google account.

---

## What happens next

Once you confirm "all three keys are in", the next step (when you decide to start building) is **Phase 0** in `../05-implementation-plan.md`, which is a pre-flight check: the engineer will run a tiny script that calls each provider once, just to verify the keys are valid. After that, Phase 1 begins.
