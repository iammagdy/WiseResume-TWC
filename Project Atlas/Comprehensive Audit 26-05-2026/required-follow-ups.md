# Required Follow-ups

Minimum blocking information/access needed to convert `UNKNOWN` items into `PASS`/`FAIL`:

1. **Vercel production dashboard access**
   - Confirm project, production branch, latest commit, build command, output directory, install command, Node version, env vars, deployment logs, and rollback availability.

2. **Production URL confirmation**
   - Confirm canonical production app URL and whether `https://resume.thewise.cloud` is the only production frontend.

3. **Production test accounts**
   - At minimum: one new job-seeker account, one existing verified job-seeker account, one HR/WiseHire account, one admin/devkit operator account, one test paid/subscription account.

4. **Appwrite Console access**
   - Verify function deployments, execution permissions, function variables, execution logs, database collections, indexes, document permissions, storage buckets, auth providers, allowed origins, and email/auth settings.

5. **Appwrite schema/permissions export**
   - Needed to audit access control and environment reproducibility without relying on dashboard screenshots.

6. **Resend dashboard access**
   - Verify API key scope, domain verification, SPF/DKIM/DMARC, delivery logs, bounce/complaint logs, and webhook status.

7. **RevenueCat dashboard access**
   - Verify webhook URL, authorization secret, recent event delivery, retries, and test event replay.

8. **Sentry dashboard access**
   - Verify DSN, project, releases/source maps, event ingestion, alert rules, PII scrubbing, and error ownership.

9. **AI provider key status**
   - Verify OpenRouter/Groq/DeepSeek/NVIDIA key presence, quotas, billing limits, rate-limit behavior, and provider retention/data-use settings.

10. **Monitoring dashboards/logs**
    - Vercel logs, Appwrite executions, Sentry issues, Resend logs, RevenueCat logs, and any uptime monitor.

11. **Backup and restore evidence**
    - Appwrite database backup policy, restore procedure, last successful backup, and restore drill result.

12. **Webhook logs**
    - RevenueCat and email/webhook logs to prove production event processing.

13. **Production smoke-test approval**
    - Permission to run non-destructive signup/login/email/AI/payment test flows against production using test accounts and test data.
