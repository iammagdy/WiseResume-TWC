# RevenueCat Payments Integration

**Added:** 2026-05-20  
**Status:** Active (sandbox mode — live keys needed for production)

---

## Architecture

```
User clicks Upgrade
      │
      ▼
RevenueCatProvider (web)
  └─ configureRevenueCat(userId)
      │
      ▼
useRevenueCat().purchase(pkg)
  └─ RC Billing checkout (Stripe-backed)
      │
      ▼
RC fires webhook → Appwrite Function (revenuecat-webhook)
  └─ verifies Authorization header
  └─ upserts subscriptions collection
      │
      ▼
queryClient.invalidateQueries(['me'])
  └─ usePlan re-reads from Appwrite → UI updates
```

---

## RC Dashboard Config (TheWiseCloud project)

| Item | Value |
|------|-------|
| Project | TheWiseCloud (`6af6d43e`) |
| Entitlements | `pro`, `premium` (lowercase) |
| Products | `wise_pro_monthly` ($5/mo), `wise_premium_monthly` ($10/mo) |
| Free trial | 3 days, "Has never made any purchase" eligibility |
| Offering | `default` — `$rc_monthly` → Pro, `$rc_annual` → Premium |
| Web Billing API key | `rcb_sb_*` (sandbox) in Vercel env |
| Webhook | "WiseResume Subscription Sync" → Active |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/revenuecat.ts` | Singleton configure/get |
| `src/providers/RevenueCatProvider.tsx` | Auth-aware RC init, tears down on sign-out |
| `src/hooks/useRevenueCat.ts` | Offerings, purchase, customerInfo, portal URL |
| `src/AppInterior.tsx` | `<RevenueCatProvider>` wrapping routes |
| `src/components/plan/UpgradeDialog.tsx` | Real purchase buttons (no coupon form) |
| `src/components/plan/UpgradeWall.tsx` | Direct purchase call |
| `src/pages/SubscriptionPage.tsx` | RC plan data + Stripe portal link |
| `appwrite-hubs/revenuecat-webhook/src/main.js` | Webhook handler |
| `scripts/deploy_webhook_hub.cjs` | Targeted deploy script for webhook only |

---

## Env Vars

| Var | Where | Note |
|-----|-------|------|
| `VITE_REVENUECAT_WEB_API_KEY` | Vercel (Production + Preview) | Sandbox `rcb_sb_*`; swap for live key when going live |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | `mobile/.env` | iOS RC key |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | `mobile/.env` | Android RC key |
| `REVENUECAT_WEBHOOK_SECRET` | Appwrite Function env | 64-char hex; matches RC webhook Authorization header value |

---

## Webhook Verification

RC sends whatever you configure as "Authorization header value" in the RC webhook settings. The Appwrite Function reads `req.headers['authorization']` and does a constant-time comparison against `REVENUECAT_WEBHOOK_SECRET`. Returns 401 if they don't match.

---

## Going Live Checklist

1. Connect Stripe account to RC Billing (done via RC dashboard → Web → Stripe)
2. Create live RC Web Billing app → get live `rcb_` key (not `rcb_sb_`)
3. Replace `VITE_REVENUECAT_WEB_API_KEY` in Vercel with the live key
4. Add iOS + Android apps to RC → get platform keys → set in mobile `.env`
5. Trigger a production Vercel redeploy
