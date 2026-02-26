import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, MessageSquarePlus, BookOpen, FileText, Compass, Video } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FeatureRequestDialog } from '@/components/settings/FeatureRequestDialog';
import { haptics } from '@/lib/haptics';

const FAQ_ITEMS = [
  { q: 'How do I create a resume?', a: 'Tap the + button on your Dashboard or go to Editor to start from scratch. You can also upload an existing PDF or Word document.' },
  { q: 'How do I export my resume as PDF?', a: 'Open your resume in the Editor, then tap Preview. From there, use the Download button to export a high-quality PDF.' },
  { q: 'What is an ATS score?', a: 'ATS (Applicant Tracking System) score measures how well your resume is optimized for automated screening tools used by employers. Aim for 80+.' },
  { q: 'Can I tailor my resume for a specific job?', a: 'Yes! Use the AI Tailor tool in AI Studio. Paste the job description and our AI will suggest improvements to match the role.' },
  { q: 'How do cover letters work?', a: 'Go to AI Tools > Cover Letters to create a new cover letter. You can generate one from scratch or base it on an existing resume.' },
  { q: 'Is my data secure?', a: 'Yes. All data is encrypted in transit and at rest. We never share your personal information with third parties.' },
  { q: 'How do I share my portfolio?', a: 'Enable your portfolio in the Portfolio tab, customize your sections, and share your unique public link.' },
  { q: 'Can I use the app offline?', a: 'Yes! WiseResume works offline as a PWA. Changes sync automatically when you reconnect.' },
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

        {/* Contact Support */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact & Feedback</h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => window.open('mailto:support@wiseresume.app', '_blank')}
              >
                <Mail className="w-4 h-4" />
                Email Support
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
    </div>
  );
}
