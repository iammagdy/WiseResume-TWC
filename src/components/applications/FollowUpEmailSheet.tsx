import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Mail, Check } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

type TemplateType = 'thank_you' | 'follow_up' | 'check_in';

interface FollowUpEmailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: string;
  jobTitle: string;
}

const TEMPLATES: { key: TemplateType; label: string; description: string }[] = [
  { key: 'thank_you', label: 'Thank You', description: 'Send after an interview' },
  { key: 'follow_up', label: 'Follow Up', description: 'Send after 1 week of no response' },
  { key: 'check_in', label: 'Check In', description: 'Send after 2 weeks' },
];

function generateTemplate(type: TemplateType, company: string, jobTitle: string): string {
  switch (type) {
    case 'thank_you':
      return `Dear Hiring Manager,

Thank you for taking the time to interview me for the ${jobTitle} position at ${company}. I truly enjoyed learning more about the role and the team.

Our conversation reinforced my enthusiasm for this opportunity. I'm confident that my skills and experience align well with what you're looking for.

Please don't hesitate to reach out if you need any additional information. I look forward to hearing from you.

Best regards`;
    case 'follow_up':
      return `Dear Hiring Manager,

I hope this message finds you well. I wanted to follow up on my application for the ${jobTitle} position at ${company}.

I remain very enthusiastic about this opportunity and would love to learn about the next steps in the process. Please let me know if there's any additional information I can provide.

Thank you for your time and consideration.

Best regards`;
    case 'check_in':
      return `Dear Hiring Manager,

I hope you're doing well. I'm writing to check in regarding my application for the ${jobTitle} position at ${company}.

I understand that hiring decisions take time, and I wanted to reiterate my strong interest in joining the team. I believe my background would be a great fit for this role.

I'd welcome the chance to discuss how I can contribute to ${company}. Thank you for your consideration.

Best regards`;
  }
}

export function FollowUpEmailSheet({ open, onOpenChange, company, jobTitle }: FollowUpEmailSheetProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('thank_you');
  const [content, setContent] = useState(() => generateTemplate('thank_you', company, jobTitle));
  const [copied, setCopied] = useState(false);

  const handleTemplateChange = (type: TemplateType) => {
    haptics.selection();
    setSelectedTemplate(type);
    setContent(generateTemplate(type, company, jobTitle));
    setCopied(false);
  };

  const handleCopy = async () => {
    haptics.light();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMailto = () => {
    haptics.light();
    const subject = encodeURIComponent(`Re: ${jobTitle} Position at ${company}`);
    const body = encodeURIComponent(content);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-left">Follow-up Email</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4 min-h-0">
          {/* Template selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TEMPLATES.map(t => (
              <button
                key={t.key}
                onClick={() => handleTemplateChange(t.key)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all touch-manipulation min-h-[44px] ${
                  selectedTemplate === t.key
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <div>{t.label}</div>
                <div className="text-[10px] font-normal opacity-70">{t.description}</div>
              </button>
            ))}
          </div>

          {/* Email context */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">{company}</Badge>
            <Badge variant="outline" className="text-xs">{jobTitle}</Badge>
          </div>

          {/* Editable content */}
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="min-h-[280px] text-sm leading-relaxed"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 shrink-0">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button className="flex-1 gap-2" onClick={handleMailto}>
            <Mail className="w-4 h-4" /> Open Mail
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
