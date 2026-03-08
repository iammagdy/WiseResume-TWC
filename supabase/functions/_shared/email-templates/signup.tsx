/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
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
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to WiseResume — verify your email to get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={logoUrl} width="48" height="48" alt="WiseResume" style={logoImg} />
        </Section>

        <Heading style={h1}>Welcome to WiseResume</Heading>
        <Text style={text}>
          Thanks for signing up! Verify your email address (
          <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
          ) to start building your career story.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Verify Email
          </Button>
        </Section>

        <Text style={footer}>
          If you didn't create an account on{' '}
          <Link href={siteUrl} style={footerLink}>WiseResume</Link>,
          you can safely ignore this email.
        </Text>

        <Text style={brand}>WiseResume — Build your career story</Text>
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
const container = { padding: '40px 24px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoImg = { borderRadius: '12px', display: 'inline-block' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 28px', textAlign: 'center' as const }
const link = { color: '#1a1a2e', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, marginBottom: '32px' }
const button = {
  backgroundColor: '#e63946',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#9ca3af', margin: '0 0 16px', textAlign: 'center' as const, lineHeight: '1.5' }
const footerLink = { color: '#9ca3af', textDecoration: 'underline' }
const brand = {
  fontSize: '12px', color: '#d1d5db', textAlign: 'center' as const,
  margin: '24px 0 0', borderTop: '1px solid #f3f4f6', paddingTop: '16px',
}
