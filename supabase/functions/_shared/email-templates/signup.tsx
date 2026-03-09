/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to WiseResume — verify your email to get started</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        {/* Dark header band */}
        <Section style={header}>
          <Img src={logoUrl} width="40" height="40" alt="WiseResume" style={headerLogo} />
          <Text style={headerText}>WiseResume</Text>
        </Section>

        {/* Red accent divider */}
        <Section style={accentDivider} />

        {/* Content card */}
        <Section style={card}>
          <Text style={emoji}>✨</Text>
          <Heading style={h1}>Welcome aboard</Heading>
          <Text style={bodyText}>
            You're one step away from building your career story. Verify your email address to get started.
          </Text>

          {/* OTP Code Block */}
          {token && (
            <Section style={otpWrapper}>
              <Text style={otpLabel}>Your verification code</Text>
              <Text style={otpCode}>{token}</Text>
              <Text style={otpHint}>Enter this code in the app, or use the button below</Text>
            </Section>
          )}

          <Section style={buttonWrapper}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: '0 auto' }}>
              <tr>
                <td style={buttonOuter}>
                  <a href={confirmationUrl} style={buttonInner}>
                    Get Started →
                  </a>
                </td>
              </tr>
            </table>
          </Section>

          <Text style={meta}>
            Verifying for <span style={metaHighlight}>{recipient}</span>
          </Text>
        </Section>

        {/* Footer band */}
        <Section style={footer}>
          <Text style={footerText}>
            Didn't sign up for <Link href={siteUrl} style={footerLink}>WiseResume</Link>? Just ignore this email.
          </Text>
          <Text style={footerBrand}>WiseResume — Build your career story</Text>
          <Text style={footerDomain}>thewise.cloud</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
  backgroundColor: '#e63946',
  margin: '0',
}
const card = {
  backgroundColor: '#f8f9fa',
  padding: '40px 32px 32px',
}
const emoji = {
  fontSize: '32px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
  lineHeight: '1',
}
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
const otpWrapper = {
  textAlign: 'center' as const,
  marginBottom: '28px',
  padding: '24px 20px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
}
const otpLabel = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#9ca3af',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 12px',
  textAlign: 'center' as const,
}
const otpCode = {
  fontSize: '36px',
  fontWeight: '800' as const,
  color: '#1a1a2e',
  letterSpacing: '8px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
  fontFamily: 'monospace, "Courier New", Courier',
}
const otpHint = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0',
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
}
const metaHighlight = { color: '#6b7280', fontWeight: '600' as const }
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
const footerDomain = {
  fontSize: '11px',
  color: '#4b5563',
  margin: '0',
}
