import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquarePlus, BookOpen, FileText, Compass, Video, MessageSquare } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FeatureRequestDialog } from '@/components/settings/FeatureRequestDialog';
import { ContactInquiryDialog } from '@/components/settings/ContactInquiryDialog';
import { haptics } from '@/lib/haptics';

const FAQ_ITEMS = [
  // Getting Started
  { q: 'How do I create a resume?', a: 'Tap the + button on your Dashboard or go to Editor to start from scratch. You can also upload an existing PDF or Word document.' },
  { q: 'How do I edit my resume after creating it?', a: 'Tap on any resume card on your Dashboard to open it in the Editor. From there you can edit any section — contact info, experience, education, skills, and more.' },
  { q: 'Can I create multiple resumes?', a: 'Yes! You can create as many resumes as you need. Each one can be tailored for a different job or industry. Manage them all from your Dashboard.' },
  { q: 'How do I upload an existing resume?', a: 'On the Dashboard, tap the + button and select "Upload Resume." We support PDF and Word (.docx) files. The content will be parsed and imported into the editor.' },

  // Export & Sharing
  { q: 'How do I export my resume as PDF?', a: 'Open your resume in the Editor, then tap Preview. From there, use the Download button to export a high-quality PDF.' },
  { q: 'Can I share my resume with a link?', a: 'Yes! In the Editor, tap Share to generate a unique link. You can optionally add a password or set an expiration date for extra privacy.' },
  { q: 'What file formats can I export?', a: 'You can export your resume as PDF (recommended for job applications) or DOCX (Word format). Both are ATS-compatible.' },

  // ATS & Optimization
  { q: 'What is an ATS score?', a: 'ATS (Applicant Tracking System) score measures how well your resume is optimized for automated screening tools used by employers. Aim for 80+.' },
  { q: 'How can I improve my ATS score?', a: 'Use the AI tools to analyze your resume against a job description. Focus on matching keywords, using standard section headings, and keeping formatting clean.' },

  // AI Features
  { q: 'Can I tailor my resume for a specific job?', a: 'Yes! Use the AI Tailor tool in AI Studio. Paste the job description and our AI will suggest improvements to match the role.' },
  { q: 'How do cover letters work?', a: 'Go to AI Tools > Cover Letters to create a new cover letter. You can generate one from scratch or base it on an existing resume and job description.' },
  { q: 'What AI features are available?', a: 'WiseResume offers AI-powered writing assistance, resume tailoring, cover letter generation, interview practice, and ATS optimization — all built into the app.' },
  { q: 'Does AI use my data for training?', a: 'No. Your data is never used to train any AI model. Content is only processed when you explicitly request AI help, and nothing is retained afterward.' },

  // Portfolio
  { q: 'How do I share my portfolio?', a: 'Enable your portfolio in the Portfolio tab, customize your sections, and share your unique public link. Your portfolio is only visible when enabled.' },
  { q: 'Can I customize my portfolio appearance?', a: 'Yes! You can choose from multiple themes, layouts, accent colors, and fonts. You can also pick which sections to show or hide.' },

  // Account & Privacy
  { q: 'Is my data secure?', a: 'Yes. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We never share your personal information with third parties.' },
  { q: 'How do I delete my account?', a: 'Go to Settings > Privacy > Delete All Data. This permanently removes all your resumes, cover letters, and account data within 30 days.' },
  { q: 'Can I export all my data?', a: 'Yes. Go to Settings > Data Export to download all your data in JSON or PDF format.' },
  { q: 'Can I use the app offline?', a: 'Yes! WiseResume works offline as a PWA. Changes sync automatically when you reconnect.' },

  // Templates
  { q: 'How do I change my resume template?', a: 'In the Editor, go to the Template section to browse and apply different designs. Your content stays the same — only the visual layout changes.' },
  { q: 'Are the templates ATS-friendly?', a: 'Yes. All our templates are designed to be ATS-compatible with clean formatting, standard fonts, and proper heading structure.' },
];

const VIDEO_TUTORIALS = [
  { title: 'Getting Started', description: 'Create your first resume in 5 minutes', duration: '5:00' },
  { title: 'ATS Optimization', description: 'Score 90+ on any ATS system', duration: '8:30' },
  { title: 'AI Tailor Guide', description: 'Customize resumes for each job', duration: '6:15' },
];

export default function HelpPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [featureRequestOpen, setFeatureRequestOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const filtered = search
    ? FAQ_ITEMS.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
    : FAQ_ITEMS;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="pt-safe sticky top-0 z-10 pb-2 px-4 glass-header backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-page-title">Help & FAQ</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search help topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        {/* FAQ */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Frequently Asked Questions</h2>
          <Accordion type="multiple" className="space-y-2">
            {filtered.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-2xl glass-elevated border-none px-4">
                <AccordionTrigger className="text-sm font-medium text-left py-4 hover:no-underline">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No results found. Try a different search term.</p>
            )}
          </Accordion>
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Explore More</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Guides', icon: BookOpen, path: '/guides' },
              { label: 'Examples', icon: FileText, path: '/examples' },
              { label: 'Career Path', icon: Compass, path: '/career' },
            ].map((link) => (
              <Button
                key={link.label}
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                onClick={() => { haptics.light(); navigate(link.path); }}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Button>
            ))}
          </div>
        </section>

        {/* Video Tutorials */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Video Tutorials</h2>
          <div className="space-y-2">
            {VIDEO_TUTORIALS.map((video, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{video.title}</p>
                    <p className="text-xs text-muted-foreground">{video.description} · {video.duration}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact & Feedback */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact & Feedback</h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => { haptics.light(); setContactOpen(true); }}
              >
                <MessageSquare className="w-4 h-4" />
                Contact Support
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => { haptics.light(); setFeatureRequestOpen(true); }}
              >
                <MessageSquarePlus className="w-4 h-4" />
                Request a Feature
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <FeatureRequestDialog open={featureRequestOpen} onOpenChange={setFeatureRequestOpen} />
      <ContactInquiryDialog open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
