import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactInquiryDialog } from '@/components/settings/ContactInquiryDialog';

export default function TermsPage() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-header border-b border-border/20 px-4 h-12 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="w-9 h-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-sm font-semibold">Terms of Service</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8 text-sm text-muted-foreground leading-relaxed pb-safe">
        <div className="flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">WiseResume Terms of Service</h2>
        </div>
        <p className="text-xs">Effective Date: February 20, 2026 · Last Updated: February 20, 2026</p>
        <p>
          These Terms of Service ("Terms") govern your use of WiseResume (the "Service"), operated by WiseResume ("we," "us," or "our"). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
        </p>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">1. Acceptance & Eligibility</h3>
          <p>By creating an account or using WiseResume, you confirm that you are at least 16 years of age and have the legal capacity to enter into these Terms. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">2. Account Registration</h3>
          <p>You agree to provide accurate, current, and complete information when creating your account. You are solely responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must notify us immediately at <span className="text-primary">support@thewise.cloud</span> if you suspect unauthorized access.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">3. Your Content & Intellectual Property</h3>
          <p>You retain <strong className="text-foreground">full ownership</strong> of all content you create using WiseResume, including but not limited to resumes, cover letters, portfolio content, career assessments, and any other documents. We claim no intellectual property rights over your content.</p>
          <p>By using the Service, you grant us a limited, non-exclusive license to process your content solely for the purpose of providing and improving the Service. This license terminates when you delete your content or account.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">4. AI-Generated Content</h3>
          <p>WiseResume offers AI-powered features including resume writing suggestions, interview coaching, content optimization, and job matching. Regarding AI-generated content:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Suggestions Only:</strong> All AI outputs are suggestions and tools to assist you. They are not professional advice (legal, career, or otherwise).</li>
            <li><strong className="text-foreground">No Accuracy Guarantee:</strong> While we strive for high quality, we do not guarantee the accuracy, completeness, or suitability of AI-generated content for any particular purpose.</li>
            <li><strong className="text-foreground">Your Responsibility:</strong> You are solely responsible for reviewing, editing, and approving all AI-generated content before using it in applications, submissions, or any other context.</li>
            <li><strong className="text-foreground">Ownership:</strong> Once you accept and incorporate AI-generated suggestions into your documents, that content becomes part of your work and is subject to your ownership rights under Section 3.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">5. License to Use the Service</h3>
          <p>We grant you a limited, non-exclusive, non-transferable, revocable license to access and use WiseResume for personal, non-commercial career development purposes, subject to these Terms. This license does not include the right to sublicense, resell, or redistribute any part of the Service.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">6. Acceptable Use</h3>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the Service to create misleading, fraudulent, or deceptive content (e.g., fabricating qualifications, credentials, or work history).</li>
            <li>Attempt to reverse-engineer, decompile, or extract source code from the Service.</li>
            <li>Use automated scripts, bots, or scrapers to access the Service.</li>
            <li>Interfere with the Service's infrastructure, security, or other users' experience.</li>
            <li>Use the Service for any illegal activity or in violation of applicable laws.</li>
            <li>Share, distribute, or sell accounts or account access.</li>
          </ul>
          <p>Violation of these terms may result in immediate suspension or termination of your account without prior notice.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">7. Subscriptions & Payments</h3>
          <p>WiseResume may offer free and premium tiers. For paid subscriptions:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Billing occurs on a recurring basis (monthly or annually) as selected at checkout.</li>
            <li>You may cancel your subscription at any time. Access to premium features continues until the end of the current billing period.</li>
            <li>Refunds are provided in accordance with applicable consumer protection laws. Contact <span className="text-primary">support@thewise.cloud</span> for refund requests.</li>
            <li>We reserve the right to modify pricing with at least 30 days' notice. Existing subscribers will be notified before any price change takes effect.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">8. Service Availability</h3>
          <p>We strive for high availability but do not guarantee uninterrupted, error-free service. We may:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Perform scheduled maintenance with reasonable advance notice.</li>
            <li>Experience downtime due to factors beyond our control (e.g., infrastructure provider outages, force majeure events).</li>
            <li>Modify, suspend, or discontinue features with reasonable notice.</li>
          </ul>
          <p>We are not liable for any loss or damage resulting from service interruptions.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">9. Limitation of Liability</h3>
          <p>To the maximum extent permitted by applicable law:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>WiseResume is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.</li>
            <li>Our total aggregate liability for any claims arising from your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or $100 USD, whichever is greater.</li>
            <li>We are not liable for indirect, incidental, special, consequential, or punitive damages, including loss of data, revenue, or business opportunities.</li>
          </ul>
          <p>Nothing in these Terms excludes or limits liability that cannot be excluded under applicable law (e.g., liability for fraud or death/personal injury caused by negligence).</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">10. Indemnification</h3>
          <p>You agree to indemnify and hold harmless WiseResume, its officers, employees, and affiliates from any claims, damages, losses, or expenses (including reasonable legal fees) arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">11. Termination</h3>
          <p><strong className="text-foreground">By You:</strong> You may terminate your account at any time by deleting it from Settings. Upon deletion, all your data will be permanently removed in accordance with our Privacy Policy.</p>
          <p><strong className="text-foreground">By Us:</strong> We may suspend or terminate your account if you violate these Terms, engage in abusive behavior, or if required by law. Where possible, we will provide notice before termination.</p>
          <p>Upon termination, your license to use the Service ceases immediately. Sections 3, 9, 10, and 12 survive termination.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">12. Governing Law & Dispute Resolution</h3>
          <p>These Terms are governed by the laws of the jurisdiction in which WiseResume operates, without regard to conflict of law principles. Any disputes arising under these Terms shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with applicable arbitration rules, except where prohibited by law.</p>
          <p>Nothing in this section prevents either party from seeking injunctive relief in a court of competent jurisdiction.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">13. Changes to These Terms</h3>
          <p>We may update these Terms from time to time. For material changes, we will provide at least 30 days' notice via in-app notification or email. Your continued use of the Service after the effective date of updated Terms constitutes acceptance. If you do not agree with the changes, you may terminate your account before the new Terms take effect.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">14. Contact Us</h3>
          <p>For questions or concerns about these Terms, you can reach us directly:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>General Support: <span className="text-primary">support@thewise.cloud</span></li>
            <li>Legal Inquiries: <span className="text-primary">legal@thewise.cloud</span></li>
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
