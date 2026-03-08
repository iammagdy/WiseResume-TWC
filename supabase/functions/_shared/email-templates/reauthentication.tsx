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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your WiseResume verification code</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Img src={logoUrl} width="40" height="40" alt="WiseResume" style={headerLogo} />
          <Text style={headerText}>WiseResume</Text>
        </Section>
        <Section style={accentDivider} />

        <Section style={card}>
          <Text style={emoji}>🔐</Text>
          <Heading style={h1}>Verification code</Heading>
          <Text style={bodyText}>
            Use the code below to confirm your identity:
          </Text>

          <Section style={codeBlock}>
            <Text style={codeText}>{token}</Text>
          </Section>

          <Text style={meta}>
            This code expires shortly. Didn't request this? Just ignore it.
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

export default ReauthenticationEmail

const logoUrl = 'https://hjnnamwgztlhzkeuufln.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png'

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}
const wrapper = { maxWidth: '520px', margin: '0 auto', padding: '0' }
const header = {
  backgroundColor: '#1a1a2e', padding: '28px 32px',
  textAlign: 'center' as const, borderRadius: '16px 16px 0 0',
}
const headerLogo = { borderRadius: '10px', display: 'inline-block', verticalAlign: 'middle' }
const headerText = {
  color: '#ffffff', fontSize: '18px', fontWeight: '700' as const,
  letterSpacing: '-0.3px', display: 'inline-block', verticalAlign: 'middle', margin: '0 0 0 12px',
}
const accentDivider = {
  height: '3px', background: 'linear-gradient(90deg, #e63946, #d62839, #e63946)',
  backgroundColor: '#e63946', margin: '0',
}
const card = { backgroundColor: '#f8f9fa', padding: '40px 32px 32px' }
const emoji = { fontSize: '32px', textAlign: 'center' as const, margin: '0 0 16px', lineHeight: '1' }
const h1 = {
  fontSize: '28px', fontWeight: '800' as const, color: '#1a1a2e',
  margin: '0 0 12px', textAlign: 'center' as const, letterSpacing: '-0.5px',
}
const bodyText = {
  fontSize: '15px', color: '#4b5563', lineHeight: '1.7',
  margin: '0 0 24px', textAlign: 'center' as const,
}
const codeBlock = {
  backgroundColor: '#1a1a2e',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}
const codeText = {
  fontFamily: '"SF Mono", "Fira Code", Courier, monospace',
  fontSize: '32px',
  fontWeight: '800' as const,
  color: '#e63946',
  letterSpacing: '6px',
  margin: '0',
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
