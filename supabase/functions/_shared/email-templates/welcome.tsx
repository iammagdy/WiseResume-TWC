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

interface WelcomeEmailProps {
  siteName: string
  siteUrl: string
  firstName?: string
}

export const WelcomeEmail = ({
  siteName,
  siteUrl,
  firstName,
}: WelcomeEmailProps) => {
  const greeting = firstName ? `Welcome, ${firstName}!` : 'Welcome aboard!'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>You're all set — let's build your career story with WiseResume</Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={header}>
            <Img src={logoUrl} width="40" height="40" alt="WiseResume" style={headerLogo} />
            <Text style={headerText}>WiseResume</Text>
          </Section>

          <Section style={accentDivider} />

          <Section style={card}>
            <Text style={emoji}>🎉</Text>
            <Heading style={h1}>{greeting}</Heading>
            <Text style={bodyText}>
              Your email is verified and your account is ready to go. Start building a resume
              that gets you hired — our AI-powered tools are standing by.
            </Text>

            <Section style={featureGrid}>
              <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
                <tr>
                  <td style={featureCell}>
                    <Text style={featureIcon}>✨</Text>
                    <Text style={featureTitle}>AI Resume Builder</Text>
                    <Text style={featureDesc}>Craft a polished resume in minutes</Text>
                  </td>
                  <td style={featureCell}>
                    <Text style={featureIcon}>🎯</Text>
                    <Text style={featureTitle}>ATS Optimizer</Text>
                    <Text style={featureDesc}>Beat the bots and land interviews</Text>
                  </td>
                </tr>
                <tr>
                  <td style={featureCell}>
                    <Text style={featureIcon}>💼</Text>
                    <Text style={featureTitle}>Job Tracker</Text>
                    <Text style={featureDesc}>Manage your entire job search</Text>
                  </td>
                  <td style={featureCell}>
                    <Text style={featureIcon}>🌐</Text>
                    <Text style={featureTitle}>Portfolio Site</Text>
                    <Text style={featureDesc}>Share your work with the world</Text>
                  </td>
                </tr>
              </table>
            </Section>

            <Section style={buttonWrapper}>
              <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: '0 auto' }}>
                <tr>
                  <td style={buttonOuter}>
                    <a href={`${siteUrl}/dashboard`} style={buttonInner}>
                      Go to Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </Section>

            <Text style={meta}>
              Questions? Reply to this email or visit{' '}
              <Link href={siteUrl} style={metaLink}>{siteName}</Link> anytime.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              You received this because you created an account at{' '}
              <Link href={siteUrl} style={footerLink}>WiseResume</Link>.
            </Text>
            <Text style={footerBrand}>WiseResume — Build your career story</Text>
            <Text style={footerDomain}>thewise.cloud</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail

const logoUrl = 'https://jnsfmkzgxsviuthaqlyy.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png'

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
  fontSize: '36px',
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
  margin: '0 0 28px',
  textAlign: 'center' as const,
}
const featureGrid = { marginBottom: '28px' }
const featureCell = {
  width: '50%',
  padding: '12px 8px',
  textAlign: 'center' as const,
  verticalAlign: 'top' as const,
}
const featureIcon = {
  fontSize: '24px',
  margin: '0 0 6px',
  lineHeight: '1',
  textAlign: 'center' as const,
}
const featureTitle = {
  fontSize: '13px',
  fontWeight: '700' as const,
  color: '#1a1a2e',
  margin: '0 0 4px',
  textAlign: 'center' as const,
}
const featureDesc = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.4',
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
const metaLink = { color: '#e63946', textDecoration: 'none' }
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
