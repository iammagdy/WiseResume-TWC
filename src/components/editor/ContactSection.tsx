import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { User, Mail, Phone, MapPin, Linkedin, Globe, Wand2, CheckCircle } from 'lucide-react';
import { AIActionBar, AIAction } from './ai/AIActionBar';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { toast } from 'sonner';

export function ContactSection() {
  const { currentResume, updateResume } = useResumeStore();

  const { enhance, isEnhancing, currentAction } = useAIEnhance({
    section: 'contact',
    onApply: () => {},
  });

  if (!currentResume) return null;

  const handleChange = (field: string, value: string) => {
    updateResume({
      contactInfo: {
        ...currentResume.contactInfo,
        [field]: value,
      },
    });
  };

  const handleAIAction = async (actionId: string) => {
    const result = await enhance(
      actionId as ActionType,
      currentResume.contactInfo,
      currentResume
    );
    
    if (result?.improved) {
      const improved = result.improved as { linkedin?: string; portfolio?: string };
      if (improved.linkedin) {
        handleChange('linkedin', improved.linkedin);
      }
      if (improved.portfolio) {
        handleChange('portfolio', improved.portfolio);
      }
      toast.success(result.changes?.join(', ') || 'Contact info improved!');
    } else if (result?.suggestions) {
      toast.success(`💡 ${result.suggestions.join(' • ')}`);
    }
  };

  const primaryActions: AIAction[] = [
    { id: 'improve', label: 'Format & Validate', icon: <CheckCircle className="w-3 h-3" /> },
    { id: 'generate', label: 'Suggest Links', icon: <Wand2 className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-lg mb-4">Contact Information</h3>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName" className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Full Name
          </Label>
          <Input
            id="fullName"
            value={currentResume.contactInfo.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            placeholder="John Doe"
            className="h-12"
            autoComplete="name"
          />
        </div>

        <div>
          <Label htmlFor="email" className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={currentResume.contactInfo.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="john@example.com"
            className="h-12"
            autoComplete="email"
          />
        </div>

        <div>
          <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={currentResume.contactInfo.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="h-12"
            autoComplete="tel"
          />
        </div>

        <div>
          <Label htmlFor="location" className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            Location
          </Label>
          <Input
            id="location"
            value={currentResume.contactInfo.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="New York, NY"
            className="h-12"
            autoComplete="address-level2"
          />
        </div>

        <div>
          <Label htmlFor="linkedin" className="flex items-center gap-2 mb-2">
            <Linkedin className="w-4 h-4 text-muted-foreground" />
            LinkedIn (optional)
          </Label>
          <Input
            id="linkedin"
            type="url"
            value={currentResume.contactInfo.linkedin || ''}
            onChange={(e) => handleChange('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/johndoe"
            className="h-12"
          />
        </div>

        <div>
          <Label htmlFor="portfolio" className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Portfolio (optional)
          </Label>
          <Input
            id="portfolio"
            type="url"
            value={currentResume.contactInfo.portfolio || ''}
            onChange={(e) => handleChange('portfolio', e.target.value)}
            placeholder="https://johndoe.com"
            className="h-12"
          />
        </div>
      </div>

      {/* AI Action Bar */}
      <AIActionBar
        primaryActions={primaryActions}
        onAction={handleAIAction}
        isLoading={isEnhancing}
        loadingAction={currentAction}
      />
    </div>
  );
}
