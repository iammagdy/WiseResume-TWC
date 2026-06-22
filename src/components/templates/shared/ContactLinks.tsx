import { memo } from 'react';
import { ContactInfo } from '@/types/resume';
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from 'lucide-react';
import { extractLinkedInUsername, extractGitHubUsername, extractDomain, DEFAULT_HEADER_ORDER } from './contactUtils';
import { safeHref } from '@/lib/urlUtils';

interface ContactLinksProps {
  contact: ContactInfo;
  className?: string;
  iconSize?: number;
  /** Show icons or plain text */
  showIcons?: boolean;
  /** Separator between items */
  separator?: string;
}

interface ContactItem {
  key: string;
  icon: typeof Mail;
  label: string;
  value: string;
  /** Optional href — when set, the label is rendered as an anchor so the
   *  exported PDF (and live preview) include a clickable hyperlink. */
  href?: string;
}

/** Ensures URLs without a scheme become absolute so anchors are clickable. */
function ensureUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/** Builds a full LinkedIn profile URL from any form (full URL, domain-relative, or bare username). */
function ensureLinkedinUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/linkedin\.com/i.test(trimmed)) return `https://${trimmed}`;
  // Bare username — construct the canonical profile URL
  return `https://linkedin.com/in/${trimmed}`;
}

/** Builds a full GitHub profile URL from any form (full URL, domain-relative, or bare username). */
function ensureGithubUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/github\.com/i.test(trimmed)) return `https://${trimmed}`;
  // Bare username — construct the canonical profile URL
  return `https://github.com/${trimmed}`;
}

function getItems(contact: ContactInfo): ContactItem[] {
  const items: ContactItem[] = [];
  if (contact.email) items.push({ key: 'email', icon: Mail, label: contact.email, value: contact.email, href: safeHref(`mailto:${contact.email}`) });
  if (contact.email2) items.push({ key: 'email2', icon: Mail, label: contact.email2, value: contact.email2, href: safeHref(`mailto:${contact.email2}`) });
  if (contact.phone) items.push({ key: 'phone', icon: Phone, label: contact.phone, value: contact.phone });
  if (contact.location) items.push({ key: 'location', icon: MapPin, label: contact.location, value: contact.location });
  if (contact.linkedin) items.push({ key: 'linkedin', icon: Linkedin, label: extractLinkedInUsername(contact.linkedin), value: contact.linkedin, href: safeHref(ensureLinkedinUrl(contact.linkedin)) });
  if (contact.github) items.push({ key: 'github', icon: Github, label: extractGitHubUsername(contact.github), value: contact.github, href: safeHref(ensureGithubUrl(contact.github)) });
  if (contact.portfolio) items.push({ key: 'portfolio', icon: Globe, label: extractDomain(contact.portfolio), value: contact.portfolio, href: safeHref(ensureUrl(contact.portfolio)) });
  return items;
}

function orderItems(items: ContactItem[], order?: string[]): ContactItem[] {
  if (!order || order.length === 0) return items;
  const map = new Map(items.map(i => [i.key, i]));
  const ordered: ContactItem[] = [];
  for (const key of order) {
    const item = map.get(key);
    if (item) {
      ordered.push(item);
      map.delete(key);
    }
  }
  // Append any remaining items not in the order array (like email2)
  map.forEach(item => ordered.push(item));
  return ordered;
}

export const ContactLinks = memo(function ContactLinks({
  contact,
  className = 'text-gray-600 text-xs',
  iconSize = 3,
  showIcons = true,
  separator,
}: ContactLinksProps) {
  const items = orderItems(getItems(contact), contact.headerOrder || DEFAULT_HEADER_ORDER);
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
      {items.map((item, i) => {
        const Label = item.href
          ? <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationThickness: '0.5px' }}>{item.label}</a>
          : <span>{item.label}</span>;
        return (
          <span key={item.key + i} className="flex items-center gap-1">
            {separator && i > 0 && <span className="mr-1">{separator}</span>}
            {showIcons && <item.icon style={{ width: iconSize * 4, height: iconSize * 4, flexShrink: 0, display: 'inline', verticalAlign: 'middle', alignSelf: 'center' }} />}
            {Label}
          </span>
        );
      })}
    </div>
  );
});
