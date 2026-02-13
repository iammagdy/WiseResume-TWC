

## PWA Push Notifications Implementation

### Overview
Add production-ready Web Push notifications to WiseResume, working on Android Chrome (installed PWA), iOS Safari (installed PWA), and desktop browsers. This involves VAPID key setup, a database table for subscriptions, a custom service worker with push handlers, a React hook, an edge function for RFC 8291 encrypted push delivery, and a settings UI.

---

### Step 0: VAPID Key Secrets

Before any code changes, two secrets need to be added to Lovable Cloud:

- **VAPID_PUBLIC_KEY** -- Base64URL-encoded public key (also embedded in frontend code as a constant, since it is a publishable key)
- **VAPID_PRIVATE_KEY** -- Base64URL-encoded private key (backend only, used by the edge function)

You will need to generate a VAPID key pair (e.g., using an online VAPID generator) and provide them when prompted.

---

### Step 1: Database -- `push_subscriptions` Table

Create a new table via migration:

- `id` UUID PK
- `user_id` UUID NOT NULL (references auth.users, CASCADE delete)
- `endpoint` TEXT NOT NULL
- `p256dh` TEXT NOT NULL
- `auth` TEXT NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT now()
- UNIQUE constraint on `(user_id, endpoint)`

RLS policies:
- INSERT: `auth.uid() = user_id`
- SELECT: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`
- No UPDATE needed (subscriptions are replaced via upsert)

---

### Step 2: Custom Service Worker with Push Handlers

**File: `public/custom-sw.js`** (new file)

A custom service worker script that `vite-plugin-pwa` will inject into. Contains:

- `push` event listener -- parses JSON payload, shows notification with title/body/icon/badge
- `notificationclick` event listener -- focuses existing window or opens new one at the notification URL
- Posts `PUSH_RECEIVED` message to open clients for in-app handling

**File: `vite.config.ts`** (modify)

Update the VitePWA config to use `injectManifest` strategy with `swSrc: 'public/custom-sw.js'` so Workbox precaching is injected into our custom SW that also has push handlers. This keeps a single service worker for both caching and push.

Key change:
```
strategies: 'injectManifest',
srcDir: 'public',
filename: 'custom-sw.js',
```

The custom SW file will include `self.__WB_MANIFEST` for Workbox injection plus the push/notification click handlers.

---

### Step 3: React Hook -- `usePushNotifications`

**File: `src/hooks/usePushNotifications.ts`** (new file)

A hook that:

- Detects platform (iOS vs Android/desktop) and PWA mode
- Checks if push is supported (iOS requires installed PWA; Android/desktop works in browser too)
- Reads current `Notification.permission` and existing subscription state
- `subscribe()` -- requests permission, subscribes via `PushManager`, stores subscription in `push_subscriptions` table
- `unsubscribe()` -- unsubscribes from push manager and deletes DB row
- `sendTest()` -- calls the edge function to send a test push to the current user
- Uses `VAPID_PUBLIC_KEY` as a constant (publishable key, safe for frontend)

Returns: `{ isSupported, isSubscribed, permission, isLoading, isiOS, isPWA, subscribe, unsubscribe, sendTest }`

---

### Step 4: Edge Function -- `send-push-notification`

**File: `supabase/functions/send-push-notification/index.ts`** (new file)

Implements RFC 8291 Web Push encryption and RFC 8292 VAPID authentication:

- Input: `{ user_id, title, body, url?, icon?, badge? }`
- Fetches all `push_subscriptions` for the given `user_id` using the service role client
- For each subscription:
  1. Generates ECDH shared secret from subscription's `p256dh` key and server-generated ephemeral key
  2. Derives encryption key and nonce via HKDF (RFC 5869)
  3. Encrypts payload with AES-128-GCM in `aes128gcm` content encoding format (RFC 8291)
  4. Constructs VAPID JWT (RFC 8292) with `aud` = subscription endpoint origin
  5. POSTs encrypted body to the push endpoint with proper headers
  6. Cleans up 404/410 (expired) subscriptions automatically
- Uses `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` from secrets
- CORS-enabled for frontend calls

**Config: `supabase/config.toml`** -- add:
```
[functions.send-push-notification]
verify_jwt = false
```

---

### Step 5: Push Notification Settings UI

**File: `src/components/settings/PushNotificationSettings.tsx`** (new file)

A component that integrates into the existing Notifications section of the Settings page. Shows:

- **iOS not installed**: Info card explaining "Add to Home Screen" is required for push on iOS
- **Not supported**: Message for unsupported browsers
- **Permission denied**: Instructions to update browser settings
- **Supported**: Toggle switch to enable/disable push notifications
- **Subscribed**: "Send Test Notification" button

Uses the same glass-elevated styling and SettingsRow patterns as the rest of the Settings page.

**File: `src/pages/SettingsPage.tsx`** (modify)

Add the `PushNotificationSettings` component inside the existing "Notifications" section (`id="section-notifications"`), right before the "Auto-save Toasts" row. Import it lazily for code splitting.

---

### Step 6: Safe Area CSS (minor)

The safe area utilities (`pt-safe`, `pb-safe`, etc.) are already configured in the Tailwind config. No additional CSS changes needed.

The `index.html` already has all necessary PWA meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `manifest`, `apple-touch-icon`, `theme-color`). No changes needed there.

---

### Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| Secrets | Add | VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY |
| Migration SQL | Create | `push_subscriptions` table with RLS |
| `public/custom-sw.js` | Create | Custom SW with Workbox inject + push handlers |
| `vite.config.ts` | Modify | Switch to `injectManifest` strategy |
| `src/hooks/usePushNotifications.ts` | Create | React hook for push subscription management |
| `supabase/functions/send-push-notification/index.ts` | Create | Edge function with RFC 8291 encryption |
| `supabase/config.toml` | Modify | Add send-push-notification function config |
| `src/components/settings/PushNotificationSettings.tsx` | Create | Settings UI component |
| `src/pages/SettingsPage.tsx` | Modify | Integrate push settings into Notifications section |

