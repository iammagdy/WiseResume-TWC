import { useState, memo } from 'react';
import { InputFormField } from '@/components/ui/form-field';
import { useResumeStore } from '@/store/resumeStore';
import { User, Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { toast } from 'sonner';
import { InlineAIButton } from './InlineAIButton';
import { z } from 'zod';
import { SectionEmptyState } from './SectionEmptyState';
import { contactExample } from '@/lib/emptyStateExamples';
import { AIContextualNudge } from './AIContextualNudge';
import { useResumeNudges } from '@/hooks/useResumeNudges';

// Validation schemas
const emailSchema = z.string().email('Please enter a valid email');
const phoneSchema = z.string().regex(/^[\d\s\-+()]*$/, 'Invalid phone format').optional().or(z.literal(''));
const linkedinUsernameSchema = z.string().regex(/^[a-zA-Z0-9\-]{3,100}$/, 'Username must be 3+ characters (letters, numbers, hyphens)');

const LINKEDIN_PREFIX = 'linkedin.com/in/';
const LINKEDIN_URL_BASE = 'https://linkedin.com/in/';

function extractLinkedInUsername(url: string): string {
  if (!url) return '';
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([^/?#]+)/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return url;
}

export const ContactSection = memo(function ContactSection() {
  const contactInfo = useResumeStore(state => state.currentResume?.contactInfo);
  const updateResume = useResumeStore(state => state.updateResume);
  const currentResume = useResumeStore(state => state.currentResume);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [started, setStarted] = useState(false);

  const { enhance, isEnhancing } = useAIEnhance({
    section: 'contact',
    onApply: () => {},
  });

  const { getNudgeForSection, dismissNudge } = useResumeNudges({ resume: currentResume });

  if (!contactInfo || !currentResume) return null;

  const contactNudge = getNudgeForSection('contact');
  const isEmpty = !contactInfo.fullName && !contactInfo.email && !contactInfo.phone;

  if (isEmpty && !started) {
    return (
      <SectionEmptyState
        icon={User}
        title="Add your contact information"
        exampleContent={
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{contactExample.fullName}</p>
            <p className="text-muted-foreground">{contactExample.email}</p>
            <p className="text-muted-foreground">{contactExample.phone}</p>
            <p className="text-muted-foreground">{contactExample.location}</p>
            <p className="text-muted-foreground">{contactExample.linkedin}</p>
          </div>
        }
        actions={[
          { label: 'Start Adding Your Info', variant: 'default', onClick: () => setStarted(true) },
        ]}
      />
    );
  }

  const handleChange = (field: string, value: string) => {
    updateResume({
      contactInfo: {
        ...contactInfo,
        [field]: value,
      },
    });
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Validation functions
  const getNameError = (): string | undefined => {
    const name = contactInfo.fullName;
    if (!name || name.trim() === '') return 'Full name is required';
    if (name.length < 2) return 'Name must be at least 2 characters';
    if (name.length > 100) return 'Name must be less than 100 characters';
    return undefined;
  };

  const getEmailError = (): string | undefined => {
    const email = contactInfo.email;
    if (!email || email.trim() === '') return 'Email is required';
    try {
      emailSchema.parse(email);
      return undefined;
    } catch (e) {
      if (e instanceof z.ZodError) return e.errors[0]?.message;
      return 'Invalid email';
    }
  };

  const getPhoneError = (): string | undefined => {
    const phone = contactInfo.phone;
    if (!phone) return undefined;
    try {
      phoneSchema.parse(phone);
      return undefined;
    } catch (e) {
      if (e instanceof z.ZodError) return e.errors[0]?.message;
      return 'Invalid phone';
    }
  };

  const getLinkedinError = (): string | undefined => {
    const username = extractLinkedInUsername(contactInfo.linkedin || '');
    if (!username) return undefined;
    try {
      linkedinUsernameSchema.parse(username);
      return undefined;
    } catch (e) {
      if (e instanceof z.ZodError) return e.errors[0]?.message;
      return 'Invalid username';
    }
  };

  const getPortfolioError = (): string | undefined => {
    const portfolio = contactInfo.portfolio;
    if (!portfolio) return undefined;
    try {
      new URL(portfolio);
      return undefined;
    } catch {
      return 'Please enter a valid URL';
    }
  };

  const handleAIAction = async (actionId: string) => {
    const result = await enhance(
      actionId as ActionType,
      contactInfo,
      currentResume
    );
    
    if (result?.improved) {
      const improved = result.improved as {
        fullName?: string;
        email?: string;
        phone?: string;
        location?: string;
        linkedin?: string;
        portfolio?: string;
      };
      if (improved.fullName) handleChange('fullName', improved.fullName);
      if (improved.email) handleChange('email', improved.email);
      if (improved.phone) handleChange('phone', improved.phone);
      if (improved.location) handleChange('location', improved.location);
      if (improved.linkedin) handleChange('linkedin', improved.linkedin);
      if (improved.portfolio) handleChange('portfolio', improved.portfolio);
      toast.success(result.changes?.join(', ') || 'Contact info improved!');
    } else if (result?.suggestions) {
      toast.info(`💡 ${result.suggestions.join(' • ')}`);
    }
  };

  return (
    <div className="space-y-5">
      <AIContextualNudge
        show={!!contactNudge}
        message={contactNudge?.message || ''}
        actionLabel={contactNudge?.actionLabel || ''}
        onAction={() => {
          if (contactNudge) dismissNudge(contactNudge.trigger);
        }}
        onDismiss={() => contactNudge && dismissNudge(contactNudge.trigger)}
        compact
      />
        <InputFormField
          id="fullName"
          label="Full Name"
          icon={<User className="w-4 h-4" />}
          value={contactInfo.fullName}
          onChange={(value) => handleChange('fullName', value)}
          onBlur={() => handleBlur('fullName')}
          placeholder="John Doe"
          autoComplete="name"
          error={getNameError()}
          touched={touched.fullName}
          required
          maxLength={100}
          showCount
        />

        <InputFormField
          id="email"
          label="Email"
          type="email"
          icon={<Mail className="w-4 h-4" />}
          value={contactInfo.email}
          onChange={(value) => handleChange('email', value)}
          onBlur={() => handleBlur('email')}
          placeholder="john@example.com"
          autoComplete="email"
          error={getEmailError()}
          touched={touched.email}
          required
        />

        <InputFormField
          id="phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          icon={<Phone className="w-4 h-4" />}
          value={contactInfo.phone}
          onChange={(value) => {
            const filtered = value.replace(/[^0-9+\-\s()]/g, '');
            handleChange('phone', filtered);
          }}
          onBlur={() => handleBlur('phone')}
          placeholder="+1 (555) 123-4567"
          autoComplete="tel"
          error={getPhoneError()}
          touched={touched.phone}
        />

        <InputFormField
          id="location"
          label="Location"
          icon={<MapPin className="w-4 h-4" />}
          value={contactInfo.location}
          onChange={(value) => handleChange('location', value)}
          onBlur={() => handleBlur('location')}
          placeholder="New York, NY"
          autoComplete="address-level2"
        />

        <InputFormField
          id="linkedin"
          label="LinkedIn (optional)"
          icon={<Linkedin className="w-4 h-4" />}
          prefix={LINKEDIN_PREFIX}
          value={extractLinkedInUsername(contactInfo.linkedin || '')}
          onChange={(value) => {
            const username = value.replace(/[^a-zA-Z0-9\-]/g, '');
            handleChange('linkedin', username ? `${LINKEDIN_URL_BASE}${username}` : '');
          }}
          onBlur={() => handleBlur('linkedin')}
          placeholder="johndoe"
          error={getLinkedinError()}
          touched={touched.linkedin}
        />

        <InputFormField
          id="portfolio"
          label="Portfolio (optional)"
          type="url"
          icon={<Globe className="w-4 h-4" />}
          value={contactInfo.portfolio || ''}
          onChange={(value) => handleChange('portfolio', value)}
          onBlur={() => handleBlur('portfolio')}
          placeholder="https://johndoe.com"
          error={getPortfolioError()}
          touched={touched.portfolio}
        />
    </div>
  );
});
