import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactInquiryDialog, DepartmentValue } from '@/components/settings/ContactInquiryDialog';

export default function TermsPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [defaultDept, setDefaultDept] = useState<DepartmentValue>('general');
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass-header border-b border-border/20 px-4 h-12 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="Go back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-sm font-semibold">Terms of Service</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-safe overflow-x-hidden">
        <div className="glass-elevated rounded-3xl border border-white/10 p-6 sm:p-8 space-y-8 text-sm leading-relaxed shadow-2xl text-gray-800 dark:text-gray-100">
          <div className="flex items-center gap-2 text-foreground pb-2 border-b border-white/5">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Terms of Service</h2>
          </div>
          <p className="text-[10px] opacity-60 uppercase tracking-widest font-medium">Effective Date: February 20, 2026 · Last Updated: March 9, 2026</p>
          <p className="text-base leading-relaxed text-foreground/90">
            These Terms govern your use of WiseResume. By creating an account or using the service, you agree to these Terms. If you don't agree, please don't use WiseResume.
          </p>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">1</span>
              Eligibility
            </h3>
            <div className="pl-8 border-l border-white/5 text-foreground/80">
              <p>You must be at least 16 years old to use WiseResume. If you're using it on behalf of an organization, you confirm you have the authority to accept these Terms for that organization.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">2</span>
              Your Account
            </h3>
            <div className="pl-8 border-l border-white/5 text-foreground/80">
              <p>You're responsible for keeping your login credentials secure and for all activity under your account. Please use accurate information when signing up. If you suspect unauthorized access, contact our <DeptLink dept="general">Support</DeptLink> team immediately.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">3</span>
              Your Content
            </h3>
            <div className="space-y-4 pl-8 border-l border-white/5 text-foreground/80">
              <p>Everything you create on WiseResume — resumes, cover letters, portfolios, assessments — belongs to you. We don't claim any ownership over your content.</p>
              <p>We only process your content to deliver the service. When you delete your content or account, this license ends.</p>
            </div>
          </section>

          <section className="space-y-3 font-medium bg-primary/5 p-4 rounded-xl border border-primary/10">
            <h3 className="text-foreground font-bold flex items-center gap-2 uppercase tracking-tight text-xs text-primary">
              AI Features
            </h3>
            <ul className="list-disc pl-5 space-y-2 mt-2 text-foreground/90">
              <li>AI outputs are <strong className="text-foreground">suggestions</strong>, not professional advice.</li>
              <li>We work hard to make them useful, but we can't guarantee they'll be perfect or suitable for every situation.</li>
              <li>You're responsible for reviewing and approving anything before you use it.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">5</span>
              What You Can Do
            </h3>
            <div className="pl-8 border-l border-white/5 text-foreground/80">
              <p>We grant you a personal, non-transferable license to use WiseResume for your own career development. You may not resell, redistribute, or sublicense any part of the service.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">6</span>
              What You Can't Do
            </h3>
            <div className="space-y-2 pl-8 border-l border-white/5 text-foreground/80">
              <p>Please don't:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Create fake or misleading content.</li>
                <li>Reverse-engineer, scrape, or interfere with the service.</li>
                <li>Use bots or automated tools to access WiseResume.</li>
              </ul>
              <p className="mt-4 italic opacity-80">Violating these rules may result in account suspension or termination.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">7</span>
              Payments
            </h3>
            <div className="space-y-2 pl-8 border-l border-white/5 text-foreground/80">
              <p>WiseResume may offer free and paid plans. For paid subscriptions:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You'll be billed on a recurring basis.</li>
                <li>Cancel anytime; access continues until the end of the period.</li>
                <li>For refund requests, contact our <DeptLink dept="billing">Billing</DeptLink> team.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">9</span>
              Limitation of Liability
            </h3>
            <div className="pl-8 border-l border-white/5 text-foreground/80">
              <p>WiseResume is provided "as is." To the extent allowed by law, our total liability is limited to the amount you've paid us in the past 12 months, or $100 USD — whichever is greater.</p>
            </div>
          </section>

          <section ref={contactRef} className="pt-8 border-t border-white/5">
            <h3 className="text-foreground font-semibold mb-2">Legal Help</h3>
            <p>Have a question about these Terms?</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={() => scrollAndOpenContact('legal')}
                variant="outline"
                className="rounded-full h-11 px-6 shadow-lg shadow-primary/5"
              >
                Legal Department
              </Button>
              <Button
                onClick={() => scrollAndOpenContact('general')}
                variant="ghost"
                className="rounded-full h-11 px-6 text-muted-foreground"
              >
                General Support
              </Button>
            </div>
          </section>
        </div>
      </main>

      <ContactInquiryDialog open={contactOpen} onOpenChange={setContactOpen} defaultDepartment={defaultDept} />
    </div>
  );
}
