/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your WiseResume password</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Img src={logoUrl} width="40" height="40" alt="WiseResume" style={headerLogo} />
          <Text style={headerText}>WiseResume</Text>
        </Section>
        <Section style={accentDivider} />

        <Section style={card}>
          <Text style={emoji}>🛡️</Text>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={bodyText}>
            We received a request to reset your password. Click below to choose a new one — this link will expire shortly.
          </Text>

          <Section style={buttonWrapper}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: '0 auto' }}>
              <tr>
                <td style={buttonOuter}>
                  <a href={confirmationUrl} style={buttonInner}>
                    Reset Password →
                  </a>
                </td>
              </tr>
            </table>
          </Section>

          <Text style={meta}>
            If you didn't request this, your password won't change. Just ignore this email.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerBrand}>WiseResume — Build your career story</Text>
          <Text style={footerDomain}>thewise.cloud</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const card = { backgroundColor: '#f8f9fa', padding: '40px 32px 32px' }
const emoji = { fontSize: '32px', textAlign: 'center' as const, margin: '0 0 16px', lineHeight: '1' }
const h1 = {
  fontSize: '28px', fontWeight: '800' as const, color: '#1a1a2e',
  margin: '0 0 12px', textAlign: 'center' as const, letterSpacing: '-0.5px',
}
const bodyText = {
  fontSize: '15px', color: '#4b5563', lineHeight: '1.7',
  margin: '0 0 32px', textAlign: 'center' as const,
}
const buttonWrapper = { textAlign: 'center' as const, marginBottom: '24px' }
const buttonOuter = { backgroundColor: '#c1121f', borderRadius: '14px', padding: '2px' }
const buttonInner = {
  backgroundColor: '#e63946', color: '#ffffff', fontSize: '15px',
  fontWeight: '700' as const, borderRadius: '12px', padding: '16px 40px',
  textDecoration: 'none' as const, display: 'block' as const, textAlign: 'center' as const,
  letterSpacing: '0.3px',
}
const meta = { fontSize: '13px', color: '#9ca3af', textAlign: 'center' as const, margin: '0', lineHeight: '1.5' }
const footer = {
  backgroundColor: '#1a1a2e', padding: '24px 32px',
  textAlign: 'center' as const, borderRadius: '0 0 16px 16px',
}
const footerBrand = {
  fontSize: '11px', color: '#6b7280', margin: '0 0 4px',
  letterSpacing: '0.5px', textTransform: 'uppercase' as const,
}
const footerDomain = { fontSize: '11px', color: '#4b5563', margin: '0' }
