import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <div className="flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">WiseResume Terms of Service</h2>
        </div>
        <p className="text-xs">Last updated: February 2026</p>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">1. Acceptance of Terms</h3>
          <p>By using WiseResume, you agree to these terms. If you do not agree, please do not use the service.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">2. Your Content</h3>
          <p>You retain full ownership of all content you create in WiseResume, including resumes, cover letters, and portfolio data. We claim no intellectual property rights over your content.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">3. AI-Generated Content</h3>
          <p>AI suggestions are tools to assist you. You are responsible for reviewing and approving all AI-generated content before using it. WiseResume does not guarantee the accuracy of AI outputs.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">4. Account Security</h3>
          <p>You are responsible for maintaining the security of your account credentials. Notify us immediately of any unauthorized access.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">5. Acceptable Use</h3>
          <p>You agree not to use WiseResume to generate misleading, fraudulent, or harmful content. Accounts violating this policy may be suspended.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">6. Service Availability</h3>
          <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform maintenance with reasonable notice.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">7. Contact</h3>
          <p>For questions about these terms, reach out at <span className="text-primary">support@wiseresume.app</span></p>
        </section>
      </main>
    </div>
  );
}
