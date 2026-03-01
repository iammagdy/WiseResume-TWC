import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, Type, Mail, Phone, Wifi, Contact } from 'lucide-react';

export type ContentType = 'url' | 'text' | 'email' | 'phone' | 'wifi' | 'vcard';

export interface ContentState {
  contentType: ContentType;
  urlText: string;
  plainText: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  phoneNumber: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiEncryption: 'WPA' | 'WEP' | 'nopass';
  vcardName: string;
  vcardOrg: string;
  vcardPhone: string;
  vcardEmail: string;
  vcardUrl: string;
  vcardAddress: string;
}

export const DEFAULT_CONTENT: ContentState = {
  contentType: 'url',
  urlText: 'https://example.com',
  plainText: '',
  emailTo: '',
  emailSubject: '',
  emailBody: '',
  phoneNumber: '',
  wifiSsid: '',
  wifiPassword: '',
  wifiEncryption: 'WPA',
  vcardName: '',
  vcardOrg: '',
  vcardPhone: '',
  vcardEmail: '',
  vcardUrl: '',
  vcardAddress: '',
};

export function derivedText(c: ContentState): string {
  switch (c.contentType) {
    case 'url': return c.urlText || 'https://example.com';
    case 'text': return c.plainText || 'Hello';
    case 'email': {
      const params = [
        c.emailSubject && `subject=${encodeURIComponent(c.emailSubject)}`,
        c.emailBody && `body=${encodeURIComponent(c.emailBody)}`,
      ].filter(Boolean).join('&');
      return `mailto:${c.emailTo}${params ? '?' + params : ''}`;
    }
    case 'phone': return `tel:${c.phoneNumber}`;
    case 'wifi': return `WIFI:T:${c.wifiEncryption};S:${c.wifiSsid};P:${c.wifiPassword};;`;
    case 'vcard': {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      if (c.vcardName) lines.push(`FN:${c.vcardName}`);
      if (c.vcardOrg) lines.push(`ORG:${c.vcardOrg}`);
      if (c.vcardPhone) lines.push(`TEL:${c.vcardPhone}`);
      if (c.vcardEmail) lines.push(`EMAIL:${c.vcardEmail}`);
      if (c.vcardUrl) lines.push(`URL:${c.vcardUrl}`);
      if (c.vcardAddress) lines.push(`ADR:;;${c.vcardAddress};;;;`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }
  }
}

const CONTENT_TYPES: { id: ContentType; label: string; icon: React.ElementType }[] = [
  { id: 'url', label: 'URL', icon: Link },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'vcard', label: 'vCard', icon: Contact },
];

interface ContentTypeFormProps {
  state: ContentState;
  onChange: (partial: Partial<ContentState>) => void;
}

export function ContentTypeForm({ state, onChange }: ContentTypeFormProps) {
  return (
    <div className="space-y-3">
      {/* Type selector */}
      <div className="grid grid-cols-3 gap-1.5">
        {CONTENT_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange({ contentType: t.id })}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95 touch-manipulation min-h-[44px] ${
              state.contentType === t.id
                ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Type-specific fields */}
      <div className="space-y-2">
        {state.contentType === 'url' && (
          <Input
            placeholder="https://example.com"
            value={state.urlText}
            onChange={(e) => onChange({ urlText: e.target.value })}
          />
        )}
        {state.contentType === 'text' && (
          <Textarea
            placeholder="Enter your text..."
            value={state.plainText}
            onChange={(e) => onChange({ plainText: e.target.value })}
            rows={4}
          />
        )}
        {state.contentType === 'email' && (
          <>
            <Input placeholder="recipient@email.com" value={state.emailTo} onChange={(e) => onChange({ emailTo: e.target.value })} />
            <Input placeholder="Subject" value={state.emailSubject} onChange={(e) => onChange({ emailSubject: e.target.value })} />
            <Textarea placeholder="Body..." value={state.emailBody} onChange={(e) => onChange({ emailBody: e.target.value })} rows={3} />
          </>
        )}
        {state.contentType === 'phone' && (
          <Input placeholder="+1234567890" value={state.phoneNumber} onChange={(e) => onChange({ phoneNumber: e.target.value })} type="tel" />
        )}
        {state.contentType === 'wifi' && (
          <>
            <Input placeholder="Network Name (SSID)" value={state.wifiSsid} onChange={(e) => onChange({ wifiSsid: e.target.value })} />
            <Input placeholder="Password" value={state.wifiPassword} onChange={(e) => onChange({ wifiPassword: e.target.value })} type="password" />
            <Select value={state.wifiEncryption} onValueChange={(v) => onChange({ wifiEncryption: v as 'WPA' | 'WEP' | 'nopass' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WPA">WPA/WPA2</SelectItem>
                <SelectItem value="WEP">WEP</SelectItem>
                <SelectItem value="nopass">None</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
        {state.contentType === 'vcard' && (
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Full Name" value={state.vcardName} onChange={(e) => onChange({ vcardName: e.target.value })} className="col-span-2" />
            <Input placeholder="Organization" value={state.vcardOrg} onChange={(e) => onChange({ vcardOrg: e.target.value })} />
            <Input placeholder="Phone" value={state.vcardPhone} onChange={(e) => onChange({ vcardPhone: e.target.value })} type="tel" />
            <Input placeholder="Email" value={state.vcardEmail} onChange={(e) => onChange({ vcardEmail: e.target.value })} />
            <Input placeholder="Website" value={state.vcardUrl} onChange={(e) => onChange({ vcardUrl: e.target.value })} />
            <Input placeholder="Address" value={state.vcardAddress} onChange={(e) => onChange({ vcardAddress: e.target.value })} className="col-span-2" />
          </div>
        )}
      </div>
    </div>
  );
}
