import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-header border-b border-border/20 px-4 h-12 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="w-9 h-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-sm font-semibold">Privacy Policy</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8 text-sm text-muted-foreground leading-relaxed pb-safe">
        <div className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">WiseResume Privacy Policy</h2>
        </div>
        <p className="text-xs">Effective Date: February 20, 2026 · Last Updated: February 20, 2026</p>
        <p>
          WiseResume ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use WiseResume (the "Service"). By using the Service, you agree to the practices described herein.
        </p>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">1. Information We Collect</h3>
          <p><strong className="text-foreground">Account Data:</strong> When you register, we collect your email address, display name, and authentication credentials. If you sign in via Google or Apple, we receive your name and email from the identity provider — we never receive or store your social account password.</p>
          <p><strong className="text-foreground">Resume & Career Content:</strong> Any resumes, cover letters, portfolio content, career assessments, and related data you create within the Service is stored to power your experience.</p>
          <p><strong className="text-foreground">Usage Data:</strong> We collect anonymized, aggregated analytics such as feature usage frequency, session duration, and navigation patterns to improve the Service. This data cannot be traced back to individual users.</p>
          <p><strong className="text-foreground">Device Information:</strong> We may collect device type, operating system, browser version, and screen resolution for compatibility and debugging purposes.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">2. How We Use Your Data</h3>
          <p>We use your personal data exclusively to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide, maintain, and improve WiseResume features (resume building, AI writing assistance, interview coaching, job matching, and portfolio generation).</li>
            <li>Authenticate your identity and secure your account.</li>
            <li>Send essential service communications (e.g., password resets, security alerts).</li>
            <li>Generate aggregated, anonymized insights to improve product quality — never to profile individuals.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">3. AI Data Processing</h3>
          <p>WiseResume uses artificial intelligence to provide writing suggestions, content optimization, interview coaching, and job-matching features. Our AI data handling follows strict principles:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Per-Session Processing:</strong> Your content is sent to AI models only when you actively request AI assistance. Data is processed in real-time and is not retained by AI providers after the response is generated.</li>
            <li><strong className="text-foreground">No Model Training:</strong> Your resume content, personal data, and career information are <strong className="text-foreground">never</strong> used to train, fine-tune, or improve any AI models — ours or third-party.</li>
            <li><strong className="text-foreground">No Third-Party AI Sharing:</strong> We do not share, sell, or license your data to AI companies, data brokers, or any third parties for machine learning purposes.</li>
            <li><strong className="text-foreground">User Responsibility:</strong> AI-generated suggestions are tools to assist you. You are solely responsible for reviewing, editing, and approving all AI outputs before use.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">4. Data Storage & Security</h3>
          <p>We implement industry-leading security measures to protect your data:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Encryption at Rest:</strong> All stored data is encrypted using AES-256 encryption.</li>
            <li><strong className="text-foreground">Encryption in Transit:</strong> All data transmitted between your device and our servers is protected using TLS 1.3.</li>
            <li><strong className="text-foreground">Access Control:</strong> Your data is accessible only to you through authenticated sessions. Our engineering team accesses production data only when necessary for critical debugging, under strict audit trails.</li>
            <li><strong className="text-foreground">Infrastructure:</strong> Our backend infrastructure is hosted on enterprise-grade cloud providers with SOC 2 Type II compliance, automatic backups, and 24/7 monitoring.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">5. Data Sharing & Third Parties</h3>
          <p>We do <strong className="text-foreground">not</strong> sell, rent, trade, or license your personal data to any third party. We share data only with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Essential Service Providers:</strong> Hosting infrastructure, authentication services, and AI processing providers — all bound by strict data processing agreements (DPAs) that prohibit use of your data beyond providing the Service.</li>
            <li><strong className="text-foreground">Legal Obligations:</strong> We may disclose data if required by law, court order, or governmental regulation, and only to the minimum extent necessary.</li>
          </ul>
          <p>Your resumes and career documents are <strong className="text-foreground">private by default</strong>. They are visible only to you unless you explicitly share them via a link.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">6. Your Rights (GDPR, CCPA & Global Privacy Laws)</h3>
          <p>Regardless of your location, we provide the following rights to all users:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Right to Access:</strong> Request a copy of all personal data we hold about you.</li>
            <li><strong className="text-foreground">Right to Rectification:</strong> Correct inaccurate or incomplete personal data at any time through your account settings.</li>
            <li><strong className="text-foreground">Right to Deletion:</strong> Permanently delete your account and all associated data via Settings → Delete All Data. Deletion is irreversible.</li>
            <li><strong className="text-foreground">Right to Data Portability:</strong> Export your data in standard formats (JSON, PDF) from Settings at any time.</li>
            <li><strong className="text-foreground">Right to Restrict Processing:</strong> Request that we limit how we process your data.</li>
            <li><strong className="text-foreground">Right to Withdraw Consent:</strong> Withdraw consent for optional data processing at any time without affecting the lawfulness of prior processing.</li>
            <li><strong className="text-foreground">Right to Object:</strong> Object to processing based on legitimate interests.</li>
          </ul>
          <p>To exercise any of these rights, use the in-app settings or contact us at <span className="text-primary">privacy@thewise.cloud</span>. We will respond within 30 days, as required by applicable law.</p>
          <p><strong className="text-foreground">CCPA-Specific:</strong> California residents have the right to know what personal information we collect, request its deletion, and opt out of any sale of personal information. We do not sell personal information.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">7. Cookies & Tracking</h3>
          <p>WiseResume uses only <strong className="text-foreground">essential cookies</strong> required for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Authentication and session management.</li>
            <li>Remembering your preferences (theme, language).</li>
          </ul>
          <p>We do <strong className="text-foreground">not</strong> use advertising cookies, tracking pixels, fingerprinting, or any third-party analytics that identify individual users. We do not participate in cross-site tracking.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">8. Data Retention</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Active Accounts:</strong> Your data is retained for as long as your account remains active.</li>
            <li><strong className="text-foreground">Account Deletion:</strong> When you delete your account, all associated data (resumes, cover letters, assessments, preferences, and analytics) is permanently purged from our systems within 30 days.</li>
            <li><strong className="text-foreground">Backups:</strong> We do not retain backups of deleted user data. Once deleted, your data cannot be recovered.</li>
            <li><strong className="text-foreground">Inactive Accounts:</strong> Accounts inactive for more than 24 months may be flagged for review. We will notify you via email before any action is taken.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">9. International Data Transfers</h3>
          <p>WiseResume's infrastructure may process data in multiple regions. When personal data is transferred across borders, we ensure adequate safeguards are in place, including Standard Contractual Clauses (SCCs) approved by the European Commission, and compliance with applicable data protection frameworks.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">10. Children's Privacy</h3>
          <p>WiseResume is not directed at individuals under the age of 16. We do not knowingly collect personal data from children. If we become aware that we have inadvertently collected data from a child under 16, we will promptly delete it. If you believe a child has provided us with personal data, please contact us at <span className="text-primary">privacy@wiseresume.app</span>.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">11. Changes to This Policy</h3>
          <p>We may update this Privacy Policy from time to time. For material changes, we will notify you via in-app notification or email at least 30 days before the changes take effect. Continued use of the Service after the effective date constitutes your acceptance of the updated policy.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">12. Contact Us</h3>
          <p>If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Email: <span className="text-primary">privacy@wiseresume.app</span></li>
            <li>Data Protection Inquiries: <span className="text-primary">dpo@wiseresume.app</span></li>
          </ul>
          <p>We aim to respond to all inquiries within 30 days.</p>
        </section>
      </main>
    </div>
  );
}
