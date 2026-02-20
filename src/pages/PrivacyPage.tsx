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

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <div className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">WiseResume Privacy Policy</h2>
        </div>
        <p className="text-xs">Last updated: February 2026</p>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">1. Data We Collect</h3>
          <p>We collect only the information you provide: your email address, resume content, and usage preferences. We do not collect browsing history, sell data, or track you across other websites.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">2. How We Use Your Data</h3>
          <p>Your data is used solely to power WiseResume features — AI resume writing, interview coaching, job matching, and portfolio generation. AI processing happens per-session and your content is never used to train models.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">3. Data Encryption</h3>
          <p>All data is encrypted at rest and in transit using industry-standard TLS 1.3 and AES-256 encryption. Your resume content is stored securely and accessible only to you.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">4. Data Sharing</h3>
          <p>We never share, sell, or license your personal data to third parties. Your resumes are private by default — only you can see them unless you explicitly share via a link.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">5. Data Deletion</h3>
          <p>You can delete your account and all associated data at any time from Settings. Deletion is permanent and irreversible — we do not retain backups of deleted user data.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">6. Cookies</h3>
          <p>We use only essential cookies required for authentication and session management. We do not use advertising or tracking cookies.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground font-semibold">7. Contact</h3>
          <p>For privacy questions, reach out at <span className="text-primary">privacy@wiseresume.app</span></p>
        </section>
      </main>
    </div>
  );
}
