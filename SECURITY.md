# Security Policy

## Supported version

Security fixes are applied to the current `main` branch and the production release at [wiseresume.app](https://wiseresume.app). Older commits, forks, local modifications, and archived Atlas material are not supported releases.

## Reporting a vulnerability

Do not include exploits, credentials, tokens, real user data, or sensitive operational details in a public GitHub issue.

The preferred reporting channel is GitHub Private Vulnerability Reporting on this repository's **Security → Advisories → Report a vulnerability** page. That feature is not currently enabled; until the owner enables it, open a minimal public issue asking for a private reporting channel without disclosing the vulnerability, exploit, or affected data.

Reports may cover:

- the WiseResume web application;
- Vercel API routes in `api/`;
- Appwrite Functions in `appwrite-hubs/`; and
- authentication, authorization, data exposure, or supply-chain weaknesses in this repository.

Include a clear impact statement, affected component, safe reproduction outline, and suggested mitigation where possible. Never submit a real CV, user document, personal data, credential, session token, API key, or other secret as evidence. Use synthetic data and redact identifiers.

The maintainer will acknowledge and triage reports as availability permits, coordinate follow-up privately, and publish remediation information when it is safe to do so. No fixed response or resolution deadline is guaranteed.

## Safe-harbor boundaries

Avoid privacy violations, service disruption, social engineering, automated high-volume testing, persistence, data modification, and access to accounts or data you do not own. Stop testing and report privately if you encounter sensitive data.
