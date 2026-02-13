

## Update VAPID Public Key in Frontend

A single-line change to embed the actual VAPID public key into the push notifications hook.

### Change

**File: `src/hooks/usePushNotifications.ts`** (line 6)

Replace the placeholder:
```
const VAPID_PUBLIC_KEY = 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY';
```
With the actual key:
```
const VAPID_PUBLIC_KEY = 'BJUSBRC5npkRn-z1die5GrM_3kl88ngw8IeikAsRiXtCXXPW2oO0IqJNiCdBpMXkc5VdP1tSOy2APxNyhIsXCWg';
```

That is the only change needed. The private key is already stored as a backend secret and the edge function reads it from there.

