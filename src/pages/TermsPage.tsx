import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactInquiryDialog } from '@/components/settings/ContactInquiryDialog';

export default function TermsPage() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="min-h-screen">
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
          <h2 className="text-lg font-bold">Terms of Service</h2>
        </div>
        <p className="text-xs">Effective Date: February 20, 2026 · Last Updated: March 9, 2026</p>
        <p>
          These Terms govern your use of WiseResume. By creating an account or using the service, you agree to these Terms. If you don't agree, please don't use WiseResume.
        </p>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">1. Eligibility</h3>
          <p>You must be at least 16 years old to use WiseResume. If you're using it on behalf of an organization, you confirm you have the authority to accept these Terms for that organization.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">2. Your Account</h3>
          <p>You're responsible for keeping your login credentials secure and for all activity under your account. Please use accurate information when signing up. If you suspect unauthorized access, contact us immediately at <span className="text-primary">support@thewise.cloud</span>.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">3. Your Content</h3>
          <p>Everything you create on WiseResume — resumes, cover letters, portfolios, assessments — belongs to you. We don't claim any ownership over your content.</p>
          <p>We only process your content to deliver the service. When you delete your content or account, this license ends.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">4. AI Features</h3>
          <p>WiseResume includes AI-powered tools for writing, optimization, and interview practice. A few things to keep in mind:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>AI outputs are <strong className="text-foreground">suggestions</strong>, not professional advice.</li>
            <li>We work hard to make them useful, but we can't guarantee they'll be perfect or suitable for every situation.</li>
            <li>You're responsible for reviewing and approving anything before you use it.</li>
            <li>Once you accept an AI suggestion into your document, it becomes part of your content under Section 3.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">5. What You Can Do</h3>
          <p>We grant you a personal, non-transferable license to use WiseResume for your own career development. You may not resell, redistribute, or sublicense any part of the service.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">6. What You Can't Do</h3>
          <p>Please don't:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Create fake or misleading content (e.g., fabricated qualifications or work history).</li>
            <li>Reverse-engineer, scrape, or interfere with the service.</li>
            <li>Use bots or automated tools to access WiseResume.</li>
            <li>Use the service for anything illegal.</li>
            <li>Share or sell your account access.</li>
          </ul>
          <p>Violating these rules may result in account suspension or termination.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">7. Payments & Subscriptions</h3>
          <p>WiseResume may offer free and paid plans. For paid subscriptions:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You'll be billed on a recurring basis (monthly or annually).</li>
            <li>You can cancel anytime — your access continues until the end of the billing period.</li>
            <li>For refund requests, contact <span className="text-primary">support@thewise.cloud</span>.</li>
            <li>We'll give you at least 30 days' notice before any price changes.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">8. Availability</h3>
          <p>We aim for high uptime but can't guarantee the service will always be available. Scheduled maintenance, infrastructure issues, or events outside our control may cause temporary downtime. We're not liable for losses caused by service interruptions.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">9. Limitation of Liability</h3>
          <p>WiseResume is provided "as is." To the extent allowed by law:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We don't make warranties about the service's accuracy, reliability, or fitness for a specific purpose.</li>
            <li>Our total liability is limited to the amount you've paid us in the past 12 months, or $100 USD — whichever is greater.</li>
            <li>We're not liable for indirect or consequential damages, including lost data or missed opportunities.</li>
          </ul>
          <p>Nothing here limits liability that can't be excluded by law (e.g., fraud or negligence causing injury).</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">10. Indemnification</h3>
          <p>You agree to hold WiseResume harmless from any claims or expenses arising from your use of the service or violation of these Terms.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">11. Termination</h3>
          <p><strong className="text-foreground">By you:</strong> Delete your account from Settings at any time. Your data will be permanently removed per our Privacy Policy.</p>
          <p><strong className="text-foreground">By us:</strong> We may suspend or terminate accounts that violate these Terms. We'll try to give notice when possible.</p>
          <p>Sections 3, 9, 10, and 12 survive termination.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">12. Disputes</h3>
          <p>These Terms are governed by the laws of the jurisdiction where WiseResume operates. We'd prefer to resolve any issues through good-faith discussion first. If that doesn't work, disputes will go to binding arbitration where permitted by law.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">13. Updates to These Terms</h3>
          <p>We may update these Terms from time to time. For significant changes, we'll notify you at least 30 days in advance. Continuing to use WiseResume after that means you accept the updated Terms.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">14. Contact Us</h3>
          <p>Have a question about these Terms? Reach out:</p>
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
