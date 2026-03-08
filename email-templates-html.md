# WiseResume — Supabase Email Template HTML (paste into Dashboard → Auth → Email Templates → Body Source)

> These are raw HTML templates using Go template variables (`{{ .ConfirmationURL }}`, `{{ .Token }}`, etc.)
> Paste each one into the **Source** tab of the corresponding email template in the Supabase dashboard.

---

## 1. Confirm Signup

**Subject:** `Welcome to WiseResume — verify your email`

```html
<html lang="en" dir="ltr">
<head><meta charset="utf-8" /></head>
<body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a2e;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <img src="https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png" width="40" height="40" alt="WiseResume" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;display:inline-block;vertical-align:middle;margin-left:12px;">WiseResume</span>
          </td>
        </tr>
        <!-- Accent Divider -->
        <tr>
          <td style="height:3px;background-color:#e63946;margin:0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <!-- Content Card -->
        <tr>
          <td style="background-color:#f8f9fa;padding:40px 32px 32px;">
            <p style="font-size:32px;text-align:center;margin:0 0 16px;line-height:1;">✨</p>
            <h1 style="font-size:28px;font-weight:800;color:#1a1a2e;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;">Welcome aboard</h1>
            <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 32px;text-align:center;">
              You're one step away from building your career story. Verify your email address to get started.
            </p>
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 24px;">
              <tr>
                <td style="background-color:#c1121f;border-radius:14px;padding:2px;">
                  <a href="{{ .ConfirmationURL }}" style="background-color:#e63946;color:#ffffff;font-size:15px;font-weight:700;border-radius:12px;padding:16px 40px;text-decoration:none;display:block;text-align:center;letter-spacing:0.3px;">
                    Get Started →
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;line-height:1.5;">
              Verifying for <span style="color:#6b7280;font-weight:600;">{{ .Email }}</span>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;border-radius:0 0 16px 16px;">
            <p style="font-size:12px;color:#9ca3af;margin:0 0 12px;line-height:1.5;">
              Didn't sign up for <a href="https://thewise.cloud" style="color:#e63946;text-decoration:none;">WiseResume</a>? Just ignore this email.
            </p>
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;letter-spacing:0.5px;text-transform:uppercase;">WiseResume — Build your career story</p>
            <p style="font-size:11px;color:#4b5563;margin:0;">thewise.cloud</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 2. Password Recovery (Reset Password)

**Subject:** `Reset your WiseResume password`

```html
<html lang="en" dir="ltr">
<head><meta charset="utf-8" /></head>
<body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a2e;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <img src="https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png" width="40" height="40" alt="WiseResume" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;display:inline-block;vertical-align:middle;margin-left:12px;">WiseResume</span>
          </td>
        </tr>
        <!-- Accent Divider -->
        <tr>
          <td style="height:3px;background-color:#e63946;margin:0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <!-- Content Card -->
        <tr>
          <td style="background-color:#f8f9fa;padding:40px 32px 32px;">
            <p style="font-size:32px;text-align:center;margin:0 0 16px;line-height:1;">🔑</p>
            <h1 style="font-size:28px;font-weight:800;color:#1a1a2e;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;">Reset your password</h1>
            <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 32px;text-align:center;">
              We received a request to reset your password. Click below to choose a new one.
            </p>
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 24px;">
              <tr>
                <td style="background-color:#c1121f;border-radius:14px;padding:2px;">
                  <a href="{{ .ConfirmationURL }}" style="background-color:#e63946;color:#ffffff;font-size:15px;font-weight:700;border-radius:12px;padding:16px 40px;text-decoration:none;display:block;text-align:center;letter-spacing:0.3px;">
                    Reset Password →
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;line-height:1.5;">
              Didn't request this? You can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;border-radius:0 0 16px 16px;">
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;letter-spacing:0.5px;text-transform:uppercase;">WiseResume — Build your career story</p>
            <p style="font-size:11px;color:#4b5563;margin:0;">thewise.cloud</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 3. Magic Link

**Subject:** `Your WiseResume login link`

```html
<html lang="en" dir="ltr">
<head><meta charset="utf-8" /></head>
<body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a2e;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <img src="https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png" width="40" height="40" alt="WiseResume" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;display:inline-block;vertical-align:middle;margin-left:12px;">WiseResume</span>
          </td>
        </tr>
        <!-- Accent Divider -->
        <tr>
          <td style="height:3px;background-color:#e63946;margin:0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <!-- Content Card -->
        <tr>
          <td style="background-color:#f8f9fa;padding:40px 32px 32px;">
            <p style="font-size:32px;text-align:center;margin:0 0 16px;line-height:1;">🔗</p>
            <h1 style="font-size:28px;font-weight:800;color:#1a1a2e;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;">Your login link</h1>
            <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 32px;text-align:center;">
              Click below to sign in instantly — no password needed. This link expires shortly.
            </p>
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 24px;">
              <tr>
                <td style="background-color:#c1121f;border-radius:14px;padding:2px;">
                  <a href="{{ .ConfirmationURL }}" style="background-color:#e63946;color:#ffffff;font-size:15px;font-weight:700;border-radius:12px;padding:16px 40px;text-decoration:none;display:block;text-align:center;letter-spacing:0.3px;">
                    Sign In →
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;line-height:1.5;">
              Didn't request this? You can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;border-radius:0 0 16px 16px;">
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;letter-spacing:0.5px;text-transform:uppercase;">WiseResume — Build your career story</p>
            <p style="font-size:11px;color:#4b5563;margin:0;">thewise.cloud</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 4. Invite User

**Subject:** `You've been invited to join WiseResume`

```html
<html lang="en" dir="ltr">
<head><meta charset="utf-8" /></head>
<body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a2e;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <img src="https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png" width="40" height="40" alt="WiseResume" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;display:inline-block;vertical-align:middle;margin-left:12px;">WiseResume</span>
          </td>
        </tr>
        <!-- Accent Divider -->
        <tr>
          <td style="height:3px;background-color:#e63946;margin:0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <!-- Content Card -->
        <tr>
          <td style="background-color:#f8f9fa;padding:40px 32px 32px;">
            <p style="font-size:32px;text-align:center;margin:0 0 16px;line-height:1;">🎉</p>
            <h1 style="font-size:28px;font-weight:800;color:#1a1a2e;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;">You're invited</h1>
            <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 32px;text-align:center;">
              Someone invited you to join <a href="https://thewise.cloud" style="color:#e63946;text-decoration:none;"><strong>WiseResume</strong></a>.
              Accept below to create your account and start building your career story.
            </p>
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 24px;">
              <tr>
                <td style="background-color:#c1121f;border-radius:14px;padding:2px;">
                  <a href="{{ .ConfirmationURL }}" style="background-color:#e63946;color:#ffffff;font-size:15px;font-weight:700;border-radius:12px;padding:16px 40px;text-decoration:none;display:block;text-align:center;letter-spacing:0.3px;">
                    Accept Invitation →
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;line-height:1.5;">
              Not expecting this? You can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;border-radius:0 0 16px 16px;">
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;letter-spacing:0.5px;text-transform:uppercase;">WiseResume — Build your career story</p>
            <p style="font-size:11px;color:#4b5563;margin:0;">thewise.cloud</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 5. Email Change

**Subject:** `Confirm your email change on WiseResume`

```html
<html lang="en" dir="ltr">
<head><meta charset="utf-8" /></head>
<body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a2e;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <img src="https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png" width="40" height="40" alt="WiseResume" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;display:inline-block;vertical-align:middle;margin-left:12px;">WiseResume</span>
          </td>
        </tr>
        <!-- Accent Divider -->
        <tr>
          <td style="height:3px;background-color:#e63946;margin:0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <!-- Content Card -->
        <tr>
          <td style="background-color:#f8f9fa;padding:40px 32px 32px;">
            <p style="font-size:32px;text-align:center;margin:0 0 16px;line-height:1;">📧</p>
            <h1 style="font-size:28px;font-weight:800;color:#1a1a2e;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;">Confirm email change</h1>
            <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 32px;text-align:center;">
              You requested to update your email to a new address. Click below to confirm this change.
            </p>
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 24px;">
              <tr>
                <td style="background-color:#c1121f;border-radius:14px;padding:2px;">
                  <a href="{{ .ConfirmationURL }}" style="background-color:#e63946;color:#ffffff;font-size:15px;font-weight:700;border-radius:12px;padding:16px 40px;text-decoration:none;display:block;text-align:center;letter-spacing:0.3px;">
                    Confirm Change →
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;line-height:1.5;">
              Didn't request this? Please secure your account immediately.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;border-radius:0 0 16px 16px;">
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;letter-spacing:0.5px;text-transform:uppercase;">WiseResume — Build your career story</p>
            <p style="font-size:11px;color:#4b5563;margin:0;">thewise.cloud</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 6. Reauthentication (OTP Code)

**Subject:** `Your WiseResume verification code`

```html
<html lang="en" dir="ltr">
<head><meta charset="utf-8" /></head>
<body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a2e;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <img src="https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png" width="40" height="40" alt="WiseResume" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;display:inline-block;vertical-align:middle;margin-left:12px;">WiseResume</span>
          </td>
        </tr>
        <!-- Accent Divider -->
        <tr>
          <td style="height:3px;background-color:#e63946;margin:0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <!-- Content Card -->
        <tr>
          <td style="background-color:#f8f9fa;padding:40px 32px 32px;">
            <p style="font-size:32px;text-align:center;margin:0 0 16px;line-height:1;">🔐</p>
            <h1 style="font-size:28px;font-weight:800;color:#1a1a2e;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;">Verification code</h1>
            <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 24px;text-align:center;">
              Use the code below to confirm your identity:
            </p>
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 24px;">
              <tr>
                <td style="background-color:#1a1a2e;border-radius:12px;padding:20px 40px;text-align:center;">
                  <span style="font-family:'SF Mono','Fira Code',Courier,monospace;font-size:32px;font-weight:800;color:#e63946;letter-spacing:6px;">{{ .Token }}</span>
                </td>
              </tr>
            </table>
            <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;line-height:1.5;">
              This code expires shortly. Didn't request this? Just ignore it.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;border-radius:0 0 16px 16px;">
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;letter-spacing:0.5px;text-transform:uppercase;">WiseResume — Build your career story</p>
            <p style="font-size:11px;color:#4b5563;margin:0;">thewise.cloud</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 7. Password Changed (Notification)

**Subject:** `Your WiseResume password has been changed`

```html
<html lang="en" dir="ltr">
<head><meta charset="utf-8" /></head>
<body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;">
        <tr>
          <td style="background-color:#1a1a2e;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <img src="https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png" width="40" height="40" alt="WiseResume" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;display:inline-block;vertical-align:middle;margin-left:12px;">WiseResume</span>
          </td>
        </tr>
        <tr>
          <td style="height:3px;background-color:#e63946;margin:0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="background-color:#f8f9fa;padding:40px 32px 32px;">
            <p style="font-size:32px;text-align:center;margin:0 0 16px;line-height:1;">🔒</p>
            <h1 style="font-size:28px;font-weight:800;color:#1a1a2e;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;">Password changed</h1>
            <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 24px;text-align:center;">
              Your WiseResume password was successfully changed. If you made this change, no further action is needed.
            </p>
            <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;text-align:center;margin:0 0 24px;">
              <p style="font-size:14px;color:#991b1b;margin:0;line-height:1.5;">
                ⚠️ If you did <strong>not</strong> make this change, please <a href="{{ .SiteURL }}/auth?mode=reset" style="color:#e63946;text-decoration:underline;font-weight:600;">reset your password</a> immediately.
              </p>
            </div>
            <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;line-height:1.5;">
              This is an automated security notification for <span style="color:#6b7280;font-weight:600;">{{ .Email }}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;border-radius:0 0 16px 16px;">
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;letter-spacing:0.5px;text-transform:uppercase;">WiseResume — Build your career story</p>
            <p style="font-size:11px;color:#4b5563;margin:0;">thewise.cloud</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 8. Email Address Changed (Notification)

**Subject:** `Your WiseResume email address has been changed`

```html
<html lang="en" dir="ltr">
<head><meta charset="utf-8" /></head>
<body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;">
        <tr>
          <td style="background-color:#1a1a2e;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <img src="https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png" width="40" height="40" alt="WiseResume" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;display:inline-block;vertical-align:middle;margin-left:12px;">WiseResume</span>
          </td>
        </tr>
        <tr>
          <td style="height:3px;background-color:#e63946;margin:0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="background-color:#f8f9fa;padding:40px 32px 32px;">
            <p style="font-size:32px;text-align:center;margin:0 0 16px;line-height:1;">📬</p>
            <h1 style="font-size:28px;font-weight:800;color:#1a1a2e;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;">Email address changed</h1>
            <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 24px;text-align:center;">
              The email address on your WiseResume account has been updated. If you made this change, no further action is needed.
            </p>
            <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;text-align:center;margin:0 0 24px;">
              <p style="font-size:14px;color:#991b1b;margin:0;line-height:1.5;">
                ⚠️ If you did <strong>not</strong> make this change, please contact us immediately at <a href="mailto:support@thewise.cloud" style="color:#e63946;text-decoration:underline;font-weight:600;">support@thewise.cloud</a>
              </p>
            </div>
            <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;line-height:1.5;">
              This notification was sent to <span style="color:#6b7280;font-weight:600;">{{ .Email }}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;border-radius:0 0 16px 16px;">
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;letter-spacing:0.5px;text-transform:uppercase;">WiseResume — Build your career story</p>
            <p style="font-size:11px;color:#4b5563;margin:0;">thewise.cloud</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## Variable Reference

| Template | Variables Available |
|---|---|
| Confirm Signup | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}` |
| Password Recovery | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}` |
| Magic Link | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}` |
| Invite User | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}` |
| Email Change | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .SiteURL }}` |
| Reauthentication | `{{ .Token }}`, `{{ .Email }}` |
| Password Changed | `{{ .Email }}`, `{{ .SiteURL }}` |
| Email Address Changed | `{{ .Email }}`, `{{ .SiteURL }}` |

## How to Apply

1. Go to **Supabase Dashboard → Authentication → Email Templates**
2. For each template type, click **Source** tab
3. Paste the corresponding HTML from above
4. Update the **Subject** field with the subject listed above each template
5. Click **Save**
6. For **Password Changed** and **Email Address Changed**: enable the toggle first (they are disabled by default), then paste the HTML
