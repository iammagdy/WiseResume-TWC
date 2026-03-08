# WiseResume — Auth Email Templates Design Spec & AI Agent Prompt

> **Use this document as a prompt for any AI agent to recreate all 6 branded authentication email templates for WiseResume.**

---

## Global Design System

### Brand Identity
- **App Name**: WiseResume
- **Tagline**: Build your career story
- **Domain**: thewise.cloud
- **Logo URL**: `https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png`
- **Logo Size**: 40×40px, border-radius 10px

### Color Palette

| Token              | Hex       | Usage                                      |
|---------------------|-----------|---------------------------------------------|
| Dark Navy           | `#1a1a2e` | Header background, footer background, headings |
| Vibrant Red         | `#e63946` | CTA button, accent divider, links           |
| Deep Red            | `#c1121f` | Button outer shadow / border trick          |
| Darker Red          | `#d62839` | Gradient mid-point for accent divider       |
| Light Gray Card     | `#f8f9fa` | Content card background                     |
| Body Text           | `#4b5563` | Paragraph text                              |
| Muted Text          | `#9ca3af` | Meta/disclaimer text                        |
| Semi-Muted Text     | `#6b7280` | Footer brand text, highlights               |
| White               | `#ffffff` | Page background, button text, header text   |

### Typography

| Element        | Size  | Weight | Color     | Letter-Spacing | Line-Height |
|----------------|-------|--------|-----------|----------------|-------------|
| Heading (h1)   | 28px  | 800    | `#1a1a2e` | -0.5px         | default     |
| Body text       | 15px  | 400    | `#4b5563` | default        | 1.7         |
| Header app name | 18px  | 700    | `#ffffff` | -0.3px         | default     |
| Meta text       | 13px  | 400    | `#9ca3af` | default        | 1.5         |
| Footer brand    | 11px  | 400    | `#6b7280` | 0.5px          | default     |
| Footer domain   | 11px  | 400    | `#4b5563` | default        | default     |
| Button text     | 15px  | 700    | `#ffffff` | 0.3px          | default     |

**Font stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

### Layout Anatomy

```
┌─────────────────────────────────────┐
│         HEADER (dark navy)          │  ← #1a1a2e, padding 28px 32px
│     [Logo 40x40]  WiseResume        │     border-radius: 16px 16px 0 0
├─────────────────────────────────────┤
│  RED ACCENT DIVIDER (3px)           │  ← gradient: #e63946 → #d62839 → #e63946
├─────────────────────────────────────┤
│                                     │
│         CONTENT CARD                │  ← #f8f9fa, padding 40px 32px 32px
│                                     │
│           [Emoji]                   │     32px font, centered
│        [Heading h1]                 │     28px, 800 weight
│        [Body text]                  │     15px, #4b5563
│                                     │
│     ┌─────────────────┐             │
│     │   [CTA Button]  │             │  ← See button spec below
│     └─────────────────┘             │
│                                     │
│        [Meta text]                  │     13px, #9ca3af
│                                     │
├─────────────────────────────────────┤
│         FOOTER (dark navy)          │  ← #1a1a2e, padding 24px 32px
│   WiseResume — Build your career    │     border-radius: 0 0 16px 16px
│         thewise.cloud               │
└─────────────────────────────────────┘
```

**Container**: max-width 520px, centered, no outer padding.

### CTA Button Spec

The button uses a **double-layer technique** for a subtle shadow/border effect:

```
Outer <td>:
  background-color: #c1121f (deep red — acts as shadow)
  border-radius: 14px
  padding: 2px

Inner <a>:
  background-color: #e63946 (vibrant red)
  color: #ffffff
  font-size: 15px
  font-weight: 700
  border-radius: 12px
  padding: 16px 40px
  text-decoration: none
  display: block
  text-align: center
  letter-spacing: 0.3px
```

The button is wrapped in a `<table>` with `cellPadding="0" cellSpacing="0" role="presentation"` and `margin: 0 auto` for centering. The button wrapper section has `text-align: center` and `margin-bottom: 24px`.

### Link Style
- Color: `#e63946`
- Text-decoration: none

---

## Technology Stack

- **React Email**: `@react-email/components@0.0.22`
- **React**: `react@18.3.1`
- **Runtime**: Deno (Supabase Edge Functions)
- **Imports**: Use `npm:` prefix for Deno compatibility
- **Type reference**: `/// <reference types="npm:@types/react@18.3.1" />`

### Required Imports

```tsx
/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img,
  Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
```

---

## Template 1: Signup Confirmation

**File**: `supabase/functions/_shared/email-templates/signup.tsx`

### Props Interface
```ts
interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}
```

### Content
| Element         | Value                                                                                     |
|-----------------|-------------------------------------------------------------------------------------------|
| Preview text    | `Welcome to WiseResume — verify your email to get started`                                |
| Emoji           | ✨                                                                                        |
| Heading         | `Welcome aboard`                                                                          |
| Body text       | `You're one step away from building your career story. Verify your email address to get started.` |
| Button text     | `Get Started →`                                                                           |
| Meta text       | `Verifying for {recipient}` — recipient email in `#6b7280` bold                           |
| Footer extra    | `Didn't sign up for WiseResume? Just ignore this email.` (WiseResume links to `siteUrl`)  |

### Export
```tsx
export const SignupEmail = ({ ... }: SignupEmailProps) => ( ... )
export default SignupEmail
```

---

## Template 2: Password Recovery

**File**: `supabase/functions/_shared/email-templates/recovery.tsx`

### Props Interface
```ts
interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}
```

### Content
| Element         | Value                                                                                     |
|-----------------|-------------------------------------------------------------------------------------------|
| Preview text    | `Reset your WiseResume password`                                                          |
| Emoji           | 🛡️                                                                                       |
| Heading         | `Reset your password`                                                                     |
| Body text       | `We received a request to reset your password. Click below to choose a new one — this link will expire shortly.` |
| Button text     | `Reset Password →`                                                                       |
| Meta text       | `If you didn't request this, your password won't change. Just ignore this email.`         |

### Export
```tsx
export const RecoveryEmail = ({ ... }: RecoveryEmailProps) => ( ... )
export default RecoveryEmail
```

---

## Template 3: Magic Link

**File**: `supabase/functions/_shared/email-templates/magic-link.tsx`

### Props Interface
```ts
interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}
```

### Content
| Element         | Value                                                                                     |
|-----------------|-------------------------------------------------------------------------------------------|
| Preview text    | `Your WiseResume login link`                                                              |
| Emoji           | 🔗                                                                                        |
| Heading         | `Your login link`                                                                         |
| Body text       | `Click below to sign in instantly — no password needed. This link expires shortly.`       |
| Button text     | `Sign In →`                                                                               |
| Meta text       | `Didn't request this? You can safely ignore this email.`                                  |

### Export
```tsx
export const MagicLinkEmail = ({ ... }: MagicLinkEmailProps) => ( ... )
export default MagicLinkEmail
```

---

## Template 4: Invitation

**File**: `supabase/functions/_shared/email-templates/invite.tsx`

### Props Interface
```ts
interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}
```

### Content
| Element         | Value                                                                                     |
|-----------------|-------------------------------------------------------------------------------------------|
| Preview text    | `You've been invited to join WiseResume`                                                  |
| Emoji           | 🎉                                                                                        |
| Heading         | `You're invited`                                                                          |
| Body text       | `Someone invited you to join WiseResume. Accept below to create your account and start building your career story.` — "WiseResume" is a link (`#e63946`, bold) to `siteUrl` |
| Button text     | `Accept Invitation →`                                                                    |
| Meta text       | `Not expecting this? You can safely ignore this email.`                                   |

### Export
```tsx
export const InviteEmail = ({ ... }: InviteEmailProps) => ( ... )
export default InviteEmail
```

---

## Template 5: Email Change Confirmation

**File**: `supabase/functions/_shared/email-templates/email-change.tsx`

### Props Interface
```ts
interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}
```

### Content
| Element         | Value                                                                                     |
|-----------------|-------------------------------------------------------------------------------------------|
| Preview text    | `Confirm your new email address for WiseResume`                                           |
| Emoji           | 📧                                                                                        |
| Heading         | `Confirm email change`                                                                    |
| Body text       | `You requested to change your email address. Confirm below to complete the update.`       |
| Highlight block | Shows old email (`{email}`) → new email (`{newEmail}`) with arrow between them. Emails displayed in `#e63946` bold. Arrow in `#9ca3af`. Block has `#f0f0f5` background, 12px border-radius, 16px 20px padding. |
| Button text     | `Confirm Change →`                                                                       |
| Meta text       | `Didn't request this? Your email won't change. Just ignore this email.`                   |

### Export
```tsx
export const EmailChangeEmail = ({ ... }: EmailChangeEmailProps) => ( ... )
export default EmailChangeEmail
```

---

## Template 6: Reauthentication (OTP Code)

**File**: `supabase/functions/_shared/email-templates/reauthentication.tsx`

### Props Interface
```ts
interface ReauthenticationEmailProps {
  token: string
}
```

### Content
| Element         | Value                                                                                     |
|-----------------|-------------------------------------------------------------------------------------------|
| Preview text    | `Your WiseResume verification code`                                                       |
| Emoji           | 🔐                                                                                        |
| Heading         | `Verification code`                                                                       |
| Body text       | `Use the code below to confirm your identity:`                                            |
| Code block      | Dark block (`#1a1a2e` background, 12px border-radius, 20px padding, centered, margin-bottom 24px). Code text: monospace font (`"SF Mono", "Fira Code", Courier, monospace`), 32px, 800 weight, `#e63946` color, 6px letter-spacing. |
| Meta text       | `This code expires shortly. Didn't request this? Just ignore it.`                         |

**Note**: This template has NO CTA button — it displays the OTP code instead.

### Export
```tsx
export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => ( ... )
export default ReauthenticationEmail
```

---

## Shared Style Definitions (for all templates)

```ts
const logoUrl = 'https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png'

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}
const wrapper = { maxWidth: '520px', margin: '0 auto', padding: '0' }
const header = {
  backgroundColor: '#1a1a2e',
  padding: '28px 32px',
  textAlign: 'center' as const,
  borderRadius: '16px 16px 0 0',
}
const headerLogo = { borderRadius: '10px', display: 'inline-block', verticalAlign: 'middle' }
const headerText = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '700' as const,
  letterSpacing: '-0.3px',
  display: 'inline-block',
  verticalAlign: 'middle',
  margin: '0 0 0 12px',
}
const accentDivider = {
  height: '3px',
  background: 'linear-gradient(90deg, #e63946, #d62839, #e63946)',
  backgroundColor: '#e63946',  // fallback for email clients that don't support gradients
  margin: '0',
}
const card = { backgroundColor: '#f8f9fa', padding: '40px 32px 32px' }
const emoji = { fontSize: '32px', textAlign: 'center' as const, margin: '0 0 16px', lineHeight: '1' }
const h1 = {
  fontSize: '28px',
  fontWeight: '800' as const,
  color: '#1a1a2e',
  margin: '0 0 12px',
  textAlign: 'center' as const,
  letterSpacing: '-0.5px',
}
const bodyText = {
  fontSize: '15px',
  color: '#4b5563',
  lineHeight: '1.7',
  margin: '0 0 32px',
  textAlign: 'center' as const,
}
const buttonWrapper = { textAlign: 'center' as const, marginBottom: '24px' }
const buttonOuter = {
  backgroundColor: '#c1121f',
  borderRadius: '14px',
  padding: '2px',
}
const buttonInner = {
  backgroundColor: '#e63946',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '700' as const,
  borderRadius: '12px',
  padding: '16px 40px',
  textDecoration: 'none' as const,
  display: 'block' as const,
  textAlign: 'center' as const,
  letterSpacing: '0.3px',
}
const meta = {
  fontSize: '13px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '0',
  lineHeight: '1.5',
}
const link = { color: '#e63946', textDecoration: 'none' }
const footer = {
  backgroundColor: '#1a1a2e',
  padding: '24px 32px',
  textAlign: 'center' as const,
  borderRadius: '0 0 16px 16px',
}
const footerText = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0 0 12px',
  lineHeight: '1.5',
}
const footerLink = { color: '#e63946', textDecoration: 'none' }
const footerBrand = {
  fontSize: '11px',
  color: '#6b7280',
  margin: '0 0 4px',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
}
const footerDomain = { fontSize: '11px', color: '#4b5563', margin: '0' }
```

---

## Email Client Compatibility Notes

- All styles are **inline** (no `<style>` tags) for maximum email client support
- Use `<table>` with `role="presentation"` for button centering
- `background` CSS gradient has a `backgroundColor` fallback
- No CSS Grid, no Flexbox — everything uses inline-block and text-align
- `as const` type assertions are TypeScript-specific for strict typing
- `Html` component uses `lang="en" dir="ltr"` for accessibility

---

## Summary

This document fully describes the visual design, copy, structure, and technical implementation for all 6 WiseResume authentication email templates. An AI agent should be able to reproduce these templates pixel-perfectly using this spec alone.
