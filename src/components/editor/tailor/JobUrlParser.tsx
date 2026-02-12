import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Loader2, Check, Globe, ChevronDown, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { parseJobUrl } from '@/lib/aiTailor';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface JobUrlParserProps {
  value: string;
  onChange: (value: string) => void;
  onParsed?: (data: { title: string; company: string; url?: string }) => void;
}

const SUPPORTED_SITES = [
  { name: 'LinkedIn', icon: '🔗' },
  { name: 'Indeed', icon: '📋' },
  { name: 'Glassdoor', icon: '🚪' },
  { name: 'Any URL', icon: '🌐' },
];

export function JobUrlParser({ value, onChange, onParsed }: JobUrlParserProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [parsedInfo, setParsedInfo] = useState<{ title: string; company: string } | null>(null);

  const extractUrl = (text: string): string | null => {
    const match = text.match(/https?:\/\/[^\s"'<>]+/i);
    return match ? match[0] : null;
  };

  const isUrl = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleParseUrl = async () => {
    const url = extractUrl(urlInput) || urlInput.trim();
    if (!url || !isUrl(url)) {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsParsing(true);
    try {
      const data = await parseJobUrl(url);
      onChange(data.description);
      setParsedInfo({ title: data.title, company: data.company });
      onParsed?.({ title: data.title, company: data.company, url });
      toast.success('Job posting parsed successfully!');
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse job URL. Try pasting the description manually.');
      setShowManual(true);
    } finally {
      setIsParsing(false);
    }
  };

  const handleInputChange = (text: string) => {
    const extracted = extractUrl(text);
    if (extracted) {
      setUrlInput(extracted);
      setShowManual(false);
    } else {
      onChange(text);
      setShowManual(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          Paste job URL or description
        </label>

        {/* URL Mode */}
        {!showManual && !value && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <Input
                value={urlInput}
              onChange={(e) => {
                const raw = e.target.value;
                const extracted = extractUrl(raw);
                setUrlInput(extracted || raw);
              }}
                placeholder="https://linkedin.com/jobs/view/..."
                className="flex-1"
              />
              <Button
                onClick={handleParseUrl}
                disabled={isParsing || !urlInput.trim()}
              >
                {isParsing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Parse'
                )}
              </Button>
            </div>

            {/* Supported Sites */}
            <div className="flex items-center gap-2 flex-wrap">
              {SUPPORTED_SITES.map((site) => (
                <Badge key={site.name} variant="secondary" className="text-xs gap-1">
                  <span>{site.icon}</span>
                  {site.name}
                </Badge>
              ))}
            </div>

            {/* Manual Toggle */}
            <button
              onClick={() => setShowManual(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              Or paste manually
              <ChevronDown className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* Parsed Success */}
        <AnimatePresence>
          {parsedInfo && value && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-3"
            >
              <Check className="w-5 h-5 text-success shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{parsedInfo.title}</p>
                <p className="text-xs text-muted-foreground truncate">@ {parsedInfo.company}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 ml-auto"
                onClick={() => {
                  setParsedInfo(null);
                  onChange('');
                  setUrlInput('');
                }}
              >
                Change
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual Textarea */}
        <AnimatePresence>
          {(showManual || value) && !parsedInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Paste the job posting you want to tailor your resume for..."
                className="min-h-[140px] resize-none text-base"
              />
              {!showManual && !isUrl(urlInput) && (
                <button
                  onClick={() => {
                    setShowManual(false);
                    onChange('');
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 flex items-center gap-1"
                >
                  <Link2 className="w-3 h-3" />
                  Use URL instead
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-sm text-muted-foreground">
        The AI will rewrite your resume to match this job's requirements
      </p>
    </div>
  );
}
