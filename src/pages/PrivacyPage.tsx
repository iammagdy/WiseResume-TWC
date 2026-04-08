import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactInquiryDialog, DepartmentValue } from '@/components/settings/ContactInquiryDialog';

export default function PrivacyPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [defaultDept, setDefaultDept] = useState<DepartmentValue>('privacy');
  const contactRef = useRef<HTMLElement>(null);

  const scrollAndOpenContact = useCallback((dept: DepartmentValue) => {
    setDefaultDept(dept);
    contactRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => setContactOpen(true), 400);
  }, []);

  const DeptLink = ({ dept, children }: { dept: DepartmentValue; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => scrollAndOpenContact(dept)}
      className="text-primary underline underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity inline"
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 h-12 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="Go back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-sm font-semibold text-foreground">Privacy Policy</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-safe overflow-x-hidden">
        <div className="rounded-2xl border border-border bg-card shadow-soft p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-foreground">
          <div className="flex items-center gap-2 text-foreground pb-3 border-b border-border">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Privacy Policy</h2>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Effective Date: February 20, 2026 · Last Updated: March 9, 2026</p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Your privacy matters to us. This policy explains what data WiseResume collects, how we use it, and how we keep it safe. By using WiseResume, you agree to these practices.
          </p>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">1</span>
              What We Collect
            </h3>
            <div className="space-y-4 pl-8 border-l border-border text-muted-foreground">
              <p><strong className="text-foreground">Account Info:</strong> Your email, display name, and login credentials. If you sign in with Google or Apple, we receive your name and email from them — never your password.</p>
              <p><strong className="text-foreground">Your Content:</strong> Resumes, cover letters, portfolios, career assessments, and any other documents you create.</p>
              <p><strong className="text-foreground">Usage Data:</strong> Anonymized, aggregated analytics like feature usage and session length.</p>
              <p><strong className="text-foreground">Device Info:</strong> Device type, OS, browser, and screen size — used for compatibility and debugging.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">2</span>
              How We Use It
            </h3>
            <div className="space-y-2 pl-8 border-l border-border text-muted-foreground">
              <p>We use your data to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Power your experience — resume building, AI writing, interview prep, job matching, and portfolios.</li>
                <li>Keep your account secure.</li>
                <li>Send essential messages like password resets and security alerts.</li>
                <li>Improve the product using anonymized, aggregated insights.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3 bg-primary/5 p-4 rounded-xl border border-primary/10">
            <h3 className="text-primary font-bold flex items-center gap-2 uppercase tracking-tight text-xs">
              <Sparkles className="w-3 h-3" />
              AI &amp; Your Data
            </h3>
            <ul className="list-disc pl-5 space-y-2 mt-2 text-muted-foreground">
              <li><strong className="text-foreground">On-demand only:</strong> Your content is sent to AI models only when you request help. Nothing is retained after the response.</li>
              <li><strong className="text-foreground">No training:</strong> Your data is never used to train or improve any AI model — ours or anyone else's.</li>
              <li><strong className="text-foreground">No selling:</strong> We don't share your data with AI companies, data brokers, or third parties.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">4</span>
              Security
            </h3>
            <div className="space-y-2 pl-8 border-l border-border text-muted-foreground">
              <p>We take security seriously:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">Encrypted storage:</strong> All data at rest is encrypted with AES-256.</li>
                <li><strong className="text-foreground">Encrypted transit:</strong> All connections use TLS 1.3.</li>
                <li><strong className="text-foreground">Access control:</strong> Only you can access your data.</li>
                <li><strong className="text-foreground">Infrastructure:</strong> Hosted on SOC 2 Type II compliant cloud providers.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">5</span>
              Sharing
            </h3>
            <div className="space-y-2 pl-8 border-l border-border text-muted-foreground">
              <p>We <strong className="text-foreground">don't</strong> sell, rent, or trade your data.</p>
              <p>Your documents are <strong className="text-foreground">private by default</strong>. They're only visible to you unless you share them via a link.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">6</span>
              Your Rights
            </h3>
            <div className="space-y-2 pl-8 border-l border-border text-muted-foreground">
              <p>No matter where you are, you can:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">Access</strong> your data anytime.</li>
                <li><strong className="text-foreground">Correct</strong> your info.</li>
                <li><strong className="text-foreground">Delete</strong> everything permanently.</li>
                <li><strong className="text-foreground">Export</strong> your data in JSON or PDF.</li>
              </ul>
              <p className="mt-4">To exercise any right, use the in-app settings or contact our <DeptLink dept="privacy">Privacy Team</DeptLink>.</p>
            </div>
          </section>

          <section ref={contactRef} className="pt-8 border-t border-border">
            <h3 className="text-foreground font-semibold mb-2">Contact Our Team</h3>
            <p className="text-muted-foreground">Questions about your data or this policy?</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={() => scrollAndOpenContact('privacy')}
                variant="outline"
                className="rounded-full h-11 px-6"
              >
                Privacy Team
              </Button>
              <Button
                onClick={() => scrollAndOpenContact('data-protection')}
                variant="ghost"
                className="rounded-full h-11 px-6 text-muted-foreground"
              >
                Data Protection
              </Button>
            </div>
          </section>
        </div>
      </main>

      <ContactInquiryDialog open={contactOpen} onOpenChange={setContactOpen} defaultDepartment={defaultDept} />
    </div>
  );
}
