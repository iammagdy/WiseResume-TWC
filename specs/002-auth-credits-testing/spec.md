# WiseResume – Auth & AI Credits Testing Spec

**Context:** This feature specification defines the exact, testable behaviors required for Kinde Authentication and AI Credit Limits within WiseResume. It is designed to be the foundation for an upcoming testing strategy, focusing strictly on "WHAT" must happen, stripped of specific testing framework implementation details.

**Primary Goals:**
1. Ensure users are never erroneously blocked from accessing the app.
2. Ensure AI credits cannot be bypassed, averting unchecked API token consumption.
3. Verify that Kinde Auth and the Supabase token bridge integrate securely.

---

## 1. Kinde Auth Flow (Login, Logout, Access)

The authentication flow utilizes Kinde as the sole provider, bridging to Supabase via `token-exchange` edge functions and `supabaseBridge.ts`. The UI should only receive minimal, strictly necessary refactoring to achieve testability for these flows.

### Scenario 1.1: Successful User Login
- **Given** an unauthenticated visitor is on the landing page,
- **When** the visitor clicks "Login" and completes the Kinde authentication prompt successfully,
- **Then** the system must issue a valid session token,
- **And** the `token-exchange` bridge must successfully sync the Kinde session with Supabase,
- **And** the user must be redirected to the Dashboard.

### Scenario 1.2: Blocking Unauthenticated Route Access
- **Given** an unauthenticated visitor,
- **When** the visitor attempts to navigate directly to a protected route (e.g., `/editor` or `/applications`),
- **Then** the route guard must intercept the request,
- **And** the user must be redirected to the public landing page or the Kinde login prompt.

### Scenario 1.3: Successful User Logout
- **Given** an authenticated user is on the Dashboard,
- **When** the user initiates the "Logout" action,
- **Then** the system must invalidate the Kinde session,
- **And** the system must clear the bridged Supabase token,
- **And** the user must be redirected to the landing page as an unauthenticated visitor.

### Scenario 1.4: Token Expiration / Invalid Session
- **Given** a user with an expired or artificially invalidated Kinde session token,
- **When** the user attempts to interact with a protected backend API or edge function,
- **Then** the request must be denied with an unauthorized error (401),
- **And** the UI must gracefully prompt the user to log in again.

---

## 2. Preventing AI Credit Limit Bypasses

WiseResume limits AI feature usage through an internal credit system. Users must either have sufficient system credits or supply a valid BYOK (Bring Your Own Key) to perform AI actions.

### Scenario 2.1: Successful AI Action with Sufficient Credits
- **Given** an authenticated user with a positive AI credit balance,
- **When** the user requests an AI-powered action (e.g., "Enhance Bullet Point" or "Tailor Resume"),
- **Then** the system must process the AI request successfully,
- **And** precisely one credit (or the configured cost) must be deducted from the user's profile balance in Supabase.

### Scenario 2.2: Blocking AI Action with Zero Credits (No BYOK)
- **Given** an authenticated user with a zero AI credit balance and no BYOK configured,
- **When** the user requests an AI-powered action,
- **Then** the backend edge function must reject the request prior to hitting the external AI API,
- **And** the credit balance must remain zero,
- **And** the UI must display a message indicating insufficient credits, prompting a wait or BYOK.

### Scenario 2.3: Bypassing Client UI Restrictions (Direct API Attack)
- **Given** a user with zero AI credits,
- **When** the user completely bypasses the UI and attempts to send a forged request directly to the Supabase Edge Function for an AI action,
- **Then** the edge function must securely validate the user's balance server-side against the Supabase database,
- **And** the request must be firmly rejected with an unauthorized/payment-required error, ensuring external API tokens are not consumed.

### Scenario 2.4: Successful AI Action using Valid BYOK
- **Given** an authenticated user with zero AI credits but a valid, securely stored BYOK configured in their profile,
- **When** the user requests an AI-powered action,
- **Then** the system must bypass the internal credit deduction,
- **And** the system must use the provided BYOK to process the request,
- **And** the action must complete successfully.

### Scenario 2.5: Blocking AI Action using Invalid BYOK
- **Given** an authenticated user with zero AI credits and an invalid/expired BYOK configured,
- **When** the user requests an AI-powered action,
- **Then** the system must attempt to use the BYOK,
- **And** handle the resulting external API failure gracefully,
- **And** the UI must inform the user that their configured API key is invalid.
