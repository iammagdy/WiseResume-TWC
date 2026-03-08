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
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={logoUrl} width="48" height="48" alt="WiseResume" style={logoImg} />
        </Section>

        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>

        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.
        </Text>

        <Text style={brand}>WiseResume — Build your career story</Text>
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
const container = { padding: '40px 24px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoImg = { borderRadius: '12px', display: 'inline-block' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 28px', textAlign: 'center' as const }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#e63946',
  margin: '0 0 32px',
  textAlign: 'center' as const,
  letterSpacing: '4px',
}
const footer = { fontSize: '13px', color: '#9ca3af', margin: '0 0 16px', textAlign: 'center' as const, lineHeight: '1.5' }
const brand = {
  fontSize: '12px', color: '#d1d5db', textAlign: 'center' as const,
  margin: '24px 0 0', borderTop: '1px solid #f3f4f6', paddingTop: '16px',
}
