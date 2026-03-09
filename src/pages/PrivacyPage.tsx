import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactInquiryDialog } from '@/components/settings/ContactInquiryDialog';

export default function PrivacyPage() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="min-h-screen">
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
          <h2 className="text-lg font-bold">Privacy Policy</h2>
        </div>
        <p className="text-xs">Effective Date: February 20, 2026 · Last Updated: March 9, 2026</p>
        <p>
          Your privacy matters to us. This policy explains what data WiseResume collects, how we use it, and how we keep it safe. By using WiseResume, you agree to these practices.
        </p>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">1. What We Collect</h3>
          <p><strong className="text-foreground">Account Info:</strong> Your email, display name, and login credentials. If you sign in with Google or Apple, we receive your name and email from them — never your password.</p>
          <p><strong className="text-foreground">Your Content:</strong> Resumes, cover letters, portfolios, career assessments, and any other documents you create.</p>
          <p><strong className="text-foreground">Usage Data:</strong> Anonymized, aggregated analytics like feature usage and session length. This data can't be traced back to you.</p>
          <p><strong className="text-foreground">Device Info:</strong> Device type, OS, browser, and screen size — used for compatibility and debugging.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">2. How We Use It</h3>
          <p>We use your data to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Power your experience — resume building, AI writing, interview prep, job matching, and portfolios.</li>
            <li>Keep your account secure.</li>
            <li>Send essential messages like password resets and security alerts.</li>
            <li>Improve the product using anonymized, aggregated insights.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">3. AI & Your Data</h3>
          <p>When you use AI features, here's exactly what happens:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">On-demand only:</strong> Your content is sent to AI models only when you request help. Nothing is retained after the response.</li>
            <li><strong className="text-foreground">No training:</strong> Your data is never used to train or improve any AI model — ours or anyone else's.</li>
            <li><strong className="text-foreground">No selling:</strong> We don't share your data with AI companies, data brokers, or third parties.</li>
            <li><strong className="text-foreground">Your call:</strong> AI suggestions are just that — suggestions. You decide what to keep.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">4. Security</h3>
          <p>We take security seriously:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Encrypted storage:</strong> All data at rest is encrypted with AES-256.</li>
            <li><strong className="text-foreground">Encrypted transit:</strong> All connections use TLS 1.3.</li>
            <li><strong className="text-foreground">Access control:</strong> Only you can access your data through authenticated sessions. Our team accesses production data only for critical debugging, under audit trails.</li>
            <li><strong className="text-foreground">Infrastructure:</strong> Hosted on SOC 2 Type II compliant cloud providers with automatic backups and 24/7 monitoring.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">5. Sharing</h3>
          <p>We <strong className="text-foreground">don't</strong> sell, rent, or trade your data. We only share it with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Service providers:</strong> Hosting, authentication, and AI processing — all under strict agreements that limit how they can use your data.</li>
            <li><strong className="text-foreground">Legal requirements:</strong> Only when required by law, and only the minimum necessary.</li>
          </ul>
          <p>Your documents are <strong className="text-foreground">private by default</strong>. They're only visible to you unless you share them via a link.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">6. Your Rights</h3>
          <p>No matter where you are, you can:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Access</strong> your data — request a copy anytime.</li>
            <li><strong className="text-foreground">Correct</strong> your info through account settings.</li>
            <li><strong className="text-foreground">Delete</strong> everything via Settings → Delete All Data. This is permanent.</li>
            <li><strong className="text-foreground">Export</strong> your data in JSON or PDF from Settings.</li>
            <li><strong className="text-foreground">Restrict</strong> or <strong className="text-foreground">object to</strong> how we process your data.</li>
            <li><strong className="text-foreground">Withdraw consent</strong> for optional processing at any time.</li>
          </ul>
          <p>To exercise any right, use the in-app settings or email <span className="text-primary">privacy@thewise.cloud</span>. We respond within 30 days.</p>
          <p><strong className="text-foreground">California residents:</strong> You have the right to know what we collect, request deletion, and opt out of data sales. We don't sell your data.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">7. Cookies</h3>
          <p>We only use <strong className="text-foreground">essential cookies</strong> for authentication and saving your preferences (like theme). No ads, no tracking pixels, no cross-site tracking.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">8. Data Retention</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Active accounts:</strong> Your data stays as long as your account is active.</li>
            <li><strong className="text-foreground">Deleted accounts:</strong> All data is permanently removed within 30 days. No backups are kept.</li>
            <li><strong className="text-foreground">Inactive accounts:</strong> Accounts unused for 24+ months may be flagged. We'll email you before taking any action.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">9. International Transfers</h3>
          <p>Our infrastructure may process data across regions. When transferring data internationally, we use Standard Contractual Clauses (SCCs) and comply with applicable data protection frameworks.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">10. Children</h3>
          <p>WiseResume is not for anyone under 16. If we discover we've collected data from a child, we'll delete it immediately. If you believe a child has used our service, please contact <span className="text-primary">privacy@thewise.cloud</span>.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">11. Policy Updates</h3>
          <p>We may update this policy from time to time. For significant changes, we'll notify you at least 30 days in advance. Continued use after the update means you accept it.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">12. Contact Us</h3>
          <p>Questions about your data or this policy? Reach out:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Privacy: <span className="text-primary">privacy@thewise.cloud</span></li>
            <li>Data Protection: <span className="text-primary">dpo@thewise.cloud</span></li>
          </ul>
          <p className="pt-2">Or send us a message directly:</p>
          <Button
            onClick={() => setContactOpen(true)}
            variant="outline"
            className="mt-1"
          >
            Contact Us
          </Button>
        </section>
      </main>

      <ContactInquiryDialog open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
